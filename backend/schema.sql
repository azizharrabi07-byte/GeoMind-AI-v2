-- =============================================================================
-- GeoMind AI — Complete Database Schema
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL → New query)
-- Project: sshiogopewlchgkueuff
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper: auto-update updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Helper: auto-create profile on signup ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- CLEAN RESET (drops old/partial tables so CREATE never skips bad schemas)
-- Safe for fresh install — you have no production data yet.
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS
  public.chat_messages,
  public.chat_sessions,
  public.analysis_results,
  public.generated_reports,
  public.files,
  public.gis_features,
  public.activities,
  public.integrations,
  public.report_templates,
  public.projects,
  public.profiles
CASCADE;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── 1. Profiles (extends auth.users) ─────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  full_name     TEXT DEFAULT '',
  license_number TEXT DEFAULT '',
  firm_name     TEXT DEFAULT '',
  default_crs   TEXT DEFAULT 'EPSG:32632',
  report_template TEXT DEFAULT 'boundary',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Projects ──────────────────────────────────────────────────────────────
CREATE TABLE public.projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'review', 'draft', 'completed', 'archived')),
  client_name       TEXT DEFAULT '',
  location          TEXT DEFAULT '',
  coordinate_system TEXT DEFAULT '',
  progress          INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Files ─────────────────────────────────────────────────────────────────
CREATE TABLE public.files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  file_ext      TEXT DEFAULT '',
  file_size     BIGINT NOT NULL DEFAULT 0,
  mime_type     TEXT DEFAULT '',
  storage_path  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing', 'analyzed', 'error', 'pending')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Analysis Results ──────────────────────────────────────────────────────
CREATE TABLE public.analysis_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id         UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  summary         TEXT DEFAULT '',
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  insights        JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions    JSONB NOT NULL DEFAULT '[]'::jsonb,
  knowledge_graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_text  TEXT DEFAULT '',
  model_used      TEXT DEFAULT 'gemini-2.5-flash',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analysis_results_file_id_unique UNIQUE (file_id)
);

-- ─── 5. GIS Features ──────────────────────────────────────────────────────────
CREATE TABLE public.gis_features (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  feature_type  TEXT NOT NULL CHECK (feature_type IN ('point', 'line', 'polygon')),
  geometry      JSONB NOT NULL,
  label         TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  elevation     DOUBLE PRECISION,
  properties    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. Chat Sessions ─────────────────────────────────────────────────────────
CREATE TABLE public.chat_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title          TEXT DEFAULT 'New Chat',
  message_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 7. Chat Messages ─────────────────────────────────────────────────────────
CREATE TABLE public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL DEFAULT '',
  commands    JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. Activities (project timeline / audit log) ─────────────────────────────
CREATE TABLE public.activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action      TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. Report Templates ──────────────────────────────────────────────────────
CREATE TABLE public.report_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  report_type   TEXT NOT NULL
                CHECK (report_type IN ('boundary', 'topographic', 'alta', 'construction', 'control')),
  description   TEXT DEFAULT '',
  sections      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 10. Generated Reports ────────────────────────────────────────────────────
CREATE TABLE public.generated_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  template_id   UUID REFERENCES public.report_templates(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  report_type   TEXT NOT NULL
                CHECK (report_type IN ('boundary', 'topographic', 'alta', 'construction', 'control')),
  storage_path  TEXT NOT NULL,
  file_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 11. Integrations (Google Drive, OneDrive, Outlook, etc.) ─────────────────
CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL
                  CHECK (provider IN ('google_drive', 'onedrive', 'outlook', 'gmail', 'dropbox', 'whatsapp', 'autocad', 'qgis')),
  access_token    TEXT DEFAULT '',
  refresh_token   TEXT DEFAULT '',
  provider_email  TEXT DEFAULT '',
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_connected    BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integrations_user_provider_unique UNIQUE (user_id, provider)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id          ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status           ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_files_user_id             ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id          ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_status              ON public.files(status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id  ON public.analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id  ON public.analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_gis_features_user_id      ON public.gis_features(user_id);
CREATE INDEX IF NOT EXISTS idx_gis_features_project_id   ON public.gis_features(project_id);
CREATE INDEX IF NOT EXISTS idx_gis_features_type         ON public.gis_features(feature_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id     ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id  ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id     ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id        ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id     ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at     ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON public.generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id      ON public.integrations(user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_integrations_updated_at ON public.integrations;
CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-increment message_count on new chat message
CREATE OR REPLACE FUNCTION public.increment_session_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_count ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_count
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_session_message_count();

-- Auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gis_features      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations      ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Projects
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Files
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_update_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;
CREATE POLICY "files_select_own" ON public.files FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "files_insert_own" ON public.files FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "files_update_own" ON public.files FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "files_delete_own" ON public.files FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Analysis Results
DROP POLICY IF EXISTS "analysis_select_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_insert_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_update_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_delete_own" ON public.analysis_results;
CREATE POLICY "analysis_select_own" ON public.analysis_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "analysis_insert_own" ON public.analysis_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "analysis_update_own" ON public.analysis_results FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "analysis_delete_own" ON public.analysis_results FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- GIS Features
DROP POLICY IF EXISTS "gis_select_own" ON public.gis_features;
DROP POLICY IF EXISTS "gis_insert_own" ON public.gis_features;
DROP POLICY IF EXISTS "gis_update_own" ON public.gis_features;
DROP POLICY IF EXISTS "gis_delete_own" ON public.gis_features;
CREATE POLICY "gis_select_own" ON public.gis_features FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "gis_insert_own" ON public.gis_features FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "gis_update_own" ON public.gis_features FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "gis_delete_own" ON public.gis_features FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Chat Sessions
DROP POLICY IF EXISTS "chat_sessions_select_own" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert_own" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update_own" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_delete_own" ON public.chat_sessions;
CREATE POLICY "chat_sessions_select_own" ON public.chat_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "chat_sessions_insert_own" ON public.chat_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_sessions_update_own" ON public.chat_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_sessions_delete_own" ON public.chat_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Chat Messages
DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own" ON public.chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Activities
DROP POLICY IF EXISTS "activities_select_own" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_own" ON public.activities;
CREATE POLICY "activities_select_own" ON public.activities FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "activities_insert_own" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Report Templates (own + system defaults)
DROP POLICY IF EXISTS "report_templates_select" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_insert_own" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_update_own" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_delete_own" ON public.report_templates;
CREATE POLICY "report_templates_select" ON public.report_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_default = TRUE);
CREATE POLICY "report_templates_insert_own" ON public.report_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "report_templates_update_own" ON public.report_templates FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "report_templates_delete_own" ON public.report_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Generated Reports
DROP POLICY IF EXISTS "generated_reports_select_own" ON public.generated_reports;
DROP POLICY IF EXISTS "generated_reports_insert_own" ON public.generated_reports;
DROP POLICY IF EXISTS "generated_reports_delete_own" ON public.generated_reports;
CREATE POLICY "generated_reports_select_own" ON public.generated_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "generated_reports_insert_own" ON public.generated_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "generated_reports_delete_own" ON public.generated_reports FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Integrations
DROP POLICY IF EXISTS "integrations_select_own" ON public.integrations;
DROP POLICY IF EXISTS "integrations_insert_own" ON public.integrations;
DROP POLICY IF EXISTS "integrations_update_own" ON public.integrations;
DROP POLICY IF EXISTS "integrations_delete_own" ON public.integrations;
CREATE POLICY "integrations_select_own" ON public.integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "integrations_insert_own" ON public.integrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "integrations_update_own" ON public.integrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "integrations_delete_own" ON public.integrations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  FALSE,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'application/json',
    'application/dxf',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('reports', 'reports', TRUE, 20971520)  -- 20 MB, public for download URLs
ON CONFLICT (id) DO NOTHING;

-- Storage policies: user-files (private per user folder)
DROP POLICY IF EXISTS "user_files_select_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_update_own" ON storage.objects;
DROP POLICY IF EXISTS "user_files_delete_own" ON storage.objects;
CREATE POLICY "user_files_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_files_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_files_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_files_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: reports (public read, authenticated write to own folder)
DROP POLICY IF EXISTS "reports_select_public" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "reports_delete_own" ON storage.objects;
CREATE POLICY "reports_select_public" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'reports');

CREATE POLICY "reports_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "reports_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- SEED DATA: Default Report Templates (idempotent)
-- =============================================================================
DELETE FROM public.report_templates WHERE is_default = TRUE AND user_id IS NULL;

INSERT INTO public.report_templates (name, report_type, description, sections, is_default, user_id)
VALUES
  (
    'Boundary Survey Report',
    'boundary',
    'Property boundary survey with legal description, monuments, and measurements',
    '["Cover Page","Legal Description","Field Evidence","Measurements & Calculations","Monument Descriptions","Certification","Exhibits"]'::jsonb,
    TRUE, NULL
  ),
  (
    'Topographic Survey Report',
    'topographic',
    'Topographic survey with contours, DTM, and feature inventory',
    '["Cover Page","Control Network","Survey Methodology","DTM Summary","Contour Data","Feature Inventory","Certification"]'::jsonb,
    TRUE, NULL
  ),
  (
    'ALTA/NSPS Land Title Survey',
    'alta',
    'ALTA/NSPS land title survey per Table A requirements',
    '["Cover Page","Table A Items","Boundary Analysis","Easements & Encumbrances","Improvements","Certification","Survey Plat"]'::jsonb,
    TRUE, NULL
  ),
  (
    'Construction Staking Report',
    'construction',
    'Construction layout, staking points, and as-built comparison',
    '["Cover Page","Control Points","Staking Layout","Offset Data","As-Built Comparison","Notes & Deviations","Certification"]'::jsonb,
    TRUE, NULL
  );

-- =============================================================================
-- DONE — Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- =============================================================================