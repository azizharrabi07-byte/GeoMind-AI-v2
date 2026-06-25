-- Phase 2: file versions + GIS snapshots for timeline restore
-- Run in Supabase SQL Editor after schema.sql

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

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gis_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_versions_own" ON public.file_versions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "gis_snapshots_own" ON public.gis_snapshots
  FOR ALL USING (auth.uid() = user_id);