import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ConnectResult } from '@/services/metaService';

interface Props {
  result: ConnectResult;
  brandName: string | null;
  onClose: () => void;
}

/** Gli errori di Meta arrivano in inglese tecnico: i più comuni detti in chiaro. */
function explainError(error?: string): string {
  const e = error || '';
  if (/developer role|not.*tester|insufficient.*role/i.test(e)) {
    return "Questo profilo Instagram non è ancora abilitato sull'app. Da Instagram, entrato con quel profilo: Impostazioni → App e siti web → Inviti tester → Accetta, poi riprova.";
  }
  if (/code has been used|authorization code|expired/i.test(e)) {
    return 'Il collegamento è scaduto a metà strada. Riprova dal pulsante.';
  }
  if (/redirect_uri/i.test(e)) {
    return "Indirizzo di ritorno non accettato da Instagram: va controllata la configurazione dell'app.";
  }
  return e || 'Errore sconosciuto';
}

/** Barra in cima alla pagina al ritorno da Instagram: collegato o perché no. */
const InstagramConnectResult: React.FC<Props> = ({ result, brandName, onClose }) => {
  const ok = result.success;
  const color = ok ? '#16a34a' : '#dc2626';
  return (
    <div
      role="status"
      className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl"
      style={{
        backgroundColor: ok ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
        border: `1px solid ${color}55`,
      }}
    >
      {ok
        ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />
        : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />}
      <div className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>
        {ok ? (
          <>
            <span className="font-bold">Instagram collegato:</span>{' '}
            @{result.username || 'profilo'}{brandName ? <> è ora il profilo di <span className="font-bold">{brandName}</span>.</> : '.'}
          </>
        ) : (
          <>
            <span className="font-bold">Instagram non collegato.</span>{' '}
            {explainError(result.error)}
          </>
        )}
      </div>
      <button onClick={onClose} aria-label="Chiudi" className="shrink-0" style={{ color: 'var(--ink3)' }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default InstagramConnectResult;
