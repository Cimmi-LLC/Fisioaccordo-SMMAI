CREATE TABLE public.competitor_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  analysis_data JSONB DEFAULT '{}',
  analysis_text TEXT,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitor analyses" ON public.competitor_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own competitor analyses" ON public.competitor_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own competitor analyses" ON public.competitor_analysis FOR DELETE USING (auth.uid() = user_id);
