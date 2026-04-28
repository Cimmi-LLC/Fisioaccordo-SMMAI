-- ============================================
-- SETUP COMPLETO PER NUOVO PROGETTO SUPABASE
-- Esegui questo SQL nella dashboard Supabase:
-- SQL Editor → New Query → Incolla tutto → Run
-- ============================================

-- ── Funzione helper per updated_at ──
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════
-- 1. GENERATED_CONTENTS
-- ══════════════════════════════════════════════
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

ALTER TABLE public.generated_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content" ON public.generated_contents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own content" ON public.generated_contents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own content" ON public.generated_contents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own content" ON public.generated_contents FOR DELETE USING (auth.uid() = user_id);

-- ── Functions per generated_contents ──
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
  id UUID, user_id UUID, title TEXT, content_text TEXT, topic TEXT, audience TEXT,
  platform TEXT, post_type TEXT, tone TEXT, length TEXT, images JSON,
  is_published BOOLEAN, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.generated_contents (user_id, title, content_text, topic, audience, platform, post_type, tone, length, images)
  VALUES (p_user_id, p_title, p_content_text, p_topic, p_audience, p_platform, p_post_type, p_tone, p_length, p_images::JSON)
  RETURNING generated_contents.id, generated_contents.user_id, generated_contents.title, generated_contents.content_text,
    generated_contents.topic, generated_contents.audience, generated_contents.platform, generated_contents.post_type,
    generated_contents.tone, generated_contents.length, generated_contents.images, generated_contents.is_published,
    generated_contents.created_at, generated_contents.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_contents(p_user_id UUID)
RETURNS TABLE (
  id UUID, user_id UUID, title TEXT, content_text TEXT, topic TEXT, audience TEXT,
  platform TEXT, post_type TEXT, tone TEXT, length TEXT, images JSON, engagement_stats JSON,
  is_published BOOLEAN, published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT gc.id, gc.user_id, gc.title, gc.content_text, gc.topic, gc.audience,
    gc.platform, gc.post_type, gc.tone, gc.length, gc.images, gc.engagement_stats,
    gc.is_published, gc.published_at, gc.created_at, gc.updated_at
  FROM public.generated_contents gc WHERE gc.user_id = p_user_id ORDER BY gc.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_content(p_content_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.generated_contents WHERE id = p_content_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_content_published(p_content_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.generated_contents SET is_published = TRUE, published_at = NOW(), updated_at = NOW()
  WHERE id = p_content_id AND user_id = p_user_id;
END;
$$;

-- ══════════════════════════════════════════════
-- 2. INSTAGRAM_CONNECTIONS
-- ══════════════════════════════════════════════
CREATE TABLE public.instagram_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  profile_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, instagram_user_id)
);

ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own instagram connections" ON public.instagram_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own instagram connections" ON public.instagram_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own instagram connections" ON public.instagram_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own instagram connections" ON public.instagram_connections FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_user_instagram_connections(p_user_id UUID)
RETURNS TABLE(id UUID, instagram_user_id TEXT, username TEXT, profile_data JSONB, is_active BOOLEAN, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT ic.id, ic.instagram_user_id, ic.username, ic.profile_data, ic.is_active, ic.created_at, ic.updated_at
  FROM public.instagram_connections ic WHERE ic.user_id = p_user_id AND ic.is_active = true ORDER BY ic.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_instagram_connection(
  p_user_id UUID, p_instagram_user_id TEXT, p_username TEXT, p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL, p_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, p_profile_data JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE connection_id UUID;
BEGIN
  INSERT INTO public.instagram_connections (user_id, instagram_user_id, username, access_token, refresh_token, token_expires_at, profile_data, updated_at)
  VALUES (p_user_id, p_instagram_user_id, p_username, p_access_token, p_refresh_token, p_token_expires_at, p_profile_data, NOW())
  ON CONFLICT (user_id, instagram_user_id) DO UPDATE SET
    username = EXCLUDED.username, access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at, profile_data = EXCLUDED.profile_data, is_active = true, updated_at = NOW()
  RETURNING id INTO connection_id;
  RETURN connection_id;
END;
$$;

-- ══════════════════════════════════════════════
-- 3. PUBLISHED_POSTS
-- ══════════════════════════════════════════════
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

ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own published posts" ON public.published_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own published posts" ON public.published_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own published posts" ON public.published_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_published_posts_updated_at BEFORE UPDATE ON public.published_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_published_posts_user_id ON public.published_posts(user_id);
CREATE INDEX idx_published_posts_status ON public.published_posts(status);
CREATE INDEX idx_published_posts_published_at ON public.published_posts(published_at DESC);

-- ══════════════════════════════════════════════
-- 4. USER_PHOTOS
-- ══════════════════════════════════════════════
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

-- ══════════════════════════════════════════════
-- 5. USER_AI_MEMORY
-- ══════════════════════════════════════════════
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

-- ══════════════════════════════════════════════
-- 6. VIRAL_ANALYSIS
-- ══════════════════════════════════════════════
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

-- ══════════════════════════════════════════════
-- 7. TRENDING_TOPICS
-- ══════════════════════════════════════════════
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

-- ══════════════════════════════════════════════
-- 8. META_CONNECTIONS
-- ══════════════════════════════════════════════
CREATE TABLE public.meta_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  facebook_user_id TEXT,
  page_id TEXT,
  page_name TEXT,
  page_access_token TEXT,
  instagram_business_id TEXT,
  instagram_username TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meta connections" ON public.meta_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meta connections" ON public.meta_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meta connections" ON public.meta_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meta connections" ON public.meta_connections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_meta_connections_updated_at BEFORE UPDATE ON public.meta_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════
-- 9. GOOGLE_CALENDAR_CONNECTIONS
-- ══════════════════════════════════════════════
CREATE TABLE public.google_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar connections" ON public.google_calendar_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar connections" ON public.google_calendar_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar connections" ON public.google_calendar_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar connections" ON public.google_calendar_connections FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 10. CANVA_TEMPLATES
-- ══════════════════════════════════════════════
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

ALTER TABLE public.canva_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view default templates" ON public.canva_templates FOR SELECT USING (is_default = true);
CREATE POLICY "Users can view own templates" ON public.canva_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.canva_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.canva_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.canva_templates FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 11. SAFE VIEWS (security invoker)
-- ══════════════════════════════════════════════
CREATE VIEW public.meta_connections_safe WITH (security_invoker = true) AS
  SELECT id, user_id, facebook_user_id, page_id, page_name, instagram_business_id,
    instagram_username, token_expires_at, is_active, created_at, updated_at
  FROM public.meta_connections;

CREATE VIEW public.google_calendar_connections_safe WITH (security_invoker = true) AS
  SELECT id, user_id, google_user_id, email, calendar_id, calendar_name,
    token_expires_at, is_active, created_at, updated_at
  FROM public.google_calendar_connections;

-- ══════════════════════════════════════════════
-- 12. STORAGE BUCKETS
-- ══════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('carousel-images', 'carousel-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies per user-photos
CREATE POLICY "Users can upload their own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own stored photos" ON storage.objects FOR SELECT USING (bucket_id = 'user-photos');
CREATE POLICY "Users can delete their own stored photos" ON storage.objects FOR DELETE USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies per carousel-images
CREATE POLICY "Carousel images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'carousel-images');
CREATE POLICY "Authenticated users can upload carousel images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');
CREATE POLICY "Service role can manage carousel images" ON storage.objects FOR ALL USING (bucket_id = 'carousel-images') WITH CHECK (bucket_id = 'carousel-images');
