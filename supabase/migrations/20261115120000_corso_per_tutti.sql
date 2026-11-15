-- ================================================================
-- Corso per andare virali: lo leggono tutti gli account
--
-- Attilio, 15/11/2026: «fai vedere quella sezione a tutti gli account,
-- esattamente come la vedo io». Prima course_lessons si leggeva solo da
-- admin (migrazione 20261031160000). Scrittura (import del corso) resta
-- agli admin; progressi e consigli erano già per utente.
-- ================================================================

DROP POLICY IF EXISTS "course_lessons: admin legge" ON public.course_lessons;
CREATE POLICY "course_lessons: tutti gli utenti leggono"
  ON public.course_lessons FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
