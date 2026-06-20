-- ================================================================
-- post_metrics — snapshot giornalieri delle performance social
--
-- 1 riga = 1 post in 1 giorno per 1 canale.
-- Aggregazione lato dashboard: SUM/AVG/LAST sul periodo richiesto.
--
-- Sorgenti (in ordine di disponibilità):
--   - Instagram: Meta Graph API /{ig-id}/insights + /{media-id}/insights
--     Edge function di sync giornaliera (fuori scope di questo PR).
--   - TikTok: TikTok Display API (NON ancora integrato → tab disabled in UI).
--   - YouTube: YouTube Data API v3 (NON ancora integrato → tab disabled in UI).
--
-- Scrittura: solo service_role (la edge fn di sync). Letture: owner + admin.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,

  channel text NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'youtube')),
  external_post_id text NOT NULL,
  published_post_id uuid REFERENCES public.published_posts(id) ON DELETE SET NULL,
  caption_excerpt text,

  snapshot_date date NOT NULL,

  -- Core metrics (some are null per channel — vedi mappa in docs)
  reach integer,
  impressions integer,
  engagement integer,
  likes integer,
  comments integer,
  saves integer,
  shares integer,
  video_views integer,
  video_completion_rate numeric(5, 4),     -- 0..1
  avg_view_sec integer,
  watch_minutes integer,

  -- Account-wide daily snapshot (denormalized for fast LAST-in-period queries)
  followers_total integer,
  new_followers integer,

  synced_at timestamptz NOT NULL DEFAULT now(),

  -- Idempotenza upsert: una sola riga per (post, giorno, canale)
  UNIQUE (external_post_id, snapshot_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_dashboard
  ON public.post_metrics (user_id, brand_id, channel, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_post_metrics_brand_period
  ON public.post_metrics (brand_id, channel, snapshot_date);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;

-- Owner reads own data. Admin reads ALL.
DROP POLICY IF EXISTS "post_metrics_select" ON public.post_metrics;
CREATE POLICY "post_metrics_select"
  ON public.post_metrics FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Nessuna INSERT/UPDATE/DELETE via client. La edge fn di sync usa service_role.

COMMENT ON TABLE public.post_metrics IS
  'Snapshot giornaliero delle metriche per ciascun post pubblicato. Scritto solo da edge fn (service_role). Letto da owner + admin.';
