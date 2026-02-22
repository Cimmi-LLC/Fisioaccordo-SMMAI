import { supabase } from '@/integrations/supabase/client';

export interface MetaConnectionData {
  id: string;
  user_id: string;
  facebook_user_id: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_id: string | null;
  instagram_username: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MetaService {
  private static readonly META_APP_ID = '1261520952551293';
  private static readonly REDIRECT_URI = 'https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback';

  static initiateAuth(): void {
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish'
    ].join(',');

    // Instagram Business Login uses instagram.com OAuth, not facebook.com
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${this.META_APP_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&scope=${scopes}&response_type=code&state=meta_auth&enable_fb_login=0`;

    const popup = window.open(
      authUrl,
      'meta-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );

    if (!popup) {
      throw new Error('Popup bloccato dal browser. Abilita i popup per questo sito.');
    }

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.location.reload();
      }
    }, 1000);

    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
      }
    }, 300000);
  }

  static async exchangeCodeForToken(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Utente non autenticato');

      const response = await supabase.functions.invoke('meta-auth', {
        body: {
          code,
          redirect_uri: this.REDIRECT_URI,
          user_id: user.user.id
        }
      });

      if (response.error) throw new Error(response.error.message || 'Errore autenticazione Meta');
      if (!response.data?.success) throw new Error(response.data?.error || 'Errore sconosciuto');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }

  static async getConnections(): Promise<MetaConnectionData[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
      .from('meta_connections' as any)
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento connessioni Meta:', error);
      return [];
    }

    return (data || []) as unknown as MetaConnectionData[];
  }

  static async disconnect(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('meta_connections' as any)
      .update({ is_active: false } as any)
      .eq('id', connectionId);

    if (error) throw error;
  }

  static async isConnected(): Promise<boolean> {
    const connections = await this.getConnections();
    return connections.length > 0;
  }

  static async publishToFacebook(connectionId: string, content: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await supabase.functions.invoke('meta-publish', {
        body: {
          connection_id: connectionId,
          platform: 'facebook',
          content,
          image_url: imageUrl
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Errore pubblicazione');

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  }

  static async publishToInstagram(connectionId: string, caption: string, imageUrl: string, carouselUrls?: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await supabase.functions.invoke('meta-publish', {
        body: {
          connection_id: connectionId,
          platform: 'instagram',
          content: caption,
          image_url: imageUrl,
          carousel_urls: carouselUrls
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Errore pubblicazione');

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  }
}
