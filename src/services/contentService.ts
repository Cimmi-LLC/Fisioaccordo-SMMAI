
import { supabase } from '@/integrations/supabase/client';

export interface SaveContentParams {
  title: string;
  contentText: string;
  topic: string;
  audience?: string;
  platform: string;
  postType: string;
  tone: string;
  length: string;
  images: string[];
}

export interface GeneratedContent {
  id: string;
  title: string;
  content_text: string;
  topic: string;
  audience?: string;
  platform: string;
  post_type: string;
  tone: string;
  length: string;
  images: string[];
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

export class ContentService {
  async saveContent(params: SaveContentParams): Promise<{ data: GeneratedContent | null; error: any }> {
    try {
      console.log('💾 Salvando contenuto nel database...');
      
      const { data, error } = await supabase
        .from('generated_contents')
        .insert({
          title: params.title,
          content_text: params.contentText,
          topic: params.topic,
          audience: params.audience || '',
          platform: params.platform,
          post_type: params.postType,
          tone: params.tone,
          length: params.length,
          images: params.images
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Errore salvataggio:', error);
        return { data: null, error };
      }

      console.log('✅ Contenuto salvato con successo');
      return { data, error: null };
    } catch (error) {
      console.error('🚫 Errore servizio contenuti:', error);
      return { data: null, error };
    }
  }

  async getUserContents(): Promise<{ data: GeneratedContent[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('generated_contents')
        .select('*')
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('🚫 Errore caricamento contenuti:', error);
      return { data: null, error };
    }
  }

  async deleteContent(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('generated_contents')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      console.error('🚫 Errore eliminazione contenuto:', error);
      return { error };
    }
  }

  async markAsPublished(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('generated_contents')
        .update({ 
          is_published: true, 
          published_at: new Date().toISOString() 
        })
        .eq('id', id);

      return { error };
    } catch (error) {
      console.error('🚫 Errore aggiornamento stato:', error);
      return { error };
    }
  }
}

export const contentService = new ContentService();
