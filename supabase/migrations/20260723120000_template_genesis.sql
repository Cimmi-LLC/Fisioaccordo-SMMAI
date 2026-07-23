-- ================================================================
-- Template Genesis: generazione automatica del template visivo dei
-- caroselli a partire dai materiali di brand.
--
-- Flusso: brand_sources (logo + post esistenti) → art director AI
-- sceglie archetipo + genoma → NB2 genera 9 template_candidates
-- (3 ruoli × 3 varianti) → l'utente approva 1 per ruolo →
-- template_variants (reference IMMUTABILE della pipeline caroselli).
--
-- Pattern del progetto: RLS `auth.uid() = user_id OR public.is_admin()`,
-- storage con path folder-owner ({user_id}/... primo segmento),
-- DB salva solo {bucket, path}, signed URL on demand.
-- ================================================================

-- ── brands: genoma + stato genesis ──────────────────────────────
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS genome jsonb,
  ADD COLUMN IF NOT EXISTS genesis_status text NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_genesis_status_check'
  ) THEN
    ALTER TABLE public.brands ADD CONSTRAINT brands_genesis_status_check
      CHECK (genesis_status IN (
        'draft','sources_uploaded','analyzing','generating',
        'awaiting_approval','locked','failed'
      ));
  END IF;
END $$;

-- ── brand_sources: materiali caricati dal cliente ───────────────
CREATE TABLE IF NOT EXISTS public.brand_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('logo','post','website_shot','brand_pdf')),
  storage_bucket text NOT NULL DEFAULT 'brand-assets',
  storage_path text NOT NULL,
  extracted jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_sources_brand ON public.brand_sources (brand_id);
-- massimo 1 logo per brand
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_sources_logo
  ON public.brand_sources (brand_id) WHERE kind = 'logo';

ALTER TABLE public.brand_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_sources_select" ON public.brand_sources;
CREATE POLICY "brand_sources_select" ON public.brand_sources
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "brand_sources_insert" ON public.brand_sources;
CREATE POLICY "brand_sources_insert" ON public.brand_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "brand_sources_delete" ON public.brand_sources;
CREATE POLICY "brand_sources_delete" ON public.brand_sources
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ── template_candidates: i 9 candidati generati da NB2 ──────────
CREATE TABLE IF NOT EXISTS public.template_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  genome_version int NOT NULL DEFAULT 1,
  slide_role text NOT NULL CHECK (slide_role IN ('cover','content','cta')),
  variant_index int NOT NULL CHECK (variant_index BETWEEN 1 AND 3),
  genome jsonb NOT NULL,
  genesis_prompt text NOT NULL,
  storage_bucket text,
  storage_path text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','done','failed','approved','rejected')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, genome_version, slide_role, variant_index)
);

CREATE INDEX IF NOT EXISTS idx_template_candidates_brand
  ON public.template_candidates (brand_id, slide_role);

ALTER TABLE public.template_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_candidates_select" ON public.template_candidates;
CREATE POLICY "template_candidates_select" ON public.template_candidates
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- INSERT/UPDATE arrivano dalla edge fn (service_role) o dal flusso di
-- approvazione lato client (solo status).
DROP POLICY IF EXISTS "template_candidates_update_status" ON public.template_candidates;
CREATE POLICY "template_candidates_update_status" ON public.template_candidates
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- ── template_variants: reference IMMUTABILE ─────────────────────
CREATE TABLE IF NOT EXISTS public.template_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_role text NOT NULL CHECK (slide_role IN ('cover','content','cta')),
  archetype text NOT NULL,
  genome jsonb NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'brand-assets',
  storage_path text NOT NULL,
  prompt_skeleton text NOT NULL,
  source_candidate_id uuid REFERENCES public.template_candidates(id) ON DELETE SET NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slide_role)
);

ALTER TABLE public.template_variants ENABLE ROW LEVEL SECURITY;

-- IMMUTABILITA STRUTTURALE: solo SELECT e INSERT per gli utenti.
-- Nessuna policy UPDATE/DELETE: correzioni solo via service_role.
DROP POLICY IF EXISTS "template_variants_select" ON public.template_variants;
CREATE POLICY "template_variants_select" ON public.template_variants
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "template_variants_insert" ON public.template_variants;
CREATE POLICY "template_variants_insert" ON public.template_variants
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ── generation_history: nuovo tipo per il contatore costi ───────
ALTER TABLE public.generation_history
  DROP CONSTRAINT IF EXISTS generation_history_generation_type_check;
ALTER TABLE public.generation_history
  ADD CONSTRAINT generation_history_generation_type_check
  CHECK (generation_type IN (
    'post','carousel','story','reel','competitor','viral_analysis',
    'image_swap','expand_topic','template_genesis'
  ));

-- ── bucket brand-assets privato + policy folder-owner ───────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "brand_assets_select_owner" ON storage.objects;
CREATE POLICY "brand_assets_select_owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-assets'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "brand_assets_insert_owner" ON storage.objects;
CREATE POLICY "brand_assets_insert_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "brand_assets_delete_owner" ON storage.objects;
CREATE POLICY "brand_assets_delete_owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "service_role_brand_assets_all" ON storage.objects;
CREATE POLICY "service_role_brand_assets_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'brand-assets')
  WITH CHECK (bucket_id = 'brand-assets');

-- ── Realtime: prima tabella dell'app nella publication ──────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'template_candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.template_candidates;
  END IF;
END $$;
