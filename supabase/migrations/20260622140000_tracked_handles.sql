-- ================================================================
-- tracked_handles — IG accounts che l'admin vuole monitorare ANCHE
-- senza che ci sia un brand/utente registrato sulla piattaforma.
--
-- Usato per: competitor watch, clienti potenziali, account di
-- riferimento. Sono SOLO admin-scoped: nessun cliente li vede.
--
-- post_metrics.tracked_handle_id riferisce qui quando le metriche
-- non appartengono a un brand. (brand_id e tracked_handle_id sono
-- mutually exclusive: una riga ha l'uno o l'altro, mai entrambi.)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tracked_handles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  label text,
  channel text NOT NULL DEFAULT 'instagram' CHECK (channel IN ('instagram', 'tiktok', 'youtube')),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username, channel)
);

ALTER TABLE public.tracked_handles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tracked handles (CRUD).
DROP POLICY IF EXISTS "tracked_handles_admin_all" ON public.tracked_handles;
CREATE POLICY "tracked_handles_admin_all"
  ON public.tracked_handles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── post_metrics: link to tracked_handles when brand_id is null
ALTER TABLE public.post_metrics
  ADD COLUMN IF NOT EXISTS tracked_handle_id uuid REFERENCES public.tracked_handles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_metrics_tracked
  ON public.post_metrics (tracked_handle_id, snapshot_date DESC)
  WHERE tracked_handle_id IS NOT NULL;
