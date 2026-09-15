export interface StudioSettingsCredentials {
  // Meta WhatsApp Cloud API
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
  whatsappBusinessAccountId: string | null;
  metaAppSecret: string | null;
  whatsappVerifyToken: string | null;
  whatsappFollowupTemplateName: string;

  // AI Model Provider
  aiProvider: 'azure' | 'openai';
  aiApiKey: string | null;
  aiEndpoint: string | null;
  aiDeploymentName: string;
  aiApiVersion: string;

  // Email Alerts (Resend)
  resendApiKey: string | null;
  notificationEmail: string | null;

  // Telegram Broadcast Bot
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramEnabled: boolean;

  // Meta Instagram Direct
  instagramAccountId: string | null;
  instagramPageAccessToken: string | null;
  instagramVerifyToken: string | null;
  instagramEnabled: boolean;

  // Meta Facebook Messenger
  messengerPageId: string | null;
  messengerPageAccessToken: string | null;
  messengerVerifyToken: string | null;
  messengerEnabled: boolean;

  // Automation policies & regional settings
  autoReplyEnabled: boolean;
  emailAlertsEnabled: boolean;
  discoveryInterviewerEnabled: boolean;
  returningClientMode: 'auto' | 'draft_only' | 'disabled';
  timeFormat: '12h' | '24h';
  timezone: string;
  followupIntervalHours: number;
  knowledgeBase: string | null;
  qualificationThreshold: number;

  // Multi-tenant studio identifiers
  id?: string;
  teamId?: string | null;
  studioName?: string | null;
  studioSlug?: string | null;
}

/**
 * Pure resolver function that evaluates database studio_settings row with env fallback.
 * Prioritizes database-configured tokens over environment variables.
 */
export function resolveStudioCredentials(
  db: Record<string, any> | null,
  env: Record<string, string | undefined> = {}
): StudioSettingsCredentials {
  // Resolve AI Provider preference
  let aiProvider: 'azure' | 'openai' = 'azure';
  if (db?.ai_provider === 'openai' || db?.ai_provider === 'azure') {
    aiProvider = db.ai_provider;
  } else if (!env.AZURE_OPENAI_API_KEY && env.OPENAI_API_KEY) {
    aiProvider = 'openai';
  }

  const aiApiKey =
    db?.ai_api_key?.trim() ||
    (aiProvider === 'azure' ? env.AZURE_OPENAI_API_KEY : env.OPENAI_API_KEY) ||
    env.AZURE_OPENAI_API_KEY ||
    env.OPENAI_API_KEY ||
    null;

  const rawEndpoint =
    db?.ai_endpoint?.trim() ||
    env.AZURE_OPENAI_ENDPOINT?.trim() ||
    null;

  let aiEndpoint: string | null = null;
  if (rawEndpoint) {
    const trimmed = rawEndpoint.replace(/\/+$/, '');
    aiEndpoint = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  const aiDeploymentName =
    db?.ai_deployment_name?.trim() ||
    (aiProvider === 'azure'
      ? env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim() || 'gpt-5-nano'
      : env.OPENAI_MODEL_NAME?.trim() || 'gpt-4o-mini');

  const aiApiVersion =
    db?.ai_api_version?.trim() ||
    env.AZURE_OPENAI_API_VERSION?.trim() ||
    '2024-12-01-preview';

  // Resolve WhatsApp credentials
  const whatsappPhoneNumberId =
    db?.whatsapp_phone_number_id?.trim() ||
    env.WHATSAPP_PHONE_NUMBER_ID ||
    null;

  const whatsappAccessToken =
    db?.whatsapp_access_token?.trim() ||
    env.WHATSAPP_ACCESS_TOKEN ||
    env.WHATSAPP_TOKEN ||
    null;

  const whatsappBusinessAccountId =
    db?.whatsapp_business_account_id?.trim() ||
    env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    env.WABA_ID ||
    null;

  const metaAppSecret =
    db?.meta_app_secret?.trim() ||
    env.META_APP_SECRET ||
    env.WHATSAPP_APP_SECRET ||
    null;

  const whatsappVerifyToken =
    db?.whatsapp_verify_token?.trim() ||
    env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    null;

  const whatsappFollowupTemplateName =
    db?.whatsapp_followup_template_name?.trim() ||
    env.WHATSAPP_FOLLOWUP_TEMPLATE_NAME ||
    'lead_reengagement';

  // Resolve Email credentials
  const resendApiKey =
    db?.resend_api_key?.trim() ||
    env.RESEND_API_KEY ||
    null;

  const notificationEmail =
    db?.notification_email?.trim() ||
    env.NOTIFICATION_EMAIL ||
    env.RESEND_FROM_EMAIL ||
    null;

  // Resolve Telegram credentials
  const telegramBotToken =
    db?.telegram_bot_token?.trim() ||
    env.TELEGRAM_BOT_TOKEN ||
    null;

  const telegramChatId =
    db?.telegram_chat_id?.trim() ||
    env.TELEGRAM_CHAT_ID ||
    null;

  const telegramEnabled =
    typeof db?.telegram_enabled === 'boolean'
      ? db.telegram_enabled
      : Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

  // Resolve Instagram Direct credentials
  const instagramAccountId =
    db?.instagram_account_id?.trim() ||
    env.INSTAGRAM_ACCOUNT_ID ||
    null;

  const instagramPageAccessToken =
    db?.instagram_page_access_token?.trim() ||
    env.INSTAGRAM_PAGE_ACCESS_TOKEN ||
    env.INSTAGRAM_ACCESS_TOKEN ||
    whatsappAccessToken ||
    null;

  const instagramVerifyToken =
    db?.instagram_verify_token?.trim() ||
    env.INSTAGRAM_VERIFY_TOKEN ||
    whatsappVerifyToken ||
    null;

  const instagramEnabled =
    typeof db?.instagram_enabled === 'boolean'
      ? db.instagram_enabled
      : Boolean(instagramAccountId && instagramPageAccessToken);

  // Resolve Facebook Messenger credentials
  const messengerPageId =
    db?.messenger_page_id?.trim() ||
    env.MESSENGER_PAGE_ID ||
    null;

  const messengerPageAccessToken =
    db?.messenger_page_access_token?.trim() ||
    env.MESSENGER_PAGE_ACCESS_TOKEN ||
    env.PAGE_ACCESS_TOKEN ||
    whatsappAccessToken ||
    null;

  const messengerVerifyToken =
    db?.messenger_verify_token?.trim() ||
    env.MESSENGER_VERIFY_TOKEN ||
    whatsappVerifyToken ||
    null;

  const messengerEnabled =
    typeof db?.messenger_enabled === 'boolean'
      ? db.messenger_enabled
      : Boolean(messengerPageId && messengerPageAccessToken);

  return {
    id: db?.id || 'default',
    teamId: db?.team_id || null,
    studioName: db?.studio_name || null,
    studioSlug: db?.studio_slug || null,
    whatsappPhoneNumberId,
    whatsappAccessToken,
    whatsappBusinessAccountId,
    metaAppSecret,
    whatsappVerifyToken,
    whatsappFollowupTemplateName,
    aiProvider,
    aiApiKey,
    aiEndpoint,
    aiDeploymentName,
    aiApiVersion,
    resendApiKey,
    notificationEmail,
    telegramBotToken,
    telegramChatId,
    telegramEnabled,
    instagramAccountId,
    instagramPageAccessToken,
    instagramVerifyToken,
    instagramEnabled,
    messengerPageId,
    messengerPageAccessToken,
    messengerVerifyToken,
    messengerEnabled,
    autoReplyEnabled: db?.auto_reply_enabled !== false,
    emailAlertsEnabled: db?.email_alerts_enabled !== false,
    discoveryInterviewerEnabled: db?.discovery_interviewer_enabled !== false,
    returningClientMode: db?.returning_client_mode || 'draft_only',
    timeFormat: db?.time_format === '24h' ? '24h' : '12h',
    timezone: db?.timezone || 'auto',
    followupIntervalHours: typeof db?.followup_interval_hours === 'number' ? db.followup_interval_hours : 24,
    knowledgeBase: db?.knowledge_base || null,
    qualificationThreshold:
      typeof db?.qualification_threshold === 'number'
        ? Math.min(100, Math.max(0, db.qualification_threshold))
        : typeof env.AI_QUALIFIED_THRESHOLD === 'string' && !isNaN(Number(env.AI_QUALIFIED_THRESHOLD))
        ? Math.min(100, Math.max(0, Number(env.AI_QUALIFIED_THRESHOLD)))
        : 70,
  };
}

import OpenAI, { AzureOpenAI } from 'openai';

/**
 * Creates an OpenAI or AzureOpenAI client instance based on resolved studio settings.
 * Returns null if required credentials or endpoint are missing.
 */
export function createAiClient(settings: StudioSettingsCredentials): {
  client: OpenAI | AzureOpenAI;
  isAzure: boolean;
  modelName: string;
} | null {
  if (!settings.aiApiKey) {
    return null;
  }

  if (settings.aiProvider === 'azure') {
    if (!settings.aiEndpoint) {
      console.warn('[AI Client] Azure OpenAI selected but endpoint is not configured.');
      return null;
    }
    const deployment = settings.aiDeploymentName || 'gpt-5-nano';
    const client = new AzureOpenAI({
      endpoint: settings.aiEndpoint,
      apiKey: settings.aiApiKey,
      deployment,
      apiVersion: settings.aiApiVersion || '2024-12-01-preview',
    });
    return { client, isAzure: true, modelName: deployment };
  }

  const client = new OpenAI({
    apiKey: settings.aiApiKey,
  });
  return { client, isAzure: false, modelName: settings.aiDeploymentName || 'gpt-4o-mini' };
}

/**
 * Pure resolver for lead notification email.
 * Prioritizes studio_settings destination email, then team owner/specialist, then env fallbacks.
 * Ignores phone numbers and values without '@'.
 */
export function resolveAlertNotificationEmail(
  studioNotificationEmail?: string | null,
  ownerEmail?: string | null,
  specialistEmail?: string | null,
  envNotificationEmail?: string | null,
  platformAdminEmail?: string | null
): string | null {
  const candidates = [
    studioNotificationEmail,
    ownerEmail,
    specialistEmail,
    envNotificationEmail,
    platformAdminEmail,
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.includes('@')) {
      return c.trim();
    }
  }
  return null;
}

