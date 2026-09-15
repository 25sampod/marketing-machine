'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, Save, RefreshCw, CheckCircle2, ChevronRight, 
  Lock, Globe, Copy, Check, Activity, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatStudioTime, COMMON_TIMEZONES } from '@/lib/formatTime';
import { SettingsTab } from './types';

interface SettingsViewProps {
  studioId?: string;
  studioName?: string;
  studioSlug?: string;
  onTimeSettingsChange?: (format: '12h' | '24h', tz: string) => void;
  onThresholdChange?: (threshold: number) => void;
}

export default function SettingsView({
  studioId = 'default',
  studioName = 'ArchScale Architecture Studio',
  studioSlug = 'archscale',
  onTimeSettingsChange,
  onThresholdChange,
}: SettingsViewProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('integrations');
  const [activeIntegrationModal, setActiveIntegrationModal] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as SettingsTab | null;
      const validTabs: SettingsTab[] = ['integrations', 'general', 'ai', 'channels'];
      const savedTab = (urlTab && validTabs.includes(urlTab))
        ? urlTab
        : (localStorage.getItem('archscale_settings_tab') as SettingsTab | null);
      if (savedTab && validTabs.includes(savedTab)) {
        setSettingsTab(savedTab);
      }
    }
  }, []);

  const handleTabChange = (tab: SettingsTab) => {
    setSettingsTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('archscale_settings_tab', tab);
      } catch (e) {}
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'settings') {
        params.set('tab', tab);
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      }
    }
  };

  // Meta WhatsApp Cloud API credentials
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState<string>('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState<string>('');
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState<string>('');
  const [metaAppSecret, setMetaAppSecret] = useState<string>('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState<string>('');
  const [whatsappFollowupTemplateName, setWhatsappFollowupTemplateName] = useState<string>('lead_reengagement');

  // AI Model Provider credentials
  const [aiProvider, setAiProvider] = useState<'azure' | 'openai'>('azure');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiEndpoint, setAiEndpoint] = useState<string>('');
  const [aiDeploymentName, setAiDeploymentName] = useState<string>('gpt-5-nano');
  const [aiApiVersion, setAiApiVersion] = useState<string>('2024-12-01-preview');

  // Email Alerts (Resend)
  const [resendApiKey, setResendApiKey] = useState<string>('');
  const [notificationEmail, setNotificationEmail] = useState<string>('');

  // Telegram Broadcast Bot
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(false);

  // Workflow & Policies
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [discoveryInterviewerEnabled, setDiscoveryInterviewerEnabled] = useState(true);
  const [returningClientMode, setReturningClientMode] = useState<'auto' | 'draft_only' | 'disabled'>('auto');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timezone, setTimezone] = useState<string>('Asia/Dhaka');
  const [followupIntervalHours, setFollowupIntervalHours] = useState<number>(24);
  const [qualificationThreshold, setQualificationThreshold] = useState<number>(70);
  const [inputThreshold, setInputThreshold] = useState<string>('70');

  useEffect(() => {
    setInputThreshold(String(qualificationThreshold));
  }, [qualificationThreshold]);

  // Client-side integrations (stored in localStorage)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [facebookAdAccountId, setFacebookAdAccountId] = useState<string>('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');

  // Secret credential edit & visibility state
  const [editingSecretFields, setEditingSecretFields] = useState<Record<string, boolean>>({});
  const [showSecretInputs, setShowSecretInputs] = useState<Record<string, boolean>>({});
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState<string>('');

  // Integration test and saving feedback
  const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean; success?: boolean; message?: string; error?: string }>>({});
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [integrationsSavedToast, setIntegrationsSavedToast] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
      setDiscordWebhookUrl(localStorage.getItem('studio_discord_webhook') || '');
      setFacebookAdAccountId(localStorage.getItem('studio_fb_account') || '');
      setGoogleSheetUrl(localStorage.getItem('studio_google_sheet') || '');
      setCustomWebhookUrl(localStorage.getItem('studio_custom_webhook') || '');
    }
    fetchSettings();
  }, [studioId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?studioId=${encodeURIComponent(studioId)}`);
      const data = await res.json();
      const settings = data?.settings;

      if (settings) {
        setAutoReplyEnabled(settings.autoReplyEnabled !== false);
        setEmailAlertsEnabled(settings.emailAlertsEnabled !== false);
        setDiscoveryInterviewerEnabled(settings.discoveryInterviewerEnabled !== false);
        if (settings.returningClientMode) setReturningClientMode(settings.returningClientMode as any);
        if (settings.timeFormat) setTimeFormat(settings.timeFormat as '12h' | '24h');
        if (settings.timezone) setTimezone(settings.timezone);
        if (settings.telegramBotToken) setTelegramBotToken(settings.telegramBotToken);
        if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
        if (settings.telegramEnabled !== undefined) setTelegramEnabled(Boolean(settings.telegramEnabled));
        if (settings.followupIntervalHours) setFollowupIntervalHours(settings.followupIntervalHours);
        if (typeof settings.qualificationThreshold === 'number') setQualificationThreshold(settings.qualificationThreshold);

        if (settings.whatsappPhoneNumberId) setWhatsappPhoneNumberId(settings.whatsappPhoneNumberId);
        if (settings.whatsappAccessToken) setWhatsappAccessToken(settings.whatsappAccessToken);
        if (settings.whatsappBusinessAccountId) setWhatsappBusinessAccountId(settings.whatsappBusinessAccountId);
        if (settings.metaAppSecret) setMetaAppSecret(settings.metaAppSecret);
        if (settings.whatsappVerifyToken) setWhatsappVerifyToken(settings.whatsappVerifyToken);
        if (settings.whatsappFollowupTemplateName) setWhatsappFollowupTemplateName(settings.whatsappFollowupTemplateName);

        if (settings.aiProvider) setAiProvider(settings.aiProvider);
        if (settings.aiApiKey) setAiApiKey(settings.aiApiKey);
        if (settings.aiEndpoint) setAiEndpoint(settings.aiEndpoint);
        if (settings.aiDeploymentName) setAiDeploymentName(settings.aiDeploymentName);
        if (settings.aiApiVersion) setAiApiVersion(settings.aiApiVersion);

        if (settings.resendApiKey) setResendApiKey(settings.resendApiKey);
        if (settings.notificationEmail) setNotificationEmail(settings.notificationEmail);
      }
    } catch (err) {
      console.warn('Failed to load settings via /api/settings:', err);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    if (key === 'auto_reply_enabled') setAutoReplyEnabled(value);
    if (key === 'email_alerts_enabled') setEmailAlertsEnabled(value);
    if (key === 'discovery_interviewer_enabled') setDiscoveryInterviewerEnabled(value);
    if (key === 'returning_client_mode') setReturningClientMode(value);
    if (key === 'time_format') {
      setTimeFormat(value);
      if (typeof window !== 'undefined') localStorage.setItem('studio_time_format', value);
      if (onTimeSettingsChange) onTimeSettingsChange(value, timezone);
    }
    if (key === 'timezone') {
      setTimezone(value);
      if (typeof window !== 'undefined') localStorage.setItem('studio_timezone', value);
      if (onTimeSettingsChange) onTimeSettingsChange(timeFormat, value);
    }
    if (key === 'telegram_bot_token') setTelegramBotToken(value);
    if (key === 'telegram_chat_id') setTelegramChatId(value);
    if (key === 'telegram_enabled') setTelegramEnabled(value);
    if (key === 'followup_interval_hours') setFollowupIntervalHours(value);
    if (key === 'qualification_threshold') {
      const parsed = Number(value);
      const num = isNaN(parsed) ? 70 : Math.max(0, Math.min(100, parsed));
      setQualificationThreshold(num);
      setInputThreshold(String(num));
      if (onThresholdChange) onThresholdChange(num);
    }

    try {
      await supabase
        .from('studio_settings')
        .upsert({ id: studioId, [key]: value, updated_at: new Date().toISOString() });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId, [key]: value }),
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to persist studio settings:', err);
    }
  };

  const handleSaveIntegrationSettings = async () => {
    setIsSavingIntegrations(true);
    try {
      const payload: Record<string, any> = {
        studioId,
        ai_provider: aiProvider,
        ai_deployment_name: aiDeploymentName.trim() || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano'),
        ai_api_version: aiApiVersion.trim() || '2024-12-01-preview',
        whatsapp_followup_template_name: whatsappFollowupTemplateName.trim() || 'lead_reengagement',
        telegram_enabled: telegramEnabled,
      };

      if (draftInputs['notif_email'] !== undefined && draftInputs['notif_email'].trim() !== '') {
        payload.notification_email = draftInputs['notif_email'].trim();
      } else if (notificationEmail && !notificationEmail.includes('••')) {
        payload.notification_email = notificationEmail.trim();
      }

      if (draftInputs['ai_endpoint'] !== undefined && draftInputs['ai_endpoint'].trim() !== '') {
        payload.ai_endpoint = draftInputs['ai_endpoint'].trim();
      } else if (aiEndpoint && !aiEndpoint.includes('••')) {
        payload.ai_endpoint = aiEndpoint.trim();
      }

      if (draftInputs['meta_phone'] !== undefined && draftInputs['meta_phone'].trim() !== '') {
        payload.whatsapp_phone_number_id = draftInputs['meta_phone'].trim();
      }
      if (draftInputs['meta_waba'] !== undefined && draftInputs['meta_waba'].trim() !== '') {
        payload.whatsapp_business_account_id = draftInputs['meta_waba'].trim();
      }
      if (draftInputs['meta_token'] !== undefined && draftInputs['meta_token'].trim() !== '') {
        payload.whatsapp_access_token = draftInputs['meta_token'].trim();
      }
      if (draftInputs['meta_secret'] !== undefined && draftInputs['meta_secret'].trim() !== '') {
        payload.meta_app_secret = draftInputs['meta_secret'].trim();
      }
      if (draftInputs['meta_verify'] !== undefined && draftInputs['meta_verify'].trim() !== '') {
        payload.whatsapp_verify_token = draftInputs['meta_verify'].trim();
      }
      if (draftInputs['ai_key'] !== undefined && draftInputs['ai_key'].trim() !== '') {
        payload.ai_api_key = draftInputs['ai_key'].trim();
      }
      if (draftInputs['tg_token'] !== undefined && draftInputs['tg_token'].trim() !== '') {
        payload.telegram_bot_token = draftInputs['tg_token'].trim();
      }
      if (draftInputs['tg_chat'] !== undefined && draftInputs['tg_chat'].trim() !== '') {
        payload.telegram_chat_id = draftInputs['tg_chat'].trim();
      }
      if (draftInputs['resend_key'] !== undefined && draftInputs['resend_key'].trim() !== '') {
        payload.resend_api_key = draftInputs['resend_key'].trim();
      }

      // Local storage integrations
      if (draftInputs['discord_url'] !== undefined) {
        const val = draftInputs['discord_url'].trim();
        setDiscordWebhookUrl(val);
        if (typeof window !== 'undefined') localStorage.setItem('studio_discord_webhook', val);
      }
      if (draftInputs['fb_account'] !== undefined) {
        const val = draftInputs['fb_account'].trim();
        setFacebookAdAccountId(val);
        if (typeof window !== 'undefined') localStorage.setItem('studio_fb_account', val);
      }
      if (draftInputs['google_sheet'] !== undefined) {
        const val = draftInputs['google_sheet'].trim();
        setGoogleSheetUrl(val);
        if (typeof window !== 'undefined') localStorage.setItem('studio_google_sheet', val);
      }
      if (draftInputs['custom_webhook'] !== undefined) {
        const val = draftInputs['custom_webhook'].trim();
        setCustomWebhookUrl(val);
        if (typeof window !== 'undefined') localStorage.setItem('studio_custom_webhook', val);
      }

      const apiRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await apiRes.json();
      if (apiRes.ok && resData.settings) {
        const s = resData.settings;
        if (s.whatsappPhoneNumberId) setWhatsappPhoneNumberId(s.whatsappPhoneNumberId);
        if (s.whatsappAccessToken) setWhatsappAccessToken(s.whatsappAccessToken);
        if (s.whatsappBusinessAccountId) setWhatsappBusinessAccountId(s.whatsappBusinessAccountId);
        if (s.metaAppSecret) setMetaAppSecret(s.metaAppSecret);
        if (s.whatsappVerifyToken) setWhatsappVerifyToken(s.whatsappVerifyToken);
        if (s.aiApiKey) setAiApiKey(s.aiApiKey);
        if (s.aiEndpoint) setAiEndpoint(s.aiEndpoint);
        if (s.telegramBotToken) setTelegramBotToken(s.telegramBotToken);
        if (s.telegramChatId) setTelegramChatId(s.telegramChatId);
        if (s.resendApiKey) setResendApiKey(s.resendApiKey);
        if (s.notificationEmail) setNotificationEmail(s.notificationEmail);

        setEditingSecretFields({});
        setShowSecretInputs({});
        setDraftInputs({});
        setIntegrationsSavedToast(true);
        setTimeout(() => setIntegrationsSavedToast(false), 3500);
      } else {
        throw new Error(resData?.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      alert(`Failed to save settings: ${err?.message || err}`);
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const handleTestIntegration = async (type: 'meta' | 'ai' | 'telegram' | 'email' | 'discord' | 'webhooks' | 'google') => {
    setTestStatuses((prev) => ({ ...prev, [type]: { loading: true, success: undefined, error: undefined } }));
    try {
      let config: any = {};
      if (type === 'meta') {
        config = {
          phoneNumberId: draftInputs['meta_phone'] !== undefined ? draftInputs['meta_phone'] : undefined,
          accessToken: draftInputs['meta_token'] !== undefined ? draftInputs['meta_token'] : undefined,
          businessAccountId: draftInputs['meta_waba'] !== undefined ? draftInputs['meta_waba'] : undefined,
          appSecret: draftInputs['meta_secret'] !== undefined ? draftInputs['meta_secret'] : undefined,
        };
      } else if (type === 'ai') {
        config = {
          provider: aiProvider,
          apiKey: draftInputs['ai_key'] !== undefined ? draftInputs['ai_key'] : undefined,
          endpoint: (draftInputs['ai_endpoint'] !== undefined ? draftInputs['ai_endpoint'] : aiEndpoint) || undefined,
          deploymentName: aiDeploymentName || undefined,
          apiVersion: aiApiVersion || undefined,
        };
      } else if (type === 'telegram') {
        config = {
          botToken: draftInputs['tg_token'] !== undefined ? draftInputs['tg_token'] : undefined,
          chatId: draftInputs['tg_chat'] !== undefined ? draftInputs['tg_chat'] : undefined,
        };
      } else if (type === 'email') {
        config = {
          apiKey: draftInputs['resend_key'] !== undefined ? draftInputs['resend_key'] : undefined,
        };
      } else if (type === 'discord') {
        config = {
          webhookUrl: draftInputs['discord_url'] !== undefined ? draftInputs['discord_url'] : (discordWebhookUrl || undefined),
        };
      } else if (type === 'webhooks') {
        config = {
          targetUrl: draftInputs['custom_webhook'] !== undefined ? draftInputs['custom_webhook'] : (customWebhookUrl || undefined),
        };
      } else if (type === 'google') {
        config = {
          scriptUrl: draftInputs['google_sheet'] !== undefined ? draftInputs['google_sheet'] : (googleSheetUrl || undefined),
        };
      }

      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatuses((prev) => ({
          ...prev,
          [type]: { loading: false, success: true, message: data.message },
        }));
      } else {
        setTestStatuses((prev) => ({
          ...prev,
          [type]: { loading: false, success: false, error: data.error || 'Connection test failed' },
        }));
      }
    } catch (err: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [type]: { loading: false, success: false, error: err.message || 'Network error testing connection' },
      }));
    }
  };

  const renderSecretField = (
    fieldKey: string,
    label: string,
    currentValue: string,
    setValue?: (val: string) => void,
    options?: {
      placeholder?: string;
      inputType?: 'text' | 'password';
    }
  ) => {
    const isConfigured = Boolean(currentValue && currentValue.trim() !== '');
    const isEditing = Boolean(editingSecretFields[fieldKey]);
    const isRevealed = Boolean(showSecretInputs[fieldKey]);
    const inputType = isRevealed ? 'text' : (options?.inputType || 'password');
    const draftVal = draftInputs[fieldKey] !== undefined ? draftInputs[fieldKey] : '';

    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block">
            {label}
          </label>
        </div>

        {isConfigured && !isEditing ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)]">
            <div className="flex items-center gap-2 overflow-hidden">
              <Lock size={12} className="text-[var(--ink)]/40 shrink-0" />
              <span className="font-mono text-xs text-[var(--ink)] tracking-widest truncate select-none">
                ••••••••••••••••
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSecretFields((prev) => ({ ...prev, [fieldKey]: true }));
                setDraftInputs((prev) => ({ ...prev, [fieldKey]: '' }));
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] hover:bg-[var(--amber)]/20 transition-colors cursor-pointer shrink-0 ml-2"
            >
              Change
            </button>
          </div>
        ) : isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={inputType}
                placeholder={options?.placeholder || 'Enter replacement value...'}
                value={draftVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftInputs((prev) => ({ ...prev, [fieldKey]: val }));
                }}
                className="w-full text-xs font-mono pl-3 pr-8 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecretInputs((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink)]/40 hover:text-[var(--ink)] transition-colors cursor-pointer p-0.5"
                title={isRevealed ? 'Hide value' : 'Show value'}
              >
                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSecretFields((prev) => ({ ...prev, [fieldKey]: false }));
                setDraftInputs((prev) => {
                  const next = { ...prev };
                  delete next[fieldKey];
                  return next;
                });
              }}
              className="text-xs px-2.5 py-2 rounded-lg border border-[var(--paper-line)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer shrink-0 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type={inputType}
              placeholder={options?.placeholder || 'Enter value...'}
              value={draftVal}
              onChange={(e) => {
                const val = e.target.value;
                setDraftInputs((prev) => ({ ...prev, [fieldKey]: val }));
              }}
              className="w-full text-xs font-mono pl-3 pr-8 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
            />
            <button
              type="button"
              onClick={() => setShowSecretInputs((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink)]/40 hover:text-[var(--ink)] transition-colors cursor-pointer p-0.5"
              title={isRevealed ? 'Hide value' : 'Show value'}
            >
              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const isMetaConfigured = Boolean(
    (whatsappPhoneNumberId && !whatsappPhoneNumberId.includes('••')) ||
    (whatsappAccessToken && !whatsappAccessToken.includes('••')) ||
    whatsappPhoneNumberId?.length > 0
  );
  const isAiConfigured = Boolean((aiApiKey && !aiApiKey.includes('••')) || aiApiKey?.length > 0);
  const isTelegramConfigured = Boolean(telegramEnabled && telegramBotToken?.length > 0);
  const isResendConfigured = Boolean((resendApiKey && !resendApiKey.includes('••')) || resendApiKey?.length > 0);
  const isDiscordConfigured = Boolean(discordWebhookUrl && discordWebhookUrl.trim() !== '');
  const isFacebookConfigured = Boolean(facebookAdAccountId && facebookAdAccountId.trim() !== '');
  const isGoogleConfigured = Boolean(googleSheetUrl && googleSheetUrl.trim() !== '');
  const isWebhooksConfigured = Boolean(customWebhookUrl && customWebhookUrl.trim() !== '');

  const providers = [
    {
      id: 'meta',
      name: 'WhatsApp Business Cloud API',
      tag: 'Meta Direct',
      enabled: isMetaConfigured,
      icon: (
        <svg className="w-5 h-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.971.53 1.764.779 2.8.779h.005c3.18 0 5.767-2.587 5.768-5.766.001-3.18-2.585-5.766-5.777-5.766zm3.374 8.204c-.144.405-.837.774-1.17.824-.311.046-.71.077-2.102-.499-1.779-.736-2.919-2.55-3.007-2.667-.087-.117-.717-.954-.717-1.821s.454-1.294.616-1.469c.162-.175.353-.219.47-.219.118 0 .235.001.338.006.109.005.255-.041.399.304.149.356.51 1.242.554 1.332.044.09.073.195.015.311-.059.117-.088.19-.176.293-.088.102-.186.229-.265.308-.09.088-.184.185-.079.365.105.18.468.772.998 1.245.684.61 1.261.799 1.441.888.18.089.286.075.394-.049.108-.124.464-.539.588-.724.124-.185.247-.154.412-.093.165.062 1.05.495 1.23.585.18.09.3.135.344.21.044.075.044.436-.1.841z"/>
        </svg>
      ),
    },
    {
      id: 'ai',
      name: 'Azure OpenAI / OpenAI Direct',
      tag: 'LLM Qualification & Reasoning',
      enabled: isAiConfigured,
      icon: (
        <svg className="w-5 h-5 text-purple-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z"/>
        </svg>
      ),
    },
    {
      id: 'telegram',
      name: 'Telegram Bot API',
      tag: 'Instant Broadcasts',
      enabled: isTelegramConfigured,
      icon: (
        <svg className="w-5 h-5 text-sky-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
        </svg>
      ),
    },
    {
      id: 'email',
      name: 'Resend',
      tag: 'Transactional Email',
      enabled: isResendConfigured,
      icon: (
        <svg className="w-5 h-5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.5 4A2.5 2.5 0 0 0 0 6.5v11A2.5 2.5 0 0 0 2.5 20h19a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 21.5 4h-19zm0 2h19c.276 0 .5.224.5.5v.379l-9.444 6.746a1 1 0 0 1-1.112 0L2 6.879V6.5c0-.276.224-.5.5-.5zm-.5 3.321 8.243 5.888a3 3 0 0 0 3.514 0L22 9.321V17.5c0 .276-.224.5-.5.5h-19a.5.5 0 0 1-.5-.5V9.321z" />
        </svg>
      ),
    },
    {
      id: 'discord',
      name: 'Discord',
      tag: 'Webhook Alerts',
      enabled: isDiscordConfigured,
      icon: (
        <svg className="w-5 h-5 text-[#5865F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ),
    },
    {
      id: 'facebook',
      name: 'Meta Ads',
      tag: 'Lead Forms',
      enabled: isFacebookConfigured,
      icon: (
        <svg className="w-5 h-5 text-[#1877F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      id: 'google',
      name: 'Google Sheets',
      tag: 'Spreadsheet Sync',
      enabled: isGoogleConfigured,
      icon: (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      ),
    },
    {
      id: 'webhooks',
      name: 'Custom Webhooks',
      tag: 'Zapier & Make',
      enabled: isWebhooksConfigured,
      icon: (
        <svg className="w-5 h-5 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c0-2.21 1.79-4 4-4h5.98" />
          <path d="M6 7.02h5.99c1.1 0 1.95-.94 2.48-1.9A4 4 0 0 1 22 7c0 2.21-1.79 4-4 4h-5.98" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
            <Settings size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
            <span>Studio Settings Center</span>
          </h2>
          <p className="text-xs text-[var(--ink)]/60 mt-0.5">
            Configure live Cloud APIs, tokens, AI engines, Telegram broadcast bot, and regional localization
          </p>
        </div>
        {settingsTab === 'integrations' && (
          <button
            type="button"
            disabled={isSavingIntegrations}
            onClick={handleSaveIntegrationSettings}
            className="px-4 py-2 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all shrink-0 self-start sm:self-auto"
          >
            {isSavingIntegrations ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving Credentials...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save All Credentials</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Settings Tab Selector */}
      <div className="flex items-center gap-2 border-b border-[var(--paper-line)] pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'integrations', label: 'API Keys & Integrations', icon: Key },
          { id: 'general', label: 'General & Localization', icon: Globe },
          { id: 'ai', label: 'AI & Workflow Policies', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id as SettingsTab)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              settingsTab === tab.id
                ? 'bg-[var(--paper)] text-[var(--ink)] shadow-2xs'
                : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
            }`}
          >
            {tab.icon && <tab.icon size={13} className="shrink-0" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 0: API Keys & Integrations */}
      {settingsTab === 'integrations' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-start gap-3.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center shrink-0 mt-0.5">
              <Key size={16} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-xs text-[var(--ink)]">Integrations &amp; API Settings</p>
              <p className="text-[11px] text-[var(--ink)]/60 leading-relaxed">
                Connect your communications, AI model, and notification channels. Select a provider below to view or update its configuration.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden shadow-xs divide-y divide-[var(--paper-line)]">
            {providers.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveIntegrationModal(p.id)}
                className="px-5 sm:px-6 py-4 flex items-center justify-between hover:bg-[var(--paper)]/60 cursor-pointer transition-colors group select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {p.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {p.name}
                    </span>
                    {p.tag && (
                      <span className="text-[10px] font-medium text-[var(--ink)]/40 hidden md:inline">
                        · {p.tag}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {p.enabled ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Configured
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                      Not Configured
                    </span>
                  )}
                  <ChevronRight size={16} className="text-[var(--ink)]/30 group-hover:text-[var(--ink)] transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {/* Pop-Up Modal Dialog */}
          {activeIntegrationModal && (
            <div
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveIntegrationModal(null);
              }}
            >
              <div
                className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 sm:p-6 border-b border-[var(--paper-line)] flex items-start justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shrink-0">
                      {providers.find((p) => p.id === activeIntegrationModal)?.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-[var(--ink)]">
                          {activeIntegrationModal === 'meta' && 'WhatsApp Business API'}
                          {activeIntegrationModal === 'ai' && 'AI Qualification Model'}
                          {activeIntegrationModal === 'telegram' && 'Telegram Alerts'}
                          {activeIntegrationModal === 'email' && 'Email Alerts (Resend)'}
                          {activeIntegrationModal === 'discord' && 'Discord Alerts'}
                          {activeIntegrationModal === 'facebook' && 'Meta Lead Ads'}
                          {activeIntegrationModal === 'google' && 'Google Sheets Sync'}
                          {activeIntegrationModal === 'webhooks' && 'Custom Webhooks'}
                        </h3>
                        {providers.find((p) => p.id === activeIntegrationModal)?.enabled ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                            Unconfigured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                        {activeIntegrationModal === 'meta' && 'Automated messaging, inbound webhook reception, and follow-ups'}
                        {activeIntegrationModal === 'ai' && 'Lead qualification scoring, analysis, and discovery'}
                        {activeIntegrationModal === 'telegram' && 'Direct notifications for newly qualified leads'}
                        {activeIntegrationModal === 'email' && 'Email summaries and notifications'}
                        {activeIntegrationModal === 'discord' && 'Lead notifications forwarded to your Discord server'}
                        {activeIntegrationModal === 'facebook' && 'Sync leads from Facebook and Instagram Instant Forms'}
                        {activeIntegrationModal === 'google' && 'Export leads to your Google Sheets spreadsheet'}
                        {activeIntegrationModal === 'webhooks' && 'Dispatch real-time lead data to external automations'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIntegrationModal(null);
                      setDraftInputs({});
                      setEditingSecretFields({});
                      setShowSecretInputs({});
                    }}
                    className="p-1.5 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer shrink-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                  {/* Meta */}
                  {activeIntegrationModal === 'meta' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {renderSecretField('meta_phone', 'Phone Number ID', whatsappPhoneNumberId, undefined, {
                          placeholder: 'e.g. 1230168753524014',
                        })}
                        {renderSecretField('meta_waba', 'WABA Account ID', whatsappBusinessAccountId, undefined, {
                          placeholder: 'e.g. 1774852886868045',
                        })}
                        <div className="sm:col-span-2">
                          {renderSecretField('meta_token', 'System User Access Token', whatsappAccessToken, undefined, {
                            placeholder: 'Paste access token (EAA...)',
                          })}
                        </div>
                        {renderSecretField('meta_secret', 'Meta App Secret', metaAppSecret, undefined, {
                          placeholder: 'App secret for webhook verification',
                        })}
                        {renderSecretField('meta_verify', 'Webhook Verify Token', whatsappVerifyToken, undefined, {
                          placeholder: 'e.g. gucsyt-marcas-jePmi5',
                        })}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                            Follow-up Template Name
                          </label>
                          <input
                            type="text"
                            placeholder="lead_reengagement"
                            value={whatsappFollowupTemplateName}
                            onChange={(e) => setWhatsappFollowupTemplateName(e.target.value)}
                            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                          />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Globe size={13} /> Webhook Callback URL
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${siteOrigin || (typeof window !== 'undefined' ? window.location.origin : '')}/api/whatsapp/webhook`;
                              navigator.clipboard.writeText(url);
                              setCopiedWebhookUrl(true);
                              setTimeout(() => setCopiedWebhookUrl(false), 2000);
                            }}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)] hover:border-emerald-500 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedWebhookUrl ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copiedWebhookUrl ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-[var(--ink)] bg-[var(--paper)] p-2 rounded border border-[var(--paper-line)] break-all select-all">
                          {siteOrigin ? `${siteOrigin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI */}
                  {activeIntegrationModal === 'ai' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1.5">
                          AI Provider
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAiProvider('azure');
                              if (!aiDeploymentName || aiDeploymentName === 'gpt-4o-mini') setAiDeploymentName('gpt-5-nano');
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                              aiProvider === 'azure'
                                ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-2xs'
                                : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)]'
                            }`}
                          >
                            Azure OpenAI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiProvider('openai');
                              if (!aiDeploymentName || aiDeploymentName === 'gpt-5-nano') setAiDeploymentName('gpt-4o-mini');
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                              aiProvider === 'openai'
                                ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-2xs'
                                : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)]'
                            }`}
                          >
                            OpenAI
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {renderSecretField('ai_key', aiProvider === 'azure' ? 'Azure OpenAI API Key' : 'OpenAI API Key', aiApiKey)}
                        {aiProvider === 'azure' ? (
                          <>
                        {renderSecretField('ai_endpoint', 'Endpoint URL', aiEndpoint, undefined, {
                          placeholder: 'https://your-resource.openai.azure.com/',
                        })}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                  Deployment Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="gpt-5-nano"
                                  value={aiDeploymentName}
                                  onChange={(e) => setAiDeploymentName(e.target.value)}
                                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                  API Version
                                </label>
                                <input
                                  type="text"
                                  placeholder="2024-12-01-preview"
                                  value={aiApiVersion}
                                  onChange={(e) => setAiApiVersion(e.target.value)}
                                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                              Model Name
                            </label>
                            <input
                              type="text"
                              placeholder="gpt-4o-mini"
                              value={aiDeploymentName}
                              onChange={(e) => setAiDeploymentName(e.target.value)}
                              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Telegram */}
                  {activeIntegrationModal === 'telegram' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--ink)]">Enable Telegram Alerts</p>
                          <p className="text-[11px] text-[var(--ink)]/60">Send instant notifications for qualified leads</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTelegramEnabled(!telegramEnabled)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                            telegramEnabled ? 'bg-sky-500' : 'bg-[var(--paper-line)]'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            telegramEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {renderSecretField('tg_token', 'Telegram Bot Token', telegramBotToken)}
                        {renderSecretField('tg_chat', 'Telegram Chat ID', telegramChatId)}
                      </div>

                      {/* Setup Instructions */}
                      <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-2">
                        <p className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                          <span>💡</span> How to Setup in 3 Quick Steps:
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[var(--ink)]/80 leading-relaxed">
                          <li>
                            Open Telegram and message <strong>@BotFather</strong> with <code>/newbot</code> to create a bot and get your <strong>Bot Token</strong>.
                          </li>
                          <li>
                            <strong className="text-amber-600 dark:text-amber-400">Critical Step:</strong> Search for your new bot username on Telegram and click <strong>Start</strong> (Telegram strictly prohibits bots from initiating messages until you start the chat).
                          </li>
                          <li>
                            Message <strong>@userinfobot</strong> on Telegram to get your personal numeric <strong>Chat ID</strong> (or add your bot to a team group/channel), paste it above, and click <strong>Test Connection</strong>.
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Resend */}
                  {activeIntegrationModal === 'email' && (
                    <div className="space-y-4">
                      {renderSecretField('resend_key', 'Resend API Key', resendApiKey)}
                      {renderSecretField('notif_email', 'Notification Email', notificationEmail, undefined, {
                        placeholder: 'owner@studio.com',
                      })}
                    </div>
                  )}

                  {/* Discord */}
                  {activeIntegrationModal === 'discord' && (
                    <div className="space-y-4">
                      {renderSecretField('discord_url', 'Discord Webhook URL', discordWebhookUrl)}
                    </div>
                  )}

                  {/* Facebook */}
                  {activeIntegrationModal === 'facebook' && (
                    <div className="space-y-4">
                      {renderSecretField('fb_account', 'Meta Ad Account ID', facebookAdAccountId)}
                    </div>
                  )}

                  {/* Google */}
                  {activeIntegrationModal === 'google' && (
                    <div className="space-y-4">
                      {renderSecretField('google_sheet', 'Google Apps Script Webhook URL', googleSheetUrl)}
                    </div>
                  )}

                  {/* Webhooks */}
                  {activeIntegrationModal === 'webhooks' && (
                    <div className="space-y-4">
                      {renderSecretField('custom_webhook', 'Webhook Endpoint URL', customWebhookUrl)}
                    </div>
                  )}

                  {/* Live Feedback Banner */}
                  {activeIntegrationModal && testStatuses[activeIntegrationModal] && (
                    <div className="pt-2">
                      {testStatuses[activeIntegrationModal].loading && (
                        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs flex items-center gap-2.5 text-amber-700 dark:text-amber-400 animate-pulse">
                          <RefreshCw size={14} className="animate-spin shrink-0" />
                          <span className="font-medium">Testing live connection to provider...</span>
                        </div>
                      )}
                      {testStatuses[activeIntegrationModal].success && (
                        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs flex items-start gap-2.5 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="break-words leading-relaxed font-medium">{testStatuses[activeIntegrationModal].message}</span>
                        </div>
                      )}
                      {testStatuses[activeIntegrationModal].error && (
                        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs flex items-start gap-2.5 text-rose-700 dark:text-rose-400">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold mb-0.5">Connection Error</p>
                            <p className="break-words leading-relaxed">{testStatuses[activeIntegrationModal].error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-[var(--paper-line)] bg-[var(--paper)]/50 flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIntegrationModal(null);
                      setDraftInputs({});
                      setEditingSecretFields({});
                      setShowSecretInputs({});
                    }}
                    className="px-3.5 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)]/70 hover:text-[var(--ink)] text-xs font-medium cursor-pointer transition-colors"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2.5">
                    {['meta', 'ai', 'telegram', 'email', 'discord', 'webhooks', 'google'].includes(activeIntegrationModal) && (
                      <button
                        type="button"
                        disabled={testStatuses[activeIntegrationModal]?.loading}
                        onClick={() => handleTestIntegration(activeIntegrationModal as any)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] hover:bg-[var(--paper-raised)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 transition-all shrink-0"
                      >
                        <Activity size={13} className="text-emerald-500" />
                        <span>{testStatuses[activeIntegrationModal]?.loading ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSavingIntegrations}
                      onClick={handleSaveIntegrationSettings}
                      className="px-4 py-2 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 transition-all shrink-0"
                    >
                      {isSavingIntegrations ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Save Integration</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Confirmation Toast */}
      {integrationsSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} />
          <span>Integration credentials saved to database! Active across all live background automations.</span>
        </div>
      )}

      {/* Tab 1: General & Localization */}
      {settingsTab === 'general' && (
        <div className="p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-4 shadow-xs">
          <h3 className="font-semibold text-sm text-[var(--ink)]">Studio Identification &amp; Regional Localization</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Studio Display Name
              </label>
              <input
                type="text"
                value={studioName}
                readOnly
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)]/50 text-[var(--ink)]/70 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Studio Identifier Slug
              </label>
              <input
                type="text"
                value={studioSlug}
                readOnly
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)]/50 text-[var(--ink)]/70 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Studio Regional Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label} ({tz.value})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Clock Display Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('time_format', '12h')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                    timeFormat === '12h'
                      ? 'border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] shadow-2xs'
                      : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60'
                  }`}
                >
                  12-Hour (e.g. 03:45 PM)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('time_format', '24h')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                    timeFormat === '24h'
                      ? 'border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] shadow-2xs'
                      : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60'
                  }`}
                >
                  24-Hour (e.g. 15:45)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI & Workflow Policies */}
      {settingsTab === 'ai' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-4 shadow-xs">
            <h3 className="font-semibold text-sm text-[var(--ink)]">AI Lead Qualification Threshold</h3>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[var(--ink)]/70 font-medium">
                  Minimum LPI Score to Qualify Lead: <strong className="text-[var(--ink)] font-bold">{qualificationThreshold}/100</strong>
                </label>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {qualificationThreshold >= 80 ? 'High Bar' : qualificationThreshold >= 60 ? 'Balanced Standard' : 'Aggressive Filter'}
                </span>
              </div>

              {/* Slider with Number Input Beside it (Image 2 style) */}
              <div className="flex items-center gap-3.5">
                <div className="flex-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={qualificationThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQualificationThreshold(val);
                      setInputThreshold(String(val));
                      handleUpdateSetting('qualification_threshold', val);
                    }}
                    style={{
                      background: `linear-gradient(to right, var(--amber) ${qualificationThreshold}%, var(--paper-line) ${qualificationThreshold}%)`,
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--amber)] bg-transparent"
                    aria-label="Qualification threshold slider"
                  />
                </div>

                <div className="w-20 sm:w-24 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={inputThreshold}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputThreshold(val);
                      if (val.trim() === '') return;
                      const num = Number(val);
                      if (!isNaN(num)) {
                        const clamped = Math.max(0, Math.min(100, num));
                        setQualificationThreshold(clamped);
                        handleUpdateSetting('qualification_threshold', clamped);
                      }
                    }}
                    onBlur={() => {
                      const num = Number(inputThreshold);
                      const clamped = isNaN(num) || inputThreshold.trim() === '' ? 70 : Math.max(0, Math.min(100, Math.round(num)));
                      setInputThreshold(String(clamped));
                      setQualificationThreshold(clamped);
                      handleUpdateSetting('qualification_threshold', clamped);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full h-9 sm:h-10 px-3 text-right font-mono font-bold text-sm sm:text-base rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] focus:ring-1 focus:ring-[var(--amber)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                    placeholder="0-100"
                    aria-label="Qualification threshold value"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-4 shadow-xs">
            <h3 className="font-semibold text-sm text-[var(--ink)]">Automated Workflows &amp; Dispatches</h3>
            
            <div className="space-y-3 divide-y divide-[var(--paper-line)]">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Autonomous Follow-Up Sweeps</p>
                  <p className="text-[11px] text-[var(--ink)]/60">Allow background worker to dispatch re-engagement templates</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('auto_reply_enabled', !autoReplyEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    autoReplyEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Email Dossier Notifications</p>
                  <p className="text-[11px] text-[var(--ink)]/60">Deliver full lead summaries to studio partners</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('email_alerts_enabled', !emailAlertsEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    emailAlertsEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
