import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LayoutGrid, BookImage, LogOut } from 'lucide-react';
import logo from '@/assets/logo-fisioaccordo.png';

const SelectionScreen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [brandChecked, setBrandChecked] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Brand check — redirect to onboarding if no brand profile
  useEffect(() => {
    if (!user) return;
    supabase.from('brands').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => {
        if (!count || count === 0) navigate('/onboarding');
        else setBrandChecked(true);
      });
  }, [user, navigate]);

  if (authLoading || (!brandChecked && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} />
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.user_metadata?.first_name || 'Utente';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          height: 58,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <img src={logo} alt="FisioAccordo PoliPartner Logo" className="h-9 w-auto" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Ciao, {firstName}</span>
          <button
            onClick={async () => { await signOut(); navigate('/auth'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ color: 'var(--ink3)', border: '1px solid var(--line)', background: 'transparent' }}
          >
            <LogOut className="h-3.5 w-3.5" /> Esci
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px 20px' }}>
        <div className="text-center" style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--ink)',
              letterSpacing: '-1px',
              marginBottom: 8,
            }}
          >
            Cosa vuoi generare oggi?
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink3)' }}>
            Scegli il tipo di contenuto che vuoi creare
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Post / Caroselli */}
          <button
            onClick={() => navigate('/posts')}
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--line)',
              borderRadius: 20,
              padding: '40px 24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--viola)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(85,70,151,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: 'var(--viola-dim)',
                margin: '0 auto 16px',
              }}
            >
              <LayoutGrid className="h-7 w-7" style={{ color: 'var(--viola)' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
              Post / Caroselli
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>
              Genera contenuti per feed Instagram, carousel, post singoli con AI
            </div>
          </button>

          {/* Storie */}
          <button
            onClick={() => navigate('/storie')}
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--line)',
              borderRadius: 20,
              padding: '40px 24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--rosa)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(230,0,126,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: 'rgba(230,0,126,0.08)',
                margin: '0 auto 16px',
              }}
            >
              <BookImage className="h-7 w-7" style={{ color: 'var(--rosa)' }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
              Storie
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>
              Genera storie Instagram con quiz, curiosità, consigli e molto altro
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionScreen;
