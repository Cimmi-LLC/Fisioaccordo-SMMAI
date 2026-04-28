export interface ReelSection {
  nome: string;
  timing: string;
  testo: string;
  inquadratura: string;
}

export interface ReelScript {
  titolo_reel: string;
  durata_stimata: string;
  sezioni: ReelSection[];
  script_completo: string;
  caption_instagram: string;
  hashtag_suggeriti: string[];
}

export const SECTION_COLORS: Record<string, string> = {
  'GANCIO': '#EF4444',
  'PROBLEMA': '#F97316',
  'PROMESSA': '#3B82F6',
  'CONTENUTO': '#22C55E',
  'CHIUSURA + CTA': '#8B5CF6',
  'CHIUSURA': '#8B5CF6',
};
