-- ================================================================
-- TikTok e YouTube: collegamento degli account, pubblicazione e statistiche
--
-- Ogni brand può collegare un profilo TikTok e un canale YouTube (come per
-- Instagram, un profilo per brand). I token stanno cifrati con la stessa
-- chiave del Vault dei token Meta (`meta_token_key`) e si leggono solo dalle
-- edge function (service_role) tramite le RPC qui sotto.
--
-- Tabelle:
--   social_connections   un account TikTok/YouTube collegato a un brand
--   social_oauth_states  il «biglietto» del collegamento in corso (10 minuti)
--   social_posts         i contenuti pubblicati con i totali aggiornati
-- published_posts si allarga a video e a TikTok/YouTube; post_metrics
-- riceve gli incrementi giornalieri (channel 'tiktok' / 'youtube').
-- ================================================================

-- ── Account collegati ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'youtube')),
  -- TikTok: open_id · YouTube: id del canale
  external_account_id text NOT NULL,
  username text,
  display_name text,
  avatar_url text,
  access_token_enc bytea,
  refresh_token_enc bytea,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  scopes text,
  -- YouTube: playlist dei caricamenti
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_connections_brand_active_idx
  ON public.social_connections (brand_id, platform) WHERE is_active;
CREATE INDEX IF NOT EXISTS social_connections_user_active_idx
  ON public.social_connections (user_id) WHERE is_active;

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_connections_select" ON public.social_connections;
CREATE POLICY "social_connections_select"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Il client legge solo le colonne senza token; scollegare passa dalla
-- funzione social-auth, che revoca anche il permesso sulla piattaforma.
REVOKE ALL ON public.social_connections FROM anon, authenticated;
GRANT SELECT (id, user_id, brand_id, platform, external_account_id, username, display_name,
              avatar_url, token_expires_at, scopes, is_active, last_error, created_at, updated_at)
  ON public.social_connections TO authenticated;

-- Una connessione può puntare solo a un brand dello stesso utente.
CREATE OR REPLACE FUNCTION public.social_connections_brand_owner_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = NEW.brand_id AND b.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'brand non appartiene all''utente della connessione';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS social_connections_brand_owner ON public.social_connections;
CREATE TRIGGER social_connections_brand_owner
  BEFORE INSERT OR UPDATE OF brand_id, user_id ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.social_connections_brand_owner_check();

REVOKE ALL ON FUNCTION public.social_connections_brand_owner_check() FROM PUBLIC, anon, authenticated;

-- Salvataggio: disattiva l'account della stessa piattaforma sullo stesso
-- brand (o lo stesso account collegato a un altro brand dell'utente).
CREATE OR REPLACE FUNCTION public.upsert_social_connection(
  p_user_id uuid,
  p_brand_id uuid,
  p_platform text,
  p_external_account_id text,
  p_username text,
  p_display_name text,
  p_avatar_url text,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz,
  p_refresh_expires_at timestamptz,
  p_scopes text,
  p_extra jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT; v_id UUID;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN RAISE EXCEPTION 'Chiave di cifratura dei token mancante (Vault meta_token_key)'; END IF;

  UPDATE public.social_connections
     SET is_active = false, updated_at = now()
   WHERE user_id = p_user_id
     AND platform = p_platform
     AND is_active
     AND (brand_id IS NOT DISTINCT FROM p_brand_id OR external_account_id = p_external_account_id);

  INSERT INTO public.social_connections (
    user_id, brand_id, platform, external_account_id, username, display_name, avatar_url,
    access_token_enc, refresh_token_enc, token_expires_at, refresh_expires_at, scopes, extra, is_active
  ) VALUES (
    p_user_id, p_brand_id, p_platform, p_external_account_id, p_username, p_display_name, p_avatar_url,
    pgp_sym_encrypt(p_access_token, v_key),
    CASE WHEN p_refresh_token IS NULL THEN NULL ELSE pgp_sym_encrypt(p_refresh_token, v_key) END,
    p_token_expires_at, p_refresh_expires_at, p_scopes, COALESCE(p_extra, '{}'::jsonb), true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_social_connection_tokens(p_connection_id uuid)
RETURNS TABLE (
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  is_active boolean,
  user_id uuid,
  brand_id uuid,
  platform text,
  external_account_id text,
  username text,
  extra jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT;
BEGIN
  v_key := public._meta_token_key();
  RETURN QUERY
  SELECT
    CASE WHEN c.access_token_enc IS NOT NULL AND v_key IS NOT NULL THEN pgp_sym_decrypt(c.access_token_enc, v_key) END,
    CASE WHEN c.refresh_token_enc IS NOT NULL AND v_key IS NOT NULL THEN pgp_sym_decrypt(c.refresh_token_enc, v_key) END,
    c.token_expires_at, c.refresh_expires_at, c.is_active, c.user_id, c.brand_id,
    c.platform, c.external_account_id, c.username, c.extra
  FROM public.social_connections c
  WHERE c.id = p_connection_id
  LIMIT 1;
END;
$$;

-- Dopo il rinnovo del token (TikTok ogni 24 ore, Google ogni ora).
CREATE OR REPLACE FUNCTION public.update_social_connection_tokens(
  p_connection_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz,
  p_refresh_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN RAISE EXCEPTION 'Chiave di cifratura dei token mancante (Vault meta_token_key)'; END IF;
  UPDATE public.social_connections
     SET access_token_enc = pgp_sym_encrypt(p_access_token, v_key),
         refresh_token_enc = CASE WHEN p_refresh_token IS NULL THEN refresh_token_enc
                                  ELSE pgp_sym_encrypt(p_refresh_token, v_key) END,
         token_expires_at = p_token_expires_at,
         refresh_expires_at = COALESCE(p_refresh_expires_at, refresh_expires_at),
         last_error = NULL,
         updated_at = now()
   WHERE id = p_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_social_connection(uuid, uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_social_connection(uuid, uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.get_social_connection_tokens(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_social_connection_tokens(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.update_social_connection_tokens(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_social_connection_tokens(uuid, text, text, timestamptz, timestamptz) TO service_role;

-- ── Collegamento in corso ───────────────────────────────────────
-- Lega il ritorno da TikTok/Google all'utente e al brand che hanno
-- cliccato «Collega» (e blocca i ritorni falsificati). Solo service_role.
CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'youtube')),
  return_to text,
  redirect_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_oauth_states FROM anon, authenticated;

-- ── Contenuti pubblicati con i totali ───────────────────────────
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.social_connections(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'youtube')),
  external_post_id text NOT NULL,
  published_post_id uuid REFERENCES public.published_posts(id) ON DELETE SET NULL,
  title text,
  url text,
  cover_url text,
  published_at timestamptz,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  watch_minutes bigint,
  avg_view_sec integer,
  -- totali all'inizio di totals_date: l'aumento del giorno è totali - base
  base jsonb,
  totals_date date,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, external_post_id)
);
CREATE INDEX IF NOT EXISTS social_posts_brand_idx ON public.social_posts (brand_id, platform, published_at DESC);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_posts_select" ON public.social_posts;
CREATE POLICY "social_posts_select"
  ON public.social_posts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.social_posts FROM anon, authenticated;

-- ── published_posts: video e TikTok/YouTube ─────────────────────
ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS social_connection_id uuid REFERENCES public.social_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS video_bucket text,
  ADD COLUMN IF NOT EXISTS platform_options jsonb,
  ADD COLUMN IF NOT EXISTS external_post_id text;

ALTER TABLE public.published_posts DROP CONSTRAINT IF EXISTS published_posts_media_type_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_media_type_check CHECK (media_type IN ('post', 'story', 'video'));

-- 'processing': TikTok ha ricevuto il contenuto e lo sta pubblicando
ALTER TABLE public.published_posts DROP CONSTRAINT IF EXISTS published_posts_status_check;
ALTER TABLE public.published_posts
  ADD CONSTRAINT published_posts_status_check CHECK (status IN ('published', 'scheduled', 'failed', 'processing'));

CREATE INDEX IF NOT EXISTS idx_published_posts_processing
  ON public.published_posts (status) WHERE status = 'processing';

-- ── Storage ─────────────────────────────────────────────────────
-- social-video: i video caricati per TikTok/YouTube (privato, 200 MB: la
-- funzione che li pubblica ha 256 MB di memoria).
-- social-pubblici: le foto dei caroselli per TikTok, che le scarica da un
-- indirizzo pubblico verificato (vedi PR: verifica del prefisso URL).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-video', 'social-video', false, 209715200, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('social-pubblici', 'social-pubblici', true, 20971520)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "social video: select own" ON storage.objects;
DROP POLICY IF EXISTS "social video: insert own" ON storage.objects;
DROP POLICY IF EXISTS "social video: delete own" ON storage.objects;
DROP POLICY IF EXISTS "social pubblici: insert own" ON storage.objects;
DROP POLICY IF EXISTS "social pubblici: delete own" ON storage.objects;

CREATE POLICY "social video: select own" ON storage.objects
  FOR SELECT USING (bucket_id = 'social-video' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "social video: insert own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'social-video' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "social video: delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'social-video' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "social pubblici: insert own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'social-pubblici' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "social pubblici: delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'social-pubblici' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── Statistiche ogni giorno alle 05:00 UTC ──────────────────────
-- Il secret del cron arriva dal Vault, mai scritto qui.
DO $$
DECLARE
  v_secret TEXT;
  v_headers TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault secret cron_secret mancante: la sync TikTok/YouTube non può partire';
  END IF;
  v_headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)::text;

  PERFORM cron.unschedule('sync-social-metrics') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-social-metrics');

  PERFORM cron.schedule(
    'sync-social-metrics',
    '0 5 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/sync-social-metrics',
        headers := %L::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 300000
      );
    $cron$, v_headers)
  );
END
$$;

NOTIFY pgrst, 'reload schema';
