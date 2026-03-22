-- Fix the safe views to use SECURITY INVOKER (so RLS of the querying user is enforced)
-- Drop and recreate both views with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.meta_connections_safe;
CREATE VIEW public.meta_connections_safe
  WITH (security_invoker = true)
AS
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

DROP VIEW IF EXISTS public.google_calendar_connections_safe;
CREATE VIEW public.google_calendar_connections_safe
  WITH (security_invoker = true)
AS
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