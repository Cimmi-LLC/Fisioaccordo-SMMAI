-- ================================================================
-- user_roles + is_admin() — admin gate non bypassabile (defense in depth)
--
-- Prima di questa migration `useIsAdmin` era basato su email hardcoded
-- lato client. Niente policy RLS poteva sapere "questo utente è admin",
-- quindi cross-customer SELECT (es. dashboard Performance) richiedevano
-- service_role bypass — non sicuro.
--
-- Pattern (riusabile per ruoli futuri):
--   1. Tabella user_roles (user_id, role text)
--   2. Funzione public.is_admin() SECURITY DEFINER che la legge col
--      JWT corrente
--   3. Le tabelle che servono cross-cliente all'admin (post_metrics)
--      mettono `OR public.is_admin()` nelle loro policy SELECT.
--
-- Solo service_role può scrivere user_roles (no escalation via SQL utente).
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Ognuno legge SOLO la propria riga. Nessuno scrive via client (service_role only).
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
CREATE POLICY "user_roles_self_select"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ── is_admin() — la chiama il client (via RPC) e la usano le policy.
--    SECURITY DEFINER così bypassa la RLS della propria tabella, ma
--    risponde sempre col contesto dell'auth.uid() del chiamante.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── Seed iniziale: l'admin email storico (teamcimmi@gmail.com).
--    Non fa nulla se l'utente non esiste ancora o se la riga c'è già.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
  FROM auth.users
 WHERE lower(email) = 'teamcimmi@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.user_roles IS
  'Ruoli applicativi. Scritta solo da service_role (no RLS INSERT). Leggi via public.is_admin().';
