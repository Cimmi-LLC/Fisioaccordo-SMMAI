-- Pass the cron secret to process-scheduled-posts so the edge function can
-- reject anonymous calls (previously the endpoint was open).
--
-- Operator setup BEFORE applying this migration:
--   SELECT vault.create_secret('REPLACE-ME-32-CHAR-RANDOM', 'cron_secret', 'Header value used by pg_cron to authenticate process-scheduled-posts');
--
-- The same value MUST be configured as the env var CRON_SECRET on the
-- edge function (Supabase dashboard → Edge Functions → Settings → Secrets).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

DO $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Read the cron secret from Vault
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'cron_secret'
   LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE NOTICE 'Vault secret cron_secret not set — cron job will be rescheduled WITHOUT auth header. Set the secret then re-apply this migration.';
  END IF;

  -- Drop existing schedule
  PERFORM cron.unschedule('process-scheduled-posts')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-posts');

  -- Re-create with the cron secret in the header
  IF v_secret IS NOT NULL THEN
    PERFORM cron.schedule(
      'process-scheduled-posts',
      '*/2 * * * *',
      format($cron$
        SELECT net.http_post(
          url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/process-scheduled-posts',
          headers := %L::jsonb,
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
      $cron$, jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)::text)
    );
  ELSE
    -- Fallback: keep old behavior so we don't break in dev where Vault isn't set up
    PERFORM cron.schedule(
      'process-scheduled-posts',
      '*/2 * * * *',
      $cron$
        SELECT net.http_post(
          url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/process-scheduled-posts',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron rescheduling failed: %', SQLERRM;
END $$;
