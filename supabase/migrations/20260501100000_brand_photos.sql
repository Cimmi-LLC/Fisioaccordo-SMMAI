-- Brand photo pool: photos uploaded by the user, used as a priority source
-- before falling back to Freepik stock when generating post/story images.

CREATE TABLE IF NOT EXISTS public.brand_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_photos_brand_id_idx ON public.brand_photos(brand_id);
CREATE INDEX IF NOT EXISTS brand_photos_user_id_idx ON public.brand_photos(user_id);

ALTER TABLE public.brand_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own brand photos" ON public.brand_photos;
CREATE POLICY "users select own brand photos"
  ON public.brand_photos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own brand photos" ON public.brand_photos;
CREATE POLICY "users insert own brand photos"
  ON public.brand_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own brand photos" ON public.brand_photos;
CREATE POLICY "users update own brand photos"
  ON public.brand_photos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own brand photos" ON public.brand_photos;
CREATE POLICY "users delete own brand photos"
  ON public.brand_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for brand photos (public read so generated posts/stories
-- using these URLs render everywhere; writes are RLS-controlled below).
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-photos', 'brand-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "brand_photos read public" ON storage.objects;
CREATE POLICY "brand_photos read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-photos');

DROP POLICY IF EXISTS "brand_photos write own folder" ON storage.objects;
CREATE POLICY "brand_photos write own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "brand_photos delete own folder" ON storage.objects;
CREATE POLICY "brand_photos delete own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
