
-- Tabella per salvare le connessioni Instagram degli utenti
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
  
  -- Constraint per evitare connessioni duplicate
  UNIQUE(user_id, instagram_user_id)
);

-- Abilita RLS per la sicurezza
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo le proprie connessioni
CREATE POLICY "Users can view their own instagram connections" 
  ON public.instagram_connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di creare le proprie connessioni
CREATE POLICY "Users can create their own instagram connections" 
  ON public.instagram_connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti di aggiornare le proprie connessioni
CREATE POLICY "Users can update their own instagram connections" 
  ON public.instagram_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy per permettere agli utenti di eliminare le proprie connessioni
CREATE POLICY "Users can delete their own instagram connections" 
  ON public.instagram_connections 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Funzione per ottenere le connessioni Instagram dell'utente
CREATE OR REPLACE FUNCTION public.get_user_instagram_connections(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  instagram_user_id TEXT,
  username TEXT,
  profile_data JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.instagram_user_id,
    ic.username,
    ic.profile_data,
    ic.is_active,
    ic.created_at,
    ic.updated_at
  FROM public.instagram_connections ic
  WHERE ic.user_id = p_user_id AND ic.is_active = true
  ORDER BY ic.created_at DESC;
END;
$$;

-- Funzione per salvare/aggiornare una connessione Instagram
CREATE OR REPLACE FUNCTION public.upsert_instagram_connection(
  p_user_id UUID,
  p_instagram_user_id TEXT,
  p_username TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_profile_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  connection_id UUID;
BEGIN
  INSERT INTO public.instagram_connections (
    user_id,
    instagram_user_id,
    username,
    access_token,
    refresh_token,
    token_expires_at,
    profile_data,
    updated_at
  )
  VALUES (
    p_user_id,
    p_instagram_user_id,
    p_username,
    p_access_token,
    p_refresh_token,
    p_token_expires_at,
    p_profile_data,
    NOW()
  )
  ON CONFLICT (user_id, instagram_user_id)
  DO UPDATE SET
    username = EXCLUDED.username,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    token_expires_at = EXCLUDED.token_expires_at,
    profile_data = EXCLUDED.profile_data,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO connection_id;
  
  RETURN connection_id;
END;
$$;
