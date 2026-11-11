// Storie: ricerca delle foto e messaggi d'errore (funzioni pure, provate nei test).
//
// Perché esiste. Test del reparto social del 09/11/2026: 10 storie hanno fatto
// 100 chiamate alla funzione delle foto (la pagina rilanciava la ricerca a
// ogni aggiornamento, e una ricerca già in corso non veniva riconosciuta), il
// server è andato in 401/504 e l'unica scritta a schermo era «Errore.
// Riprova.». Qui: una chiamata per foto, poche insieme, un tempo massimo, una
// pausa dopo un errore, e il motivo detto in italiano.

import { contrasto } from './brand/layouts';

export type MotivoFoto = 'tempo' | 'errore' | 'nessuna';

export type EsitoFoto = { url: string | null; motivo: MotivoFoto | null };

/** Risposta di chi cerca davvero la foto (la funzione edge). */
export type RispostaFoto = { url?: string | null; errore?: string | null };

export type OpzioniCercaFoto = {
  chiama: (query: string, brandId: string | null) => Promise<RispostaFoto>;
  /** Ricerche in corso insieme (le altre aspettano il loro turno). */
  inParallelo?: number;
  /** Oltre questo tempo la storia esce senza foto. */
  tempoMassimoMs?: number;
  /** Dopo un errore la stessa ricerca non riparte da sola per questo tempo. */
  riposoErroreMs?: number;
  adesso?: () => number;
};

export const FOTO_IN_PARALLELO = 3;
export const FOTO_TEMPO_MASSIMO_MS = 75_000;
export const FOTO_RIPOSO_ERRORE_MS = 60_000;

/** Frase breve da mostrare sulla storia rimasta senza foto. */
export function fraseSenzaFoto(motivo: MotivoFoto | null): string {
  if (motivo === 'tempo') return 'La foto non è arrivata in tempo';
  if (motivo === 'nessuna') return 'Nessuna foto adatta trovata';
  return 'La foto non è arrivata';
}

/**
 * Cercatore di foto con memoria: una chiamata per ricerca, riusata da chi la
 * chiede mentre è in corso e dopo che è riuscita.
 */
export function creaCercaFoto(opzioni: OpzioniCercaFoto) {
  const inParallelo = Math.max(1, opzioni.inParallelo ?? FOTO_IN_PARALLELO);
  const tempoMassimo = opzioni.tempoMassimoMs ?? FOTO_TEMPO_MASSIMO_MS;
  const riposo = opzioni.riposoErroreMs ?? FOTO_RIPOSO_ERRORE_MS;
  const adesso = opzioni.adesso ?? (() => Date.now());

  const riuscite = new Map<string, string>();
  const fallite = new Map<string, { quando: number; motivo: MotivoFoto }>();
  const inCorso = new Map<string, Promise<EsitoFoto>>();
  const coda: Array<() => void> = [];
  let attive = 0;

  const turno = (): Promise<void> => {
    if (attive < inParallelo) { attive++; return Promise.resolve(); }
    return new Promise((via) => coda.push(() => { attive++; via(); }));
  };
  const libera = () => {
    attive--;
    const prossimo = coda.shift();
    if (prossimo) prossimo();
  };

  const unaRicerca = async (query: string, brandId: string | null): Promise<EsitoFoto> => {
    await turno();
    let sveglia: ReturnType<typeof setTimeout> | undefined;
    try {
      const scaduto = new Promise<EsitoFoto>((r) => {
        sveglia = setTimeout(() => r({ url: null, motivo: 'tempo' }), tempoMassimo);
      });
      const chiamata = opzioni.chiama(query, brandId).then<EsitoFoto, EsitoFoto>(
        (r) => (r?.url ? { url: r.url, motivo: null } : { url: null, motivo: r?.errore ? 'errore' : 'nessuna' }),
        () => ({ url: null, motivo: 'errore' }),
      );
      return await Promise.race([chiamata, scaduto]);
    } finally {
      if (sveglia) clearTimeout(sveglia);
      libera();
    }
  };

  /** `forza`: riprova anche se la stessa ricerca è appena fallita («Riprova la foto»). */
  const cerca = (query: string | null | undefined, brandId?: string | null, opz: { forza?: boolean } = {}): Promise<EsitoFoto> => {
    const q = (query || '').trim();
    if (!q) return Promise.resolve({ url: null, motivo: 'nessuna' });
    const chiave = `${brandId || '-'}::${q}`;
    const pronta = riuscite.get(chiave);
    if (pronta) return Promise.resolve({ url: pronta, motivo: null });
    const corso = inCorso.get(chiave);
    if (corso) return corso;
    const fallita = fallite.get(chiave);
    if (fallita && !opz.forza && adesso() - fallita.quando < riposo) {
      return Promise.resolve({ url: null, motivo: fallita.motivo });
    }
    const p = unaRicerca(q, brandId || null).then((esito) => {
      inCorso.delete(chiave);
      if (esito.url) { riuscite.set(chiave, esito.url); fallite.delete(chiave); }
      else fallite.set(chiave, { quando: adesso(), motivo: esito.motivo || 'errore' });
      return esito;
    });
    inCorso.set(chiave, p);
    return p;
  };

  return { cerca };
}

/**
 * Messaggio per chi ha premuto «Genera le Storie» e non le ha avute. Il
 * server manda già frasi leggibili («Gemini è temporaneamente sovraccarico.
 * Riprova tra 30 secondi.»): si mostrano quelle. Gli errori tecnici diventano
 * una frase che dice cosa fare.
 */
export function messaggioErroreStorie(err: unknown): string {
  const testo = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const t = testo.trim();
  if (!t) return 'Le storie non sono arrivate. Riprova fra un minuto.';
  if (/no json array|unexpected token|unexpected end|json|is not valid/i.test(t)) {
    return 'La risposta è arrivata in un formato che non riesco a leggere. Riprova: di solito al secondo tentativo passa.';
  }
  if (/non-2xx|failed to fetch|failed to send|networkerror|load failed|timeout|timed out/i.test(t)) {
    return 'Il server non ha risposto in tempo. Aspetta un minuto e riprova.';
  }
  if (/ai api error|ai call failed/i.test(t)) {
    return 'Il servizio che scrive le storie ha dato errore. Riprova fra un minuto.';
  }
  return t.length > 220 ? t.slice(0, 220) + '…' : t;
}

/** true quando conviene ritentare da soli una volta (risposta non leggibile). */
export function rispostaNonLeggibile(err: unknown): boolean {
  const t = err instanceof Error ? err.message : '';
  return /no json array|unexpected token|unexpected end|is not valid json/i.test(t);
}

/** Inchiostro usato al posto di un colore del brand troppo chiaro. */
export const INCHIOSTRO_STORIE = '#1f2430';

/**
 * Colore per testi e pulsanti delle storie, che hanno il fondo chiaro: un
 * colore del brand che sul bianco non si legge (giallo, menta, azzurro
 * pallido) lascia il posto all'inchiostro. Prova del 10/11/2026: le storie
 * di un brand giallo uscivano con il testo giallo su fondo chiaro.
 */
export function coloreLeggibile(hex: string | null | undefined, minimo = 2.2): string {
  const c = String(hex || '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(c)) return INCHIOSTRO_STORIE;
  return contrasto(c, '#ffffff') >= minimo ? c : INCHIOSTRO_STORIE;
}
