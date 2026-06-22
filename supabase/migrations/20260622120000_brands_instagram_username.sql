-- ================================================================
-- brands.instagram_username — handle compilato dall'admin per scraping
--
-- Diverso da meta_connections.instagram_username che è popolato solo
-- dopo OAuth Meta. Questo campo permette di scrapere via Apify ANCHE
-- per i clienti che non vogliono / non possono collegare OAuth.
--
-- Coexistenza con OAuth: l'edge fn Apify (sync-instagram-metrics-apify)
-- salta i brand che hanno già una meta_connections attiva, perché in
-- quel caso il sync giornaliero Meta è più ricco (reach/saves/shares).
-- ================================================================

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS instagram_username text;

COMMENT ON COLUMN public.brands.instagram_username IS
  'IG handle del cliente, compilato dall''admin in /admin. Usato dal cron Apify per scaricare metriche pubbliche.';

CREATE INDEX IF NOT EXISTS idx_brands_instagram_username
  ON public.brands (instagram_username)
  WHERE instagram_username IS NOT NULL;
