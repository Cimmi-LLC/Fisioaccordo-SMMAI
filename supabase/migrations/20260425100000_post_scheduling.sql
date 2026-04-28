-- ────────────────────────────────────────────────────────────────────
-- Scheduling infrastructure for posts to Instagram via Meta Graph API
-- ────────────────────────────────────────────────────────────────────

-- 1) Estendi published_posts con i campi necessari per lo scheduling
ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[],
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hashtags TEXT,
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_published_posts_scheduled_lookup
  ON public.published_posts (status, scheduled_for)
  WHERE status = 'scheduled';

-- 2) Estensioni necessarie per il cron HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Schedule del worker (ogni 2 minuti)
-- Nota: l'edge function process-scheduled-posts è --no-verify-jwt e usa SERVICE_ROLE
-- internamente. Il cron la chiama senza Authorization header.
DO $$
BEGIN
  -- Drop previous schedule if exists (idempotent)
  PERFORM cron.unschedule('process-scheduled-posts')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-posts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-scheduled-posts',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/process-scheduled-posts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
