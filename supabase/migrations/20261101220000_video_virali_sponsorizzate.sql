-- «Probabili sponsorizzate» relative al canale, non più la soglia fissa del 2%.
-- Su Instagram il 2% nascondeva il 60% dei reel (mediana 1,66%: Instagram non
-- dà le condivisioni). Un video spinto con le inserzioni fa visualizzazioni
-- senza interazioni: si segna quando ha meno di un terzo dell'engagement
-- mediano del suo canale.
-- La vista rispetta i permessi di virali_video (security_invoker).

CREATE OR REPLACE VIEW public.virali_video_vista
WITH (security_invoker = true) AS
SELECT
  v.*,
  (v.engagement IS NOT NULL AND m.mediana IS NOT NULL AND v.engagement < m.mediana / 3) AS sponsorizzata_probabile
FROM public.virali_video v
LEFT JOIN (
  SELECT piattaforma, handle, percentile_cont(0.5) WITHIN GROUP (ORDER BY engagement) AS mediana
  FROM public.virali_video
  WHERE engagement IS NOT NULL
  GROUP BY piattaforma, handle
) m USING (piattaforma, handle);

GRANT SELECT ON public.virali_video_vista TO authenticated;
