-- Video virali dentro la quota gratuita di Apify (5 $ al mese), richiesta di
-- Attilio del 01/11/2026: «non spendere neanche un euro».
-- - un giro al mese (il 2, dopo che la quota si è azzerata) invece che ogni domenica;
-- - 8 ricerche di inserzioni accese su 16 (le altre restano, spente: si
--   riaccendono con un clic in «Account seguiti»);
-- - costo di ogni giro salvato, per sapere quanto consuma davvero.

ALTER TABLE public.virali_giri ADD COLUMN IF NOT EXISTS costo_usd NUMERIC;

UPDATE public.virali_ricerche SET attiva = false
WHERE (paese, ricerca) NOT IN (
  ('IT', 'mal di schiena'), ('IT', 'fisioterapia'), ('IT', 'nutrizionista'), ('IT', 'osteopata'),
  ('US', 'back pain'), ('US', 'physical therapy'), ('US', 'chiropractor'), ('US', 'weight loss program')
);

DO $$
BEGIN
  PERFORM cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'virali-avvia'), schedule := '0 3 2 * *');
END
$$;
