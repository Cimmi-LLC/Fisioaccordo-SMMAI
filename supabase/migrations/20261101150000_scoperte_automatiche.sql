-- Pilota automatico: scoperte scientifiche → carosello → programmazione.
--
-- brands.pubblicazione_automatica esisteva già (interruttore senza effetto):
-- da qui accende il giro giornaliero di scoperte-automatiche.
-- auto_orari: orari italiani "HH:MM" (1-3) = quanti caroselli al giorno.
-- auto_temi: argomenti della ricerca; vuoto = temi chiave e servizi del brand.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS auto_orari TEXT[] NOT NULL DEFAULT ARRAY['09:00'],
  ADD COLUMN IF NOT EXISTS auto_temi TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.scoperte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo TEXT NOT NULL,
  sintesi JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonte TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  data_pubblicazione DATE,
  tipo_fonte TEXT NOT NULL DEFAULT 'study',
  stato TEXT NOT NULL DEFAULT 'nuova'
    CHECK (stato IN ('nuova', 'in_produzione', 'programmata', 'errore', 'scartata')),
  errore TEXT,
  carousel_id UUID REFERENCES public.produced_carousels(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
  programmata_per TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, url)
);

CREATE INDEX IF NOT EXISTS idx_scoperte_brand_created ON public.scoperte (brand_id, created_at DESC);

ALTER TABLE public.scoperte ENABLE ROW LEVEL SECURITY;

-- Le scoperte le scrive solo la funzione (service role). Il proprietario le
-- legge e può scartarle o rimetterle fra le nuove.
CREATE POLICY "scoperte: il proprietario legge"
  ON public.scoperte FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "scoperte: il proprietario aggiorna"
  ON public.scoperte FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Solo lo stato è modificabile dall'app: il resto lo scrive la funzione.
REVOKE UPDATE ON public.scoperte FROM authenticated;
GRANT UPDATE (stato, updated_at) ON public.scoperte TO authenticated;

-- Giro giornaliero alle 04:00 UTC (05:00 o 06:00 in Italia), prima dei
-- primi orari del mattino. Il secret del cron arriva dal Vault, mai scritto qui.
DO $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault secret cron_secret mancante: il giro scoperte-automatiche non può partire';
  END IF;

  PERFORM cron.unschedule('scoperte-automatiche')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scoperte-automatiche');

  PERFORM cron.schedule(
    'scoperte-automatiche',
    '0 4 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/scoperte-automatiche',
        headers := %L::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cron$, jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)::text)
  );
END
$$;
