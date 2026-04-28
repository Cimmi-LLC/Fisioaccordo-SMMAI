export type StoryBatchSource = 'topic' | 'reviews' | 'manual' | 'file';

export interface StoryBatch {
  id: string;
  user_id: string;
  brand_id: string | null;
  source_type: StoryBatchSource;
  source_meta: {
    label?: string;          // human label, es. "Recensioni di Studio Bianchi"
    url?: string;            // gmaps url o sito
    types?: string[];        // tipi di storie generate
    qty?: number;            // numero richiesto
    [k: string]: unknown;
  };
  stories: any[];            // metadata storie (headline/text/photoQuery/etc)
  story_count: number;
  created_at: string;
}

export const SOURCE_LABEL: Record<StoryBatchSource, string> = {
  topic: 'Topic',
  reviews: 'Recensioni Google',
  manual: 'Recensioni manuali',
  file: 'Recensioni da file',
};
