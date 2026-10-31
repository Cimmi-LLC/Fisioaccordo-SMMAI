-- ================================================================
-- Un profilo Instagram per ogni brand
--
-- Prima la connessione Instagram era dell'utente: collegarne una nuova
-- disattivava la precedente, quindi chi gestisce più brand (l'account del
-- team ne ha 8) poteva avere un solo Instagram. Ora ogni connessione dice a
-- quale brand appartiene e ogni brand ha la sua.
-- ================================================================

ALTER TABLE public.meta_connections
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meta_connections_brand_active_idx
  ON public.meta_connections (brand_id) WHERE is_active;

-- Una connessione può puntare solo a un brand dello stesso utente
-- (gli utenti possono aggiornare le proprie righe via RLS).
CREATE OR REPLACE FUNCTION public.meta_connections_brand_owner_check()
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

DROP TRIGGER IF EXISTS meta_connections_brand_owner ON public.meta_connections;
CREATE TRIGGER meta_connections_brand_owner
  BEFORE INSERT OR UPDATE OF brand_id, user_id ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.meta_connections_brand_owner_check();

-- Connessioni attive esistenti: al brand con lo stesso username Instagram,
-- altrimenti al primo brand creato dall'utente.
UPDATE public.meta_connections m
   SET brand_id = COALESCE(
     (SELECT b.id FROM public.brands b
       WHERE b.user_id = m.user_id
         AND lower(trim(leading '@' from b.instagram_username)) = lower(m.instagram_username)
       ORDER BY b.created_at LIMIT 1),
     (SELECT b.id FROM public.brands b
       WHERE b.user_id = m.user_id
       ORDER BY b.created_at LIMIT 1))
 WHERE m.is_active AND m.brand_id IS NULL;

-- Salvataggio della connessione: disattiva solo quella dello stesso brand
-- (o lo stesso account Instagram collegato a un altro brand dell'utente).
DROP FUNCTION IF EXISTS public.upsert_meta_connection(uuid, text, text, text, timestamptz, text, text, text);

CREATE FUNCTION public.upsert_meta_connection(
  p_user_id uuid,
  p_page_access_token text,
  p_instagram_business_id text,
  p_instagram_username text,
  p_token_expires_at timestamptz,
  p_facebook_user_id text DEFAULT NULL,
  p_page_id text DEFAULT NULL,
  p_page_name text DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT; v_enc BYTEA; v_id UUID;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN RAISE EXCEPTION 'Meta token encryption key not configured'; END IF;
  v_enc := pgp_sym_encrypt(p_page_access_token, v_key);

  UPDATE public.meta_connections
     SET is_active = false, updated_at = now()
   WHERE user_id = p_user_id
     AND is_active
     AND (brand_id IS NOT DISTINCT FROM p_brand_id
          OR (p_instagram_business_id IS NOT NULL AND instagram_business_id = p_instagram_business_id));

  INSERT INTO public.meta_connections (
    user_id, brand_id, facebook_user_id, page_id, page_name, page_access_token, page_access_token_enc,
    instagram_business_id, instagram_username, token_expires_at, is_active
  ) VALUES (
    p_user_id, p_brand_id, p_facebook_user_id, p_page_id, p_page_name, NULL, v_enc,
    p_instagram_business_id, p_instagram_username, p_token_expires_at, true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_meta_connection(uuid, text, text, text, timestamptz, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_meta_connection(uuid, text, text, text, timestamptz, text, text, text, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.meta_connections_brand_owner_check() FROM PUBLIC, anon, authenticated;
