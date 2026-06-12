# Stato Storage — snapshot pre-fix (2026-06-07)

## Buckets

| id | public | owner |
|---|---|---|
| `brand-photos` | **True** | — |
| `carousel-images` | **True** | — |
| `generated-images` | **True** | — |
| `graphic-templates` | **True** | — |
| `media` | **False** | — |
| `media-uploads` | **True** | — |
| `story-templates` | **True** | — |
| `templates` | **False** | — |
| `thumbnails` | **True** | — |
| `user-photos` | **True** | — |
| `viral-uploads` | **False** | — |
| `workspace-logos` | **True** | — |

## Storage.objects policies (totale: 33)

| Bucket target | Cmd | Policy | USING | WITH CHECK |
|---|---|---|---|---|
| `brand-photos` | DELETE | `brand_photos delete own folder` | `((bucket_id = 'brand-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `brand-photos` | INSERT | `brand_photos write own folder` | `—` | `((bucket_id = 'brand-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `brand-photos` | SELECT | `brand_photos read public` | `(bucket_id = 'brand-photos'::text)` | `—` |
| `carousel-images` | ALL | `Service role can manage carousel images` | `(bucket_id = 'carousel-images'::text)` | `(bucket_id = 'carousel-images'::text)` |
| `carousel-images` | INSERT | `Authenticated users can upload carousel images` | `—` | `((bucket_id = 'carousel-images'::text) AND (auth.role() = 'authenticated'::text))` |
| `carousel-images` | SELECT | `Carousel images are publicly accessible` | `(bucket_id = 'carousel-images'::text)` | `—` |
| `generated-images` | INSERT | `Auth upload generated` | `—` | `(bucket_id = 'generated-images'::text)` |
| `generated-images` | INSERT | `generated_images_insert` | `—` | `((bucket_id = 'generated-images'::text) AND (auth.uid() IS NOT NULL))` |
| `generated-images` | SELECT | `Public read generated` | `(bucket_id = 'generated-images'::text)` | `—` |
| `generated-images` | SELECT | `generated_images_select` | `(bucket_id = 'generated-images'::text)` | `—` |
| `graphic-templates` | INSERT | `graphic_templates_storage_insert` | `—` | `((bucket_id = 'graphic-templates'::text) AND (auth.uid() IS NOT NULL))` |
| `graphic-templates` | SELECT | `graphic_templates_storage_select` | `(bucket_id = 'graphic-templates'::text)` | `—` |
| `media` | DELETE | `Auth delete media` | `(bucket_id = 'media'::text)` | `—` |
| `media` | INSERT | `Auth upload media` | `—` | `(bucket_id = 'media'::text)` |
| `media` | SELECT | `Auth read media` | `(bucket_id = 'media'::text)` | `—` |
| `media-uploads` | DELETE | `media_uploads_delete` | `((bucket_id = 'media-uploads'::text) AND (auth.uid() IS NOT NULL))` | `—` |
| `media-uploads` | INSERT | `media_uploads_insert` | `—` | `((bucket_id = 'media-uploads'::text) AND (auth.uid() IS NOT NULL))` |
| `media-uploads` | SELECT | `media_uploads_select` | `(bucket_id = 'media-uploads'::text)` | `—` |
| `story-templates` | DELETE | `story templates: delete own` | `((bucket_id = 'story-templates'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `story-templates` | INSERT | `story templates: insert own` | `—` | `((bucket_id = 'story-templates'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `story-templates` | SELECT | `story templates: read public` | `(bucket_id = 'story-templates'::text)` | `—` |
| `templates` | INSERT | `Auth upload templates` | `—` | `(bucket_id = 'templates'::text)` |
| `templates` | SELECT | `Auth read templates` | `(bucket_id = 'templates'::text)` | `—` |
| `thumbnails` | INSERT | `thumbnails_insert` | `—` | `((bucket_id = 'thumbnails'::text) AND (auth.uid() IS NOT NULL))` |
| `thumbnails` | SELECT | `thumbnails_select` | `(bucket_id = 'thumbnails'::text)` | `—` |
| `user-photos` | DELETE | `Users can delete their own stored photos` | `((bucket_id = 'user-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `user-photos` | INSERT | `Users can upload their own photos` | `—` | `((bucket_id = 'user-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `user-photos` | SELECT | `Users can view their own stored photos` | `(bucket_id = 'user-photos'::text)` | `—` |
| `viral-uploads` | ALL | `viral_uploads_owner_all` | `((bucket_id = 'viral-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `((bucket_id = 'viral-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `workspace-logos` | INSERT | `Auth upload logos` | `—` | `(bucket_id = 'workspace-logos'::text)` |
| `workspace-logos` | INSERT | `workspace_logos_insert` | `—` | `((bucket_id = 'workspace-logos'::text) AND (auth.uid() IS NOT NULL))` |
| `workspace-logos` | SELECT | `Public read logos` | `(bucket_id = 'workspace-logos'::text)` | `—` |
| `workspace-logos` | SELECT | `workspace_logos_select` | `(bucket_id = 'workspace-logos'::text)` | `—` |
