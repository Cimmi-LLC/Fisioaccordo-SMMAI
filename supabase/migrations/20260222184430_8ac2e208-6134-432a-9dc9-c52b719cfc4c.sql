-- Create public bucket for carousel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read carousel images (public bucket)
CREATE POLICY "Carousel images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

-- Allow authenticated users to upload carousel images
CREATE POLICY "Authenticated users can upload carousel images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');

-- Allow service role to upload (for edge functions)
CREATE POLICY "Service role can manage carousel images"
ON storage.objects FOR ALL
USING (bucket_id = 'carousel-images')
WITH CHECK (bucket_id = 'carousel-images');