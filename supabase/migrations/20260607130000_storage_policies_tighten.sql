-- ================================================================
-- Step 2 — Stringere le policy storage (L2) + L3 carousel_image_logs
--
-- BUCKET INTERESSATI:
--   user-photos       (in uso, vuoto)
--   story-templates   (in uso, vuoto)
--   carousel-images   (in uso, 660 file orfani di test, public per ora)
--
-- POLICY CAMBIATE:
--   - SELECT permissiva (solo bucket_id) → SELECT folder-owner ([1]=auth.uid())
--   - INSERT permissiva (auth.role()) su carousel-images → INSERT folder-owner
--
-- NOTA: il bucket carousel-images resta public=TRUE in questo step.
-- Letture via endpoint pubblico (/storage/v1/object/public/...) bypassano
-- le policy SELECT — il fix delle URL pubbliche arriva nello Step 4 col
-- flip public=false. Stringere ora la SELECT chiude però le letture via
-- storage API autenticata (cross-utente).
--
-- I 660 file esistenti in carousel-images hanno il path legacy
-- `carousels/<user_id>/...` che NON soddisfa la nuova policy folder-owner
-- [1]=auth.uid(). Diventeranno inaccessibili in lettura via storage API.
-- Non è un problema: nello Step 4 vengono cancellati come orfani di test.
--
-- DOWN (manuale, in caso di rollback):
--   Vedi il file 20260607120000_snapshot_runtime_state.sql per riapplicare
--   le policy precedenti.
-- ================================================================

-- ─── user-photos ───
-- Drop SELECT permissiva
DROP POLICY IF EXISTS "Users can view their own stored photos" ON storage.objects;
-- Ricrea col filtro folder-owner
CREATE POLICY "user_photos_select_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── story-templates ───
-- Drop SELECT permissiva
DROP POLICY IF EXISTS "story templates: read public" ON storage.objects;
-- Ricrea col filtro folder-owner
CREATE POLICY "story_templates_select_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'story-templates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── carousel-images ───
-- Drop policy permissive (SELECT pubblica + INSERT senza ownership)
DROP POLICY IF EXISTS "Carousel images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload carousel images" ON storage.objects;

-- Le edge function caricano in carousel-images via service role: la policy
-- 'Service role can manage carousel images' (cmd=ALL) esiste già e copre
-- queste scritture. Non viene toccata.

-- Per upload e letture *via client autenticato* (oggi non avviene, ma chiudiamo
-- la porta) applichiamo folder-owner col path nuovo `<user_id>/<carousel_id>/...`
CREATE POLICY "carousel_images_select_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'carousel-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "carousel_images_insert_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'carousel-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "carousel_images_delete_owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'carousel-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- L3 — carousel_image_logs: chiudere INSERT permissivo (WITH CHECK true)
-- ================================================================

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.carousel_image_logs;
CREATE POLICY "carousel_image_logs_insert_owner"
  ON public.carousel_image_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
