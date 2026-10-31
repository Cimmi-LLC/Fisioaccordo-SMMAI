-- Siti collegati e versioni del Brand Kit.
--
-- 1. brand_sites: un brand puo avere piu siti (sito principale, landing,
--    secondo centro...). Quello con is_primary = true resta copiato in
--    brands.website_url, che e cio che il resto dell'app gia legge: nessuna
--    funzione di generazione cambia.
-- 2. brand_versions: istantanea del Brand Kit salvata prima di ogni
--    salvataggio e prima di applicare una rianalisi del sito, cosi ogni
--    modifica si puo vedere e ripristinare.

CREATE TABLE IF NOT EXISTS public.brand_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (char_length(url) BETWEEN 4 AND 500),
  label text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  last_analyzed_at timestamptz,
  last_colors text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS brand_sites_brand_url_uq ON public.brand_sites (brand_id, lower(url));
CREATE UNIQUE INDEX IF NOT EXISTS brand_sites_one_primary ON public.brand_sites (brand_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS brand_sites_brand_idx ON public.brand_sites (brand_id);

ALTER TABLE public.brand_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_sites_select_own ON public.brand_sites;
CREATE POLICY brand_sites_select_own ON public.brand_sites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS brand_sites_insert_own ON public.brand_sites;
CREATE POLICY brand_sites_insert_own ON public.brand_sites FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS brand_sites_update_own ON public.brand_sites;
CREATE POLICY brand_sites_update_own ON public.brand_sites FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS brand_sites_delete_own ON public.brand_sites;
CREATE POLICY brand_sites_delete_own ON public.brand_sites FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.brand_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brand_versions_brand_idx ON public.brand_versions (brand_id, created_at DESC);

ALTER TABLE public.brand_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_versions_select_own ON public.brand_versions;
CREATE POLICY brand_versions_select_own ON public.brand_versions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS brand_versions_insert_own ON public.brand_versions;
CREATE POLICY brand_versions_insert_own ON public.brand_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS brand_versions_delete_own ON public.brand_versions;
CREATE POLICY brand_versions_delete_own ON public.brand_versions FOR DELETE USING (auth.uid() = user_id);

-- Link salvati prima della pulizia automatica: via ?utm_...&fbclid=... (bio di Instagram).
UPDATE public.brands
SET website_url = regexp_replace(website_url, '\?.*$', '')
WHERE website_url ~* '[?&](utm_[a-z]+|fbclid|gclid|igshid|igsh)=';

-- Ogni brand con un sito gia salvato parte con quel sito come principale.
INSERT INTO public.brand_sites (brand_id, user_id, url, is_primary)
SELECT b.id, b.user_id, b.website_url, true
FROM public.brands b
WHERE coalesce(btrim(b.website_url), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.brand_sites s WHERE s.brand_id = b.id)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
