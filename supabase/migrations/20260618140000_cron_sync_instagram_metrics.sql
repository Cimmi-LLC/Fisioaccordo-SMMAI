-- ================================================================
-- Cron: daily 04:00 UTC → sync-instagram-metrics
--
-- The CRON_SECRET header is read by `requireCronSecret` in the edge fn.
-- We reuse the same secret as `process-scheduled-posts` (already in pg_cron
-- and in the edge fn `CRON_SECRET` env var). DO NOT change one without the
-- other.
-- ================================================================

-- idempotency: unschedule first if exists (older schedule may differ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-instagram-metrics') THEN
    PERFORM cron.unschedule('sync-instagram-metrics');
  END IF;
END
$$;

SELECT cron.schedule(
  'sync-instagram-metrics',
  '0 4 * * *',  -- 04:00 UTC every day
  $$
    SELECT net.http_post(
      url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/sync-instagram-metrics',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "b3ea42bcfe026c92dfa789d13402d2d6ab6c8aad9adcaacb4abe8ba6f9232d4b"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);
