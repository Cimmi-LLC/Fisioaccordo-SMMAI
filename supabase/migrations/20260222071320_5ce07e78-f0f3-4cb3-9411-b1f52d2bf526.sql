
-- Table: user_photos
CREATE TABLE public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'generale',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own photos" ON public.user_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own photos" ON public.user_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own photos" ON public.user_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.user_photos FOR DELETE USING (auth.uid() = user_id);

-- Table: user_ai_memory
CREATE TABLE public.user_ai_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'preference',
  content TEXT NOT NULL,
  context TEXT,
  importance INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own memories" ON public.user_ai_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own memories" ON public.user_ai_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own memories" ON public.user_ai_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own memories" ON public.user_ai_memory FOR DELETE USING (auth.uid() = user_id);

-- Table: viral_analysis
CREATE TABLE public.viral_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_url TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  post_type TEXT NOT NULL DEFAULT 'carosello',
  patterns JSONB DEFAULT '{}',
  engagement_data JSONB DEFAULT '{}',
  analysis_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.viral_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own analyses" ON public.viral_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analyses" ON public.viral_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analyses" ON public.viral_analysis FOR DELETE USING (auth.uid() = user_id);

-- Table: trending_topics
CREATE TABLE public.trending_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  trend_score INT NOT NULL DEFAULT 50,
  source TEXT,
  suggested_content TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own trends" ON public.trending_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trends" ON public.trending_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trends" ON public.trending_topics FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for user photos
INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true);

-- Storage RLS policies
CREATE POLICY "Users can upload their own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own photos" ON storage.objects FOR SELECT USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public can view user photos" ON storage.objects FOR SELECT USING (bucket_id = 'user-photos');
