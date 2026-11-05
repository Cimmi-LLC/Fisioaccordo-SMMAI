-- ────────────────────────────────────────────────────────────────────
-- Reel Instagram: video caricato dall'utente, pubblicato subito o programmato.
--
-- Flusso (process-scheduled-posts, ogni 2 minuti):
--   scheduled  → crea il container su Instagram (media_type=REELS)  → processing
--   processing → stato del container FINISHED → media_publish         → published
-- Il video sta nel bucket privato social-video (lo stesso di TikTok e
-- YouTube); Instagram lo scarica da un URL firmato creato al momento.
-- Va applicata DOPO 20261103120000_tiktok_youtube.
-- ────────────────────────────────────────────────────────────────────

-- 1) published_posts: tipo «reel» (accanto a «video» di TikTok/YouTube) e
-- stato «processing»
ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_media_type_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_media_type_check
  CHECK (media_type IN ('post', 'story', 'reel', 'video'));

ALTER TABLE public.published_posts
  DROP CONSTRAINT IF EXISTS published_posts_status_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_status_check
  CHECK (status IN ('published', 'scheduled', 'processing', 'failed'));

ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS video_path TEXT,
  ADD COLUMN IF NOT EXISTS video_bucket TEXT,
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

-- 2) Annullare un post programmato o togliere un tentativo fallito.
-- Prima mancava la policy DELETE: il Calendario diceva «eliminato» ma la riga
-- restava. Quelli pubblicati o in elaborazione non si toccano.
DROP POLICY IF EXISTS "Users can delete their own scheduled or failed posts" ON public.published_posts;
CREATE POLICY "Users can delete their own scheduled or failed posts"
  ON public.published_posts
  FOR DELETE
  USING (auth.uid() = user_id AND status IN ('scheduled', 'failed'));

-- 3) Il video sta nel bucket social-video della migrazione TikTok/YouTube
-- (20261103120000): un caricamento solo per Reel, Shorts e TikTok.
-- Il limite globale del progetto (Storage → Settings) deve essere almeno 100 MB.
-- La copertina del Reel (facoltativa) va nella stessa cartella privata:
-- il bucket accetta anche JPG e PNG.
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
  WHERE id = 'social-video';

NOTIFY pgrst, 'reload schema';
