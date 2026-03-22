-- Ensure RLS is enabled on meta_connections
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate tightly scoped ones
DROP POLICY IF EXISTS "Users can view their own meta connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can insert their own meta connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can update their own meta connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can delete their own meta connections" ON public.meta_connections;

-- Users can only read their own connection rows
CREATE POLICY "Users can view their own meta connections"
  ON public.meta_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meta connections"
  ON public.meta_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meta connections"
  ON public.meta_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meta connections"
  ON public.meta_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create a view that exposes meta_connections WITHOUT the token column for client use
CREATE OR REPLACE VIEW public.meta_connections_safe AS
  SELECT
    id,
    user_id,
    facebook_user_id,
    page_id,
    page_name,
    instagram_business_id,
    instagram_username,
    token_expires_at,
    is_active,
    created_at,
    updated_at
  FROM public.meta_connections;

-- Ensure RLS is enabled on google_calendar_connections
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate tightly scoped ones
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can insert their own calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can update their own calendar connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Users can delete their own calendar connections" ON public.google_calendar_connections;

CREATE POLICY "Users can view their own calendar connections"
  ON public.google_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar connections"
  ON public.google_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
  ON public.google_calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections"
  ON public.google_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create a view that exposes google_calendar_connections WITHOUT token columns
CREATE OR REPLACE VIEW public.google_calendar_connections_safe AS
  SELECT
    id,
    user_id,
    google_user_id,
    email,
    calendar_id,
    calendar_name,
    token_expires_at,
    is_active,
    created_at,
    updated_at
  FROM public.google_calendar_connections;