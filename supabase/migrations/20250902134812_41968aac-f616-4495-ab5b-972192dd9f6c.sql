-- Crea tabella per tracciare i post pubblicati tramite Blotato
CREATE TABLE public.published_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  blotato_post_id TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'scheduled', 'failed')),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo i propri post
CREATE POLICY "Users can view their own published posts" 
ON public.published_posts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di inserire i propri post
CREATE POLICY "Users can insert their own published posts" 
ON public.published_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare i propri post
CREATE POLICY "Users can update their own published posts" 
ON public.published_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_published_posts_updated_at
  BEFORE UPDATE ON public.published_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indice per migliorare le performance
CREATE INDEX idx_published_posts_user_id ON public.published_posts(user_id);
CREATE INDEX idx_published_posts_status ON public.published_posts(status);
CREATE INDEX idx_published_posts_published_at ON public.published_posts(published_at DESC);