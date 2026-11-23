export interface ReelSection {
  nome: string;
  timing: string;
  testo: string;
  inquadratura: string;
  /** Testo in sovrimpressione (massimo 7 parole): molti guardano senza audio. */
  testo_a_schermo?: string;
}

export interface ReelScript {
  titolo_reel: string;
  durata_stimata: string;
  sezioni: ReelSection[];
  script_completo: string;
  caption_instagram: string;
  hashtag_suggeriti: string[];
  /** Promesse sanitarie o cose che il brand non dice, rimaste nello script dopo la riscrittura. */
  da_rivedere?: string[];
  /** Tipo di gancio usato (Domanda, Lista, Esperienza…): con più script cambia per ognuno. */
  tipo_gancio?: string;
}

export const SECTION_COLORS: Record<string, string> = {
  'GANCIO': '#EF4444',
  'PROBLEMA': '#F97316',
  'PROMESSA': '#3B82F6',
  'RISPOSTA': '#F97316',
  'SPIEGAZIONE': '#3B82F6',
  'AZIONE': '#22C55E',
  'CTA': '#8B5CF6',
  'CONTENUTO': '#22C55E',
  'CHIUSURA + CTA': '#8B5CF6',
  'CHIUSURA': '#8B5CF6',
};
