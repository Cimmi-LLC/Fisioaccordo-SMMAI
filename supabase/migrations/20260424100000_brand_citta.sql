-- Add city field to brands table for local hashtag suggestions in Competitor Analysis v2
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS citta TEXT DEFAULT '';
