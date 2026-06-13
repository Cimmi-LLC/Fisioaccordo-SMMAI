-- ================================================================
-- Step 4 — Flip bucket pubblici → private + cleanup policy
--
-- NOTA OPERATIVA SU SUPABASE STORAGE:
--   - DELETE da storage.objects/storage.buckets è protetto da
--     storage.protect_delete() trigger. Richiede ownership della tabella.
--   - Per droppare bucket/oggetti via SQL non si può: serve la Storage REST
--     API (con service_role) o la dashboard.
--   - QUESTO file applica solo le operazioni che SQL standard può fare:
--       UPDATE buckets SET public=false   ← OK
--       DROP POLICY ...                   ← OK
--     Il drop dei 7 bucket fantasma e dei 660 file orfani va eseguito
--     manualmente dalla dashboard (vedi docs/storage-state-before.md).
--
-- Vincoli del codice già deployato (vedi commit 3a/3b/3c):
--   - useUserPhotos / useBrandPhotos / useStoryTemplates / CanvaTemplateSelector
--     usano signedUrl() per la visualizzazione
--   - save-slide-image, generate-carousel-images: caricano su path
--     `<user_id>/<carousel_id>/...` e ritornano {bucket, path}
--   - meta-publish, process-scheduled-posts: createSignedUrls al publish-time
--
-- DOWN: UPDATE … SET public = true riporta i bucket pubblici.
-- ================================================================

-- ── 1. Flip a private dei bucket usati
UPDATE storage.buckets
   SET public = false
 WHERE id IN ('user-photos', 'story-templates', 'carousel-images');

-- ── 2. Pulizia policy dei 7 bucket dead-code (le policy NON cascade
--      automaticamente quando i bucket vengono droppati dalla dashboard).
DROP POLICY IF EXISTS "brand_photos delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "brand_photos read public" ON storage.objects;
DROP POLICY IF EXISTS "brand_photos write own folder" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload generated" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated" ON storage.objects;
DROP POLICY IF EXISTS "generated_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "generated_images_select" ON storage.objects;
DROP POLICY IF EXISTS "media_uploads_delete" ON storage.objects;
DROP POLICY IF EXISTS "media_uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_uploads_select" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_insert" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_select" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_select" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete media" ON storage.objects;
DROP POLICY IF EXISTS "Auth read media" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload media" ON storage.objects;
DROP POLICY IF EXISTS "Auth read templates" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload templates" ON storage.objects;

-- ── 3. Service-role policy esplicita per carousel-images.
--      Le edge function caricano + firmano via service_role; la vecchia
--      policy generica viene sostituita da una più stretta.
DROP POLICY IF EXISTS "Service role can manage carousel images" ON storage.objects;
CREATE POLICY "service_role_carousel_images_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'carousel-images')
  WITH CHECK (bucket_id = 'carousel-images');

-- ── 4. CLEANUP MANUALE (da fare dalla dashboard Supabase Storage):
--      a) Drop bucket: brand-photos, generated-images, media-uploads,
--         thumbnails, workspace-logos, media, templates
--         Vuoti, 0 reference nel codice.
--      b) Drop 645 oggetti orfani in carousel-images con prefisso
--         "carousels/" (path legacy). Già inaccessibili (policy folder-owner
--         non li matcha) ma occupano spazio. Sono test pre-produzione.
