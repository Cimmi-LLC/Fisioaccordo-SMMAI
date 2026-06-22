-- ================================================================
-- Cron: sync-instagram-metrics-apify — weekly Sunday 04:30 UTC
-- (30 min after the daily Meta sync so we don't fight for compute)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-instagram-metrics-apify') THEN
    PERFORM cron.unschedule('sync-instagram-metrics-apify');
  END IF;
END
$$;

SELECT cron.schedule(
  'sync-instagram-metrics-apify',
  '30 4 * * 0',  -- Sunday 04:30 UTC
  $$
    SELECT net.http_post(
      url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/sync-instagram-metrics-apify',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "b3ea42bcfe026c92dfa789d13402d2d6ab6c8aad9adcaacb4abe8ba6f9232d4b"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);
