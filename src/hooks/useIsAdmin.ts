import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Legacy hardcoded fallback. Kept so the hook still gates correctly even if
 * the RPC is briefly unavailable (network blip, function being deployed).
 * Source of truth in production is the `public.is_admin()` RPC, backed by
 * the `user_roles` table.
 */
export const ADMIN_EMAILS = ['teamcimmi@gmail.com'];

const isHardcodedAdmin = (email: string | undefined | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

/**
 * Returns true when the current user has the `admin` role.
 *
 * Defense in depth:
 *   - This hook is used for route guards / menu visibility (cosmetic).
 *   - The real gate is server-side: every cross-customer SELECT is allowed
 *     only when the RLS policy evaluates `public.is_admin()` to true.
 *
 * Boot strategy: while the RPC is loading we trust the hardcoded email so
 * the admin UI doesn't flicker on first paint. Once the RPC responds we
 * trust IT (security wins over UX).
 */
export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  const [serverAdmin, setServerAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setServerAdmin(false); return; }
    (async () => {
      const { data, error } = await (supabase as any).rpc('is_admin');
      if (cancelled) return;
      if (error) {
        // Don't elevate on error — fall back to hardcoded list only.
        console.warn('[useIsAdmin] is_admin RPC failed:', error.message);
        setServerAdmin(null);
        return;
      }
      setServerAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (serverAdmin === null) return isHardcodedAdmin(user?.email);
  return serverAdmin;
};
