-- Drop user_ai_memory table — feature removed.
-- See ADR: the "AI Memory" feature was confusing for users, only one edge
-- function used it (generate-content), and the same outcome is achievable
-- more clearly through the Brand Kit fields (parole_da_evitare, temi_chiave,
-- identita_core).

DROP TABLE IF EXISTS public.user_ai_memory CASCADE;

NOTIFY pgrst, 'reload schema';
