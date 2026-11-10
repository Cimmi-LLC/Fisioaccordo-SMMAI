// Stato delle slide di un carosello in produzione (riga produced_carousels,
// campo `slides`). Funzioni pure, specchiate in
// supabase/functions/_shared/brand (lo controlla mirrorSync.test.ts).
//
// Perché esiste: fino al 09/11/2026 ogni slide finita rileggeva il jsonb, lo
// cambiava e lo riscriveva per intero, e con 6 slide insieme l'ultima
// scrittura cancellava le altre. La riga risultava «ready 5/5» con 4 slide
// ancora «pending» e il sito lasciava le rotelline per sempre (10 righe su
// 26). Ora chi scrive confronta la versione della riga (updated_at) e, a fine
// lavoro, la riga si chiude sempre: una slide è fatta o è fallita.

export type SlideStato = {
  index: number;
  path?: string | null;
  error?: string | null;
  status?: string;
};

export type StatoFinale = 'ready' | 'partial' | 'failed';

/** Messaggio di una slide che non è mai arrivata in fondo. */
export const SLIDE_NON_ARRIVATA = 'la slide non è arrivata in fondo: premi Riprova';

/** Sostituisce nella lista la slide con lo stesso indice. */
export function applicaSlide<T extends SlideStato>(slides: T[], slide: T): T[] {
  return slides.map((s) => (s.index === slide.index ? slide : s));
}

/** Slide con l'immagine salvata. */
export function contaFatte(slides: SlideStato[]): number {
  return slides.filter((s) => s.status === 'done' && !!s.path).length;
}

/** Stato della riga quando la produzione è finita. */
export function statoFinale(slides: SlideStato[]): StatoFinale {
  const fatte = contaFatte(slides);
  return fatte === slides.length && fatte > 0 ? 'ready' : fatte > 0 ? 'partial' : 'failed';
}

/**
 * Versione successiva della riga: sempre dopo la precedente, anche quando due
 * scritture cadono nello stesso millisecondo o gli orologi non coincidono.
 */
export function versioneSuccessiva(precedente: string | null | undefined, adessoMs: number): string {
  const prima = precedente ? Date.parse(precedente) : NaN;
  const ms = Number.isFinite(prima) ? Math.max(adessoMs, Math.floor(prima) + 1) : adessoMs;
  return new Date(ms).toISOString();
}

/** Riga letta dal database: le slide e la versione (updated_at). */
export type RigaSlides<T extends SlideStato> = { slides?: T[] | null; updated_at?: string | null; status?: string | null };

/** Accesso alla riga, iniettato: la funzione edge usa Supabase, i test una riga in memoria. */
export type IoRiga<T extends SlideStato> = {
  leggi: () => Promise<RigaSlides<T> | null>;
  /** Scrive i campi; con `seVersione` solo se la riga ha ancora quella versione. true = scritta. */
  scrivi: (campi: Record<string, unknown>, seVersione: string | null) => Promise<boolean>;
  adesso: () => number;
  pausa: (ms: number) => Promise<void>;
};

export const TENTATIVI_SCRITTURA = 10;

/**
 * Riscrive il campo `slides` senza perdere le scritture degli altri: legge la
 * riga, calcola il nuovo stato e lo salva solo se nel frattempo nessuno l'ha
 * cambiata. Se qualcuno è arrivato prima, rilegge e riprova. All'ultimo giro
 * scrive comunque: meglio un confronto mancato che una slide persa.
 */
export async function scriviSlides<T extends SlideStato>(
  io: IoRiga<T>,
  cambia: (riga: RigaSlides<T>) => Record<string, unknown> & { slides: T[] },
): Promise<T[] | null> {
  for (let tentativo = 0; tentativo < TENTATIVI_SCRITTURA; tentativo++) {
    const riga = await io.leggi();
    if (!riga) return null;
    const campi = cambia(riga);
    const ultimo = tentativo === TENTATIVI_SCRITTURA - 1;
    const scritta = await io.scrivi(
      { ...campi, updated_at: versioneSuccessiva(riga.updated_at, io.adesso()) },
      riga.updated_at && !ultimo ? riga.updated_at : null,
    );
    if (scritta) return campi.slides;
    await io.pausa(30 + Math.random() * 120);
  }
  return null;
}

/**
 * Chiusura della produzione. Parte dalle slide salvate nella riga, ci rimette
 * i risultati che chi ha prodotto ha in mano e che nella riga mancano, e
 * segna fallite quelle rimaste a metà.
 */
export function chiudiProduzione<T extends SlideStato>(
  salvate: T[],
  risultati: T[],
): { slides: T[]; okCount: number; status: StatoFinale } {
  const perIndice = new Map(risultati.map((r) => [r.index, r]));
  const slides = salvate.map((s) => {
    if (s.status === 'done' && s.path) return s;
    const r = perIndice.get(s.index);
    if (r && r.status === 'done' && r.path) return r;
    if (s.status === 'failed' && s.error) return s;
    if (r && r.status === 'failed') return { ...r, path: null, error: r.error || SLIDE_NON_ARRIVATA };
    return { ...s, path: null, status: 'failed', error: SLIDE_NON_ARRIVATA };
  });
  return { slides, okCount: contaFatte(slides), status: statoFinale(slides) };
}

/**
 * Lato sito: in una riga già chiusa una slide senza immagine e senza errore
 * non arriverà più. Riceve l'errore, così compare «Riprova» al posto della
 * rotellina. Dice anche quante erano.
 */
export function chiudiPendenti<T extends { path?: string | null; error?: string | null }>(
  slides: T[],
): { slides: T[]; quante: number } {
  let quante = 0;
  const chiuse = slides.map((s) => {
    if (s.path || s.error) return s;
    quante++;
    return { ...s, error: SLIDE_NON_ARRIVATA };
  });
  return { slides: chiuse, quante };
}
