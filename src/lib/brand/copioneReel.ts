// Script dei reel: misure e controlli che non si lasciano al modello.
// File PURO, specchiato in supabase/functions/_shared/brand/copioneReel.ts
// (vedi mirrorSync.test): niente import, gira uguale in Vite e in Deno.
//
// Nato dal test del reparto social del 18/11/2026 (note revisione v3, punto 4):
// a 45 secondi uno script aveva 216 parole (86 secondi detti) e il «Gancio
// 0-3 s» ne aveva 18; i tempi scritti dal modello non c'entravano con le
// parole. Qui i tempi si calcolano dalle parole, a 2,5 parole al secondo.

/** Ritmo del parlato in camera, misurato dal reparto social. */
export const PAROLE_AL_SECONDO = 2.5;

/** Il contenuto vero deve partire entro questo secondo. */
export const SECONDI_GANCIO_MAX = 5;

/** Parole giuste per una durata: il massimo è la durata detta a 2,5 parole al secondo. */
export function parolePerDurata(secondi: number): { min: number; max: number } {
  const max = Math.round(secondi * PAROLE_AL_SECONDO);
  return { min: Math.round(max * 0.85), max };
}

export function contaParole(testo: unknown): number {
  const t = String(testo ?? '').trim();
  if (!t) return 0;
  return t.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

/**
 * Tempi delle sezioni calcolati dalle parole: «0-4», «4-12»… Ogni sezione
 * comincia dove finisce la precedente; l'ultimo numero è la durata detta.
 */
export function tempiDaParole(testi: string[], ritmo = PAROLE_AL_SECONDO): { tempi: string[]; secondi: number } {
  let parole = 0;
  const tempi: string[] = [];
  for (const t of testi) {
    const inizio = Math.round(parole / ritmo);
    parole += contaParole(t);
    const fine = Math.max(inizio + 1, Math.round(parole / ritmo));
    tempi.push(`${inizio}-${fine}`);
  }
  return { tempi, secondi: Math.round(parole / ritmo) };
}

// ── Ganci ──

export interface TipoGancio {
  id: 'domanda' | 'negativo' | 'lista' | 'autorita' | 'curiosita';
  nome: string;
  istruzione: string;
}

/**
 * Tipi di gancio a rotazione: con 2 o più script ognuno parte da un tipo
 * diverso, così il terapista ha davvero qualcosa da mettere a confronto
 * (prima uscivano tutti con lo stesso angolo e la stessa struttura).
 */
export const TIPI_GANCIO: TipoGancio[] = [
  {
    id: 'domanda',
    nome: 'Domanda',
    istruzione: 'una domanda in cui chi ha quel problema si riconosce subito (es. «Mal di testa che parte dal collo e gli antidolorifici non bastano mai?»), seguita SUBITO dalla risposta',
  },
  {
    id: 'negativo',
    nome: 'Errore da evitare',
    istruzione: 'l\'errore che quasi tutti fanno, detto in modo diretto (es. «Se hai mal di testa dal collo, smetti di fare questa cosa»), e nella frase dopo qual è l\'errore',
  },
  {
    id: 'lista',
    nome: 'Lista',
    istruzione: 'un numero preciso di cose, segnali o motivi (es. «Tre segnali che il tuo mal di testa parte dal collo»), poi le cose una per una, numerate a voce',
  },
  {
    id: 'autorita',
    nome: 'Esperienza',
    istruzione: 'quello che il professionista vede in studio, in prima persona (es. «Ogni settimana in studio vedo persone con mal di testa che…»), senza numeri o statistiche inventate',
  },
  {
    id: 'curiosita',
    nome: 'Curiosità',
    istruzione: 'un fatto che sorprende e contraddice quello che la gente crede (es. «Il tuo mal di testa forse non nasce nella testa»), spiegato nella frase dopo, senza farlo aspettare',
  },
];

/** Il gancio per la variante i (da 0): con una sola variante si parte dalla domanda. */
export function gancioPerVariante(variante: unknown): TipoGancio {
  const i = Math.max(0, Math.floor(Number(variante) || 0));
  return TIPI_GANCIO[i % TIPI_GANCIO.length];
}

// ── Frasi insicure ──

/**
 * Frasi di permesso o di comprensione che fanno sembrare insicuro chi parla
 * («Forse ci dici», «Magari senti», «Noi capiamo bene»): il reparto social le
 * ha segnate da togliere il 18/11/2026.
 */
const FRASI_INSICURE: RegExp[] = [
  /\b(?:forse|magari)\s+(?:anche\s+)?(?:tu\s+|voi\s+)?(?:ti|ci|mi|vi|senti|sentite|hai|avete|provi|provate|pensi|pensate|stai|state|dici|dite|sei|siete|soffri|soffrite|ti\s+capita|vi\s+capita)\b[^.!?\n]*/giu,
  /\b(?:noi\s+|io\s+)?(?:capiamo|capisco|comprendiamo|comprendo)\s+(?:bene|benissimo|perfettamente|quanto|come|questa|la\s+tua|il\s+tuo|la\s+vostra|il\s+vostro)\b[^.!?\n]*/giu,
  /\b(?:sappiamo|so)\s+(?:bene\s+)?(?:quanto|come)\s+(?:sia|possa|può|sei|siete)\b[^.!?\n]*/giu,
  /\bnon\s+(?:preoccuparti|preoccupatevi|ti\s+preoccupare)\b[^.!?\n]*/giu,
];

export function frasiInsicure(testo: unknown): string[] {
  const t = String(testo ?? '');
  const trovate: string[] = [];
  for (const re of FRASI_INSICURE) {
    for (const m of t.matchAll(re)) {
      const f = m[0].trim();
      if (f && !trovate.includes(f)) trovate.push(f);
    }
  }
  return trovate;
}

// ── Hashtag ──

/** Hashtag comuni del settore che si tengono anche se il testo non li contiene. */
const HASHTAG_DEL_SETTORE = new Set([
  'fisioterapia', 'fisioterapista', 'osteopatia', 'osteopata', 'riabilitazione', 'postura',
  'salute', 'benessere', 'prevenzione', 'movimento', 'esercizi', 'esercizio', 'terapiamanuale',
  'chinesiologia', 'nutrizione', 'nutrizionista', 'dietista', 'psicologia', 'psicologo',
  'logopedia', 'podologia', 'massoterapia', 'sport', 'sportivi', 'mobilita', 'stretching',
]);

function piano(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it');
}

/**
 * Hashtag in minuscolo (niente CamelCase), senza refusi. Un hashtag si tiene
 * se è scritto con parole che stanno davvero nei testi (1-4 parole di fila,
 * attaccate: «mal di testa» → «malditesta») o se è uno dei comuni del settore.
 * Così «#malotesta», «#maliditesta» e «#studiodefisioterapia» non passano.
 * Se ne restano meno di 3, si aggiungono le parole del tema.
 */
export function hashtagControllati(lista: unknown, testi: unknown[], opz: { tema?: string; massimo?: number } = {}): string[] {
  const massimo = opz.massimo ?? 8;
  const parole = testi
    .map((t) => piano(String(t ?? '')))
    .join(' \n ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const ammessi = new Set<string>();
  for (let i = 0; i < parole.length; i++) {
    let s = '';
    for (let n = 0; n < 4 && i + n < parole.length; n++) {
      s += parole[i + n];
      ammessi.add(s);
    }
  }
  const visti = new Set<string>();
  const out: string[] = [];
  const prova = (v: unknown) => {
    const h = piano(String(v ?? '').replace(/^#+/, '')).replace(/[^\p{L}\p{N}_]/gu, '');
    if (h.length < 3 || h.length > 30 || visti.has(h)) return;
    if (!ammessi.has(h) && !HASHTAG_DEL_SETTORE.has(h)) return;
    visti.add(h);
    out.push(h);
  };
  for (const v of Array.isArray(lista) ? lista : []) {
    if (out.length >= massimo) break;
    prova(v);
  }
  if (out.length < 3 && opz.tema) {
    // Le due parole più lunghe del tema (di solito i nomi: «antidolorifici»,
    // «cervicale»), saltando i verbi più comuni.
    const verbi = /^(?:bastano|basta|passa|passano|parte|partono|funziona|funzionano|serve|servono|capire|sapere|fare|fanno|succede|davvero|sempre)$/;
    const candidate = piano(opz.tema).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 6 && !verbi.test(w));
    candidate.sort((a, b) => b.length - a.length);
    for (const w of candidate.slice(0, 2)) prova(w);
  }
  return out;
}
