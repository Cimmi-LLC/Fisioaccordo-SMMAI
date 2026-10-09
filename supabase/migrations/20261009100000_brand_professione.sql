-- Professione del brand: il generatore produce contenuti anche per
-- nutrizionisti, personal trainer e altre figure sanitarie, non solo per
-- fisioterapisti. La professione puo essere scelta dall'utente oppure
-- lasciata rilevare dal codice (NULL = automatica, dai campi del brand kit
-- e dal topic del post). Quando vale 'altro', professione_custom porta
-- l'etichetta scritta dall'utente (es. "Terapista occupazionale").
--
-- Gli slug ammessi vivono nel codice (src/lib/brand/profession.ts, specchiato
-- in supabase/functions/_shared/brand/profession.ts): niente CHECK sul DB,
-- cosi aggiungere una professione non richiede una migration. Valori
-- sconosciuti vengono ignorati dal codice (ricade sul rilevamento).
--
-- ORDINE DI RILASCIO: prima questa migration, poi le edge function, poi il
-- frontend. Il frontend salva il brand kit con tutte le colonne: se la
-- colonna manca, PostgREST rifiuta il salvataggio (PGRST204).

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS professione        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS professione_custom TEXT DEFAULT '';

COMMENT ON COLUMN public.brands.professione IS
  'Slug della professione (fisioterapista, nutrizionista, personal_trainer, ... , altro). NULL = rilevata automaticamente dal codice.';
COMMENT ON COLUMN public.brands.professione_custom IS
  'Etichetta libera della professione quando professione = altro.';

NOTIFY pgrst, 'reload schema';
