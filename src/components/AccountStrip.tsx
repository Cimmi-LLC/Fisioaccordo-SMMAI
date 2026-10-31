// Barra minima "Connesso come ... · Esci" per le schermate fuori dal layout
// principale (onboarding e wizard del template). Senza, chi si iscriveva con
// l'email sbagliata restava chiuso nell'onboarding: /auth lo rimandava li.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AccountStrip: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;
  return (
    <div className="w-full flex items-center justify-end gap-2 px-4 pt-3 text-[11px]" style={{ color: 'var(--ink3)' }}>
      <span className="truncate max-w-[60vw]">Connesso come <strong style={{ color: 'var(--ink2)' }}>{user.email}</strong></span>
      <span aria-hidden>·</span>
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          try { await signOut(); } finally { navigate('/auth', { replace: true }); }
        }}
        className="inline-flex items-center gap-1 font-bold underline disabled:opacity-50"
        style={{ color: 'var(--rosa)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {leaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
        Esci
      </button>
    </div>
  );
};

export default AccountStrip;
