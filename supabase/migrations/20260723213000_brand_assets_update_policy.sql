-- L'upload con upsert:true su un oggetto gia esistente esegue un UPDATE su
-- storage.objects: senza policy UPDATE la ri-scrittura di sources/logo.png
-- (o di qualsiasi sorgente ricaricata) fallisce con violazione RLS.
create policy "brand_assets_update_owner"
on storage.objects for update
using (
  bucket_id = 'brand-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id = 'brand-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
