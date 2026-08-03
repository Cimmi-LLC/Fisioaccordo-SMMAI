-- Preferenze di generazione per brand (recupero del lavoro dal branch
-- backup/lovable-2026-07-20): scelta del modello immagini con listino
-- crediti, stile delle slide DOM e tipo di copy (B2C/B2B).
--
-- Senza il NOTIFY finale PostgREST scarta in silenzio le colonne
-- sconosciute e il salvataggio dalle card sembra riuscire senza
-- persistere (stesso bug documentato in 20260511150000).

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'nano-2'
    CHECK (image_model IN ('nano-2', 'nano-pro', 'gpt-2', 'stock')),
  ADD COLUMN IF NOT EXISTS slide_style TEXT DEFAULT 'foto'
    CHECK (slide_style IN ('foto', 'neon', 'referto', 'copertina')),
  ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'B2C'
    CHECK (avatar_type IN ('B2C', 'B2B'));

NOTIFY pgrst, 'reload schema';
