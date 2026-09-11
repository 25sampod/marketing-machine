-- ==============================================================================
-- Migration 00009: Multi-Tenant Studio Settings & Team Association
-- Target Environment: Supabase / PostgreSQL
-- Purpose:
--   1. Upgrades `public.studio_settings` from a singleton row to a multi-tenant
--      architecture linked to `public.teams` (`team_id`).
--   2. Enables multiple businesses, restaurants, or agencies to each maintain
--      isolated integration credentials, AI qualification rules, and preferences.
--   3. Adds foreign key indexes in accordance with Supabase Postgres best practices.
--   4. Backfills the primary 'default' settings row with the default team entity.
-- ==============================================================================

-- 1. Add multi-tenant team association and studio identifiers
ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS studio_name TEXT DEFAULT 'ArchScale Architecture Studio',
  ADD COLUMN IF NOT EXISTS studio_slug TEXT DEFAULT 'archscale';

-- 2. Add foreign key index for high-speed JOINs (Supabase Postgres best practice)
CREATE INDEX IF NOT EXISTS idx_studio_settings_team_id 
  ON public.studio_settings(team_id);

CREATE INDEX IF NOT EXISTS idx_studio_settings_slug 
  ON public.studio_settings(studio_slug);

-- 3. Backfill default row to attach to the default team
UPDATE public.studio_settings
SET 
  team_id = '00000000-0000-0000-0000-000000000001',
  studio_name = 'ArchScale Architecture Studio',
  studio_slug = 'archscale'
WHERE id = 'default' AND (team_id IS NULL OR team_id != '00000000-0000-0000-0000-000000000001');

-- 4. Self-documenting table comments
COMMENT ON COLUMN public.studio_settings.team_id IS 
  'Foreign key referencing public.teams(id), enabling multi-studio / multi-tenant configuration rows.';

COMMENT ON COLUMN public.studio_settings.studio_name IS 
  'Display name for this business, client, or studio.';

COMMENT ON COLUMN public.studio_settings.studio_slug IS 
  'URL-safe unique identifier for this studio.';
