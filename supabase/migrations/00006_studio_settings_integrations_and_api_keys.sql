-- ==============================================================================
-- Migration 00006: Studio Settings Integration Credentials and API Keys
--
-- Enables studio buyers and non-technical business operators to configure
-- all external service credentials, API tokens, endpoints, and webhook secrets
-- directly from the Dashboard Settings Center without modifying code or .env files.
--
-- 1. Meta WhatsApp Cloud API credentials
-- 2. AI Model Provider settings (Azure OpenAI / OpenAI Direct)
-- 3. Resend Email alert credentials
-- 4. Telegram Alert Bot configuration (idempotent validation)
-- ==============================================================================

ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_app_secret TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_followup_template_name TEXT DEFAULT 'lead_reengagement',
  ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'azure',
  ADD COLUMN IF NOT EXISTS ai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS ai_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS ai_deployment_name TEXT DEFAULT 'gpt-5-nano',
  ADD COLUMN IF NOT EXISTS ai_api_version TEXT DEFAULT '2024-12-01-preview',
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT false;

-- Safe check constraint for ai_provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_settings_ai_provider_check'
  ) THEN
    ALTER TABLE public.studio_settings
      ADD CONSTRAINT studio_settings_ai_provider_check
      CHECK (ai_provider IS NULL OR ai_provider IN ('azure', 'openai'));
  END IF;
END $$;

-- Ensure RLS allows INSERT so PostgREST upsert (INSERT ... ON CONFLICT DO UPDATE) succeeds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'studio_settings' AND policyname = 'policy_studio_settings_insert'
  ) THEN
    CREATE POLICY policy_studio_settings_insert ON public.studio_settings
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

COMMENT ON COLUMN public.studio_settings.whatsapp_phone_number_id IS 
  'Meta WhatsApp Cloud API Phone Number ID.';

COMMENT ON COLUMN public.studio_settings.whatsapp_access_token IS 
  'Meta WhatsApp Cloud API System User Access Token.';

COMMENT ON COLUMN public.studio_settings.whatsapp_business_account_id IS 
  'Meta WhatsApp Business Account (WABA) ID.';

COMMENT ON COLUMN public.studio_settings.meta_app_secret IS 
  'Meta App Secret for HMAC-SHA256 webhook payload signature verification.';

COMMENT ON COLUMN public.studio_settings.whatsapp_verify_token IS 
  'Webhook Verification Token for Meta hub.challenge handshake.';

COMMENT ON COLUMN public.studio_settings.whatsapp_followup_template_name IS 
  'Meta pre-approved HSM template name for out-of-window lead re-engagement.';

COMMENT ON COLUMN public.studio_settings.ai_provider IS 
  'AI Provider type: azure or openai.';

COMMENT ON COLUMN public.studio_settings.ai_api_key IS 
  'API Key for Azure OpenAI or standard OpenAI.';

COMMENT ON COLUMN public.studio_settings.ai_endpoint IS 
  'Endpoint URL for Azure OpenAI service instance.';

COMMENT ON COLUMN public.studio_settings.ai_deployment_name IS 
  'Deployment model name (e.g. gpt-5-nano, gpt-4o-mini).';

COMMENT ON COLUMN public.studio_settings.ai_api_version IS 
  'Azure OpenAI API version (e.g. 2024-12-01-preview).';

COMMENT ON COLUMN public.studio_settings.resend_api_key IS 
  'Resend API key for transactional email alerts.';

COMMENT ON COLUMN public.studio_settings.notification_email IS 
  'Destination email for high-priority lead notifications.';

COMMENT ON COLUMN public.studio_settings.telegram_bot_token IS 
  'Telegram Bot API HTTP Token generated via @BotFather.';

COMMENT ON COLUMN public.studio_settings.telegram_chat_id IS 
  'Telegram destination Chat or Channel ID for real-time lead alerts.';

COMMENT ON COLUMN public.studio_settings.telegram_enabled IS 
  'Master toggle for dispatching alerts to the studio Telegram channel.';
