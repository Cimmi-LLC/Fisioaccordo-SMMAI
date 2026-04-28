-- Persistent history of generated story batches per brand
CREATE TABLE IF NOT EXISTS public.generated_story_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('topic','reviews','manual','file')),
  source_meta JSONB DEFAULT '{}'::jsonb,
  stories JSONB NOT NULL DEFAULT '[]'::jsonb,
  story_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_batches_user_date
  ON public.generated_story_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_batches_brand
  ON public.generated_story_batches (brand_id);

ALTER TABLE public.generated_story_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story batches: select own" ON public.generated_story_batches;
DROP POLICY IF EXISTS "story batches: insert own" ON public.generated_story_batches;
DROP POLICY IF EXISTS "story batches: delete own" ON public.generated_story_batches;

CREATE POLICY "story batches: select own" ON public.generated_story_batches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "story batches: insert own" ON public.generated_story_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story batches: delete own" ON public.generated_story_batches
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
