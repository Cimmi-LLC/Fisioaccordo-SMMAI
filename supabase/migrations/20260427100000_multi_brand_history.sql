-- ──────────────────────────────────────────────────────────────────────
-- Multi-brand support (admin) + generation history (all users)
-- ──────────────────────────────────────────────────────────────────────

-- 1) Allow multiple brands per user (drop UNIQUE on user_id)
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_user_id_key;
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON public.brands (user_id);

-- 2) user_settings: persistent active brand selection
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own settings select" ON public.user_settings;
DROP POLICY IF EXISTS "users own settings upsert" ON public.user_settings;
DROP POLICY IF EXISTS "users own settings update" ON public.user_settings;

CREATE POLICY "users own settings select" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users own settings upsert" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own settings update" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 3) generation_history: log of every AI generation
CREATE TABLE IF NOT EXISTS public.generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN
    ('post','carousel','story','reel','competitor','viral_analysis','image_swap','expand_topic')
  ),
  topic TEXT,
  title TEXT,
  preview JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user_date ON public.generation_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_brand ON public.generation_history (brand_id);
CREATE INDEX IF NOT EXISTS idx_history_type ON public.generation_history (generation_type);

ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own history" ON public.generation_history;
DROP POLICY IF EXISTS "users delete own history" ON public.generation_history;

-- SELECT: users see only their own history
CREATE POLICY "users see own history" ON public.generation_history
  FOR SELECT USING (auth.uid() = user_id);

-- DELETE: users can clear their own history
CREATE POLICY "users delete own history" ON public.generation_history
  FOR DELETE USING (auth.uid() = user_id);

-- INSERT: only via service_role (edge functions). No client policy → blocked.

NOTIFY pgrst, 'reload schema';
