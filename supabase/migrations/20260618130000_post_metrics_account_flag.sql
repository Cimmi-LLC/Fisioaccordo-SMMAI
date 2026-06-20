-- ================================================================
-- post_metrics: distinguish account-level snapshots from per-post rows.
--
-- Why:
--   - Account-level metrics (follower_count, profile_views, account reach)
--     have no `external_post_id`, but the table requires it (NOT NULL).
--   - We use a placeholder like 'ig_account' for those rows and a boolean
--     flag so the dashboard can SUM post metrics without double-counting.
--
-- Follower growth chart now works on any day (sync writes 1 account row
-- per day even if no posts were published).
-- ================================================================

ALTER TABLE public.post_metrics
  ADD COLUMN IF NOT EXISTS is_account_level boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_post_metrics_account_level
  ON public.post_metrics (brand_id, channel, is_account_level, snapshot_date DESC);
