-- Professioni personalizzate per account + analisi modificabili.
--
-- 1. user_professions: le professioni che un utente scrive a mano quando la
--    sua non e nella lista. Restano SOLO nel suo account (RLS per user_id) e
--    gli vengono riproposte nel selettore. Il brand continua a salvare
--    professione = 'altro' + professione_custom = etichetta: la pipeline di
--    generazione gestisce gia questo caso, quindi nessuna edge function cambia.
-- 2. competitor_analysis e viral_analysis avevano solo SELECT/INSERT/DELETE:
--    senza una policy UPDATE la modifica dal client fallirebbe in silenzio.

CREATE TABLE IF NOT EXISTS public.user_professions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 2 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_professions_user_label_uq
  ON public.user_professions (user_id, lower(btrim(label)));

ALTER TABLE public.user_professions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_professions_select_own ON public.user_professions;
CREATE POLICY user_professions_select_own ON public.user_professions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_professions_insert_own ON public.user_professions;
CREATE POLICY user_professions_insert_own ON public.user_professions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_professions_update_own ON public.user_professions;
CREATE POLICY user_professions_update_own ON public.user_professions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_professions_delete_own ON public.user_professions;
CREATE POLICY user_professions_delete_own ON public.user_professions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own competitor analyses" ON public.competitor_analysis;
CREATE POLICY "Users can update their own competitor analyses" ON public.competitor_analysis
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analyses" ON public.viral_analysis;
CREATE POLICY "Users can update their own analyses" ON public.viral_analysis
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PostgREST deve rileggere lo schema, altrimenti la tabella nuova da 404.
NOTIFY pgrst, 'reload schema';
