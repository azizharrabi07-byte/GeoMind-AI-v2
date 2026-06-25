-- GeoMind AI v2 — Phase 3 migration
-- Run in Supabase SQL Editor after schema.sql + RUN_IN_SUPABASE.sql

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_analyze_uploads  BOOLEAN NOT NULL DEFAULT true,
  proactive_flagging    BOOLEAN NOT NULL DEFAULT true,
  report_suggestions    BOOLEAN NOT NULL DEFAULT false,
  notification_email    TEXT DEFAULT '',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_own" ON public.user_preferences;
CREATE POLICY "user_preferences_own" ON public.user_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Speed up Smart Search (ilike on common columns)
CREATE INDEX IF NOT EXISTS idx_projects_user_name ON public.projects (user_id, name);
CREATE INDEX IF NOT EXISTS idx_files_user_filename ON public.files (user_id, filename);
CREATE INDEX IF NOT EXISTS idx_reports_user_title ON public.generated_reports (user_id, title);