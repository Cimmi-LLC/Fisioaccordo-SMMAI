-- Il secret del cron si legge dal Vault a ogni giro, mai scritto nei job.
--
-- Prima: ogni job portava nel suo comando il valore di x-cron-secret,
-- scritto in chiaro da due migrazioni (repo pubblico) o copiato dal Vault
-- al momento della programmazione. Cambiare il secret voleva dire
-- riprogrammare tutti i job a mano.
-- Adesso: il comando chiede al Vault `cron_secret` quando parte. Per ruotare
-- il secret basta aggiornare il Vault (`cron_secret`) e le Edge Functions
-- (`CRON_SECRET`) con lo stesso valore.
--
-- Si cambia solo il comando (cron.alter_job): orario e acceso/spento restano
-- quelli di oggi. I job che non ci sono vengono saltati.

DO $$
DECLARE
  v_job RECORD;
  v_id BIGINT;
  v_cambiati INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret') THEN
    RAISE EXCEPTION 'Vault secret cron_secret mancante: i job del cron resterebbero senza secret';
  END IF;

  FOR v_job IN
    SELECT * FROM (VALUES
      ('process-scheduled-posts',      'process-scheduled-posts',      '{}',                   30000),
      ('sync-instagram-metrics',       'sync-instagram-metrics',       '{}',                   60000),
      ('sync-instagram-metrics-apify', 'sync-instagram-metrics-apify', '{}',                   120000),
      ('scoperte-automatiche',         'scoperte-automatiche',         '{}',                   120000),
      ('virali-avvia',                 'virali-raccolta',              '{"azione":"avvia"}',   60000),
      ('virali-raccogli',              'virali-raccolta',              '{"azione":"raccogli"}', 300000),
      ('sync-social-metrics',          'sync-social-metrics',          '{}',                   300000)
    ) AS t(jobname, funzione, body, timeout_ms)
  LOOP
    SELECT jobid INTO v_id FROM cron.job WHERE jobname = v_job.jobname;
    CONTINUE WHEN v_id IS NULL;

    PERFORM cron.alter_job(
      v_id,
      command := format($cron$
        SELECT net.http_post(
          url := 'https://cktdoqvyyvjlkpahbjyi.supabase.co/functions/v1/%s',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
          ),
          body := %L::jsonb,
          timeout_milliseconds := %s
        );
      $cron$, v_job.funzione, v_job.body, v_job.timeout_ms)
    );
    v_cambiati := v_cambiati + 1;
  END LOOP;

  -- Nessun job deve più contenere il secret scritto per esteso.
  IF EXISTS (
    SELECT 1 FROM cron.job
     WHERE position((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1) IN command) > 0
  ) THEN
    RAISE EXCEPTION 'C''è ancora un job col secret scritto nel comando: aggiungerlo alla lista sopra';
  END IF;

  RAISE NOTICE 'Job del cron che ora leggono il secret dal Vault: %', v_cambiati;
END
$$;
