import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SocialService } from '@/services/socialService';
import { isSocialPlatform, PLATFORM_LABEL } from '@/lib/social/socialCore';

/**
 * Ritorno da TikTok o Google dopo il consenso. Salva il collegamento sul
 * brand che aveva cliccato «Collega» e torna alla pagina di partenza, che
 * mostra l'esito in una barra verde (o rossa con il motivo in chiaro).
 */
const SocialCallback: React.FC = () => {
  const navigate = useNavigate();
  const { platform } = useParams();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      if (!isSocialPlatform(platform)) {
        navigate('/settings', { replace: true });
        return;
      }
      const q = new URLSearchParams(window.location.search);
      const error = q.get('error');
      const code = q.get('code');
      const state = q.get('state');
      if (error || !code || !state) {
        SocialService.saveConnectResult({ success: false, platform, error: q.get('error_description') || error || 'access_denied' });
        navigate('/settings', { replace: true });
        return;
      }
      const { result, returnTo } = await SocialService.finishConnect(platform, code, state);
      SocialService.saveConnectResult(result);
      navigate(returnTo, { replace: true });
    })();
  }, [navigate, platform]);

  const label = isSocialPlatform(platform) ? PLATFORM_LABEL[platform] : 'account';
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--rosa)' }} />
        <p style={{ color: 'var(--ink)' }}>Sto collegando {label}…</p>
      </div>
    </div>
  );
};

export default SocialCallback;
