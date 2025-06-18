import { supabase } from '@/integrations/supabase/client';

export interface InstagramProfile {
  id: string;
  username: string;
  account_type: 'PERSONAL' | 'BUSINESS';
  media_count: number;
  followers_count?: number;
}

export class InstagramService {
  private static readonly INSTAGRAM_APP_ID = '1075498781152908'; // Nuovo App ID
  private static readonly REDIRECT_URI = window.location.origin + '/auth/instagram/callback';
  
  // Avvia il processo di autenticazione Instagram
  static initiateAuth(): void {
    const scopes = ['user_profile', 'user_media'];
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${this.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&scope=${scopes.join(',')}&response_type=code`;
    
    console.log('🚀 Avvio autenticazione Instagram con URL:', authUrl);
    console.log('📱 App ID utilizzato:', this.INSTAGRAM_APP_ID);
    console.log('🔄 Redirect URI:', this.REDIRECT_URI);
    
    // Apri una nuova finestra per l'autenticazione
    const popup = window.open(
      authUrl,
      'instagram-auth',
      'width=600,height=600,scrollbars=yes,resizable=yes'
    );

    // Ascolta per il completamento dell'autenticazione
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // Ricarica la pagina per aggiornare lo stato
        window.location.reload();
      }
    }, 1000);
  }

  // Scambia il codice di autorizzazione per un access token
  static async exchangeCodeForToken(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Scambio codice per token, codice ricevuto:', code);
      
      // Questo dovrebbe essere fatto tramite un Edge Function per sicurezza
      const response = await supabase.functions.invoke('instagram-auth', {
        body: { code, redirect_uri: this.REDIRECT_URI }
      });

      console.log('📡 Risposta Edge Function:', response);

      if (response.error) {
        console.error('❌ Errore Edge Function:', response.error);
        throw new Error(response.error.message);
      }

      console.log('✅ Token scambiato con successo!');
      return { success: true };
    } catch (error) {
      console.error('❌ Errore scambio token Instagram:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }

  // Ottieni le connessioni Instagram dell'utente
  static async getUserConnections() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'Utente non autenticato' } };
      }

      const { data, error } = await supabase.rpc('get_user_instagram_connections', {
        p_user_id: user.id
      });

      return { data, error };
    } catch (error) {
      console.error('Errore caricamento connessioni Instagram:', error);
      return { data: null, error };
    }
  }

  static async disconnectAccount(connectionId: string) {
    try {
      const { error } = await supabase
        .from('instagram_connections')
        .update({ is_active: false })
        .eq('id', connectionId);

      return { error };
    } catch (error) {
      console.error('Errore disconnessione Instagram:', error);
      return { error };
    }
  }
}
