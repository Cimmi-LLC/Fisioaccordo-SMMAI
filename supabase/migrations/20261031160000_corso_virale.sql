-- ================================================================
-- Corso per andare virali — sezione riservata agli amministratori
--
-- course_lessons : il testo del corso (una riga per lezione + la guida
--                  iniziale). Il repo è pubblico, quindi il testo NON sta nel
--                  codice: lo importa l'admin dall'app (pagina /corso,
--                  "Importa corso") e lo leggono solo gli admin.
-- course_progress: lezioni studiate e compiti fatti, per utente.
-- course_advice  : consigli sugli account generati per (utente, brand,
--                  lezione), tenuti per non rigenerarli a ogni apertura.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id             text PRIMARY KEY,               -- 'guida' oppure 'l-2-1'
  kind           text NOT NULL CHECK (kind IN ('intro', 'lesson')),
  position       integer NOT NULL,
  module_num     integer,
  module_title   text,
  module_label   text,                           -- nome originale del modulo
  module_lead    text,
  lesson_num     text,
  title          text NOT NULL,
  source         text,
  html           text NOT NULL,
  plain          text NOT NULL DEFAULT '',       -- testo semplice per ricerca e consigli
  imported_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_position ON public.course_lessons (position);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_lessons: admin legge"
  ON public.course_lessons FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "course_lessons: admin inserisce"
  ON public.course_lessons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "course_lessons: admin aggiorna"
  ON public.course_lessons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "course_lessons: admin cancella"
  ON public.course_lessons FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.course_progress (
  user_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id  text NOT NULL,                        -- 'l-2-1' (lezione) o 'l-2-1#c1' (compito)
  done_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_progress: legge i propri"
  ON public.course_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "course_progress: inserisce i propri"
  ON public.course_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "course_progress: cancella i propri"
  ON public.course_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.course_advice (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  lesson_id   text NOT NULL,
  advice      jsonb NOT NULL,
  stats       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_advice_lookup
  ON public.course_advice (user_id, brand_id, lesson_id, created_at DESC);

ALTER TABLE public.course_advice ENABLE ROW LEVEL SECURITY;

-- Scrive solo la edge function (service_role); l'utente legge e cancella i propri.
CREATE POLICY "course_advice: legge i propri"
  ON public.course_advice FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "course_advice: cancella i propri"
  ON public.course_advice FOR DELETE TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
