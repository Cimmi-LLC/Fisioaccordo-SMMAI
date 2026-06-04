-- Rate limiting table: every call to a rate-limited edge function inserts
-- a row. The function checks count of rows for (user_id, endpoint) within
-- the configured window and rejects with 429 when exceeded.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index optimized for the lookup pattern: WHERE user_id=? AND endpoint=? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.api_rate_limits (user_id, endpoint, created_at DESC);

-- RLS: service_role only (edge functions). Users never read/write directly.
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policy → no access for anon/authenticated. service_role bypasses RLS.

-- Daily cleanup: delete rows older than 7 days (we only need recent window)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-rate-limits')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-rate-limits',
  '17 3 * * *',  -- daily at 03:17 UTC
  $$DELETE FROM public.api_rate_limits WHERE created_at < NOW() - INTERVAL '7 days'$$
);

NOTIFY pgrst, 'reload schema';
