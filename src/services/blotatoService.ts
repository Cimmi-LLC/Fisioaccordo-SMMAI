import { supabase } from '@/integrations/supabase/client';

export interface BlotatoAccount {
  id: string;
  platform: string;
  username: string;
  status: 'connected' | 'error' | 'pending';
}

export interface BlotatoPostRequest {
  content: string;
  platforms: string[];
  images?: string[];
  scheduleFor?: string;
}

export interface BlotatoPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
  platformResults?: Array<{
    platform: string;
    success: boolean;
    postId?: string;
    error?: string;
  }>;
}

export class BlotatoService {
  // Ottieni account collegati dell'utente
  static async getConnectedAccounts(): Promise<{ data: BlotatoAccount[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'Utente non autenticato' } };
      }

      // Per ora simuliamo dei dati - in futuro si integrerà con Blotato API
      const mockAccounts: BlotatoAccount[] = [
        { id: 'ig_1', platform: 'instagram', username: 'test_user', status: 'connected' },
        { id: 'fb_1', platform: 'facebook', username: 'test_user', status: 'connected' },
        { id: 'tw_1', platform: 'twitter', username: 'test_user', status: 'connected' },
        { id: 'tk_1', platform: 'tiktok', username: 'test_user', status: 'pending' },
      ];

      return { data: mockAccounts, error: null };
    } catch (error) {
      console.error('Errore caricamento account Blotato:', error);
      return { data: null, error };
    }
  }

  // Pubblica post su piattaforme selezionate
  static async publishPost(postData: BlotatoPostRequest): Promise<BlotatoPostResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utente non autenticato');
      }

      console.log('🚀 Pubblicazione post via Blotato:', {
        platforms: postData.platforms,
        hasImages: postData.images?.length || 0,
        isScheduled: !!postData.scheduleFor
      });

      const response = await supabase.functions.invoke('blotato-publish', {
        body: {
          ...postData,
          user_id: user.id
        }
      });

      if (response.error) {
        console.error('❌ Errore Edge Function Blotato:', response.error);
        throw new Error(response.error.message || 'Errore durante la pubblicazione');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Errore sconosciuto durante la pubblicazione');
      }

      console.log('✅ Post pubblicato con successo!', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Errore pubblicazione Blotato:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }

  // Ottieni piattaforme supportate
  static getSupportedPlatforms() {
    return [
      { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-purple-500' },
      { id: 'facebook', name: 'Facebook', icon: '👥', color: 'from-blue-600 to-blue-700' },
      { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'from-gray-900 to-black' },
      { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-800' },
      { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-black to-red-600' },
      { id: 'youtube', name: 'YouTube', icon: '📺', color: 'from-red-600 to-red-700' },
      { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'from-red-500 to-pink-500' },
      { id: 'threads', name: 'Threads', icon: '🧵', color: 'from-gray-800 to-black' },
      { id: 'bluesky', name: 'Bluesky', icon: '☁️', color: 'from-sky-400 to-blue-500' }
    ];
  }

  // Scollega account
  static async disconnectAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Per ora simuliamo la disconnessione
      console.log('🔌 Disconnessione account:', accountId);
      return { success: true };
    } catch (error) {
      console.error('Errore disconnessione account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }
}