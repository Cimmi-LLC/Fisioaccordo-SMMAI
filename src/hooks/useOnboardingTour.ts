import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LS_KEY_PREFIX = 'fisioaccordo:tour_completed:';

/**
 * Manages the first-time guided tour. Auto-starts ONCE per user after
 * they're authenticated. Persisted via localStorage so it doesn't
 * re-trigger on every login. User can replay via `restart()` from Settings.
 */
export const useOnboardingTour = () => {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const userKey = user?.id ? LS_KEY_PREFIX + user.id : null;

  // Auto-start on first login (only when key NOT present)
  useEffect(() => {
    if (!userKey) return;
    const completed = localStorage.getItem(userKey);
    if (!completed) {
      // small delay so the main UI is mounted and selectors exist
      const t = setTimeout(() => setRunning(true), 800);
      return () => clearTimeout(t);
    }
  }, [userKey]);

  const markCompleted = useCallback(() => {
    if (userKey) localStorage.setItem(userKey, '1');
    setRunning(false);
  }, [userKey]);

  const restart = useCallback(() => {
    if (userKey) localStorage.removeItem(userKey);
    setRunning(true);
  }, [userKey]);

  const stop = useCallback(() => setRunning(false), []);

  return { running, markCompleted, restart, stop };
};
