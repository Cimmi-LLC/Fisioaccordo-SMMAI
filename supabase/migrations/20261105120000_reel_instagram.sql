-- ────────────────────────────────────────────────────────────────────
-- Reel Instagram: video caricato dall'utente, pubblicato subito o programmato.
--
-- Flusso (process-scheduled-posts, ogni 2 minuti):
--   scheduled  → crea il container su Instagram (media_type=REELS)  → processing
--   processing → stato del container FINISHED → media_publish         → published
-- Il video resta nel bucket privato reel-videos; Instagram lo scarica da un
-- URL firmato creato al momento.
-- ────────────────────────────────────────────────────────────────────

-- 1) published_posts: tipo «reel» e stato «processing»
ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_media_type_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_media_type_check
  CHECK (media_type IN ('post', 'story', 'reel'));

ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_status_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_status_check
  CHECK (status IN ('published', 'scheduled', 'processing', 'failed'));

ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS video_path TEXT,
  ADD COLUMN IF NOT EXISTS cover_path TEXT,
  ADD COLUMN IF NOT EXISTS thumb_offset_ms INTEGER,
  ADD COLUMN IF NOT EXISTS share_to_feed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ig_container_id TEXT,
  ADD COLUMN IF NOT EXISTS container_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_claimed_at TIMESTAMPTZ;

ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_reel_video_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_reel_video_check
  CHECK (media_type IS DISTINCT FROM 'reel' OR video_path IS NOT NULL);

ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_thumb_offset_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_thumb_offset_check
  CHECK (thumb_offset_ms IS NULL OR thumb_offset_ms >= 0);

-- Il cron cerca i reel in elaborazione a ogni giro.
CREATE INDEX IF NOT EXISTS idx_published_posts_processing
  ON public.published_posts (updated_at)
  WHERE status = 'processing';

-- 2) Annullare un post programmato o togliere un tentativo fallito.
-- Prima mancava la policy DELETE: il Calendario diceva «eliminato» ma la riga
-- restava. Quelli pubblicati o in elaborazione non si toccano.
DROP POLICY IF EXISTS "Users can delete their own scheduled or failed posts" ON public.published_posts;
CREATE POLICY "Users can delete their own scheduled or failed posts"
  ON public.published_posts
  FOR DELETE
  USING (auth.uid() = user_id AND status IN ('scheduled', 'failed'));

-- 3) Bucket privato per i video dei reel (e le copertine), 100 MB a file.
-- Il limite globale del progetto (Storage → Settings) deve essere almeno 100 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reel-videos', 'reel-videos', false, 104857600,
  ARRAY['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "reel_videos_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "reel_videos_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "reel_videos_delete_owner" ON storage.objects;

CREATE POLICY "reel_videos_select_owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "reel_videos_insert_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "reel_videos_delete_owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reel-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
