
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
  user_id: string;
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
  published_at?: string;
  engagement_stats?: any;
}

export class ContentService {
  async saveContent(params: SaveContentParams): Promise<{ data: any; error: any }> {
    try {
      console.log('💾 Salvando contenuto nel database...');
      
      // Ottieni l'utente corrente
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'Utente non autenticato' } };
      }

      // Usa la funzione RPC per inserire i dati
      const { data, error } = await supabase.rpc('insert_generated_content', {
        p_user_id: user.id,
        p_title: params.title,
        p_content_text: params.contentText,
        p_topic: params.topic,
        p_audience: params.audience || '',
        p_platform: params.platform,
        p_post_type: params.postType,
        p_tone: params.tone,
        p_length: params.length,
        p_images: JSON.stringify(params.images)
      });

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

  async getUserContents(): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'Utente non autenticato' } };
      }

      const { data, error } = await supabase.rpc('get_user_contents', {
        p_user_id: user.id
      });

      return { data, error };
    } catch (error) {
      console.error('🚫 Errore caricamento contenuti:', error);
      return { data: null, error };
    }
  }

  async deleteContent(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Utente non autenticato' } };
      }

      const { error } = await supabase.rpc('delete_user_content', {
        p_content_id: id,
        p_user_id: user.id
      });

      return { error };
    } catch (error) {
      console.error('🚫 Errore eliminazione contenuto:', error);
      return { error };
    }
  }

  async markAsPublished(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Utente non autenticato' } };
      }

      const { error } = await supabase.rpc('mark_content_published', {
        p_content_id: id,
        p_user_id: user.id
      });

      return { error };
    } catch (error) {
      console.error('🚫 Errore aggiornamento stato:', error);
      return { error };
    }
  }
}

export const contentService = new ContentService();
