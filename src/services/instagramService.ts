
import { supabase } from '@/integrations/supabase/client';

export interface InstagramProfile {
  id: string;
  username: string;
  account_type: 'PERSONAL' | 'BUSINESS';
  media_count: number;
  followers_count?: number;
}

export class InstagramService {
  // App ID centralizzata per tutti gli utenti
  private static readonly INSTAGRAM_APP_ID = '578518187777036'; // App ID business centralizzata
  private static readonly REDIRECT_URI = window.location.origin + '/auth/instagram/callback';
  
  // Avvia il processo di autenticazione Instagram
  static initiateAuth(): void {
    // Scopes per Instagram Graph API (non Basic Display)
    const scopes = ['instagram_basic', 'pages_show_list'];
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&scope=${scopes.join(',')}&response_type=code&state=instagram_auth`;
    
    console.log('🚀 Avvio autenticazione Instagram Business con URL:', authUrl);
    console.log('📱 App ID centralizzata:', this.INSTAGRAM_APP_ID);
    console.log('🔄 Redirect URI:', this.REDIRECT_URI);
    
    // Apri una nuova finestra per l'autenticazione
    const popup = window.open(
      authUrl,
      'instagram-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );

    if (!popup) {
      throw new Error('Popup bloccato dal browser. Abilita i popup per questo sito.');
    }

    // Ascolta per il completamento dell'autenticazione
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Ricarica la pagina per aggiornare lo stato
        window.location.reload();
      }
    }, 1000);

    // Timeout di sicurezza
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
      }
    }, 300000); // 5 minuti timeout
  }

  // Scambia il codice di autorizzazione per un access token
  static async exchangeCodeForToken(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Scambio codice per token, codice ricevuto:', code?.substring(0, 10) + '...');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utente non autenticato');
      }

      const response = await supabase.functions.invoke('instagram-auth', {
        body: { 
          code, 
          redirect_uri: this.REDIRECT_URI,
          user_id: user.user.id 
        }
      });

      console.log('📡 Risposta Edge Function:', response);

      if (response.error) {
        console.error('❌ Errore Edge Function:', response.error);
        throw new Error(response.error.message || 'Errore durante l\'autenticazione');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Errore sconosciuto durante l\'autenticazione');
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

      // Instagram legacy - ritorna array vuoto dato che ora usiamo Blotato
      return { data: [], error: null };
    } catch (error) {
      console.error('Errore caricamento connessioni Instagram:', error);
      return { data: null, error };
    }
  }

  static async disconnectAccount(connectionId: string) {
    try {
      // Instagram legacy - ritorna successo dato che ora usiamo Blotato
      console.log('Instagram disconnection legacy method called for:', connectionId);
      return { error: null };
    } catch (error) {
      console.error('Errore disconnessione Instagram:', error);
      return { error };
    }
  }
}
