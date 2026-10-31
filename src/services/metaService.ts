import { supabase } from '@/integrations/supabase/client';

export interface MetaConnectionData {
  id: string;
  user_id: string;
  brand_id: string | null;
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

export interface ConnectResult {
  success: boolean;
  brandId?: string | null;
  username?: string | null;
  error?: string;
}

export class MetaService {
  // Public OAuth App ID — not secret, but read from env for consistency with backend.
  // Falls back to the legacy literal so existing deployments don't break before .env is set.
  private static readonly META_APP_ID = import.meta.env.VITE_META_APP_ID || '1685995206180695';
  private static readonly REDIRECT_URI = import.meta.env.VITE_META_REDIRECT_URI
    || 'https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback';

  /**
   * Flusso OAuth via popup. Disattivato: il redirect nella stessa scheda e
   * piu affidabile (niente popup bloccati, funziona su mobile). Il codice
   * del popup resta per poterci tornare cambiando questa costante.
   */
  private static readonly USE_POPUP_AUTH = false;

  /** Brand e pagina di ritorno del collegamento in corso (sopravvivono al redirect). */
  private static readonly PENDING_KEY = 'fisioaccordo:ig_connect';
  /** Esito dell'ultimo collegamento, mostrato dalla pagina a cui si torna. */
  private static readonly RESULT_KEY = 'fisioaccordo:ig_connect_result';

  /**
   * Collega un profilo Instagram al brand indicato (ogni brand ha il suo).
   * Senza brand, il server usa il brand attivo dell'utente.
   */
  static initiateAuth(brandId?: string | null): void {
    try {
      sessionStorage.setItem(MetaService.PENDING_KEY, JSON.stringify({
        brandId: brandId || null,
        returnTo: window.location.pathname,
      }));
    } catch { /* storage bloccato: si torna alle impostazioni sul brand attivo */ }

    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
      // Statistiche dei post (copertura, visualizzazioni, salvataggi) per
      // sync-instagram-metrics: senza, dalla sync arrivano solo i follower.
      'instagram_business_manage_insights'
    ].join(',');

    // Si collega il profilo aperto in quel momento su instagram.com. Niente
    // force_reauth: rifare il login fa scattare i controlli di sicurezza di
    // Instagram (reCAPTCHA) e dopo il login Instagram resta sulla sua home
    // invece di tornare all'app.
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${this.META_APP_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&scope=${scopes}&response_type=code&state=meta_auth&enable_fb_login=0`;

    // Redirect nella stessa scheda invece del popup: i browser mobile e i
    // blocchi popup rendevano il flusso inaffidabile. Al ritorno la pagina
    // /auth/instagram/callback non trova un opener e fa lo scambio del
    // codice in-place (vedi InstagramCallback).
    if (!MetaService.USE_POPUP_AUTH) {
      window.location.href = authUrl;
      return;
    }

    const popup = window.open(
      authUrl,
      'meta-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );
    if (!popup) {
      throw new Error('Popup bloccato dal browser. Abilita i popup per questo sito.');
    }

    let exchangeInProgress = false;

    const messageHandler = async (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data?.type) return;

      // POPUP forwarded the OAuth code → we do the exchange here (we have the session)
      if (data.type === 'meta-auth-code' && data.code && !exchangeInProgress) {
        exchangeInProgress = true;
        console.log('[MetaService] received code from popup, exchanging...');
        const result = await MetaService.exchangeCodeForToken(data.code, MetaService.takePendingConnect().brandId);
        cleanup();
        MetaService.saveConnectResult(result);
        if (result.success) {
          // soft success — reload to refresh connection state in UI
          window.dispatchEvent(new CustomEvent('meta-auth-completed', { detail: { success: true } }));
          window.location.reload();
        } else {
          window.dispatchEvent(new CustomEvent('meta-auth-completed', {
            detail: { success: false, error: result.error },
          }));
          alert('Errore collegamento Instagram: ' + (result.error || 'sconosciuto'));
        }
        return;
      }

      // Errors directly from popup
      if (data.type === 'meta-auth-error') {
        cleanup();
        alert('Autenticazione Instagram annullata o fallita: ' + (data.error || ''));
      }
    };

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        // If popup closed without sending us a code AND no exchange running → user cancelled
        if (!exchangeInProgress) cleanup();
      }
    }, 800);

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      clearInterval(checkClosed);
      try { if (!popup.closed) popup.close(); } catch { /* ignore */ }
    };

    window.addEventListener('message', messageHandler);

    // Safety timeout 5 min
    setTimeout(() => { cleanup(); }, 300000);
  }

  /** Legge e cancella il collegamento in corso salvato da initiateAuth. */
  static takePendingConnect(): { brandId: string | null; returnTo: string | null } {
    try {
      const raw = sessionStorage.getItem(MetaService.PENDING_KEY);
      sessionStorage.removeItem(MetaService.PENDING_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return { brandId: parsed?.brandId ?? null, returnTo: parsed?.returnTo ?? null };
    } catch {
      return { brandId: null, returnTo: null };
    }
  }

  static saveConnectResult(result: ConnectResult): void {
    try { sessionStorage.setItem(MetaService.RESULT_KEY, JSON.stringify(result)); } catch { /* solo il toast */ }
  }

  /** Esito del collegamento appena tornato da Instagram (senza cancellarlo). */
  static peekConnectResult(): ConnectResult | null {
    try {
      const raw = sessionStorage.getItem(MetaService.RESULT_KEY);
      return raw ? JSON.parse(raw) as ConnectResult : null;
    } catch {
      return null;
    }
  }

  /** Va chiamato dopo averlo mostrato: l'esito si vede una volta sola. */
  static clearConnectResult(): void {
    try { sessionStorage.removeItem(MetaService.RESULT_KEY); } catch { /* niente da fare */ }
  }

  static async exchangeCodeForToken(
    code: string,
    brandId?: string | null,
  ): Promise<ConnectResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Utente non autenticato');

      console.log('[MetaService] Invocazione meta-auth con codice...');
      const response = await supabase.functions.invoke('meta-auth', {
        body: {
          code,
          redirect_uri: this.REDIRECT_URI,
          brand_id: brandId || undefined,
          // user_id is determined server-side from JWT — not sent by client
        }
      });

      console.log('[MetaService] Risposta:', { data: response.data, error: response.error?.message });

      // Check data.error first (Supabase SDK puts real error in data when status is non-2xx)
      if (response.data?.success) {
        return {
          success: true,
          brandId: response.data.brand_id ?? brandId ?? null,
          username: response.data.instagram_username ?? null,
        };
      }
      if (response.data?.error) throw new Error(response.data.error);
      if (response.error) throw new Error(response.error.message || 'Errore autenticazione Meta');
      
      throw new Error('Risposta non valida dal server');
    } catch (error) {
      console.error('[MetaService] Errore exchangeCodeForToken:', error);
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

    // Filter out expired tokens client-side
    const now = new Date().toISOString();
    const validConnections = (data || []).filter((conn: any) => {
      if (!conn.token_expires_at) return true;
      return conn.token_expires_at > now;
    });

    return validConnections as unknown as MetaConnectionData[];
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

      if (response.error) {
        const realError = response.data?.error || response.error.message;
        throw new Error(realError);
      }
      if (!response.data?.success) throw new Error(response.data?.error || 'Errore pubblicazione');

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  }

  /**
   * Immediate publish to Instagram.
   * Prefer the new {bucket, paths} shape (signed URLs minted server-side
   * at publish time, never leaked to the client). The legacy URL shape is
   * still accepted by the edge function for backward compat.
   */
  static async publishToInstagram(
    connectionId: string,
    caption: string,
    imageUrlOrPath: string,
    carouselUrlsOrPaths?: string[],
    options?: { bucket?: string; isPath?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isPath = options?.isPath ?? false;
      const bucket = options?.bucket || 'carousel-images';
      console.log('[MetaService] publishToInstagram:', { connectionId, isPath, bucket, carouselCount: carouselUrlsOrPaths?.length });
      const response = await supabase.functions.invoke('meta-publish', {
        body: {
          connection_id: connectionId,
          platform: 'instagram',
          content: caption,
          // new shape
          image_path: isPath && !carouselUrlsOrPaths?.length ? imageUrlOrPath : undefined,
          image_paths: isPath && carouselUrlsOrPaths?.length ? carouselUrlsOrPaths : undefined,
          image_bucket: isPath ? bucket : undefined,
          // legacy shape (kept for callers that still pass full URLs)
          image_url: isPath ? undefined : imageUrlOrPath,
          carousel_urls: isPath ? undefined : carouselUrlsOrPaths,
        }
      });

      console.log('[MetaService] publishToInstagram response:', { data: response.data, error: response.error?.message });

      if (response.error) {
        const realError = response.data?.error || response.error.message;
        throw new Error(realError);
      }
      if (!response.data?.success) throw new Error(response.data?.error || 'Errore pubblicazione');

      return { success: true };
    } catch (error) {
      console.error('[MetaService] publishToInstagram error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  }
}
