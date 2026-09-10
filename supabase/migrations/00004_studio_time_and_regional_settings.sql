-- ==============================================================================
-- Migration 00004: Studio Timezone and Clock Display Preferences
-- Target Environment: Supabase / PostgreSQL
-- Purpose:
--   1. Adds `time_format` ('12h' | '24h') to `public.studio_settings` for configuring
--      studio-wide and user interface timestamp formats.
--   2. Adds `timezone` (e.g., 'auto', 'Asia/Dhaka', 'America/New_York', 'UTC')
--      for localizing timestamps across lead tables, chat messages, and audit logs.
-- ==============================================================================

ALTER TABLE public.studio_settings 
  ADD COLUMN IF NOT EXISTS time_format TEXT NOT NULL DEFAULT '12h' 
  CHECK (time_format IN ('12h', '24h'));

ALTER TABLE public.studio_settings 
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'auto';

-- Clear, self-documenting table column comments
COMMENT ON COLUMN public.studio_settings.time_format IS 
  'Clock display preference across dashboard and chat logs: 12h (AM/PM) or 24h standard.';

COMMENT ON COLUMN public.studio_settings.timezone IS 
  'Studio timezone for localizing timestamps across tables, chat messages, and telemetry feeds.';
