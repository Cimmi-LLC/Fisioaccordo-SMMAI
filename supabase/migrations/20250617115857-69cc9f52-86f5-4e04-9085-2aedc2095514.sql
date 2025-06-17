
-- Aggiungi la tabella generated_contents al database esistente
CREATE TABLE IF NOT EXISTS public.generated_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  topic TEXT,
  audience TEXT,
  platform TEXT DEFAULT 'instagram',
  post_type TEXT DEFAULT 'carosello',
  tone TEXT DEFAULT 'professionale',
  length TEXT DEFAULT 'media',
  images JSON DEFAULT '[]'::json,
  engagement_stats JSON DEFAULT '{}'::json,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita Row Level Security
ALTER TABLE public.generated_contents ENABLE ROW LEVEL SECURITY;

-- Policies per generated_contents
CREATE POLICY "Users can view their own content" 
  ON public.generated_contents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content" 
  ON public.generated_contents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" 
  ON public.generated_contents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content" 
  ON public.generated_contents FOR DELETE 
  USING (auth.uid() = user_id);
