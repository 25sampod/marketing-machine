-- ==============================================================================
-- Migration 00013: Instagram Direct & Facebook Messenger Integration Columns
--
-- Enables studios to ingest leads, handle DMs, and dispatch automated or manual
-- messages across Instagram Direct and Facebook Messenger via Meta Graph API.
-- ==============================================================================

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS instagram_account_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS instagram_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS instagram_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS messenger_page_id TEXT,
  ADD COLUMN IF NOT EXISTS messenger_page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS messenger_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS messenger_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.studio_settings.instagram_account_id IS
  'Meta Instagram Business/Professional Account ID.';

COMMENT ON COLUMN public.studio_settings.instagram_page_access_token IS
  'Meta Page / Instagram System User Access Token for Instagram Graph Messaging.';

COMMENT ON COLUMN public.studio_settings.instagram_verify_token IS
  'Webhook Verification Token for Instagram hub.challenge handshake.';

COMMENT ON COLUMN public.studio_settings.instagram_enabled IS
  'Master toggle for Instagram Direct lead ingestion and messaging.';

COMMENT ON COLUMN public.studio_settings.messenger_page_id IS
  'Meta Facebook Page ID for Messenger.';

COMMENT ON COLUMN public.studio_settings.messenger_page_access_token IS
  'Meta Page System User Access Token for Facebook Messenger API.';

COMMENT ON COLUMN public.studio_settings.messenger_verify_token IS
  'Webhook Verification Token for Messenger hub.challenge handshake.';

COMMENT ON COLUMN public.studio_settings.messenger_enabled IS
  'Master toggle for Facebook Messenger lead ingestion and messaging.';
