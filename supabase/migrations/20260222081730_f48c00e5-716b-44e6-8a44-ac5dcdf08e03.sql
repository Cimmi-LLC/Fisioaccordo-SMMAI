
-- Create canva_templates table
CREATE TABLE public.canva_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  background_url TEXT NOT NULL,
  text_zones JSONB NOT NULL DEFAULT '[{"zone": "top", "x": 5, "y": 5, "width": 90, "height": 20}, {"zone": "center", "x": 5, "y": 30, "width": 90, "height": 40}, {"zone": "bottom", "x": 5, "y": 75, "width": 90, "height": 20}]',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  is_default BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canva_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view default templates
CREATE POLICY "Anyone can view default templates"
ON public.canva_templates FOR SELECT
USING (is_default = true);

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
ON public.canva_templates FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates"
ON public.canva_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.canva_templates FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.canva_templates FOR DELETE
USING (auth.uid() = user_id);
