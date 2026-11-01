-- Video virali da copiare (Italia e USA) e «Duplica questo video».
--
-- virali_account     account da seguire: libreria comune (brand_id null, la
--                    cura l'admin) + competitor aggiunti da ogni utente per
--                    il suo brand (visibili solo a lui).
-- virali_video       i loro video, col punteggio outlier di Kallaway
--                    (visualizzazioni ÷ media del canale negli ultimi 90 giorni).
-- virali_ricerche    parole cercate nella Libreria inserzioni di Meta.
-- virali_inserzioni  inserzioni video ancora accese: più giorni = più soldi.
-- virali_copioni     i copioni «Duplica questo video» di ogni brand.
-- virali_giri        i giri di raccolta su Apify (coda, in corso, raccolti).
--
-- Scrive tutto la funzione virali-raccolta (service role); dall'app si
-- aggiungono solo i propri competitor e si cancellano i propri copioni.

CREATE TABLE IF NOT EXISTS public.virali_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piattaforma TEXT NOT NULL CHECK (piattaforma IN ('instagram', 'tiktok')),
  handle TEXT NOT NULL CHECK (handle ~ '^[a-z0-9._]{1,30}$'),
  nome TEXT,
  paese TEXT NOT NULL DEFAULT 'IT' CHECK (paese IN ('IT', 'US', 'ALTRO')),
  professione TEXT NOT NULL DEFAULT 'fisioterapista',
  vende TEXT,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  follower BIGINT,
  media_views NUMERIC,
  ultimo_giro TIMESTAMPTZ,
  ultimo_errore TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((brand_id IS NULL) = (user_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS virali_account_unico
  ON public.virali_account (piattaforma, handle, COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_virali_account_handle ON public.virali_account (piattaforma, handle);

CREATE TABLE IF NOT EXISTS public.virali_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piattaforma TEXT NOT NULL CHECK (piattaforma IN ('instagram', 'tiktok')),
  handle TEXT NOT NULL,
  external_id TEXT NOT NULL,
  shortcode TEXT,
  url TEXT NOT NULL,
  paese TEXT NOT NULL DEFAULT 'IT',
  professione TEXT NOT NULL DEFAULT 'fisioterapista',
  didascalia TEXT NOT NULL DEFAULT '',
  pubblicato_il TIMESTAMPTZ,
  durata_s NUMERIC,
  views BIGINT,
  likes BIGINT,
  commenti BIGINT,
  condivisioni BIGINT,
  salvataggi BIGINT,
  outlier NUMERIC,
  engagement NUMERIC,
  copertina TEXT,
  video_url TEXT,
  trascrizione TEXT,
  analisi JSONB,
  analisi_il TIMESTAMPTZ,
  aggiornato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (piattaforma, external_id)
);

CREATE INDEX IF NOT EXISTS idx_virali_video_handle ON public.virali_video (piattaforma, handle);
CREATE INDEX IF NOT EXISTS idx_virali_video_outlier ON public.virali_video (outlier DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_virali_video_pubblicato ON public.virali_video (pubblicato_il DESC);

CREATE TABLE IF NOT EXISTS public.virali_ricerche (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paese TEXT NOT NULL CHECK (paese IN ('IT', 'US', 'ALTRO')),
  professione TEXT NOT NULL,
  ricerca TEXT NOT NULL,
  attiva BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paese, ricerca)
);

CREATE TABLE IF NOT EXISTS public.virali_inserzioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id TEXT NOT NULL UNIQUE,
  paese TEXT NOT NULL,
  professione TEXT NOT NULL,
  ricerca TEXT,
  pagina TEXT NOT NULL,
  pagina_id TEXT,
  iniziata_il DATE,
  finita_il DATE,
  attiva BOOLEAN NOT NULL DEFAULT true,
  giorni INT,
  varianti INT NOT NULL DEFAULT 1,
  testo TEXT NOT NULL DEFAULT '',
  titolo TEXT NOT NULL DEFAULT '',
  link TEXT,
  cta TEXT,
  piattaforme TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT,
  copertina TEXT,
  analisi JSONB,
  analisi_il TIMESTAMPTZ,
  aggiornato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_virali_inserzioni_giorni ON public.virali_inserzioni (giorni DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.virali_copioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.virali_video(id) ON DELETE SET NULL,
  inserzione_id UUID REFERENCES public.virali_inserzioni(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('esatta', 'vicina')),
  copione JSONB NOT NULL,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_virali_copioni_brand ON public.virali_copioni (brand_id, creato_il DESC);

CREATE TABLE IF NOT EXISTS public.virali_giri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('instagram', 'tiktok', 'inserzioni')),
  parametri JSONB NOT NULL DEFAULT '{}'::jsonb,
  stato TEXT NOT NULL DEFAULT 'in_coda' CHECK (stato IN ('in_coda', 'in_corso', 'raccolto', 'errore')),
  apify_run_id TEXT UNIQUE,
  dataset_id TEXT,
  risultati INT,
  errore TEXT,
  creato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  avviato_il TIMESTAMPTZ,
  raccolto_il TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_virali_giri_stato ON public.virali_giri (stato, creato_il);

-- ── Permessi ────────────────────────────────────────────────────────────
ALTER TABLE public.virali_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virali_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virali_ricerche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virali_inserzioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virali_copioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virali_giri ENABLE ROW LEVEL SECURITY;

-- Libreria comune: la leggono tutti gli utenti, la cura l'admin.
-- Competitor di un brand: li vede e li gestisce solo il proprietario.
CREATE POLICY "virali_account: legge libreria e propri"
  ON public.virali_account FOR SELECT TO authenticated
  USING (brand_id IS NULL OR user_id = auth.uid() OR public.is_admin());
CREATE POLICY "virali_account: aggiunge competitor del proprio brand"
  ON public.virali_account FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()))
    OR (public.is_admin() AND brand_id IS NULL AND user_id IS NULL)
  );
CREATE POLICY "virali_account: modifica propri o admin"
  ON public.virali_account FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (brand_id IS NULL AND public.is_admin()))
  WITH CHECK (user_id = auth.uid() OR (brand_id IS NULL AND public.is_admin()));
CREATE POLICY "virali_account: cancella propri o admin"
  ON public.virali_account FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (brand_id IS NULL AND public.is_admin()));

-- Dall'app si cambiano solo questi campi: numeri ed errori li scrive la funzione.
REVOKE UPDATE ON public.virali_account FROM authenticated;
GRANT UPDATE (nome, paese, professione, vende, attivo) ON public.virali_account TO authenticated;

-- Un video si vede se il suo account è in libreria o fra i propri competitor.
CREATE POLICY "virali_video: legge se vede l'account"
  ON public.virali_video FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.virali_account a
      WHERE a.piattaforma = virali_video.piattaforma
        AND a.handle = virali_video.handle
        AND (a.brand_id IS NULL OR a.user_id = auth.uid())
    )
  );

CREATE POLICY "virali_ricerche: legge"
  ON public.virali_ricerche FOR SELECT TO authenticated USING (true);
CREATE POLICY "virali_ricerche: admin gestisce"
  ON public.virali_ricerche FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "virali_inserzioni: legge"
  ON public.virali_inserzioni FOR SELECT TO authenticated USING (true);

CREATE POLICY "virali_copioni: il proprietario legge"
  ON public.virali_copioni FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "virali_copioni: il proprietario cancella"
  ON public.virali_copioni FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "virali_giri: admin legge"
  ON public.virali_giri FOR SELECT TO authenticated USING (public.is_admin());

-- Copertine dei video e delle inserzioni (contenuti già pubblici).
-- Le scrive solo la funzione; i link di Instagram e TikTok scadono in pochi giorni.
INSERT INTO storage.buckets (id, name, public)
VALUES ('virali', 'virali', true)
ON CONFLICT (id) DO NOTHING;

-- ── Parole cercate nella Libreria inserzioni ────────────────────────────
INSERT INTO public.virali_ricerche (paese, professione, ricerca) VALUES
  ('IT', 'fisioterapista', 'fisioterapia'),
  ('IT', 'fisioterapista', 'mal di schiena'),
  ('IT', 'fisioterapista', 'dolore alla spalla'),
  ('IT', 'fisioterapista', 'cervicale'),
  ('IT', 'osteopata', 'osteopata'),
  ('IT', 'nutrizionista', 'nutrizionista'),
  ('IT', 'nutrizionista', 'dimagrire'),
  ('IT', 'personal_trainer', 'personal trainer'),
  ('US', 'fisioterapista', 'physical therapy'),
  ('US', 'fisioterapista', 'back pain'),
  ('US', 'fisioterapista', 'shoulder pain'),
  ('US', 'fisioterapista', 'neck pain'),
  ('US', 'chiropratico', 'chiropractor'),
  ('US', 'nutrizionista', 'nutritionist'),
  ('US', 'nutrizionista', 'weight loss program'),
  ('US', 'personal_trainer', 'online coaching')
ON CONFLICT (paese, ricerca) DO NOTHING;

-- ── Giri automatici ─────────────────────────────────────────────────────
-- La domenica alle 03:00 UTC si mette in coda la raccolta della settimana;
-- ogni 10 minuti si avviano i giri in coda e si leggono quelli finiti.
-- Il secret del cron arriva dal Vault, mai scritto qui.
DO $$
DECLARE
  v_secret TEXT;
  v_headers TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault secret cron_secret mancante: la raccolta dei video virali non può partire';
  END IF;
  v_headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)::text;

  PERFORM cron.unschedule('virali-avvia') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'virali-avvia');
  PERFORM cron.unschedule('virali-raccogli') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'virali-raccogli');

  PERFORM cron.schedule(
    'virali-avvia',
    '0 3 * * 0',
    format($cron$
      SELECT net.http_post(
        url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/virali-raccolta',
        headers := %L::jsonb,
        body := '{"azione":"avvia"}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cron$, v_headers)
  );

  PERFORM cron.schedule(
    'virali-raccogli',
    '*/10 * * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/virali-raccolta',
        headers := %L::jsonb,
        body := '{"azione":"raccogli"}'::jsonb,
        timeout_milliseconds := 300000
      );
    $cron$, v_headers)
  );
END
$$;
