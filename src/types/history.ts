export type GenerationType =
  | 'post'
  | 'carousel'
  | 'story'
  | 'reel'
  | 'competitor'
  | 'viral_analysis'
  | 'image_swap'
  | 'expand_topic';

export type GenerationStatus = 'success' | 'failed' | 'partial';

export interface HistoryEntry {
  id: string;
  user_id: string;
  brand_id: string | null;
  generation_type: GenerationType;
  topic: string | null;
  title: string | null;
  preview: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: GenerationStatus;
  error_message: string | null;
  created_at: string;
}

export const GENERATION_TYPE_LABELS: Record<GenerationType, string> = {
  post: 'Post singolo',
  carousel: 'Carosello',
  story: 'Storia',
  reel: 'Reel',
  competitor: 'Analisi competitor',
  viral_analysis: 'Analisi virale',
  image_swap: 'Cambio immagine',
  expand_topic: 'Idee post',
};
