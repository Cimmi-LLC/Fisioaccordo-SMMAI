import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';

const AppLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Brand check — redirect to onboarding only if user has zero brands
  useEffect(() => {
    if (!user) return;
    supabase.from('brands').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => {
        if (!count || count === 0) navigate('/onboarding');
        else setReady(true);
      });
  }, [user, navigate]);

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
      <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
