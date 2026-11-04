-- Inserzioni che fanno soldi, pulite (Attilio 01/11/2026).
--
-- Le ricerche per parola chiave nella Libreria inserzioni portano anche
-- prodotti per il dolore (materassi, solette, creme) e pagine fuori tema
-- (veterinari, predicatori, acqua a domicilio). Gemini classifica ogni
-- inserzione (virali-raccolta, azione 'classifica' e a ogni 'raccogli'):
--   studio      studi, centri e professionisti che portano pazienti
--   prodotto    prodotti per la salute senza un professionista
--   fuori_tema  tutto il resto, comprese le inserzioni per i professionisti
-- Nell'app di serie si vedono solo gli studi; i prodotti con un interruttore.

ALTER TABLE public.virali_inserzioni
  ADD COLUMN IF NOT EXISTS categoria TEXT
  CHECK (categoria IN ('studio', 'prodotto', 'fuori_tema'));

-- Inserzioni di catalogo: Meta lascia «{{product.brand}}» al posto del testo.
UPDATE public.virali_inserzioni
SET testo = btrim(regexp_replace(testo, '\{\{[^}]*\}\}', '', 'g')),
    titolo = btrim(regexp_replace(titolo, '\{\{[^}]*\}\}', '', 'g'))
WHERE testo ~ '\{\{' OR titolo ~ '\{\{';

-- Doppioni: la stessa pagina con lo stesso testo e ad_id diversi sono
-- varianti della stessa inserzione. La vista ne tiene una sola per paese e
-- professione (con la copertina, accesa da più tempo), con i giorni più lunghi
-- del gruppo e le varianti sommate.
CREATE OR REPLACE VIEW public.virali_inserzioni_vista
WITH (security_invoker = true) AS
SELECT
  id, ad_id, paese, professione, ricerca, pagina, pagina_id, iniziata_il, finita_il, attiva,
  giorni_gruppo AS giorni,
  varianti_gruppo AS varianti,
  testo, titolo, link, cta, piattaforme, video_url, copertina, analisi, analisi_il,
  categoria, aggiornato_il, creato_il
FROM (
  SELECT
    i.*,
    MAX(i.giorni) OVER g AS giorni_gruppo,
    (SUM(i.varianti) OVER g)::INT AS varianti_gruppo,
    ROW_NUMBER() OVER (g ORDER BY (i.copertina IS NULL), i.giorni DESC NULLS LAST, i.varianti DESC, i.id) AS posto
  FROM public.virali_inserzioni i
  WHERE i.attiva
  WINDOW g AS (
    PARTITION BY i.paese, i.professione, lower(i.pagina),
      lower(regexp_replace(btrim(i.titolo || ' ' || i.testo), '\s+', ' ', 'g'))
  )
) x
WHERE posto = 1;

GRANT SELECT ON public.virali_inserzioni_vista TO authenticated;
