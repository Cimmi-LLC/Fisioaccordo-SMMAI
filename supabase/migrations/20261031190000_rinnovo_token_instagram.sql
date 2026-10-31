-- ================================================================
-- Rinnovo automatico del token Instagram
--
-- Il token Instagram (Business Login) dura 60 giorni. Prima non veniva mai
-- rinnovato: il 16/09/2026 è scaduto quello dell'unica connessione attiva e
-- la sincronizzazione quotidiana si è fermata senza avvisare nessuno.
-- sync-instagram-metrics ora lo rinnova quando mancano meno di 20 giorni e
-- salva il nuovo token cifrato con questa funzione (solo service_role).
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_meta_connection_token(
  p_connection_id uuid,
  p_page_access_token text,
  p_token_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_key TEXT;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN RAISE EXCEPTION 'Meta token encryption key not configured'; END IF;
  UPDATE public.meta_connections
     SET page_access_token_enc = pgp_sym_encrypt(p_page_access_token, v_key),
         page_access_token = NULL,
         token_expires_at = p_token_expires_at,
         updated_at = now()
   WHERE id = p_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_meta_connection_token(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_meta_connection_token(uuid, text, timestamptz) TO service_role;
