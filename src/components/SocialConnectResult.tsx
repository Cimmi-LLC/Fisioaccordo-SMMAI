import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { SocialConnectResult as Result } from '@/services/socialService';
import { PLATFORM_LABEL, explainSocialError } from '@/lib/social/socialCore';

interface Props {
  result: Result;
  brandName: string | null;
  onClose: () => void;
}

/** Barra in cima alla pagina al ritorno da TikTok/Google: collegato o perché no. */
const SocialConnectResult: React.FC<Props> = ({ result, brandName, onClose }) => {
  const ok = result.success;
  const color = ok ? '#16a34a' : '#dc2626';
  const label = PLATFORM_LABEL[result.platform];
  return (
    <div
      role="status"
      className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl"
      style={{ backgroundColor: ok ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${color}55` }}
    >
      {ok
        ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />
        : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color }} />}
      <div className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>
        {ok ? (
          <>
            <span className="font-bold">{label} collegato:</span> {result.name || 'account'}
            {brandName ? <> ora pubblica per <span className="font-bold">{brandName}</span>.</> : '.'}
          </>
        ) : (
          <>
            <span className="font-bold">{label} non collegato.</span> {explainSocialError(result.platform, result.error)}
          </>
        )}
      </div>
      <button onClick={onClose} aria-label="Chiudi" className="shrink-0" style={{ color: 'var(--ink3)' }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SocialConnectResult;
