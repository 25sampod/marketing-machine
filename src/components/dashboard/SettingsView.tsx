'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, Save, RefreshCw, CheckCircle2, ChevronRight, 
  Lock, Globe, Copy, Check, Activity, AlertTriangle 
} from 'lucide-react';
import { formatStudioTime, COMMON_TIMEZONES } from '@/lib/formatTime';
import { SettingsTab } from './types';

interface SettingsViewProps {
  // Current settings values
  whatsappPhoneNumberId: string;
  setWhatsappPhoneNumberId: (val: string) => void;
  whatsappAccessToken: string;
  setWhatsappAccessToken: (val: string) => void;
  whatsappBusinessAccountId: string;
  setWhatsappBusinessAccountId: (val: string) => void;
  metaAppSecret: string;
  setMetaAppSecret: (val: string) => void;
  whatsappVerifyToken: string;
  setWhatsappVerifyToken: (val: string) => void;
  whatsappFollowupTemplateName: string;
  setWhatsappFollowupTemplateName: (val: string) => void;

  aiProvider: 'azure' | 'openai';
  setAiProvider: (val: 'azure' | 'openai') => void;
  aiApiKey: string;
  setAiApiKey: (val: string) => void;
  aiEndpoint: string;
  setAiEndpoint: (val: string) => void;
  aiDeploymentName: string;
  setAiDeploymentName: (val: string) => void;
  aiApiVersion: string;
  setAiApiVersion: (val: string) => void;

  resendApiKey: string;
  setResendApiKey: (val: string) => void;
  notificationEmail: string;
  setNotificationEmail: (val: string) => void;

  telegramBotToken: string;
  setTelegramBotToken: (val: string) => void;
  telegramChatId: string;
  setTelegramChatId: (val: string) => void;
  telegramEnabled: boolean;
  setTelegramEnabled: (val: boolean) => void;

  autoReplyEnabled: boolean;
  setAutoReplyEnabled: (val: boolean) => void;
  emailAlertsEnabled: boolean;
  setEmailAlertsEnabled: (val: boolean) => void;
  discoveryInterviewerEnabled: boolean;
  setDiscoveryInterviewerEnabled: (val: boolean) => void;
  returningClientMode: 'auto' | 'draft_only' | 'disabled';
  setReturningClientMode: (val: 'auto' | 'draft_only' | 'disabled') => void;

  timeFormat: '12h' | '24h';
  setTimeFormat: (val: '12h' | '24h') => void;
  timezone: string;
  setTimezone: (val: string) => void;
  followupIntervalHours: number;
  setFollowupIntervalHours: (val: number) => void;
  qualificationThreshold: number;
  setQualificationThreshold: (val: number) => void;

  studioName?: string;
  setStudioName?: (val: string) => void;
  studioSlug?: string;
  setStudioSlug?: (val: string) => void;

  onUpdateSetting: (key: string, val: any) => Promise<void> | void;
  onSaveIntegrationSettings: (customPayload?: Record<string, any>) => Promise<void> | void;
  isSavingIntegrations: boolean;
  integrationsSavedToast: boolean;
  testStatuses: Record<string, { loading: boolean; success?: boolean; message?: string; error?: string }>;
  onTestIntegration: (type: 'meta' | 'ai' | 'telegram' | 'email' | 'discord' | 'webhooks' | 'google', draftInputs?: Record<string, string>) => Promise<void> | void;
}

export default function SettingsView({
  whatsappPhoneNumberId,
  setWhatsappPhoneNumberId,
  whatsappAccessToken,
  setWhatsappAccessToken,
  whatsappBusinessAccountId,
  setWhatsappBusinessAccountId,
  metaAppSecret,
  setMetaAppSecret,
  whatsappVerifyToken,
  setWhatsappVerifyToken,
  whatsappFollowupTemplateName,
  setWhatsappFollowupTemplateName,
  aiProvider,
  setAiProvider,
  aiApiKey,
  setAiApiKey,
  aiEndpoint,
  setAiEndpoint,
  aiDeploymentName,
  setAiDeploymentName,
  aiApiVersion,
  setAiApiVersion,
  resendApiKey,
  setResendApiKey,
  notificationEmail,
  setNotificationEmail,
  telegramBotToken,
  setTelegramBotToken,
  telegramChatId,
  setTelegramChatId,
  telegramEnabled,
  setTelegramEnabled,
  autoReplyEnabled,
  setAutoReplyEnabled,
  emailAlertsEnabled,
  setEmailAlertsEnabled,
  discoveryInterviewerEnabled,
  setDiscoveryInterviewerEnabled,
  returningClientMode,
  setReturningClientMode,
  timeFormat,
  setTimeFormat,
  timezone,
  setTimezone,
  followupIntervalHours,
  setFollowupIntervalHours,
  qualificationThreshold,
  setQualificationThreshold,
  studioName = 'ArchScale Architecture Studio',
  setStudioName,
  studioSlug = 'archscale',
  setStudioSlug,
  onUpdateSetting,
  onSaveIntegrationSettings,
  isSavingIntegrations,
  integrationsSavedToast,
  testStatuses,
  onTestIntegration,
}: SettingsViewProps) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('integrations');
  const [activeIntegrationModal, setActiveIntegrationModal] = useState<string | null>(null);

  // Client-side integrations (stored in localStorage)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [facebookAdAccountId, setFacebookAdAccountId] = useState<string>('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');

  const [editingSecretFields, setEditingSecretFields] = useState<Record<string, boolean>>({});
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
      setDiscordWebhookUrl(localStorage.getItem('studio_discord_webhook') || '');
      setFacebookAdAccountId(localStorage.getItem('studio_fb_account') || '');
      setGoogleSheetUrl(localStorage.getItem('studio_google_sheet') || '');
      setCustomWebhookUrl(localStorage.getItem('studio_custom_webhook') || '');
    }
  }, []);

  const renderSecretField = (
    fieldKey: string,
    label: string,
    currentValue: string,
    setValue?: (val: string) => void,
    options?: {
      placeholder?: string;
      isIdField?: boolean;
      inputType?: 'text' | 'password';
      onBlur?: (val: string) => void;
    }
  ) => {
    const isConfigured = Boolean(currentValue && currentValue.trim() !== '');
    const isEditing = Boolean(editingSecretFields[fieldKey]);
    const inputType = options?.inputType || (options?.isIdField ? 'text' : 'password');
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
            <input
              type={inputType}
              placeholder={options?.placeholder || 'Enter replacement value...'}
              value={draftVal}
              onChange={(e) => {
                const val = e.target.value;
                setDraftInputs((prev) => ({ ...prev, [fieldKey]: val }));
              }}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              autoFocus
            />
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
          <input
            type={inputType}
            placeholder={options?.placeholder || 'Enter value...'}
            value={draftVal}
            onChange={(e) => {
              const val = e.target.value;
              setDraftInputs((prev) => ({ ...prev, [fieldKey]: val }));
            }}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
          />
        )}
      </div>
    );
  };

  const handleSave = () => {
    // Client-side integrations (stored in localStorage)
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

    onSaveIntegrationSettings(draftInputs);
    setEditingSecretFields({});
    setDraftInputs({});
  };

  const isWhatsAppConfigured = Boolean(whatsappAccessToken?.trim() && whatsappPhoneNumberId?.trim());
  const isAiConfigured = Boolean(aiApiKey?.trim());
  const isTelegramConfigured = Boolean(telegramEnabled && telegramBotToken?.trim() && telegramChatId?.trim());
  const isEmailConfigured = Boolean(resendApiKey?.trim());
  const isDiscordConfigured = Boolean(discordWebhookUrl?.trim());
  const isFacebookConfigured = Boolean(metaAppSecret?.trim() && whatsappPhoneNumberId?.trim());
  const isGoogleConfigured = Boolean(googleSheetUrl?.trim());
  const isWebhooksConfigured = Boolean(customWebhookUrl?.trim());

  const providers = [
    {
      id: 'meta',
      name: 'Meta WhatsApp',
      tag: 'WhatsApp Business API',
      enabled: isWhatsAppConfigured,
      icon: (
        <svg className="w-5 h-5 text-[#25D366] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.16C10.57 20.16 9.12 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.05 20.16ZM16.57 14.33C16.32 14.2 15.1 13.6 14.87 13.52C14.65 13.43 14.48 13.39 14.32 13.64C14.15 13.89 13.67 14.46 13.52 14.63C13.38 14.8 13.23 14.82 12.98 14.7C12.73 14.57 11.93 14.31 10.98 13.47C10.24 12.81 9.74 11.99 9.6 11.74C9.45 11.49 9.58 11.36 9.71 11.23C9.82 11.12 9.96 10.94 10.08 10.8C10.21 10.66 10.25 10.55 10.33 10.39C10.41 10.22 10.37 10.08 10.31 9.95C10.25 9.83 9.75 8.6 9.55 8.09C9.35 7.59 9.14 7.66 8.99 7.65C8.84 7.65 8.68 7.64 8.51 7.64C8.34 7.64 8.08 7.7 7.85 7.95C7.62 8.2 6.98 8.8 6.98 10.02C6.98 11.24 7.87 12.41 8 12.58C8.12 12.75 9.75 15.25 12.24 16.33C12.83 16.59 13.29 16.74 13.65 16.85C14.25 17.04 14.79 17.02 15.22 16.95C15.7 16.88 16.7 16.35 16.91 15.77C17.11 15.19 17.11 14.69 17.05 14.59C16.99 14.49 16.82 14.45 16.57 14.33Z" />
        </svg>
      ),
    },
    {
      id: 'ai',
      name: 'AI Model',
      tag: 'Azure & OpenAI',
      enabled: isAiConfigured,
      icon: (
        <svg className="w-5 h-5 text-[#10A37F] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.66-4.7214a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1402-2.2424zm-1.1278-9.4586a4.4755 4.4755 0 0 1 2.3418-1.9729v.1656l.0047 5.5163a.79.79 0 0 0 .3928.6813l5.8428 3.3685-2.02 1.1683a.071.071 0 0 1-.0662.0047L4.72 13.1492a4.4992 4.4992 0 0 1-2.2479-4.899zm14.7738 3.6558-5.8428-3.3685 2.02-1.1683a.071.071 0 0 1 .0662-.0047l4.1378 2.3891a4.4992 4.4992 0 0 1 2.2479 4.899 4.4755 4.4755 0 0 1-2.3418 1.9729v-.1656l-.0047-5.5163a.79.79 0 0 0-.3928-.6813zm2.8465-3.0468-.142-.0852-4.783-2.7582a.7712.7712 0 0 0-.7806 0L8.808 9.5849V7.2525a.0804.0804 0 0 1 .0332-.0615l4.1378-2.3891a4.4992 4.4992 0 0 1 6.1402 2.2424 4.4708 4.4708 0 0 1 .5346 3.0137zM8.0066 12.801l3.2386-1.8702v3.7404l-3.2386-1.8702zm3.9934-2.3057 3.2386 1.8702-3.2386 1.8702V10.4953z" />
        </svg>
      ),
    },
    {
      id: 'telegram',
      name: 'Telegram',
      tag: 'Alerts Bot',
      enabled: isTelegramConfigured,
      icon: (
        <svg className="w-5 h-5 text-[#24A1DE] shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
    {
      id: 'email',
      name: 'Email (Resend)',
      tag: 'Alerts',
      enabled: isEmailConfigured,
      icon: (
        <svg className="w-5 h-5 text-amber-500 dark:text-zinc-200 shrink-0" viewBox="0 0 24 24" fill="currentColor">
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
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all shrink-0 self-start sm:self-auto"
          >
            {isSavingIntegrations ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save All Integrations</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex items-center p-1 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] overflow-x-auto">
        {[
          { id: 'integrations', label: 'API Keys & Integrations', icon: Key },
          { id: 'general', label: 'General & Time' },
          { id: 'ai', label: 'AI Qualification & Rules' },
          { id: 'channels', label: 'Omnichannel & Webhooks' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSettingsTab(tab.id as any)}
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
          {/* Guidance Banner */}
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

          {/* Providers Table */}
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
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <CheckCircle2 size={13} className="text-emerald-500 fill-emerald-500/20 shrink-0" />
                      <span>Enabled</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full text-xs font-medium border border-[var(--paper-line)] text-[var(--ink)]/40 bg-[var(--paper)]/50">
                      <span>Disabled</span>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-[var(--ink)]/30 group-hover:text-[var(--ink)]/80 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Status Info Bar */}
          <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <p className="text-xs text-[var(--ink)]/60 text-center sm:text-left">
              Credentials are securely saved to your private database and active across all background workflows.
            </p>
            <button
              type="button"
              disabled={isSavingIntegrations}
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all shrink-0"
            >
              {isSavingIntegrations ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save All Settings</span>
                </>
              )}
            </button>
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
                {/* Modal Header */}
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
                    onClick={() => setActiveIntegrationModal(null)}
                    className="p-1.5 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer shrink-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                  {/* 1. Meta WhatsApp Modal Body */}
                  {activeIntegrationModal === 'meta' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {renderSecretField('meta_phone', 'Phone Number ID', whatsappPhoneNumberId, undefined, {
                          placeholder: 'e.g. 1230168753524014',
                          isIdField: true,
                        })}

                        {renderSecretField('meta_waba', 'WABA Account ID', whatsappBusinessAccountId, undefined, {
                          placeholder: 'e.g. 1774852886868045',
                          isIdField: true,
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

                      {/* Webhook Callback URL Card */}
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
                        <p className="text-[11px] text-[var(--ink)]/60 leading-relaxed">
                          Add this URL in Meta App Dashboard under <strong>WhatsApp &rarr; Configuration &rarr; Callback URL</strong>, along with the Webhook Verify Token above.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2. OpenAI / Azure Modal Body */}
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
                              if (!aiDeploymentName || aiDeploymentName === 'gpt-4o-mini') {
                                setAiDeploymentName('gpt-5-nano');
                              }
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
                              if (!aiDeploymentName || aiDeploymentName === 'gpt-5-nano') {
                                setAiDeploymentName('gpt-4o-mini');
                              }
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
                        {renderSecretField('ai_key', aiProvider === 'azure' ? 'Azure OpenAI API Key' : 'OpenAI API Key', aiApiKey, undefined, {
                          placeholder: aiProvider === 'azure' ? 'Enter Azure OpenAI Key' : 'Enter OpenAI Key',
                        })}

                        {aiProvider === 'azure' ? (
                          <>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                Endpoint URL
                              </label>
                              <input
                                type="text"
                                placeholder="https://your-resource.openai.azure.com/"
                                value={aiEndpoint}
                                onChange={(e) => setAiEndpoint(e.target.value)}
                                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                  Deployment Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="gpt-5-nano or gpt-4o-mini"
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
                              placeholder="gpt-4o-mini or gpt-4o"
                              value={aiDeploymentName}
                              onChange={(e) => setAiDeploymentName(e.target.value)}
                              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Telegram Modal Body */}
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
                        {renderSecretField('tg_token', 'Telegram Bot Token', telegramBotToken, undefined, {
                          placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
                        })}

                        {renderSecretField('tg_chat', 'Telegram Chat ID', telegramChatId, undefined, {
                          placeholder: '-1001234567890 or @channelname',
                          isIdField: true,
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-1.5">
                        <p className="font-semibold text-sky-600 dark:text-sky-400">Telegram 3-Step Setup:</p>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          1. Message <span className="font-mono font-semibold">@BotFather</span> on Telegram to generate your Bot Token.<br />
                          2. Add your bot as an Administrator to your channel or group.<br />
                          3. Message <span className="font-mono font-semibold">@userinfobot</span> to get your Chat ID.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 4. Resend Email Modal Body */}
                  {activeIntegrationModal === 'email' && (
                    <div className="space-y-4">
                      <div>
                        {renderSecretField('resend_key', 'Resend API Key', resendApiKey, undefined, {
                          placeholder: 're_123456789...',
                        })}
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                          Notification Email
                        </label>
                        <input
                          type="email"
                          placeholder="owner@studio.com"
                          value={notificationEmail}
                          onChange={(e) => setNotificationEmail(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-1">
                        <p className="font-semibold text-amber-600 dark:text-amber-400">Delivery Summary:</p>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          Structured inquiry dossiers and lead summaries are delivered directly to this inbox when a lead is qualified.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 5. Discord Modal Body */}
                  {activeIntegrationModal === 'discord' && (
                    <div className="space-y-4">
                      <div>
                        {renderSecretField('discord_url', 'Discord Webhook URL', discordWebhookUrl, undefined, {
                          placeholder: 'https://discord.com/api/webhooks/1234567890/...',
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 text-xs space-y-1.5">
                        <p className="font-semibold text-[#5865F2]">Discord Setup:</p>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          1. In your Discord server, go to <strong>Server Settings &rarr; Integrations &rarr; Webhooks</strong>.<br />
                          2. Click <strong>New Webhook</strong>, select your channel, and copy the Webhook URL.<br />
                          3. Paste the URL above and click <strong>Save Integration</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 6. Facebook / Meta Ads Modal Body */}
                  {activeIntegrationModal === 'facebook' && (
                    <div className="space-y-4">
                      <div>
                        {renderSecretField('fb_account', 'Meta Ad Account ID', facebookAdAccountId, undefined, {
                          placeholder: 'act_1234567890',
                          isIdField: true,
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                          Lead Ads Subscription:
                        </span>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          Inbound leads from Click-to-WhatsApp ads and Instant Forms are automatically ingested through your WhatsApp webhook.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 7. Google Workspace Modal Body */}
                  {activeIntegrationModal === 'google' && (
                    <div className="space-y-4">
                      <div>
                        {renderSecretField('google_sheet', 'Google Apps Script Webhook URL', googleSheetUrl, undefined, {
                          placeholder: 'https://script.google.com/macros/s/.../exec',
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-1.5">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Google Sheets Sync:</p>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          Deploy a standard Google Apps Script Web App that receives HTTP POST requests and appends incoming lead fields to your studio spreadsheet.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 8. Custom REST Webhook Modal Body */}
                  {activeIntegrationModal === 'webhooks' && (
                    <div className="space-y-4">
                      <div>
                        {renderSecretField('custom_webhook', 'Webhook Endpoint URL', customWebhookUrl, undefined, {
                          placeholder: 'https://hooks.zapier.com/hooks/catch/...',
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs space-y-1">
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">Zapier, Make &amp; n8n Integration:</p>
                        <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                          Sends real-time JSON payloads containing client contact info, LPI qualification score, budget tier, and summary whenever a lead is qualified.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connection Diagnostics Live Feedback Banner */}
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

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-[var(--paper-line)] bg-[var(--paper)]/50 flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIntegrationModal(null);
                      setDraftInputs({});
                      setEditingSecretFields({});
                    }}
                    className="px-3.5 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)]/70 hover:text-[var(--ink)] text-xs font-medium cursor-pointer transition-colors"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2.5">
                    {/* Test Button */}
                    {['meta', 'ai', 'telegram', 'email', 'discord', 'webhooks', 'google'].includes(activeIntegrationModal) && (
                      <button
                        type="button"
                        disabled={testStatuses[activeIntegrationModal]?.loading}
                        onClick={() => onTestIntegration(activeIntegrationModal as any, draftInputs)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] hover:bg-[var(--paper-raised)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 transition-all shrink-0"
                      >
                        <Activity size={13} className="text-emerald-500" />
                        <span>
                          {testStatuses[activeIntegrationModal]?.loading ? 'Testing...' : 'Test Connection'}
                        </span>
                      </button>
                    )}

                    {/* Save Changes Button */}
                    <button
                      type="button"
                      disabled={isSavingIntegrations}
                      onClick={handleSave}
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

      {/* Tab 1: General & Time */}
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
                onChange={(e) => {
                  if (setStudioName) setStudioName(e.target.value);
                }}
                onBlur={(e) => onUpdateSetting('studio_name', e.target.value)}
                placeholder="ArchScale Architecture Studio"
                className="w-full text-xs bg-[var(--paper)] border border-[var(--paper-line)] rounded-lg px-3 py-2 text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Studio URL Slug
              </label>
              <input
                type="text"
                value={studioSlug}
                onChange={(e) => {
                  if (setStudioSlug) setStudioSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''));
                }}
                onBlur={(e) => onUpdateSetting('studio_slug', e.target.value)}
                placeholder="archscale"
                className="w-full text-xs font-mono bg-[var(--paper)] border border-[var(--paper-line)] rounded-lg px-3 py-2 text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Time Format
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--paper-line)]">
                <button
                  type="button"
                  onClick={() => onUpdateSetting('time_format', '12h')}
                  className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                    timeFormat === '12h'
                      ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-bold shadow-2xs'
                      : 'text-[var(--ink)]/70'
                  }`}
                >
                  12-Hour (AM/PM)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSetting('time_format', '24h')}
                  className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                    timeFormat === '24h'
                      ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-bold shadow-2xs'
                      : 'text-[var(--ink)]/70'
                  }`}
                >
                  24-Hour (Military)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                Studio Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => onUpdateSetting('timezone', e.target.value)}
                className="w-full text-xs bg-[var(--paper)] border border-[var(--paper-line)] rounded-lg px-3 py-2 text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs font-medium tabular-nums text-[var(--ink)]/70">
            <span>Live Studio Clock Preview:</span>
            <span className="font-bold text-[var(--ink)]">
              {formatStudioTime(new Date(), { timeFormat, timezone })}
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: AI Qualification & Rules */}
      {settingsTab === 'ai' && (
        <div className="space-y-4">
          {/* AI Qualification Rate Threshold */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-[var(--ink)]">AI Qualification Threshold Rate</h3>
                  <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active: LPI ≥ {qualificationThreshold}%
                  </span>
                </div>
                <p className="text-xs text-[var(--ink)]/60 mt-1 leading-relaxed">
                  Minimum Lead Priority Index (0–100%) required to classify inbound inquiries as AI Qualified across the pipeline, analytics funnel, and team alerts.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={qualificationThreshold}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setQualificationThreshold(val);
                  }}
                  onBlur={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 70));
                    onUpdateSetting('qualification_threshold', val);
                  }}
                  className="w-20 text-sm font-bold tabular-nums text-center px-2 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
                <span className="text-xs font-semibold text-[var(--ink)]/60">%</span>
              </div>
            </div>

            {/* Interactive Slider */}
            <div className="space-y-2 pt-1">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={20}
                  max={95}
                  step={5}
                  value={qualificationThreshold}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setQualificationThreshold(val);
                  }}
                  onMouseUp={(e) => {
                    onUpdateSetting('qualification_threshold', parseInt((e.target as HTMLInputElement).value));
                  }}
                  onTouchEnd={(e) => {
                    onUpdateSetting('qualification_threshold', parseInt((e.target as HTMLInputElement).value));
                  }}
                  aria-label="AI Qualification Threshold Slider"
                  className="w-full h-2 bg-[var(--paper)] rounded-lg appearance-none cursor-pointer accent-[var(--amber)] border border-[var(--paper-line)]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium tabular-nums text-[var(--ink)]/40">
                <span>20% (More Leads)</span>
                <span>50% (Standard)</span>
                <span>70% (Recommended)</span>
                <span>95% (High Budget Only)</span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="pt-2 border-t border-[var(--paper-line)] flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-[var(--ink)]/50 mr-1">Presets:</span>
              {[
                { label: '50% Lenient', val: 50 },
                { label: '60% Moderate', val: 60 },
                { label: '70% Recommended', val: 70 },
                { label: '80% Strict', val: 80 },
                { label: '90% High Budget', val: 90 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    setQualificationThreshold(preset.val);
                    onUpdateSetting('qualification_threshold', preset.val);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    qualificationThreshold === preset.val
                      ? 'bg-[var(--amber)] text-[var(--text-on-amber)] border-[var(--amber)] font-bold shadow-2xs'
                      : 'bg-[var(--paper)] text-[var(--ink)]/70 border-[var(--paper-line)] hover:text-[var(--ink)] hover:border-[var(--amber)]/40'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discovery Interviewer */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-start justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[var(--ink)]">Progressive Discovery Interviewer</h3>
                <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Azure gpt-5-nano
                </span>
              </div>
              <p className="text-xs text-[var(--ink)]/60 mt-1 leading-relaxed">
                Engages new incoming inquiries in natural discovery (typology → scope → budget → timeline) until qualification reaches threshold, then alerts team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !discoveryInterviewerEnabled;
                setDiscoveryInterviewerEnabled(next);
                onUpdateSetting('discovery_interviewer_enabled', next);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                discoveryInterviewerEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                discoveryInterviewerEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Returning Client VIP Policy */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
            <div>
              <h3 className="font-semibold text-sm text-[var(--ink)]">Returning Client VIP Protocol</h3>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                Define automated handling when a past client contacts the studio.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'auto', title: 'Auto Welcome', desc: 'Instant warm VIP greeting recognizing past projects' },
                { id: 'draft_only', title: 'Draft Only', desc: 'Pre-generates draft for human specialist approval' },
                { id: 'disabled', title: 'Disabled', desc: 'No automated action for past clients' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setReturningClientMode(mode.id as any);
                    onUpdateSetting('returning_client_mode', mode.id);
                  }}
                  className={`p-3 rounded-xl border text-left text-xs cursor-pointer transition-all ${
                    returningClientMode === mode.id
                      ? 'border-blue-500 bg-[var(--paper)] text-blue-600 dark:text-blue-400 font-medium shadow-2xs'
                      : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  <p className="font-bold">{mode.title}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Automated Follow-up Interval */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
            <div>
              <h3 className="font-semibold text-sm text-[var(--ink)]">Dynamic AI Follow-up Interval</h3>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                Elapsed quiet hours before the automated follow-up cron re-engages a stalled lead.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={168}
                value={followupIntervalHours}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 24;
                  setFollowupIntervalHours(val);
                  onUpdateSetting('followup_interval_hours', val);
                }}
                className="w-24 text-xs font-medium tabular-nums px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
              />
              <span className="text-xs text-[var(--ink)]/70">Hours quiet time (Default: 24h)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Omnichannel & Webhooks */}
      {settingsTab === 'channels' && (
        <div className="space-y-4">
          {/* WhatsApp Master */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-start justify-between gap-4 shadow-xs">
            <div>
              <h3 className="font-semibold text-sm text-[var(--ink)]">Master WhatsApp Outbound</h3>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                Global toggle enabling or disabling automated WhatsApp messages to inbound clients.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !autoReplyEnabled;
                setAutoReplyEnabled(next);
                onUpdateSetting('auto_reply_enabled', next);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                autoReplyEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Resend Email Alerts */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-start justify-between gap-4 shadow-xs">
            <div>
              <h3 className="font-semibold text-sm text-[var(--ink)]">Resend Email Lead Alerts</h3>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                Dispatches instant high-priority email notifications when qualification score ≥ 60%.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !emailAlertsEnabled;
                setEmailAlertsEnabled(next);
                onUpdateSetting('email_alerts_enabled', next);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                emailAlertsEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Meta Messenger & Instagram Architecture */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--ink)]">Messenger &amp; Instagram Automations</span>
              <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Meta Graph API
              </span>
            </div>
            <p className="text-xs text-[var(--ink)]/60 leading-relaxed">
              ArchScale processes Meta Click-to-WhatsApp ads with full referral tracking. For direct Instagram Direct Messages &amp; Facebook Messenger, configure webhook subscriptions pointing to <code className="font-mono text-[11px] bg-[var(--paper)] px-1 py-0.5 rounded">/api/whatsapp/webhook</code> with matching Graph API app tokens.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
