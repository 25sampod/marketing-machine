-- Migration: 00007_add_qualification_threshold_to_studio_settings.sql
-- Description: Adds qualification_threshold (0-100) to public.studio_settings for customizable AI Qualification Rate

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS qualification_threshold INTEGER NOT NULL DEFAULT 70
  CHECK (qualification_threshold >= 0 AND qualification_threshold <= 100);

COMMENT ON COLUMN public.studio_settings.qualification_threshold IS
  'Threshold qualification percentage (0-100) required for a lead to be classified as AI Qualified across pipeline, telemetry, and alerts.';
