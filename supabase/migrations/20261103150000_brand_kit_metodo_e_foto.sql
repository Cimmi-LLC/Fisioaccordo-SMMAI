-- Revisione interna del 03/11/2026 (nota del reparto social):
--
-- 1. brand_photos.url era NOT NULL ma l'app non salva più URL firmati nel DB
--    (si firma in lettura da storage_path): l'insert con url vuoto falliva
--    con 23502 e OGNI upload di foto del brand moriva lasciando file orfani.
--    La colonna diventa nullable; le righe nuove scrivono '' finché questa
--    migrazione non è applicata, poi possono scrivere NULL.
--
-- 2. Opzione «usa prima le mie foto, sempre»: senza flag la regola interna
--    («solo quando rilevanti») non si vede e non si governa.
--
-- 3. Campi del Brand Kit che servono al metodo Short Form Academy (Kallaway):
--    le frasi testuali dei pazienti (parole vere, non le nostre), la
--    convinzione del settore da ribaltare (contrarian take) e il profilo di
--    riferimento detestato (come NON suonare). Senza questi il copy resta
--    la parafrasi del sito.

ALTER TABLE public.brand_photos ALTER COLUMN url DROP NOT NULL;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS foto_mie_sempre BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frasi_pazienti TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS convinzione_da_ribaltare TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profilo_detestato TEXT NOT NULL DEFAULT '';

-- Senza il NOTIFY PostgREST scarta in silenzio le colonne nuove
-- (stesso problema documentato in 20260724100000).
NOTIFY pgrst, 'reload schema';
