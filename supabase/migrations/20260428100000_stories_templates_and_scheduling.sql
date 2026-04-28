-- ────────────────────────────────────────────────────────────────────
-- Stories: persistent templates per brand + schedule stories on Instagram
-- ────────────────────────────────────────────────────────────────────

-- 1) Brand: array of saved story templates (URL)
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS story_templates TEXT[] DEFAULT '{}'::TEXT[];

-- 2) published_posts: differentiate post vs story
ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'post';

-- Add check constraint only if it doesn't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'published_posts_media_type_check'
  ) THEN
    ALTER TABLE public.published_posts
      ADD CONSTRAINT published_posts_media_type_check
      CHECK (media_type IN ('post','story'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_published_posts_media_type
  ON public.published_posts (media_type);

-- 3) Storage bucket for story templates (public read, owner write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-templates', 'story-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: any authenticated user can upload/read/delete in their own folder
DROP POLICY IF EXISTS "story templates: read public" ON storage.objects;
DROP POLICY IF EXISTS "story templates: insert own" ON storage.objects;
DROP POLICY IF EXISTS "story templates: delete own" ON storage.objects;

CREATE POLICY "story templates: read public" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-templates');

CREATE POLICY "story templates: insert own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'story-templates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "story templates: delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'story-templates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

NOTIFY pgrst, 'reload schema';
