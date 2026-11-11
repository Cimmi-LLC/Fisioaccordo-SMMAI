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
