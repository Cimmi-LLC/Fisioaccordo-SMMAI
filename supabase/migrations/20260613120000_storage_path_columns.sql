-- ================================================================
-- Step 3b/3d — Aggiunta colonne {bucket, path} alle tabelle che persistono
-- riferimenti a oggetti Storage.
--
-- Regola applicativa (vedi docs/storage-usage-map.md):
--   In DB salviamo solo {bucket, path}. Le URL pubbliche (legacy `*_url`)
--   restano nelle vecchie colonne per backward-compat e sono lasciate NULL
--   per i nuovi record. Le signed URL si generano on-demand.
--
-- Tabelle toccate:
--   published_posts        → image_paths text[], image_bucket text
--   carousel_image_logs    → storage_path text, storage_bucket text
--   canva_templates        → storage_path text  (per i template che usano user-photos)
--
-- Tutto IF NOT EXISTS — idempotente. Tabelle hanno 0 record live, niente
-- backfill da fare.
-- ================================================================

ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS image_paths TEXT[],
  ADD COLUMN IF NOT EXISTS image_bucket TEXT;

COMMENT ON COLUMN public.published_posts.image_paths IS
  'Relative storage paths for the post media. Signed URLs are minted at publish time inside meta-publish/process-scheduled-posts. Legacy image_urls is kept NULL for new rows.';

ALTER TABLE public.carousel_image_logs
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

ALTER TABLE public.canva_templates
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- (No new columns on brand_photos: storage_path already exists.)
