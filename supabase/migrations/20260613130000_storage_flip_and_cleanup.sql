-- ================================================================
-- Step 4 — Flip bucket pubblici → private + drop 7 bucket fantasma
--
-- Vincoli del codice già deployato (vedi commit 3a/3b/3c):
--   - useUserPhotos / useBrandPhotos / useStoryTemplates / CanvaTemplateSelector
--     usano signedUrl() per la visualizzazione
--   - save-slide-image, generate-carousel-images: caricano su path
--     `<user_id>/<carousel_id>/...` e ritornano {bucket, path}
--   - meta-publish, process-scheduled-posts: createSignedUrls al publish-time
--
-- DOWN: ridiventare public=true è banale. Per i bucket droppati l'unico
-- ripristino è ricrearli a mano dalla dashboard (vedi
-- docs/storage-state-before.md per la configurazione).
-- ================================================================

-- ── 1. Flip a private dei bucket usati (avranno upload nuovi col path
--      conforme alla policy folder-owner)
UPDATE storage.buckets
   SET public = false
 WHERE id IN ('user-photos', 'story-templates', 'carousel-images');

-- ── 2. Drop 7 bucket dead-code (0 file, 0 reference nel codice)
--      Prima cancello tutti gli oggetti (per sicurezza, anche se vuoti),
--      poi il bucket. Le policy associate cadono insieme al bucket.
DELETE FROM storage.objects WHERE bucket_id IN (
  'brand-photos','generated-images','media-uploads',
  'thumbnails','workspace-logos','media','templates'
);
DELETE FROM storage.buckets WHERE id IN (
  'brand-photos','generated-images','media-uploads',
  'thumbnails','workspace-logos','media','templates'
);

-- ── 3. Cancella i 660 file orfani in carousel-images (path legacy
--      `carousels/<user_id>/...` che NON soddisfa la nuova policy folder-owner).
--      Sono test pre-produzione: 0 record in published_posts che li referenzino.
DELETE FROM storage.objects
 WHERE bucket_id = 'carousel-images'
   AND name LIKE 'carousels/%';

-- ── 4. Pulizia policy storage residue dei bucket droppati (best-effort).
--      Le policy referenziano `bucket_id = '<name>'` come stringa;
--      Postgres non le cascade automaticamente.
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

-- ── 5. Storage.buckets: drop residual carousel-images public-read policy
--      (sostituita da carousel_images_select_owner nello Step 2).
DROP POLICY IF EXISTS "Service role can manage carousel images" ON storage.objects;
-- Ricreo la policy per service_role mantenendo l'ALL su carousel-images,
-- visto che le edge function la usano per upload + signing.
CREATE POLICY "service_role_carousel_images_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'carousel-images')
  WITH CHECK (bucket_id = 'carousel-images');
