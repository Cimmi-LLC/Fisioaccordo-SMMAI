-- Add missing brand columns referenced by the frontend (BrandProfile type).
-- The original brands table (20260404000000_brands.sql) lacked visual identity
-- and several content-preference columns. The frontend has been writing them
-- via UPDATE for months, but PostgREST silently drops unknown columns — so
-- "Save" appeared to succeed while the data never persisted. This explains
-- why brand colors never propagate to the Stories generator.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS colore_primario          TEXT    DEFAULT '#554697',
  ADD COLUMN IF NOT EXISTS colore_secondario        TEXT    DEFAULT '#E6007E',
  ADD COLUMN IF NOT EXISTS colore_terziario         TEXT    DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS font_intestazioni        TEXT    DEFAULT 'Montserrat',
  ADD COLUMN IF NOT EXISTS font_body                TEXT    DEFAULT 'Montserrat',
  ADD COLUMN IF NOT EXISTS logo_url                 TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url               TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_photos          TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_photos           TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parole_da_evitare        TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pubblicazione_automatica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS identita_core            TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_templates          TEXT[]  DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
