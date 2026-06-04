import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetaService } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';

/**
 * OAuth callback for Instagram Business Login.
 *
 * Flow:
 *  - Popup: extract `code` → postMessage to opener → opener does the token
 *    exchange (it has the user session, the popup may not after the OAuth
 *    redirect through facebook.com/instagram.com).
 *  - No opener (direct nav): falls back to in-place exchange.
 */
const InstagramCallback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorReason = urlParams.get('error_reason');

      console.log('[InstagramCallback] code:', !!code, 'error:', error, 'reason:', errorReason);

      // ── Error path ──
      if (error) {
        if (window.opener) {
          window.opener.postMessage({
            type: 'meta-auth-error',
            error: errorReason || error,
          }, window.location.origin);
          setTimeout(() => window.close(), 1500);
        } else {
          toast({ title: '❌ Errore Autenticazione', description: error, variant: 'destructive' });
          navigate('/');
        }
        return;
      }

      // ── Success path ──
      if (!code) {
        toast({ title: '❌ Codice mancante', variant: 'destructive' });
        if (window.opener) setTimeout(() => window.close(), 1500);
        else navigate('/');
        return;
      }

      // POPUP: send code to opener (which has the session), then close
      if (window.opener && !window.opener.closed) {
        console.log('[InstagramCallback] sending code to opener');
        window.opener.postMessage({
          type: 'meta-auth-code',
          code,
        }, window.location.origin);
        setTimeout(() => window.close(), 600);
        return;
      }

      // DIRECT NAV (no popup): do the exchange in-place (legacy fallback)
      console.log('[InstagramCallback] no opener, in-place exchange');
      const result = await MetaService.exchangeCodeForToken(code);
      if (result.success) {
        toast({ title: '🎉 Instagram Collegato!' });
        navigate('/settings');
      } else {
        toast({
          title: '❌ Errore Collegamento',
          description: result.error || 'Errore sconosciuto',
          variant: 'destructive',
        });
        navigate('/settings');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--rosa)' }}></div>
        <p style={{ color: 'var(--ink)' }}>Elaborazione autenticazione Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallback;
