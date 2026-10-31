import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { checkBrandGate } from '@/lib/brandGate';
import Sidebar from './Sidebar';
import OnboardingTour from './OnboardingTour';

const AppLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Brand check — redirect to onboarding only if the server says zero brands.
  // A server error is not "zero brands": retry, then show a message.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setServerDown(false);
    checkBrandGate((signal) =>
      supabase.from('brands').select('id', { count: 'exact', head: true }).eq('user_id', user.id).abortSignal(signal),
    ).then((gate) => {
      if (cancelled) return;
      if (gate === 'has') setReady(true);
      else if (gate === 'none') navigate('/onboarding');
      else setServerDown(true);
    });
    return () => { cancelled = true; };
  }, [user, navigate, attempt]);

  if (serverDown && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-sm text-center space-y-4">
          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Il server non risponde</p>
          <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.75 }}>
            I tuoi dati sono al sicuro: il problema è solo di collegamento. Riprova tra qualche secondo.
          </p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="px-5 py-2 rounded-lg font-semibold text-white"
            style={{ background: 'var(--rosa)' }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <main
        className="main-content"
        style={{ flex: 1, minHeight: '100vh' }}
      >
        <Outlet />
      </main>
      <OnboardingTour />
    </div>
  );
};

export default AppLayout;
