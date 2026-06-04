-- Encrypt Meta access tokens at rest.
--
-- Threat model: a SQL injection or accidental SELECT on meta_connections
-- currently leaks page_access_token in plaintext. After this migration the
-- column is BYTEA (encrypted with pgcrypto pgp_sym_encrypt) and only
-- security-definer RPCs (callable by service_role) can decrypt it.
--
-- The encryption key is read from Supabase Vault. To set it up before this
-- migration is applied, the operator must run (in the SQL editor):
--   SELECT vault.create_secret('REPLACE-ME-WITH-32+RANDOM-CHARS', 'meta_token_key', 'Encryption key for Meta/Instagram tokens');
-- The migration is defensive: if the secret is missing it short-circuits the
-- backfill and leaves columns NULL, so edge functions can keep working until
-- the secret is configured (they fall back to legacy plaintext column during
-- the transition window).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- 1) Add encrypted column (keep plaintext column for the transition window)
ALTER TABLE public.meta_connections
  ADD COLUMN IF NOT EXISTS page_access_token_enc BYTEA;

-- 2) Helper: read the Meta token encryption key from Vault.
--    Returns NULL if the secret is not configured (the caller must handle it).
CREATE OR REPLACE FUNCTION public._meta_token_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'meta_token_key'
   LIMIT 1;
  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public._meta_token_key() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._meta_token_key() TO service_role;

-- 3) RPC to upsert a Meta connection with token encryption (called from edge functions)
CREATE OR REPLACE FUNCTION public.upsert_meta_connection(
  p_user_id              UUID,
  p_page_access_token    TEXT,
  p_instagram_business_id TEXT,
  p_instagram_username   TEXT,
  p_token_expires_at     TIMESTAMPTZ,
  p_facebook_user_id     TEXT DEFAULT NULL,
  p_page_id              TEXT DEFAULT NULL,
  p_page_name            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_enc BYTEA;
  v_id  UUID;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Meta token encryption key not configured (Vault secret meta_token_key missing)';
  END IF;

  v_enc := pgp_sym_encrypt(p_page_access_token, v_key);

  -- Deactivate previous connections for this user
  UPDATE public.meta_connections
     SET is_active = false, updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.meta_connections (
    user_id, facebook_user_id, page_id, page_name,
    page_access_token, page_access_token_enc,
    instagram_business_id, instagram_username,
    token_expires_at, is_active
  ) VALUES (
    p_user_id, p_facebook_user_id, p_page_id, p_page_name,
    NULL, v_enc,
    p_instagram_business_id, p_instagram_username,
    p_token_expires_at, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_meta_connection(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_meta_connection(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO service_role;

-- 4) RPC to read a decrypted token, scoped to a single connection_id.
--    Returns NULL if connection not found OR if vault key missing.
CREATE OR REPLACE FUNCTION public.get_meta_connection_token(p_connection_id UUID)
RETURNS TABLE (
  page_access_token       TEXT,
  instagram_business_id   TEXT,
  token_expires_at        TIMESTAMPTZ,
  is_active               BOOLEAN,
  user_id                 UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := public._meta_token_key();

  RETURN QUERY
  SELECT
    CASE
      WHEN mc.page_access_token_enc IS NOT NULL AND v_key IS NOT NULL
        THEN pgp_sym_decrypt(mc.page_access_token_enc, v_key)
      ELSE mc.page_access_token  -- transition fallback
    END AS page_access_token,
    mc.instagram_business_id,
    mc.token_expires_at,
    mc.is_active,
    mc.user_id
  FROM public.meta_connections mc
  WHERE mc.id = p_connection_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_meta_connection_token(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_meta_connection_token(UUID) TO service_role;

-- 5) Backfill existing rows where the secret is configured.
--    If the secret is missing, this DO block silently skips backfill.
DO $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN
    RAISE NOTICE 'Vault secret meta_token_key not set — skipping backfill. Run the migration again after configuring the secret, or rely on transition fallback.';
  ELSE
    UPDATE public.meta_connections
       SET page_access_token_enc = pgp_sym_encrypt(page_access_token, v_key)
     WHERE page_access_token IS NOT NULL
       AND page_access_token_enc IS NULL;
    RAISE NOTICE 'Meta tokens backfill complete';
  END IF;
END;
$$;

-- 6) Tighten RLS so anon/authenticated cannot SELECT raw tokens directly.
--    Existing policy "Users can view their own meta connections" stays, but
--    we drop the raw plaintext column visibility by REVOKE on column.
REVOKE SELECT (page_access_token, page_access_token_enc) ON public.meta_connections FROM authenticated, anon;
-- service_role retains access (it's the role used by edge functions).

-- NOTE: a follow-up migration will DROP COLUMN page_access_token after the
-- edge functions are confirmed reading via get_meta_connection_token. For now
-- we keep both for zero-downtime rollout.
