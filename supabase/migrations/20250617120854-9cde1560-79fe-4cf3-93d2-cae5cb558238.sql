
-- Funzione per inserire contenuti generati
CREATE OR REPLACE FUNCTION public.insert_generated_content(
  p_user_id UUID,
  p_title TEXT,
  p_content_text TEXT,
  p_topic TEXT,
  p_audience TEXT DEFAULT '',
  p_platform TEXT DEFAULT 'instagram',
  p_post_type TEXT DEFAULT 'carosello',
  p_tone TEXT DEFAULT 'professionale',
  p_length TEXT DEFAULT 'media',
  p_images TEXT DEFAULT '[]'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content_text TEXT,
  topic TEXT,
  audience TEXT,
  platform TEXT,
  post_type TEXT,
  tone TEXT,
  length TEXT,
  images JSON,
  is_published BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.generated_contents (
    user_id, title, content_text, topic, audience, 
    platform, post_type, tone, length, images
  )
  VALUES (
    p_user_id, p_title, p_content_text, p_topic, p_audience,
    p_platform, p_post_type, p_tone, p_length, p_images::JSON
  )
  RETURNING 
    generated_contents.id,
    generated_contents.user_id,
    generated_contents.title,
    generated_contents.content_text,
    generated_contents.topic,
    generated_contents.audience,
    generated_contents.platform,
    generated_contents.post_type,
    generated_contents.tone,
    generated_contents.length,
    generated_contents.images,
    generated_contents.is_published,
    generated_contents.created_at,
    generated_contents.updated_at;
END;
$$;

-- Funzione per ottenere i contenuti dell'utente
CREATE OR REPLACE FUNCTION public.get_user_contents(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content_text TEXT,
  topic TEXT,
  audience TEXT,
  platform TEXT,
  post_type TEXT,
  tone TEXT,
  length TEXT,
  images JSON,
  engagement_stats JSON,
  is_published BOOLEAN,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.id,
    gc.user_id,
    gc.title,
    gc.content_text,
    gc.topic,
    gc.audience,
    gc.platform,
    gc.post_type,
    gc.tone,
    gc.length,
    gc.images,
    gc.engagement_stats,
    gc.is_published,
    gc.published_at,
    gc.created_at,
    gc.updated_at
  FROM public.generated_contents gc
  WHERE gc.user_id = p_user_id
  ORDER BY gc.created_at DESC;
END;
$$;

-- Funzione per eliminare contenuto
CREATE OR REPLACE FUNCTION public.delete_user_content(
  p_content_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.generated_contents 
  WHERE id = p_content_id AND user_id = p_user_id;
END;
$$;

-- Funzione per marcare come pubblicato
CREATE OR REPLACE FUNCTION public.mark_content_published(
  p_content_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.generated_contents 
  SET 
    is_published = TRUE,
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_content_id AND user_id = p_user_id;
END;
$$;
