-- ================================================================
-- SNAPSHOT del runtime state (2026-06-07) — PRE-FIX STORAGE
--
-- Questo file cattura lo schema (tabelle, indici, policy, funzioni)
-- che oggi esiste SOLO a runtime: creato a suo tempo dalla dashboard
-- Supabase / piattaforma Lovable, mai versato in migration files.
--
-- Scopo: avere un rollback di riferimento prima di toccare lo storage.
-- Tutto IF NOT EXISTS / OR REPLACE — applicare 2 volte è no-op.
--
-- 12 tabelle dashboard-created (9 fantasma, 3 in uso):
--   in uso:    carousel_image_logs, google_calendar_connections, profiles
--   fantasma:  ai_generations_log, content_items, editorial_plans,
--              graphic_concepts, graphic_templates, strategies,
--              video_scripts, workspace_members, workspaces
-- ================================================================

-- ─── function: _meta_token_key ───
CREATE OR REPLACE FUNCTION public._meta_token_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'vault', 'public'
AS $function$
DECLARE v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'meta_token_key' LIMIT 1;
  RETURN v_key;
END;
$function$
;

-- ─── function: get_meta_connection_token ───
CREATE OR REPLACE FUNCTION public.get_meta_connection_token(p_connection_id uuid)
 RETURNS TABLE(page_access_token text, instagram_business_id text, token_expires_at timestamp with time zone, is_active boolean, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_key TEXT;
BEGIN
  v_key := public._meta_token_key();
  RETURN QUERY
  SELECT
    CASE WHEN mc.page_access_token_enc IS NOT NULL AND v_key IS NOT NULL
      THEN pgp_sym_decrypt(mc.page_access_token_enc, v_key) ELSE mc.page_access_token END,
    mc.instagram_business_id, mc.token_expires_at, mc.is_active, mc.user_id
  FROM public.meta_connections mc WHERE mc.id = p_connection_id LIMIT 1;
END;
$function$
;

-- ─── function: is_workspace_admin ───
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = p_workspace_id
      AND owner_id = auth.uid()
  );
$function$
;

-- ─── function: is_workspace_member ───
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM workspaces
    WHERE id = p_workspace_id
      AND owner_id = auth.uid()
  );
$function$
;

-- ─── function: update_updated_at_column ───
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- ─── function: upsert_meta_connection ───
CREATE OR REPLACE FUNCTION public.upsert_meta_connection(p_user_id uuid, p_page_access_token text, p_instagram_business_id text, p_instagram_username text, p_token_expires_at timestamp with time zone, p_facebook_user_id text DEFAULT NULL::text, p_page_id text DEFAULT NULL::text, p_page_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_key TEXT; v_enc BYTEA; v_id UUID;
BEGIN
  v_key := public._meta_token_key();
  IF v_key IS NULL THEN RAISE EXCEPTION 'Meta token encryption key not configured'; END IF;
  v_enc := pgp_sym_encrypt(p_page_access_token, v_key);
  UPDATE public.meta_connections SET is_active = false, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.meta_connections (
    user_id, facebook_user_id, page_id, page_name, page_access_token, page_access_token_enc,
    instagram_business_id, instagram_username, token_expires_at, is_active
  ) VALUES (
    p_user_id, p_facebook_user_id, p_page_id, p_page_name, NULL, v_enc,
    p_instagram_business_id, p_instagram_username, p_token_expires_at, true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$
;


-- ================================================================
-- SNAPSHOT (DDL ricostruito da pg_catalog) — pre-fix storage
-- 12 tabelle create da dashboard non presenti nelle migration storiche
-- ================================================================

-- ─── ai_generations_log ───
CREATE TABLE IF NOT EXISTS public.ai_generations_log (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  user_id UUID,
  type ai_generation_type NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT,
  output_tokens INT,
  total_tokens INT,
  duration_ms INT,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  request_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES None(None),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
ALTER TABLE public.ai_generations_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX ai_generations_log_workspace_id_idx ON public.ai_generations_log USING btree (workspace_id);
CREATE INDEX ai_generations_log_user_id_idx ON public.ai_generations_log USING btree (user_id);
CREATE INDEX ai_generations_log_type_idx ON public.ai_generations_log USING btree (type);
CREATE INDEX ai_generations_log_created_at_idx ON public.ai_generations_log USING btree (created_at DESC);
CREATE POLICY "ai_generations_log_insert" ON public.ai_generations_log FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "ai_generations_log_select" ON public.ai_generations_log FOR SELECT TO public
  USING (is_workspace_member(workspace_id));

-- ─── carousel_image_logs ───
CREATE TABLE IF NOT EXISTS public.carousel_image_logs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID,
  carousel_id TEXT,
  slide_index INT,
  prompt_used TEXT,
  image_url TEXT,
  error TEXT,
  provider TEXT DEFAULT 'freepik'::text,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.carousel_image_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs" ON public.carousel_image_logs FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Users can view their own logs" ON public.carousel_image_logs FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ─── content_items ───
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  editorial_plan_id UUID NOT NULL,
  strategy_id UUID,
  scheduled_date date NOT NULL,
  scheduled_time time without time zone,
  publish_at TIMESTAMPTZ,
  content_type content_type NOT NULL,
  platforms text[] DEFAULT '{}'::text[] NOT NULL,
  funnel_stage funnel_stage DEFAULT 'cold'::funnel_stage NOT NULL,
  title TEXT,
  topic TEXT,
  hook TEXT,
  body_copy TEXT,
  cta TEXT,
  caption TEXT,
  hashtags text[] DEFAULT '{}'::text[],
  alt_text TEXT,
  script_id UUID,
  selected_hook_index smallint DEFAULT 0,
  selected_body_index smallint DEFAULT 0,
  selected_cta_index smallint DEFAULT 0,
  graphic_concept_id UUID,
  generated_image_url TEXT,
  template_id UUID,
  media_urls text[] DEFAULT '{}'::text[],
  video_url TEXT,
  thumbnail_url TEXT,
  status content_status DEFAULT 'idea'::content_status NOT NULL,
  ayrshare_post_id TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  scheduling_error TEXT,
  notes TEXT,
  tags text[] DEFAULT '{}'::text[],
  order_in_day smallint DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES None(None),
  FOREIGN KEY (editorial_plan_id) REFERENCES editorial_plans(id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (graphic_concept_id) REFERENCES graphic_concepts(id),
  FOREIGN KEY (script_id) REFERENCES video_scripts(id),
  FOREIGN KEY (template_id) REFERENCES graphic_templates(id)
);
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX content_items_workspace_id_idx ON public.content_items USING btree (workspace_id);
CREATE INDEX content_items_editorial_plan_id_idx ON public.content_items USING btree (editorial_plan_id);
CREATE INDEX content_items_strategy_id_idx ON public.content_items USING btree (strategy_id);
CREATE INDEX content_items_scheduled_date_idx ON public.content_items USING btree (scheduled_date);
CREATE INDEX content_items_status_idx ON public.content_items USING btree (status);
CREATE INDEX content_items_funnel_stage_idx ON public.content_items USING btree (funnel_stage);
CREATE INDEX content_items_workspace_date_idx ON public.content_items USING btree (workspace_id, scheduled_date);
CREATE POLICY "content_items_delete" ON public.content_items FOR DELETE TO public
  USING (is_workspace_admin(workspace_id));
CREATE POLICY "content_items_insert" ON public.content_items FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "content_items_select" ON public.content_items FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "content_items_update" ON public.content_items FOR UPDATE TO public
  USING (is_workspace_member(workspace_id));

-- ─── editorial_plans ───
CREATE TABLE IF NOT EXISTS public.editorial_plans (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  strategy_id UUID,
  name TEXT NOT NULL,
  month smallint NOT NULL,
  year smallint NOT NULL,
  status plan_status DEFAULT 'draft'::plan_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (strategy_id) REFERENCES strategies(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  UNIQUE (year),
  UNIQUE (year),
  UNIQUE (year),
  UNIQUE (month),
  UNIQUE (month),
  UNIQUE (month),
  UNIQUE (workspace_id),
  UNIQUE (workspace_id),
  UNIQUE (workspace_id)
);
ALTER TABLE public.editorial_plans ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX editorial_plans_unique_month ON public.editorial_plans USING btree (workspace_id, month, year);
CREATE INDEX editorial_plans_workspace_id_idx ON public.editorial_plans USING btree (workspace_id);
CREATE INDEX editorial_plans_strategy_id_idx ON public.editorial_plans USING btree (strategy_id);
CREATE INDEX editorial_plans_period_idx ON public.editorial_plans USING btree (year, month);
CREATE POLICY "editorial_plans_delete" ON public.editorial_plans FOR DELETE TO public
  USING (is_workspace_admin(workspace_id));
CREATE POLICY "editorial_plans_insert" ON public.editorial_plans FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "editorial_plans_select" ON public.editorial_plans FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "editorial_plans_update" ON public.editorial_plans FOR UPDATE TO public
  USING (is_workspace_member(workspace_id));

-- ─── google_calendar_connections ───
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID NOT NULL,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own calendar connections" ON public.google_calendar_connections FOR DELETE TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own calendar connections" ON public.google_calendar_connections FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own calendar connections" ON public.google_calendar_connections FOR UPDATE TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own calendar connections" ON public.google_calendar_connections FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ─── graphic_concepts ───
CREATE TABLE IF NOT EXISTS public.graphic_concepts (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  content_item_id UUID,
  topic TEXT NOT NULL,
  content_type graphic_concept_content_type DEFAULT 'post_image'::graphic_concept_content_type NOT NULL,
  funnel_stage funnel_stage DEFAULT 'cold'::funnel_stage NOT NULL,
  concepts JSONB DEFAULT '[]'::jsonb NOT NULL,
  selected_concept smallint DEFAULT 0 NOT NULL,
  generated_image_url TEXT,
  status graphic_concept_status DEFAULT 'concept'::graphic_concept_status NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (created_by) REFERENCES None(None),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
ALTER TABLE public.graphic_concepts ENABLE ROW LEVEL SECURITY;

CREATE INDEX graphic_concepts_workspace_id_idx ON public.graphic_concepts USING btree (workspace_id);
CREATE INDEX graphic_concepts_content_item_id_idx ON public.graphic_concepts USING btree (content_item_id);
CREATE INDEX graphic_concepts_status_idx ON public.graphic_concepts USING btree (status);
CREATE POLICY "graphic_concepts_delete" ON public.graphic_concepts FOR DELETE TO public
  USING (is_workspace_admin(workspace_id));
CREATE POLICY "graphic_concepts_insert" ON public.graphic_concepts FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "graphic_concepts_select" ON public.graphic_concepts FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "graphic_concepts_update" ON public.graphic_concepts FOR UPDATE TO public
  USING (is_workspace_member(workspace_id));

-- ─── graphic_templates ───
CREATE TABLE IF NOT EXISTS public.graphic_templates (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category template_category DEFAULT 'post'::template_category NOT NULL,
  thumbnail_url TEXT,
  file_url TEXT,
  file_path TEXT,
  base64_preview TEXT,
  platform TEXT,
  tags text[] DEFAULT '{}'::text[],
  is_global BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES None(None),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
ALTER TABLE public.graphic_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX graphic_templates_workspace_id_idx ON public.graphic_templates USING btree (workspace_id);
CREATE INDEX graphic_templates_category_idx ON public.graphic_templates USING btree (category);
CREATE INDEX graphic_templates_is_global_idx ON public.graphic_templates USING btree (is_global);
CREATE INDEX graphic_templates_is_active_idx ON public.graphic_templates USING btree (is_active);
CREATE POLICY "graphic_templates_delete" ON public.graphic_templates FOR DELETE TO public
  USING (((workspace_id IS NOT NULL) AND is_workspace_admin(workspace_id)));
CREATE POLICY "graphic_templates_insert" ON public.graphic_templates FOR INSERT TO public
  WITH CHECK ((((workspace_id IS NOT NULL) AND is_workspace_member(workspace_id)) OR ((is_global = true) AND (auth.uid() IS NOT NULL))));
CREATE POLICY "graphic_templates_select" ON public.graphic_templates FOR SELECT TO public
  USING (((is_global = true) OR ((workspace_id IS NOT NULL) AND is_workspace_member(workspace_id))));
CREATE POLICY "graphic_templates_update" ON public.graphic_templates FOR UPDATE TO public
  USING ((((workspace_id IS NOT NULL) AND is_workspace_admin(workspace_id)) OR (is_global = true)));

-- ─── profiles ───
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL,
  first_name TEXT,
  last_name TEXT,
  clinic_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES None(None)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can edit own profile" ON public.profiles FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO public
  USING ((auth.uid() = id));

-- ─── strategies ───
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  status strategy_status DEFAULT 'draft'::strategy_status NOT NULL,
  ica JSONB DEFAULT '{}'::jsonb NOT NULL,
  positioning JSONB DEFAULT '{}'::jsonb NOT NULL,
  market_trends JSONB DEFAULT '[]'::jsonb NOT NULL,
  content_mix JSONB DEFAULT '{}'::jsonb NOT NULL,
  publishing_frequency JSONB DEFAULT '{}'::jsonb NOT NULL,
  hashtag_strategy JSONB DEFAULT '{}'::jsonb NOT NULL,
  keywords text[] DEFAULT '{}'::text[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE INDEX strategies_workspace_id_idx ON public.strategies USING btree (workspace_id);
CREATE INDEX strategies_status_idx ON public.strategies USING btree (status);
CREATE INDEX strategies_workspace_status_idx ON public.strategies USING btree (workspace_id, status);
CREATE POLICY "strategies_delete" ON public.strategies FOR DELETE TO public
  USING (is_workspace_admin(workspace_id));
CREATE POLICY "strategies_insert" ON public.strategies FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "strategies_select" ON public.strategies FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "strategies_update" ON public.strategies FOR UPDATE TO public
  USING (is_workspace_member(workspace_id));

-- ─── video_scripts ───
CREATE TABLE IF NOT EXISTS public.video_scripts (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  content_item_id UUID,
  topic TEXT NOT NULL,
  funnel_stage funnel_stage DEFAULT 'cold'::funnel_stage NOT NULL,
  target_duration_seconds INT DEFAULT 60 NOT NULL,
  platform TEXT,
  hooks JSONB DEFAULT '[]'::jsonb NOT NULL,
  bodies JSONB DEFAULT '[]'::jsonb NOT NULL,
  ctas JSONB DEFAULT '[]'::jsonb NOT NULL,
  selected_hook smallint DEFAULT 0 NOT NULL,
  selected_body smallint DEFAULT 0 NOT NULL,
  selected_cta smallint DEFAULT 0 NOT NULL,
  final_script TEXT,
  keywords text[] DEFAULT '{}'::text[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id),
  FOREIGN KEY (created_by) REFERENCES None(None),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
ALTER TABLE public.video_scripts ENABLE ROW LEVEL SECURITY;

CREATE INDEX video_scripts_workspace_id_idx ON public.video_scripts USING btree (workspace_id);
CREATE INDEX video_scripts_content_item_id_idx ON public.video_scripts USING btree (content_item_id);
CREATE POLICY "video_scripts_delete" ON public.video_scripts FOR DELETE TO public
  USING (is_workspace_admin(workspace_id));
CREATE POLICY "video_scripts_insert" ON public.video_scripts FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "video_scripts_select" ON public.video_scripts FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "video_scripts_update" ON public.video_scripts FOR UPDATE TO public
  USING (is_workspace_member(workspace_id));

-- ─── workspace_members ───
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role workspace_role DEFAULT 'member'::workspace_role NOT NULL,
  invited_by UUID,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (invited_by) REFERENCES None(None),
  FOREIGN KEY (user_id) REFERENCES None(None),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  UNIQUE (workspace_id),
  UNIQUE (workspace_id),
  UNIQUE (user_id),
  UNIQUE (user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX workspace_members_unique ON public.workspace_members USING btree (workspace_id, user_id);
CREATE INDEX workspace_members_workspace_id_idx ON public.workspace_members USING btree (workspace_id);
CREATE INDEX workspace_members_user_id_idx ON public.workspace_members USING btree (user_id);
CREATE POLICY "workspace_members_delete" ON public.workspace_members FOR DELETE TO public
  USING ((is_workspace_admin(workspace_id) OR (user_id = auth.uid())));
CREATE POLICY "workspace_members_insert" ON public.workspace_members FOR INSERT TO public
  WITH CHECK (is_workspace_admin(workspace_id));
CREATE POLICY "workspace_members_select" ON public.workspace_members FOR SELECT TO public
  USING (is_workspace_member(workspace_id));
CREATE POLICY "workspace_members_update" ON public.workspace_members FOR UPDATE TO public
  USING (is_workspace_admin(workspace_id));

-- ─── workspaces ───
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  description TEXT,
  brand_voice TEXT,
  brand_colors JSONB DEFAULT '{"accent": "#F59E0B", "primary": "#6366F1", "secondary": "#8B5CF6"}'::jsonb,
  social_accounts JSONB DEFAULT '{}'::jsonb,
  ayrshare_profile_key TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (owner_id) REFERENCES None(None),
  UNIQUE (slug)
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX workspaces_slug_key ON public.workspaces USING btree (slug);
CREATE INDEX workspaces_owner_id_idx ON public.workspaces USING btree (owner_id);
CREATE INDEX workspaces_slug_idx ON public.workspaces USING btree (slug);
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE TO public
  USING ((owner_id = auth.uid()));
CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT TO public
  WITH CHECK ((owner_id = auth.uid()));
CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT TO public
  USING (((owner_id = auth.uid()) OR is_workspace_member(id)));
CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE TO public
  USING (((owner_id = auth.uid()) OR is_workspace_admin(id)));


-- ================================================================
-- STORAGE STATE — buckets e policy come sono OGGI
-- (riferimento — i bucket esistenti non vengono toccati da questo
--  file; la chiusura delle falle è negli sprint successivi)
-- ================================================================
-- Vedi docs/storage-state-before.md per la tabella leggibile.
