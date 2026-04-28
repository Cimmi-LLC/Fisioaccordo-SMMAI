-- Fix: the previous migration's bucket INSERT didn't take effect.
-- Force-create the bucket using the auth-aware storage helper.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'brand-photos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'brand-photos',
      'brand-photos',
      TRUE,
      10485760, -- 10 MB
      ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    );
  END IF;
END
$$;
