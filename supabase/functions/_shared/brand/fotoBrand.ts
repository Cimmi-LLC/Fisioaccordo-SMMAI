// Foto del brand: etichette automatiche e scelta della foto per argomento.
// Funzioni pure, specchiate in supabase/functions/_shared/brand (lo controlla
// mirrorSync.test.ts).
//
// Revisione del reparto social, 09/11/2026: le foto caricate non avevano tag
// né didascalia, quindi la scelta era a sorte (copertina «Dolore alla spalla»
// su una storia di vertigini) e finivano come sfondo anche le copertine dei
// video, che hanno già il loro testo e il loro logo sopra. Ora ogni foto viene
// guardata una volta dal modello: cosa mostra, se ha testo sopra, se c'è un
// volto. Le etichette stanno in brand_photos.tags (nessuna migrazione); quelle
// di servizio iniziano con «__» e non si mostrano.

/** La foto è già stata guardata: non si riguarda. */
export const TAG_VISTA = '__vista';
/** Ha testo o logo sopra: non si usa come sfondo, il nostro testo ci finirebbe sopra. */
export const TAG_TESTO = '__testo';
/** C'è un volto in primo piano. */
export const TAG_VOLTO = '__volto';

export type FotoPool = { url: string; tags: string[]; caption: string | null };

export const PROMPT_ETICHETTE = `Guarda questa foto caricata da uno studio sanitario per i suoi post.
Rispondi SOLO con JSON:
{"descrizione":"cosa mostra, in italiano, massimo 12 parole","parole":["6-10 parole chiave: parte del corpo, gesto, ambiente, attrezzo; ognuna in italiano E in inglese"],"testo_sopra":true se nell'immagine ci sono scritte, titoli, loghi o grafiche sovrapposte (copertina di un video, locandina, screenshot), altrimenti false,"volto":true se c'è un volto in primo piano, altrimenti false}`;

export type Etichette = { descrizione: string; parole: string[]; testoSopra: boolean; volto: boolean };

/** Risposta del modello → etichette, o null se non è leggibile. */
export function leggiEtichette(raw: string): Etichette | null {
  try {
    const o = JSON.parse(String(raw || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (!o || typeof o !== 'object') return null;
    const parole = (Array.isArray(o.parole) ? o.parole : [])
      .flatMap((p: unknown) => String(p ?? '').split(/[\/,]/))
      .map((p: string) => p.trim().toLocaleLowerCase('it'))
      .filter((p: string) => p.length >= 3 && p.length <= 30 && !p.startsWith('__'));
    return {
      descrizione: String(o.descrizione ?? '').trim().slice(0, 140),
      parole: [...new Set<string>(parole)].slice(0, 20),
      testoSopra: o.testo_sopra === true,
      volto: o.volto === true,
    };
  } catch {
    return null;
  }
}

/** Etichette → tag da salvare, tenendo quelli scritti a mano dallo studio. */
export function tagDaEtichette(e: Etichette, giaPresenti: string[] = []): string[] {
  const aMano = giaPresenti.filter((t) => t && !t.startsWith('__'));
  return [...new Set([...aMano, ...e.parole, TAG_VISTA, ...(e.testoSopra ? [TAG_TESTO] : []), ...(e.volto ? [TAG_VOLTO] : [])])];
}

export const daGuardare = (tags: string[] | null | undefined): boolean => !(tags || []).includes(TAG_VISTA);
export const haTestoSopra = (tags: string[] | null | undefined): boolean => (tags || []).includes(TAG_TESTO);
/** Tag da mostrare allo studio (senza quelli di servizio). */
export const tagVisibili = (tags: string[] | null | undefined): string[] => (tags || []).filter((t) => t && !t.startsWith('__'));

function punteggio(foto: FotoPool, parole: string[]): number {
  const dove = [...tagVisibili(foto.tags), foto.caption || ''].join(' ').toLocaleLowerCase('it');
  let n = 0;
  for (const p of parole) if (p && p.length >= 3 && dove.includes(p)) n++;
  return n;
}

/**
 * Sceglie la foto del brand per una slide o una storia.
 * - Mai una foto con testo o logo sopra.
 * - Vince quella che c'entra di più con le parole della slide.
 * - Se nessuna c'entra: con `sempre` («usa prima le mie foto, sempre») si
 *   prende la prossima a rotazione, mai due volte la stessa finché ce ne sono
 *   di nuove; senza `sempre` nessuna (si passa a immagine generata o stock).
 */
export function scegliFoto(pool: FotoPool[], paroleSlide: string[], usate: Set<string>, sempre: boolean): string | null {
  const pulite = pool.filter((p) => p.url && !haTestoSopra(p.tags));
  if (pulite.length === 0) return null;
  const nuove = pulite.filter((p) => !usate.has(p.url));
  const candidate = nuove.length > 0 ? nuove : pulite;
  const parole = [...new Set(paroleSlide.map((k) => String(k || '').toLocaleLowerCase('it').trim()).filter(Boolean))];
  let migliore: FotoPool | null = null;
  let top = 0;
  for (const f of candidate) {
    const p = punteggio(f, parole);
    if (p > top) { top = p; migliore = f; }
  }
  if (migliore) return migliore.url;
  return sempre ? candidate[0].url : null;
}

/**
 * Spartisce le foto del brand fra tutte le slide o le storie di una stessa
 * generazione (una voce per slide, nell'ordine in cui si vedono), invece di
 * sceglierle una alla volta.
 *
 * Prova del reparto social del 18/11/2026: con 5 foto in galleria la stessa
 * foto è finita su 7 storie su 10. Ogni storia chiedeva la sua foto da sola
 * (una chiamata per storia, tre insieme) e ogni chiamata ripartiva con
 * l'elenco delle foto usate vuoto: vinceva sempre la stessa, quella che
 * c'entrava di più con l'argomento del brand.
 *
 * Regole:
 * - mai una foto con testo o logo sopra;
 * - adatte = quelle che c'entrano con la slide (con `sempre`: tutte);
 * - prima si usano tutte le foto: finché ce n'è una mai usata, nessuna si ripete;
 * - poi si ripete la meno usata, mai sulla slide subito prima o subito dopo;
 * - a parità vince quella che c'entra di più. Se non resta nessuna foto
 *   possibile la slide resta senza (immagine generata o stock).
 * Le slide con meno foto adatte scelgono per prime.
 */
export function assegnaFoto(pool: FotoPool[], paroleSlide: string[][], sempre: boolean): Array<string | null> {
  const pulite = pool.filter((p) => p.url && !haTestoSopra(p.tags));
  const n = paroleSlide.length;
  const scelta: number[] = new Array(n).fill(-1);
  if (pulite.length === 0 || n === 0) return scelta.map(() => null);
  const punti = paroleSlide.map((ps) => {
    const parole = [...new Set((ps || []).map((k) => String(k || '').toLocaleLowerCase('it').trim()).filter(Boolean))];
    return pulite.map((f) => punteggio(f, parole));
  });
  const adatte = punti.map((riga) => riga.map((p, j) => (sempre || p > 0 ? j : -1)).filter((j) => j >= 0));
  const usi: number[] = new Array(pulite.length).fill(0);
  const ordine = [...Array(n).keys()].sort((a, b) => adatte[a].length - adatte[b].length || a - b);
  for (const i of ordine) {
    if (adatte[i].length === 0) continue;
    const vicine = new Set([i > 0 ? scelta[i - 1] : -1, i < n - 1 ? scelta[i + 1] : -1]);
    const ancoraNuove = usi.some((u) => u === 0);
    const candidate = adatte[i].filter((j) => !vicine.has(j) && (!ancoraNuove || usi[j] === 0));
    if (candidate.length === 0) continue;
    candidate.sort((a, b) => usi[a] - usi[b] || punti[i][b] - punti[i][a] || a - b);
    scelta[i] = candidate[0];
    usi[candidate[0]]++;
  }
  return scelta.map((j) => (j >= 0 ? pulite[j].url : null));
}
