-- =============================================================================
-- GeoMind AI v2 — RUN THIS IN SUPABASE SQL EDITOR
-- Dashboard → SQL → New query → Paste → Run
--
-- FIRST TIME?  Run backend/schema.sql first (full database setup).
-- ALREADY RAN schema.sql?  Run ONLY this file (Phase 2 add-ons).
-- =============================================================================

-- ─── Phase 2 tables: timeline restore ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.file_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id         UUID NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  filename        TEXT NOT NULL,
  file_ext        TEXT DEFAULT '',
  file_size       BIGINT NOT NULL DEFAULT 0,
  preview_text    TEXT DEFAULT '',
  preview_image   TEXT,
  storage_path    TEXT DEFAULT '',
  version_number  INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gis_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  label           TEXT DEFAULT '',
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  feature_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Optional preview column on files (for API file list) ─────────────────────
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '';

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gis_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "file_versions_own" ON public.file_versions;
CREATE POLICY "file_versions_own" ON public.file_versions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "gis_snapshots_own" ON public.gis_snapshots;
CREATE POLICY "gis_snapshots_own" ON public.gis_snapshots
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Service role (backend) bypasses RLS automatically.

-- Done. Next: python backend/seed_demo.py (if no demo user yet)