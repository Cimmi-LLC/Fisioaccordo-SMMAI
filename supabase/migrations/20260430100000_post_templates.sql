-- Post template selection per brand (decorative SVG overlay on slides)
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS post_template_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS post_template_color_role TEXT DEFAULT 'secondary' CHECK (post_template_color_role IN ('primary','secondary','terziario')),
  ADD COLUMN IF NOT EXISTS post_template_opacity NUMERIC(3,2) DEFAULT 0.85 CHECK (post_template_opacity >= 0 AND post_template_opacity <= 1);

NOTIFY pgrst, 'reload schema';
