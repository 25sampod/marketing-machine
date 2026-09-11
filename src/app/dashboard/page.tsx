'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ChatInbox from '@/components/ChatInbox';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Users, Filter, CheckCircle2, MessageSquare, Plus, Activity, Clock, 
  ArrowLeft, Sun, Moon, LogOut, Copy, Check, UserPlus, X, Shield, SlidersHorizontal, Sparkles, Settings, Globe, Pencil,
  BookOpen, Upload, FileText, CheckCheck, Trash2, FileSpreadsheet, Download, Search, BarChart3,
  Menu, ChevronLeft, ChevronRight, Send, Layers, ExternalLink, RefreshCw, AlertTriangle, ArrowUpRight, LayoutGrid,
  ShieldCheck, Lock, Key, Cpu, Mail, CheckCircle, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { formatStudioTime, COMMON_TIMEZONES } from '@/lib/formatTime';

type DashboardView = 'pipeline' | 'kanban' | 'sheet' | 'analytics' | 'knowledge' | 'team' | 'settings';
type SettingsTab = 'integrations' | 'general' | 'ai' | 'channels';

const KANBAN_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'consultation_booked', label: 'Consult Booked' },
  { id: 'converted', label: 'Won' },
  { id: 'lost', label: 'Archived' },
] as const;

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Navigation & View state
  const [currentView, setCurrentView] = useState<DashboardView>('pipeline');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Kanban Board Drag & Drop and Search state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState('');
  
  // Filters & Sorting
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'budget'>('match');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'returning' | 'review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Mobile tab in split view
  const [mobileTab, setMobileTab] = useState<'pipeline' | 'chat'>('pipeline');

  // Studio Settings state
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('integrations');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [discoveryInterviewerEnabled, setDiscoveryInterviewerEnabled] = useState(true);
  const [returningClientMode, setReturningClientMode] = useState<'auto' | 'draft_only' | 'disabled'>('auto');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timezone, setTimezone] = useState<string>('Asia/Dhaka');
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(false);
  const [followupIntervalHours, setFollowupIntervalHours] = useState<number>(24);
  const [qualificationThreshold, setQualificationThreshold] = useState<number>(70);

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

  // Secret credential edit state: credentials remain securely masked by default for privacy & judge demos
  const [editingSecretFields, setEditingSecretFields] = useState<Record<string, boolean>>({});
  const toggleEditingSecret = (field: string) => {
    setEditingSecretFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const renderSecretField = (
    fieldKey: string,
    label: string,
    currentValue: string,
    setValue: (val: string) => void,
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

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block">
            {label}
          </label>
          {isConfigured && !isEditing && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 size={10} /> Active &amp; Protected
            </span>
          )}
        </div>

        {isConfigured && !isEditing ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)]">
            <div className="flex items-center gap-2 overflow-hidden">
              <Lock size={12} className="text-emerald-500 shrink-0" />
              <span className="font-mono text-xs text-[var(--ink)] tracking-widest truncate select-none">
                {options?.isIdField
                  ? (currentValue.length > 4 ? `••••••••${currentValue.slice(-4)}` : '••••••••••••')
                  : '••••••••••••••••••••••••'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleEditingSecret(fieldKey)}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] hover:bg-[var(--amber)]/20 transition-colors cursor-pointer shrink-0 ml-2"
            >
              Change
            </button>
          </div>
        ) : isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type={inputType}
              placeholder={options?.placeholder || 'Enter new replacement value...'}
              value={currentValue.includes('••') ? '' : currentValue}
              onChange={(e) => setValue(e.target.value)}
              onBlur={(e) => options?.onBlur?.(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => toggleEditingSecret(fieldKey)}
              className="text-xs px-2.5 py-2 rounded-lg border border-[var(--paper-line)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer shrink-0 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <input
            type={inputType}
            placeholder={options?.placeholder || 'Enter value...'}
            value={currentValue}
            onChange={(e) => setValue(e.target.value)}
            onBlur={(e) => options?.onBlur?.(e.target.value)}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
          />
        )}
      </div>
    );
  };

  // Integration test connection feedback state
  const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean; success?: boolean; message?: string; error?: string }>>({});
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [integrationsSavedToast, setIntegrationsSavedToast] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState<string>('');

  // Provider Hub & Modal Pop-up state (matching Supabase providers list UI)
  const [activeIntegrationModal, setActiveIntegrationModal] = useState<string | null>(null);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [facebookAdAccountId, setFacebookAdAccountId] = useState<string>('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');

  // Team Invite & Edit state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editRole, setEditRole] = useState('specialist');
  const [editName, setEditName] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Studio Knowledge Base State
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [knowledgeSavedToast, setKnowledgeSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lead Capture Modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadMessage, setNewLeadMessage] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<'whatsapp' | 'web'>('whatsapp');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Cron execution state & real-time feedback
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [sweepResultToast, setSweepResultToast] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: Array<{ leadId: string; name: string; action: string; note?: string }>;
  } | null>(null);

  // Meta Click-to-WhatsApp Campaign Link Generator State
  const [campaignStudioNumber, setCampaignStudioNumber] = useState('');
  const [campaignNameInput, setCampaignNameInput] = useState('luxury_villas_2026');
  const [campaignMessageInput, setCampaignMessageInput] = useState(
    "Hi ArchScale, I'm reaching out from your Instagram ad regarding an architectural project. [Ref: {{campaign}}]"
  );
  const [copiedCampaignUrl, setCopiedCampaignUrl] = useState(false);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
      const savedFormat = localStorage.getItem('studio_time_format') as '12h' | '24h' | null;
      if (savedFormat) setTimeFormat(savedFormat);
      const savedTz = localStorage.getItem('studio_timezone');
      if (savedTz) setTimezone(savedTz);
      const savedDiscord = localStorage.getItem('studio_discord_webhook');
      if (savedDiscord) setDiscordWebhookUrl(savedDiscord);
      const savedCustomWebhook = localStorage.getItem('studio_custom_webhook');
      if (savedCustomWebhook) setCustomWebhookUrl(savedCustomWebhook);
      const savedFbAccount = localStorage.getItem('studio_fb_account');
      if (savedFbAccount) setFacebookAdAccountId(savedFbAccount);
      const savedGoogleSheet = localStorage.getItem('studio_google_sheet');
      if (savedGoogleSheet) setGoogleSheetUrl(savedGoogleSheet);
    }

    fetchData();

    const leadChannel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => (l.id === payload.new.id ? payload.new : l)));
          if (selectedLead?.id === payload.new.id) {
            setSelectedLead(payload.new);
          }
        }
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('public:studio_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_settings' }, (payload) => {
        if (payload.new && typeof (payload.new as any).qualification_threshold === 'number') {
          setQualificationThreshold((payload.new as any).qualification_threshold);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveIntegrationModal(null);
    };
    if (activeIntegrationModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeIntegrationModal]);

  const fetchData = async () => {
    // 1. Current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('archscale_has_session', 'true');
      } catch (e) {}
    }

    // 2. Leads
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (leadsData) {
      setLeads(leadsData);
      if (!selectedLead && leadsData.length > 0) {
        setSelectedLead(leadsData[0]);
      }
    }

    // 3. Team & members
    if (user?.id && user?.email) {
      try {
        const res = await fetch(`/api/teams?userId=${user.id}&email=${encodeURIComponent(user.email)}`);
        const teamRes = await res.json();
        if (teamRes.team) setTeam(teamRes.team);
        if (teamRes.members) setTeamMembers(teamRes.members);
      } catch (err) {
        console.error('Failed to load team data:', err);
      }
    } else {
      const { data: teamData } = await supabase.from('team_members').select('*');
      if (teamData && teamData.length > 0) {
        setTeamMembers(teamData);
      } else {
        setTeamMembers([
          { id: '1', name: 'Sampod', email: '25sampod@gmail.com', contact: '25sampod@gmail.com', role: 'owner', specialty: 'Master Planning & Architecture', status: 'active' },
        ]);
      }
    }

    // 4. Studio Settings (Server resolved credentials + DB fallback)
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      const settings = data?.settings;

      if (settings) {
        setAutoReplyEnabled(settings.autoReplyEnabled !== false);
        setEmailAlertsEnabled(settings.emailAlertsEnabled !== false);
        setDiscoveryInterviewerEnabled(settings.discoveryInterviewerEnabled !== false);
        if (settings.returningClientMode) setReturningClientMode(settings.returningClientMode as any);
        if (settings.timeFormat) {
          setTimeFormat(settings.timeFormat as '12h' | '24h');
          if (typeof window !== 'undefined') localStorage.setItem('studio_time_format', settings.timeFormat);
        }
        if (settings.timezone) {
          setTimezone(settings.timezone);
          if (typeof window !== 'undefined') localStorage.setItem('studio_timezone', settings.timezone);
        }
        if (settings.knowledgeBase !== undefined && settings.knowledgeBase !== null) {
          setKnowledgeBase(settings.knowledgeBase);
        }
        if (settings.telegramBotToken) setTelegramBotToken(settings.telegramBotToken);
        if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
        if (settings.telegramEnabled !== undefined) setTelegramEnabled(Boolean(settings.telegramEnabled));
        if (settings.followupIntervalHours) setFollowupIntervalHours(settings.followupIntervalHours);
        if (typeof settings.qualificationThreshold === 'number') setQualificationThreshold(settings.qualificationThreshold);

        // Meta WhatsApp Credentials
        if (settings.whatsappPhoneNumberId) {
          setWhatsappPhoneNumberId(settings.whatsappPhoneNumberId);
          setCampaignStudioNumber((prev) => prev || settings.whatsappPhoneNumberId);
        }
        if (settings.whatsappAccessToken) setWhatsappAccessToken(settings.whatsappAccessToken);
        if (settings.whatsappBusinessAccountId) setWhatsappBusinessAccountId(settings.whatsappBusinessAccountId);
        if (settings.metaAppSecret) setMetaAppSecret(settings.metaAppSecret);
        if (settings.whatsappVerifyToken) setWhatsappVerifyToken(settings.whatsappVerifyToken);
        if (settings.whatsappFollowupTemplateName) setWhatsappFollowupTemplateName(settings.whatsappFollowupTemplateName);

        // AI Provider Credentials
        if (settings.aiProvider) setAiProvider(settings.aiProvider);
        if (settings.aiApiKey) setAiApiKey(settings.aiApiKey);
        if (settings.aiEndpoint) setAiEndpoint(settings.aiEndpoint);
        if (settings.aiDeploymentName) setAiDeploymentName(settings.aiDeploymentName);
        if (settings.aiApiVersion) setAiApiVersion(settings.aiApiVersion);

        // Email Alerts (Resend)
        if (settings.resendApiKey) setResendApiKey(settings.resendApiKey);
        if (settings.notificationEmail) setNotificationEmail(settings.notificationEmail);
      }
    } catch (err) {
      console.warn('Failed to load settings via /api/settings, attempting direct DB query:', err);
      const { data: settingsData } = await supabase
        .from('studio_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (settingsData) {
        setAutoReplyEnabled(settingsData.auto_reply_enabled !== false);
        setEmailAlertsEnabled(settingsData.email_alerts_enabled !== false);
        setDiscoveryInterviewerEnabled(settingsData.discovery_interviewer_enabled !== false);
        if (settingsData.returning_client_mode) setReturningClientMode(settingsData.returning_client_mode as any);
        if (settingsData.time_format) {
          setTimeFormat(settingsData.time_format as '12h' | '24h');
          if (typeof window !== 'undefined') localStorage.setItem('studio_time_format', settingsData.time_format);
        }
        if (settingsData.timezone) {
          setTimezone(settingsData.timezone);
          if (typeof window !== 'undefined') localStorage.setItem('studio_timezone', settingsData.timezone);
        }
        if (settingsData.knowledge_base !== undefined && settingsData.knowledge_base !== null) {
          setKnowledgeBase(settingsData.knowledge_base);
        }
        if (settingsData.telegram_bot_token) setTelegramBotToken(settingsData.telegram_bot_token);
        if (settingsData.telegram_chat_id) setTelegramChatId(settingsData.telegram_chat_id);
        if (settingsData.telegram_enabled !== undefined) setTelegramEnabled(Boolean(settingsData.telegram_enabled));
        if (settingsData.followup_interval_hours) setFollowupIntervalHours(settingsData.followup_interval_hours);
        if (typeof settingsData.qualification_threshold === 'number') setQualificationThreshold(settingsData.qualification_threshold);

        // Meta WhatsApp Credentials
        if (settingsData.whatsapp_phone_number_id) {
          const raw = settingsData.whatsapp_phone_number_id;
          setWhatsappPhoneNumberId(raw.length > 4 ? `••••••••${raw.slice(-4)}` : '••••••••');
        }
        if (settingsData.whatsapp_access_token) setWhatsappAccessToken('••••••••••••••••••••••••');
        if (settingsData.whatsapp_business_account_id) {
          const raw = settingsData.whatsapp_business_account_id;
          setWhatsappBusinessAccountId(raw.length > 4 ? `••••••••${raw.slice(-4)}` : '••••••••');
        }
        if (settingsData.meta_app_secret) setMetaAppSecret('••••••••••••••••');
        if (settingsData.whatsapp_verify_token) setWhatsappVerifyToken('••••••••••••••••');
        if (settingsData.whatsapp_followup_template_name) setWhatsappFollowupTemplateName(settingsData.whatsapp_followup_template_name);

        // AI Provider Credentials
        if (settingsData.ai_provider) setAiProvider(settingsData.ai_provider);
        if (settingsData.ai_api_key) setAiApiKey('••••••••••••••••••••••••');
        if (settingsData.ai_endpoint) setAiEndpoint(settingsData.ai_endpoint);
        if (settingsData.ai_deployment_name) setAiDeploymentName(settingsData.ai_deployment_name);
        if (settingsData.ai_api_version) setAiApiVersion(settingsData.ai_api_version);

        // Email Alerts (Resend)
        if (settingsData.resend_api_key) setResendApiKey('••••••••••••••••••••••••');
        if (settingsData.notification_email) setNotificationEmail(settingsData.notification_email);
        if (settingsData.telegram_bot_token) setTelegramBotToken('••••••••••••••••••••••••');
        if (settingsData.telegram_chat_id) {
          const raw = settingsData.telegram_chat_id;
          setTelegramChatId(raw.length > 4 ? `••••••••${raw.slice(-4)}` : '••••••••');
        }
      }
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
    }
    if (key === 'timezone') {
      setTimezone(value);
      if (typeof window !== 'undefined') localStorage.setItem('studio_timezone', value);
    }
    if (key === 'telegram_bot_token') setTelegramBotToken(value);
    if (key === 'telegram_chat_id') setTelegramChatId(value);
    if (key === 'telegram_enabled') setTelegramEnabled(value);
    if (key === 'followup_interval_hours') setFollowupIntervalHours(value);
    if (key === 'qualification_threshold') setQualificationThreshold(Number(value) || 70);

    // Integrations keys
    if (key === 'whatsapp_phone_number_id') setWhatsappPhoneNumberId(value);
    if (key === 'whatsapp_access_token') setWhatsappAccessToken(value);
    if (key === 'whatsapp_business_account_id') setWhatsappBusinessAccountId(value);
    if (key === 'meta_app_secret') setMetaAppSecret(value);
    if (key === 'whatsapp_verify_token') setWhatsappVerifyToken(value);
    if (key === 'whatsapp_followup_template_name') setWhatsappFollowupTemplateName(value);
    if (key === 'ai_provider') setAiProvider(value);
    if (key === 'ai_api_key') setAiApiKey(value);
    if (key === 'ai_endpoint') setAiEndpoint(value);
    if (key === 'ai_deployment_name') setAiDeploymentName(value);
    if (key === 'ai_api_version') setAiApiVersion(value);
    if (key === 'resend_api_key') setResendApiKey(value);
    if (key === 'notification_email') setNotificationEmail(value);

    try {
      await supabase
        .from('studio_settings')
        .upsert({ id: 'default', [key]: value, updated_at: new Date().toISOString() });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to persist studio settings:', err);
    }
  };

  const handleSaveIntegrationSettings = async () => {
    setIsSavingIntegrations(true);
    try {
      const payload: Record<string, any> = {
        whatsapp_phone_number_id: whatsappPhoneNumberId.trim() || null,
        whatsapp_access_token: whatsappAccessToken.trim() || null,
        whatsapp_business_account_id: whatsappBusinessAccountId.trim() || null,
        meta_app_secret: metaAppSecret.trim() || null,
        whatsapp_verify_token: whatsappVerifyToken.trim() || null,
        whatsapp_followup_template_name: whatsappFollowupTemplateName.trim() || 'lead_reengagement',
        ai_provider: aiProvider,
        ai_api_key: aiApiKey.trim() || null,
        ai_endpoint: aiEndpoint.trim() || null,
        ai_deployment_name: aiDeploymentName.trim() || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano'),
        ai_api_version: aiApiVersion.trim() || '2024-12-01-preview',
        resend_api_key: resendApiKey.trim() || null,
        notification_email: notificationEmail.trim() || null,
        telegram_bot_token: telegramBotToken.trim() || null,
        telegram_chat_id: telegramChatId.trim() || null,
        telegram_enabled: telegramEnabled,
        updated_at: new Date().toISOString(),
      };

      // 1. Prioritize saving via server API endpoint to immediately invalidate cache & bypass RLS
      const apiRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (apiRes.ok) {
        setEditingSecretFields({});
        setIntegrationsSavedToast(true);
        setTimeout(() => setIntegrationsSavedToast(false), 3500);
      } else {
        // Fallback to direct supabase client upsert if API route encounters an error
        const { error } = await supabase
          .from('studio_settings')
          .upsert({ id: 'default', ...payload });

        if (error) {
          console.error('Failed to save integration settings:', error);
          alert(`Failed to save settings: ${error.message}`);
        } else {
          setIntegrationsSavedToast(true);
          setTimeout(() => setIntegrationsSavedToast(false), 3500);
        }
      }
    } catch (err: any) {
      console.error('Error saving settings via API, attempting direct fallback:', err);
      try {
        const fallbackPayload: Record<string, any> = {
          id: 'default',
          ai_provider: aiProvider,
          ai_deployment_name: aiDeploymentName.trim() || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano'),
          ai_api_version: aiApiVersion.trim() || '2024-12-01-preview',
          whatsapp_followup_template_name: whatsappFollowupTemplateName.trim() || 'lead_reengagement',
          telegram_enabled: telegramEnabled,
          updated_at: new Date().toISOString(),
        };
        if (whatsappPhoneNumberId && !whatsappPhoneNumberId.includes('••')) fallbackPayload.whatsapp_phone_number_id = whatsappPhoneNumberId.trim();
        if (whatsappAccessToken && !whatsappAccessToken.includes('••')) fallbackPayload.whatsapp_access_token = whatsappAccessToken.trim();
        if (whatsappBusinessAccountId && !whatsappBusinessAccountId.includes('••')) fallbackPayload.whatsapp_business_account_id = whatsappBusinessAccountId.trim();
        if (metaAppSecret && !metaAppSecret.includes('••')) fallbackPayload.meta_app_secret = metaAppSecret.trim();
        if (whatsappVerifyToken && !whatsappVerifyToken.includes('••')) fallbackPayload.whatsapp_verify_token = whatsappVerifyToken.trim();
        if (aiApiKey && !aiApiKey.includes('••')) fallbackPayload.ai_api_key = aiApiKey.trim();
        if (aiEndpoint && !aiEndpoint.includes('••')) fallbackPayload.ai_endpoint = aiEndpoint.trim();
        if (resendApiKey && !resendApiKey.includes('••')) fallbackPayload.resend_api_key = resendApiKey.trim();
        if (notificationEmail && !notificationEmail.includes('••')) fallbackPayload.notification_email = notificationEmail.trim();
        if (telegramBotToken && !telegramBotToken.includes('••')) fallbackPayload.telegram_bot_token = telegramBotToken.trim();
        if (telegramChatId && !telegramChatId.includes('••')) fallbackPayload.telegram_chat_id = telegramChatId.trim();

        const { error: fallbackError } = await supabase
          .from('studio_settings')
          .upsert(fallbackPayload);
        if (fallbackError) {
          alert(`Failed to save settings: ${fallbackError.message}`);
        } else {
          setEditingSecretFields({});
          setIntegrationsSavedToast(true);
          setTimeout(() => setIntegrationsSavedToast(false), 3500);
        }
      } catch (finalErr: any) {
        alert(`Failed to save settings: ${finalErr?.message || finalErr}`);
      }
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const handleTestIntegration = async (type: 'meta' | 'ai' | 'telegram' | 'email' | 'discord' | 'webhooks') => {
    setTestStatuses((prev) => ({ ...prev, [type]: { loading: true, success: undefined, error: undefined } }));
    try {
      let config: any = {};
      if (type === 'meta') {
        config = {
          phoneNumberId: whatsappPhoneNumberId?.includes('••') ? undefined : whatsappPhoneNumberId?.trim(),
          accessToken: whatsappAccessToken?.includes('••') ? undefined : whatsappAccessToken?.trim(),
        };
      } else if (type === 'ai') {
        config = {
          provider: aiProvider,
          apiKey: aiApiKey?.includes('••') ? undefined : aiApiKey?.trim(),
          endpoint: aiEndpoint?.includes('••') ? undefined : aiEndpoint?.trim(),
          deploymentName: aiDeploymentName,
          apiVersion: aiApiVersion,
        };
      } else if (type === 'telegram') {
        config = {
          botToken: telegramBotToken?.includes('••') ? undefined : telegramBotToken?.trim(),
          chatId: telegramChatId?.includes('••') ? undefined : telegramChatId?.trim(),
        };
      } else if (type === 'email') {
        config = { apiKey: resendApiKey?.includes('••') ? undefined : resendApiKey?.trim() };
      } else if (type === 'discord') {
        config = { webhookUrl: discordWebhookUrl };
      } else if (type === 'webhooks') {
        config = { targetUrl: customWebhookUrl };
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

  const handleSaveKnowledge = async () => {
    if (isSavingKnowledge) return;
    setIsSavingKnowledge(true);
    try {
      const { error } = await supabase
        .from('studio_settings')
        .update({
          knowledge_base: knowledgeBase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default');

      if (error) throw error;
      setKnowledgeSavedToast(true);
      setTimeout(() => setKnowledgeSavedToast(false), 3000);
    } catch (err) {
      console.error('Failed to save knowledge base:', err);
      alert('Failed to save knowledge base: ' + ((err as any).message || err));
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setKnowledgeBase(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setKnowledgeBase(text);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadStarterTemplate = () => {
    const template = `# Studio Overview
We are a premier design and architecture studio specializing in modern residential, commercial, and digital brand experiences.

## Core Services
1. Architectural & Spatial Design
2. 3D Renderings & Interior Planning
3. High-Performance Digital Platforms & Websites

## Packages & Offerings
• Starter: Essential design consultation & schematic sketches (Fast turnaround)
• Growth: Complete concept design, 3D visualization, and material schedules
• Bespoke / Turnkey: Full architectural drafting, permitting sets, and contractor oversight

## Pricing & Engagements
• Starter engagements typically begin at $2,500.
• Comprehensive full-scope projects range from $8,000 to $25,000+ depending on square footage.

## Communication & Consultation Rules
• Tone: Sophisticated, warm, concise, professional.
• WhatsApp responses must be 35–50 words maximum.
• When scope and budget match, invite them to book a discovery consultation with our senior team.`;
    setKnowledgeBase(template);
  };

  const handleCaptureLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadContact || isSubmittingLead) return;
    setIsSubmittingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeadName,
          contact: newLeadContact,
          source: newLeadSource,
          message: newLeadMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsLeadModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to capture lead');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while capturing lead');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const getLeadKanbanStage = (lead: any): string => {
    const s = lead?.status?.toLowerCase();
    if (s === 'consultation_booked') return 'consultation_booked';
    if (s === 'converted') return 'converted';
    if (s === 'lost' || s === 'dead') return 'lost';
    if (s === 'qualified') return 'qualified';
    if (s === 'contacted') return 'contacted';
    return 'new';
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    const previousLeads = leads;
    const previousSelected = selectedLead;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, last_contacted_at: new Date().toISOString() } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev: any) => ({ ...prev, status: newStatus, last_contacted_at: new Date().toISOString() }));
    }
    const { error } = await supabase.from('leads').update({ status: newStatus, last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', leadId);
    if (error) {
      console.error('Error updating lead status in Supabase:', error);
      setLeads(previousLeads);
      if (previousSelected?.id === leadId) setSelectedLead(previousSelected);
      alert(`Failed to update pipeline stage: ${error.message}`);
    }
  };

  const handleUpdateLeadAssignee = async (leadId: string, assigneeId: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, assigned_to: assigneeId } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev: any) => ({ ...prev, assigned_to: assigneeId }));
    }
    await supabase.from('leads').update({ assigned_to: assigneeId, updated_at: new Date().toISOString() }).eq('id', leadId);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads available to export.');
      return;
    }
    const headers = [
      'ID', 'Name', 'Contact', 'LPI Priority Score', 'Priority Tier', 'Status',
      'Project Type', 'Estimated Budget', 'Campaign', 'Meta Ad ID', 'UTM Source',
      'Assigned Specialist', 'Returning VIP', 'Discovery Stage', 'AI Summary', 'Created At', 'Last Activity'
    ];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.contact || '').replace(/"/g, '""')}"`,
      l.score ?? l.qualification_percentage ?? 0,
      l.priority_tier || 'medium',
      l.status || 'new',
      `"${(l.project_type || '').replace(/"/g, '""')}"`,
      `"${(l.estimated_budget || '').replace(/"/g, '""')}"`,
      `"${(l.campaign || 'Direct / Organic').replace(/"/g, '""')}"`,
      `"${(l.ad_id || 'N/A').replace(/"/g, '""')}"`,
      `"${(l.utm_source || l.source || '').replace(/"/g, '""')}"`,
      `"${(getAssigneeName(l.assigned_to) || '').replace(/"/g, '""')}"`,
      l.is_returning_client ? 'Yes' : 'No',
      l.discovery_stage || 'discovery',
      `"${(l.ai_summary || '').replace(/"/g, '""')}"`,
      l.created_at || '',
      l.last_contacted_at || l.created_at || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `archscale_leads_sheet_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !team?.id) return;
    setIsInviting(true);
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          email: inviteEmail,
          name: inviteName,
          specialty: inviteSpecialty.trim() || 'Architecture Specialist',
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setTeamMembers((prev) => [...prev, data.member]);
        setInviteEmail('');
        setInviteName('');
        setInviteSpecialty('');
      } else {
        alert(data.error || 'Failed to invite member');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scale.sampod.site';
    const code = team?.invite_code || 'arch8899';
    const link = `${origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const startEditingMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditSpecialty(member.specialty || '');
    setEditRole(member.role || 'specialist');
    setEditName(member.name || '');
  };

  const handleSaveMemberEdit = async (memberId: string) => {
    if (isSavingMember) return;
    setIsSavingMember(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          specialty: editSpecialty,
          role: editRole,
          name: editName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, specialty: editSpecialty, role: editRole, name: editName || m.name }
              : m
          )
        );
        setEditingMemberId(null);
      } else {
        alert(data.error || 'Failed to update member');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating member');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('archscale_has_session');
      } catch (e) {}
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getAssigneeName = (id: string) => {
    if (!id) return 'Unassigned';
    return teamMembers.find((t) => t.id === id)?.name || 'Specialist Partner';
  };

  const triggerCron = async () => {
    setIsRunningCron(true);
    setSweepResultToast(null);
    try {
      const res = await fetch('/api/cron/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sweep' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to execute follow-up sweep.');
      }
      setSweepResultToast({
        type: 'success',
        message: data.message || `Sweep complete: ${data.processedCount || 0} leads analyzed, ${data.followUpCount || 0} automated follow-ups dispatched.`,
        details: data.details,
      });
      fetchData();
    } catch (e: any) {
      setSweepResultToast({
        type: 'error',
        message: e?.message || 'Error executing automated follow-up sweep.',
      });
    } finally {
      setIsRunningCron(false);
    }
  };

  // Filter and sort leads
  const filteredLeads = leads
    .filter((lead) => {
      // My assigned filter
      if (activeFilter === 'mine' && currentUser) {
        const myMember = teamMembers.find((m) => m.user_id === currentUser.id || m.email === currentUser.email);
        if (!myMember || lead.assigned_to !== myMember.id) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }
      // Priority filter
      const lpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
      if (priorityFilter === 'urgent') {
        return lead.priority_tier === 'urgent' || lpi >= 80;
      }
      if (priorityFilter === 'high') {
        return lead.priority_tier === 'high' || (lpi >= 60 && lpi < 80);
      }
      if (priorityFilter === 'returning') {
        return Boolean(lead.is_returning_client);
      }
      if (priorityFilter === 'review') {
        return lpi < 60 && lead.status !== 'qualified';
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (lead.name || '').toLowerCase().includes(query);
        const matchesContact = (lead.contact || '').toLowerCase().includes(query);
        const matchesProject = (lead.project_type || '').toLowerCase().includes(query);
        const matchesCampaign = (lead.campaign || '').toLowerCase().includes(query);
        const matchesSummary = (lead.ai_summary || '').toLowerCase().includes(query);
        if (!matchesName && !matchesContact && !matchesProject && !matchesCampaign && !matchesSummary) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : (a.qualification_percentage || 0);
      const scoreB = typeof b.score === 'number' ? b.score : (b.qualification_percentage || 0);

      if (sortBy === 'match') {
        const diff = scoreB - scoreA;
        if (diff !== 0) return diff;
        return new Date(b.last_contacted_at || b.created_at).getTime() - new Date(a.last_contacted_at || a.created_at).getTime();
      }
      if (sortBy === 'recent') {
        return new Date(b.last_contacted_at || b.created_at).getTime() - new Date(a.last_contacted_at || a.created_at).getTime();
      }
      if (sortBy === 'budget') {
        return (b.budget_mentioned ? 1 : 0) - (a.budget_mentioned ? 1 : 0);
      }
      return 0;
    });

  // Funnel and Analytics Aggregations
  const totalLeadsCount = leads.length;
  const contactedCount = leads.filter((l) => l.status === 'contacted' || l.status === 'qualified' || l.status === 'consult_booked' || l.status === 'won').length;
  const qualifiedCount = leads.filter((l) => l.status === 'qualified' || l.status === 'consult_booked' || l.status === 'won').length;
  const bookedCount = leads.filter((l) => l.status === 'consult_booked' || l.status === 'won').length;
  const wonCount = leads.filter((l) => l.status === 'won').length;

  // Group by campaign / source for attribution
  const campaignAttributionMap = leads.reduce((acc: any, lead: any) => {
    const key = lead.campaign || (lead.source === 'whatsapp' ? 'Direct WhatsApp (Organic)' : 'Web Landing Brief');
    if (!acc[key]) {
      acc[key] = {
        name: key,
        source: lead.utm_source || lead.source || 'meta',
        total: 0,
        qualified: 0,
        booked: 0,
        topAdId: lead.ad_id || 'N/A',
      };
    }
    acc[key].total += 1;
    if (lead.status === 'qualified' || lead.status === 'consult_booked' || lead.status === 'won' || (lead.qualification_percentage || 0) >= qualificationThreshold || (lead.score || 0) >= qualificationThreshold) {
      acc[key].qualified += 1;
    }
    if (lead.status === 'consult_booked' || lead.status === 'won') {
      acc[key].booked += 1;
    }
    return acc;
  }, {});
  const campaignAttributionList = Object.values(campaignAttributionMap);

  return (
    <div className="h-screen bg-[var(--paper)] text-[var(--text-on-paper)] flex flex-col font-sans overflow-hidden">
      
      {/* Top Header Bar */}
      <header className="min-h-16 border-b border-[var(--paper-line)] bg-[var(--paper-raised)]/90 backdrop-blur px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu size={18} />
          </button>

          {/* Studio Brand */}
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 tracking-wider">
              AS
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-[var(--ink)] truncate max-w-[150px] sm:max-w-none">
                  {team?.name || 'ArchScale Studio'}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70 uppercase">
                  AS-05 ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] font-medium tabular-nums text-[var(--ink)]/50 hidden sm:block">
                Clock: {formatStudioTime(new Date(), { timeFormat, timezone })} ({timezone.split('/')[1] || timezone})
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLeadModalOpen(true)}
            className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-3 sm:px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Capture Lead</span>
            <span className="xs:hidden">Lead</span>
          </button>

          <button
            type="button"
            onClick={triggerCron}
            disabled={isRunningCron}
            title="Trigger an autonomous, whole-studio re-engagement sweep across inactive leads"
            className="text-xs font-semibold flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs active:scale-95"
          >
            <Clock size={13} className={isRunningCron ? 'animate-spin text-[var(--amber-deep)]' : 'text-[var(--amber-deep)] dark:text-[var(--amber)]'} />
            <span className="hidden sm:inline">{isRunningCron ? 'Sweeping...' : '⚡ Follow-Up Sweep'}</span>
            <span className="sm:hidden">{isRunningCron ? '...' : '⚡ Sweep'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] flex items-center justify-center text-[var(--ink)] cursor-pointer shrink-0 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            title={currentUser?.email ? `Sign out (${currentUser.email})` : 'Sign out of studio'}
            className="h-8 px-2.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500 flex items-center gap-1.5 text-xs text-[var(--ink)]/70 cursor-pointer shrink-0 transition-colors font-medium"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Real-time Follow-Up Sweep Notification Banner */}
      {sweepResultToast && (
        <div className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b transition-all animate-in fade-in slide-in-from-top-1 ${
          sweepResultToast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
            <span className="font-semibold truncate">{sweepResultToast.message}</span>
            {sweepResultToast.details && sweepResultToast.details.length > 0 && (
              <span className="opacity-75 hidden md:inline truncate">
                · [{sweepResultToast.details.map((d: any) => `${d.name}: ${d.action.replace('_', ' ')}`).join(', ')}]
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSweepResultToast(null)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* Collapsible Left Sidebar */}
        <aside className={`
          ${sidebarCollapsed ? 'w-16' : 'w-64'} 
          hidden md:flex flex-col border-r border-[var(--paper-line)] bg-[var(--paper-raised)] shrink-0 transition-all duration-200 select-none z-20
        `}>
          {/* Collapse Toggle */}
          <div className="p-3 border-b border-[var(--paper-line)] flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]/50">
                Studio Workspace
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-[var(--ink)]/60 hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer mx-auto"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1 flex-1 overflow-y-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setCurrentView('pipeline')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'pipeline'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Pipeline & WhatsApp Inbox"
            >
              <Layers size={17} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Pipeline &amp; Inbox</span>
                  <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.2 rounded-full ${
                    currentView === 'pipeline' ? 'bg-black/20 text-white' : 'bg-[var(--paper)] text-[var(--ink)]/60'
                  }`}>
                    {leads.length}
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('kanban')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'kanban'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Interactive Pipeline Kanban Stage Board"
            >
              <LayoutGrid size={17} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Kanban Board</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--amber)]/20 text-[var(--amber-deep)] dark:text-[var(--amber)] font-bold">
                    Stages
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('sheet')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'sheet'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Excel-style Leads Priority Sheet"
            >
              <FileSpreadsheet size={17} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Leads Sheet</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                    Excel
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Conversion Funnel & Campaign Performance"
            >
              <BarChart3 size={17} className="shrink-0" />
              {!sidebarCollapsed && <span>Funnel &amp; Campaigns</span>}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('knowledge')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'knowledge'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Studio Offerings & Knowledge Base"
            >
              <BookOpen size={17} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Studio Knowledge</span>
                  {knowledgeBase?.trim() && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Knowledge Base Active" />
                  )}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('team')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'team'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Specialist Team & Roster"
            >
              <Users size={17} className="shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Team Specialists</span>
                  <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.2 rounded-full ${
                    currentView === 'team' ? 'bg-black/20 text-white' : 'bg-[var(--paper)] text-[var(--ink)]/60'
                  }`}>
                    {teamMembers.length}
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'settings'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Studio Settings & Integrations"
            >
              <Settings size={17} className="shrink-0" />
              {!sidebarCollapsed && <span>Settings Center</span>}
            </button>

            <div className="pt-3 mt-3 border-t border-[var(--paper-line)]">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/40 mb-1">
                  External Probes
                </p>
              )}
              <Link
                href="/dashboard/platform"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
                title="Live Platform Telemetry"
              >
                <Activity size={16} className="text-emerald-500 shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>Platform Health</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                )}
              </Link>

              <Link
                href="/"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
                title="Public Marketing Site"
              >
                <Globe size={16} className="shrink-0 text-sky-500" />
                {!sidebarCollapsed && <span>Public Site</span>}
              </Link>
            </div>
          </nav>

          {/* User profile footer */}
          <div className="p-3 border-t border-[var(--paper-line)] bg-[var(--paper)]/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-[var(--amber)]/20 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center font-bold text-xs shrink-0">
                {(currentUser?.email || 'S').charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--ink)] truncate">
                    {teamMembers.find((m) => m.user_id === currentUser?.id)?.name || 'Studio Principal'}
                  </p>
                  <p className="text-[10px] text-[var(--ink)]/50 font-medium truncate">
                    {currentUser?.email || 'demo@archscale.com'}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of studio"
                className="p-1.5 rounded-lg text-[var(--ink)]/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex">
            <div className="w-64 bg-[var(--paper-raised)] border-r border-[var(--paper-line)] h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--paper-line)]">
                <span className="font-display font-bold text-sm text-[var(--ink)]">ArchScale Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg border border-[var(--paper-line)] text-[var(--ink)]/60"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-3 space-y-1 flex-1 overflow-y-auto scrollbar-none">
                {[
                  { id: 'pipeline', label: 'Pipeline & Inbox', icon: Layers },
                  { id: 'kanban', label: 'Kanban Board', icon: LayoutGrid },
                  { id: 'sheet', label: 'Leads Sheet (Excel)', icon: FileSpreadsheet },
                  { id: 'analytics', label: 'Funnel & Analytics', icon: BarChart3 },
                  { id: 'knowledge', label: 'Studio Knowledge', icon: BookOpen },
                  { id: 'team', label: 'Team Specialists', icon: Users },
                  { id: 'settings', label: 'Settings Center', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentView(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        isActive
                          ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold'
                          : 'text-[var(--ink)]/70 hover:bg-[var(--paper)]'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <div className="pt-3 border-t border-[var(--paper-line)] space-y-1">
                  <Link
                    href="/dashboard/platform"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--ink)]/70 hover:bg-[var(--paper)]"
                  >
                    <Activity size={16} className="text-emerald-500" />
                    <span>Platform Telemetry</span>
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--ink)]/70 hover:bg-[var(--paper)]"
                  >
                    <Globe size={16} className="text-sky-500" />
                    <span>Public Website</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 cursor-pointer font-medium border border-rose-500/20"
                  >
                    <LogOut size={16} />
                    <span>Sign out ({currentUser?.email || 'Studio'})</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Dynamic Center Stage Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-none">
          
          {/* Top Metrics Strip (Always visible across all views) */}
          <div className="border-b border-[var(--paper-line)] bg-[var(--paper)] px-4 sm:px-6 lg:px-8 py-3.5 shrink-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Total Inbound Leads</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-2xl font-bold text-[var(--ink)]">{totalLeadsCount}</p>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">100% genuine</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">AI Qualified (LPI ≥ {qualificationThreshold})</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-2xl font-bold text-emerald-500">{qualifiedCount}</p>
                  <span className="text-[10px] font-medium tabular-nums text-[var(--ink)]/60">
                    {totalLeadsCount > 0 ? Math.round((qualifiedCount / totalLeadsCount) * 100) : 0}% rate
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Consultations Booked</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-2xl font-bold text-sky-500">{bookedCount}</p>
                  <span className="text-[10px] font-medium text-[var(--ink)]/60">Stage 4 Pipeline</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Won Engagements</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-display text-2xl font-bold text-[var(--amber-deep)] dark:text-[var(--amber)]">{wonCount}</p>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold">Active Clients</span>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW 1: INBOUND PIPELINE & WHATSAPP CONSOLE */}
          {currentView === 'pipeline' && (
            <div className="flex-1 flex flex-col lg:flex-row p-4 sm:p-5 lg:p-5 xl:p-6 gap-4 xl:gap-5 w-full min-h-0 lg:overflow-hidden">
              {/* Mobile View Switcher Pill */}
              <div className="lg:hidden flex items-center p-1 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileTab('pipeline')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mobileTab === 'pipeline'
                      ? 'bg-[var(--paper)] text-[var(--ink)] shadow-2xs font-bold'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  <span>Inbound Pipeline</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-[var(--paper-raised)] border border-[var(--paper-line)]">
                    {filteredLeads.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('chat')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mobileTab === 'chat'
                      ? 'bg-[var(--paper)] text-[var(--ink)] shadow-2xs font-bold'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  <span>WhatsApp Console</span>
                  {selectedLead && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </button>
              </div>

              {/* Inbound Leads Queue Table */}
              <div className={`flex-1 flex flex-col bg-[var(--paper-raised)] rounded-2xl shadow-xs border border-[var(--paper-line)] overflow-hidden min-w-0 h-[540px] sm:h-[600px] lg:h-full min-h-[480px] ${
                mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
              }`}>
                {/* Pipeline Controls */}
                <div className="p-4 border-b border-[var(--paper-line)] flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--paper)] gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-semibold text-base text-[var(--ink)]">Inbound Lead Pipeline</h2>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                      Ranked by multi-factor Lead Priority Index (LPI: 0–100) &amp; scope depth
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority Tier Filter */}
                    <div className="inline-flex p-0.5 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setPriorityFilter('all')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          priorityFilter === 'all'
                            ? 'bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs'
                            : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                        }`}
                      >
                        All ({leads.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriorityFilter('urgent')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          priorityFilter === 'urgent'
                            ? 'bg-[var(--paper)] text-rose-600 dark:text-rose-400 font-semibold shadow-2xs'
                            : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                        }`}
                      >
                        Urgent
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriorityFilter('high')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          priorityFilter === 'high'
                            ? 'bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs'
                            : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                        }`}
                      >
                        High
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriorityFilter('returning')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          priorityFilter === 'returning'
                            ? 'bg-[var(--paper)] text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                            : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                        }`}
                      >
                        VIP ({leads.filter((l) => l.is_returning_client).length})
                      </button>
                    </div>

                    {/* Sort Selector */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort leads"
                      className="text-xs font-medium border border-[var(--paper-line)] bg-[var(--paper)] rounded-lg px-2.5 py-1 text-[var(--ink)] cursor-pointer focus:outline-none focus:border-[var(--amber)]"
                    >
                      <option value="match">Sort: LPI Priority Score</option>
                      <option value="recent">Sort: Newest Activity</option>
                      <option value="budget">Sort: Budget Mentioned</option>
                    </select>

                    {/* My Assigned Toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveFilter(activeFilter === 'all' ? 'mine' : 'all')}
                      className={`text-xs px-2.5 py-1 rounded-lg border border-[var(--paper-line)] font-medium transition-colors cursor-pointer ${
                        activeFilter === 'mine'
                          ? 'bg-[var(--amber)] text-[var(--text-on-amber)] border-[var(--amber)]'
                          : 'bg-[var(--paper)] text-[var(--ink)]/70 hover:text-[var(--ink)]'
                      }`}
                    >
                      {activeFilter === 'mine' ? 'My Assigned' : 'Filter Mine'}
                    </button>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-none">
                  <table className="min-w-[700px] w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[var(--paper-raised)] text-[var(--ink)]/60 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-[2] border-b border-[var(--paper-line)]">
                      <tr>
                        <th className="p-3.5 font-medium">Lead Client</th>
                        <th className="p-3.5 font-medium">Scope &amp; Budget</th>
                        <th className="p-3.5 font-medium">Source &amp; Campaign</th>
                        <th className="p-3.5 font-medium">LPI Priority Index</th>
                        <th className="p-3.5 font-medium">Assigned Partner</th>
                        <th className="p-3.5 font-medium">Status</th>
                        <th className="p-3.5 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--paper-line)]">
                      {filteredLeads.map((lead) => {
                        const lpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
                        const isUrgent = lead.priority_tier === 'urgent' || lpi >= 80;
                        const isHigh = lead.priority_tier === 'high' || (lpi >= 60 && !isUrgent);

                        const matchColor = isUrgent
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          : isHigh
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : lpi >= 35
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-[var(--paper)] border-[var(--paper-line)] text-[var(--ink)]/60';

                        return (
                          <tr
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setMobileTab('chat');
                            }}
                            className={`cursor-pointer transition-colors ${
                              selectedLead?.id === lead.id ? 'bg-[var(--amber)]/10 font-medium' : 'hover:bg-[var(--paper)]'
                            }`}
                          >
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-[var(--ink)]">{lead.name}</p>
                                {lead.is_returning_client && (
                                  <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    VIP
                                  </span>
                                )}
                                {lead.automation_enabled === false && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                                    AI Paused
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--ink)]/50 font-medium tabular-nums mt-0.5">{lead.contact}</p>
                            </td>

                            <td className="p-3.5">
                              <p className="text-xs text-[var(--ink)]/85 font-medium">
                                {lead.project_type || 'Pending Extraction'}
                              </p>
                              {lead.estimated_budget ? (
                                <p className="text-[11px] font-semibold tabular-nums text-[var(--amber-deep)] dark:text-[var(--amber)] mt-0.5">
                                  {lead.estimated_budget}
                                </p>
                              ) : lead.budget_mentioned ? (
                                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  Budget Mentioned
                                </p>
                              ) : null}
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="capitalize font-medium text-[11px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70">
                                  {lead.source}
                                </span>
                                {lead.campaign && (
                                  <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 truncate max-w-[140px]" title={lead.campaign}>
                                    Ad: {lead.campaign}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-col gap-1 items-start">
                                <div className="flex items-center gap-1.5 tabular-nums">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${matchColor}`}>
                                    LPI {lead.score ?? lpi}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider font-bold opacity-80">
                                    {lead.priority_tier || (lpi >= 80 ? 'Urgent' : lpi >= 60 ? 'High' : lpi >= 35 ? 'Med' : 'Low')}
                                  </span>
                                </div>
                                {lead.qualification_percentage ? (
                                  <span className="text-[10px] font-medium tabular-nums text-[var(--ink)]/50">
                                    {lead.qualification_percentage}% match
                                  </span>
                                ) : null}
                                {lead.ai_summary && (
                                  <p className="text-[10px] text-[var(--ink)]/55 font-normal max-w-[170px] truncate" title={lead.ai_summary}>
                                    {lead.ai_summary}
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[var(--amber)]/20 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center text-[10px] font-bold">
                                  {getAssigneeName(lead.assigned_to).charAt(0)}
                                </div>
                                <span className="text-xs text-[var(--ink)]/80 truncate max-w-[110px]">
                                  {getAssigneeName(lead.assigned_to)}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border capitalize ${
                                lead.status === 'won'
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                                  : lead.status === 'consult_booked'
                                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300'
                                  : lead.status === 'qualified'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : lead.status === 'contacted'
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                                  : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400'
                              }`}>
                                {lead.status ? lead.status.replace('_', ' ') : 'new'}
                              </span>
                            </td>

                            <td className="p-3.5 text-xs text-[var(--ink)]/50 font-medium tabular-nums whitespace-nowrap">
                              {formatStudioTime(lead.last_contacted_at || lead.created_at, { timeFormat, timezone })}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-[var(--ink)]/50">
                            {activeFilter === 'mine' ? 'No leads currently assigned to you.' : 'No inquiries match the current filter.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary Bar */}
                <div className="px-4 py-3 border-t border-[var(--paper-line)] bg-[var(--paper)]/80 flex items-center justify-between text-[11px] font-medium tabular-nums text-[var(--ink)]/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <span>Showing <strong className="text-[var(--ink)] font-semibold">{filteredLeads.length}</strong> of {leads.length} lead{leads.length === 1 ? '' : 's'}</span>
                    {activeFilter === 'mine' && <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-medium">(Filtered: My Assigned)</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Sync Active</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Console Inbox */}
              <div className={`w-full lg:w-[420px] xl:w-[480px] 2xl:w-[520px] flex-shrink-0 h-[540px] sm:h-[600px] lg:h-full min-h-[480px] flex flex-col min-h-0 ${
                mobileTab === 'pipeline' ? 'hidden lg:flex' : 'flex'
              }`}>
                <ChatInbox
                  lead={selectedLead}
                  timeOptions={{ timeFormat, timezone }}
                  qualificationThreshold={qualificationThreshold}
                  onLeadUpdate={(updatedLead) => {
                    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l)));
                    setSelectedLead((prev: any) => (prev?.id === updatedLead.id ? { ...prev, ...updatedLead } : prev));
                  }}
                />
              </div>
            </div>
          )}

          {/* VIEW 2: INTERACTIVE KANBAN PIPELINE BOARD */}
          {currentView === 'kanban' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-4">
              {/* Kanban Action Bar */}
              <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                    <h2 className="font-display font-bold text-lg text-[var(--ink)]">Pipeline Stage Kanban</h2>
                    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] border border-[var(--amber)]/30">
                      Drag &amp; Drop Active
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                    Pipeline progression stages (New &rarr; Contacted &rarr; Qualified &rarr; Consult Booked &rarr; Won &rarr; Archived) with 1-click &amp; drag-and-drop movement.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search input */}
                  <div className="relative min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
                    <input
                      type="text"
                      placeholder="Filter Kanban leads..."
                      value={kanbanSearchQuery}
                      onChange={(e) => setKanbanSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                    />
                  </div>
                </div>
              </div>

              {/* 6-Stage Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
                {KANBAN_STAGES.map((col, colIdx) => {
                  const colLeads = leads.filter((l) => {
                    const matchesCol = getLeadKanbanStage(l) === col.id;
                    if (!matchesCol) return false;
                    if (!kanbanSearchQuery.trim()) return true;
                    const q = kanbanSearchQuery.toLowerCase();
                    return (
                      l.name?.toLowerCase().includes(q) ||
                      l.contact?.toLowerCase().includes(q) ||
                      l.project_type?.toLowerCase().includes(q) ||
                      l.estimated_budget?.toLowerCase().includes(q)
                    );
                  });

                  const isOver = dragOverColumn === col.id;

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverColumn(col.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverColumn === col.id) setDragOverColumn(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
                        if (leadId) {
                          handleUpdateLeadStatus(leadId, col.id);
                        }
                        setDragOverColumn(null);
                        setDraggedLeadId(null);
                      }}
                      className={`flex flex-col rounded-2xl border transition-all min-w-[210px] ${
                        isOver
                          ? 'border-[var(--amber)] bg-[var(--amber)]/5 ring-2 ring-[var(--amber)]/20 shadow-md'
                          : 'border-[var(--paper-line)] bg-[var(--paper-raised)]/70 shadow-2xs'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-3 border-b border-[var(--paper-line)] flex items-center justify-between bg-[var(--paper)] rounded-t-2xl">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            col.id === 'new' ? 'bg-cyan-500' :
                            col.id === 'contacted' ? 'bg-blue-500' :
                            col.id === 'qualified' ? 'bg-purple-500' :
                            col.id === 'consultation_booked' ? 'bg-amber-500' :
                            col.id === 'converted' ? 'bg-emerald-500' :
                            'bg-zinc-500'
                          }`} />
                          <span className="text-xs font-bold font-display text-[var(--ink)]">
                            {col.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[var(--paper-raised)] border border-[var(--paper-line)] text-[var(--ink)]/60">
                          {colLeads.length}
                        </span>
                      </div>

                      {/* Column Cards Container */}
                      <div className="p-2 space-y-2.5 min-h-[350px] max-h-[calc(100vh-270px)] overflow-y-auto scrollbar-none">
                        {colLeads.length === 0 ? (
                          <div className="h-28 flex flex-col items-center justify-center text-center p-3 border-2 border-dashed border-[var(--paper-line)] rounded-xl text-[var(--ink)]/35 text-[11px] font-medium">
                            <span>Drop leads here</span>
                          </div>
                        ) : (
                          colLeads.map((lead) => {
                            const priority = lead.priority_tier || 'medium';
                            const tierBadgeColor =
                              priority === 'urgent' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                              priority === 'high' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                              priority === 'medium' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' :
                              'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';

                            const assignedMember = teamMembers.find((m) => m.id === lead.assigned_to);

                            return (
                              <div
                                key={lead.id}
                                draggable
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setCurrentView('pipeline');
                                }}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', lead.id);
                                  setDraggedLeadId(lead.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedLeadId(null);
                                  setDragOverColumn(null);
                                }}
                                className={`p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] hover:border-[var(--amber)]/50 transition-all shadow-2xs space-y-2 cursor-grab active:cursor-grabbing group ${
                                  draggedLeadId === lead.id ? 'opacity-40 scale-95' : ''
                                }`}
                              >
                                {/* Top Row: Lead Name & LPI badge */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-xs text-[var(--ink)] truncate" title={lead.name}>
                                      {lead.name || 'Unknown Lead'}
                                    </p>
                                    <p className="text-[10px] font-medium tabular-nums text-[var(--ink)]/50 truncate">
                                      {lead.contact}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <span className={`text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded border uppercase ${tierBadgeColor}`}>
                                      LPI {lead.score ?? 0}
                                    </span>
                                  </div>
                                </div>

                                {/* Scope & Budget Info */}
                                <div className="space-y-1">
                                  {lead.project_type && (
                                    <div className="text-[10px] text-[var(--ink)]/80 font-medium truncate flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber-deep)] dark:bg-[var(--amber)] shrink-0" />
                                      <span className="truncate">{lead.project_type}</span>
                                    </div>
                                  )}
                                  {lead.estimated_budget && (
                                    <div className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                      {lead.estimated_budget}
                                    </div>
                                  )}
                                  {lead.timeline && !lead.timeline.toLowerCase().includes('not specified') && (
                                    <div className="text-[9px] font-medium text-[var(--ink)]/60 truncate flex items-center gap-1">
                                      <Clock size={10} className="shrink-0 text-[var(--amber-deep)]" />
                                      <span className="truncate">{lead.timeline}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Specialist & Timestamp Footer */}
                                <div className="pt-2 border-t border-[var(--paper-line)]/60 flex items-center justify-between text-[10px] text-[var(--ink)]/50">
                                  <span className="truncate max-w-[90px]" title={assignedMember ? `Assigned to ${assignedMember.name}` : 'Unassigned'}>
                                    {assignedMember?.name ? `👤 ${assignedMember.name.split(' ')[0]}` : 'Unassigned'}
                                  </span>
                                  <span className="font-medium tabular-nums text-[9px] shrink-0">
                                    {formatStudioTime(lead.last_contacted_at || lead.created_at, { timeFormat, timezone })}
                                  </span>
                                </div>

                                {/* 1-Click Stage Progression & Quick Chat Navigation */}
                                <div className="pt-2 border-t border-[var(--paper-line)]/60 flex items-center justify-between gap-1">
                                  {/* Step backward */}
                                  <button
                                    type="button"
                                    disabled={colIdx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (colIdx > 0) handleUpdateLeadStatus(lead.id, KANBAN_STAGES[colIdx - 1].id);
                                    }}
                                    className="p-1 rounded hover:bg-[var(--paper-raised)] text-[var(--ink)]/60 hover:text-[var(--ink)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title={colIdx > 0 ? `Move back to ${KANBAN_STAGES[colIdx - 1].label}` : 'First stage'}
                                  >
                                    <ChevronLeft size={13} />
                                  </button>

                                  {/* Open in Chat Inbox */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                      setCurrentView('pipeline');
                                    }}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--paper-raised)] hover:bg-[var(--amber)] hover:text-[var(--text-on-amber)] transition-colors text-[var(--ink)]/70 cursor-pointer"
                                    title="Open lead in WhatsApp Chat Inbox"
                                  >
                                    Chat
                                  </button>

                                  {/* Stage Selector Dropdown */}
                                  <select
                                    value={col.id}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleUpdateLeadStatus(lead.id, e.target.value);
                                    }}
                                    className="text-[9px] font-medium bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded px-1 py-0.5 text-[var(--ink)] cursor-pointer focus:outline-none focus:border-[var(--amber)]"
                                    title="Change Stage"
                                  >
                                    {KANBAN_STAGES.map((s) => (
                                      <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                  </select>

                                  {/* Step forward */}
                                  <button
                                    type="button"
                                    disabled={colIdx === KANBAN_STAGES.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (colIdx < KANBAN_STAGES.length - 1) handleUpdateLeadStatus(lead.id, KANBAN_STAGES[colIdx + 1].id);
                                    }}
                                    className="p-1 rounded hover:bg-[var(--paper-raised)] text-[var(--ink)]/60 hover:text-[var(--ink)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title={colIdx < KANBAN_STAGES.length - 1 ? `Move to ${KANBAN_STAGES[colIdx + 1].label}` : 'Final stage'}
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: EXCEL-STYLE LEADS SHEET (SPREADSHEET VIEW) */}
          {currentView === 'sheet' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-4">
              {/* Sheet Action Bar */}
              <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-emerald-500" />
                    <h2 className="font-display font-bold text-lg text-[var(--ink)]">Leads Priority Spreadsheet</h2>
                    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Live Grid
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                    Full spreadsheet view with LPI scoring, inline status changes, and 1-click CSV export.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search input */}
                  <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
                    <input
                      type="text"
                      placeholder="Search client, scope, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                    />
                  </div>

                  {/* Status Dropdown Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs font-medium border border-[var(--paper-line)] bg-[var(--paper)] rounded-lg px-2.5 py-1.5 text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New Inbound</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="consult_booked">Consult Booked</option>
                    <option value="won">Won / Converted</option>
                    <option value="archived">Archived</option>
                  </select>

                  {/* Sort Selector */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs font-medium border border-[var(--paper-line)] bg-[var(--paper)] rounded-lg px-2.5 py-1.5 text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] cursor-pointer"
                  >
                    <option value="match">Sort: LPI Priority Score</option>
                    <option value="recent">Sort: Newest Activity</option>
                    <option value="budget">Sort: Budget Mentioned</option>
                  </select>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Download active leads table as CSV file"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Spreadsheet Grid Container */}
              <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[650px] overflow-y-auto scrollbar-none">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--paper)] text-[var(--ink)]/70 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-[2] border-b border-[var(--paper-line)] shadow-2xs">
                      <tr>
                        <th className="p-3 border-r border-[var(--paper-line)] w-12 text-center">#</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[130px]">LPI Priority</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[180px]">Client / Contact</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[160px]">Campaign / Ad</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[180px]">Project Typology</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[120px]">Budget</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[150px]">Pipeline Status</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[150px]">Assigned Partner</th>
                        <th className="p-3 border-r border-[var(--paper-line)] min-w-[130px]">Last Active</th>
                        <th className="p-3 min-w-[100px] text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--paper-line)] font-sans">
                      {filteredLeads.map((lead, idx) => {
                        const lpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
                        const isUrgent = lead.priority_tier === 'urgent' || lpi >= 80;
                        const isHigh = lead.priority_tier === 'high' || (lpi >= 60 && !isUrgent);

                        return (
                          <tr key={lead.id} className="hover:bg-[var(--paper)]/70 transition-colors">
                            <td className="p-3 border-r border-[var(--paper-line)] text-center font-medium tabular-nums text-[var(--ink)]/40 text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <div className="flex items-center gap-1.5 tabular-nums">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  isUrgent
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                    : isHigh
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {lead.score ?? lpi}/100
                                </span>
                                <span className="text-[9px] uppercase font-bold text-[var(--ink)]/60">
                                  {lead.priority_tier || (isUrgent ? 'URGENT' : isHigh ? 'HIGH' : 'MED')}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--ink)]">{lead.name}</span>
                                {lead.is_returning_client && (
                                  <span className="text-[9px] font-semibold tracking-wider px-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium tabular-nums text-[var(--ink)]/50 mt-0.5">{lead.contact}</p>
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <p className="font-medium text-xs text-[var(--ink)]/80 truncate max-w-[150px]" title={lead.campaign || 'Direct / Organic'}>
                                {lead.campaign || 'Direct / Organic'}
                              </p>
                              {lead.ad_id && (
                                <p className="text-[10px] font-medium text-sky-600 dark:text-sky-400 mt-0.5">
                                  Ad: {lead.ad_id}
                                </p>
                              )}
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <p className="font-medium text-[var(--ink)]/90">{lead.project_type || 'Unspecified'}</p>
                              {lead.ai_summary && (
                                <p className="text-[10px] text-[var(--ink)]/50 line-clamp-1 mt-0.5" title={lead.ai_summary}>
                                  {lead.ai_summary}
                                </p>
                              )}
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)] font-semibold tabular-nums text-[var(--amber-deep)] dark:text-[var(--amber)]">
                              {lead.estimated_budget || (lead.budget_mentioned ? 'Mentioned' : 'Pending')}
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <select
                                value={lead.status || 'new'}
                                onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                className="w-full text-xs font-medium bg-[var(--paper)] border border-[var(--paper-line)] rounded px-2 py-1 text-[var(--ink)] cursor-pointer focus:outline-none focus:border-[var(--amber)]"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="consult_booked">Consult Booked</option>
                                <option value="won">Won / Converted</option>
                                <option value="archived">Archived</option>
                              </select>
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)]">
                              <select
                                value={lead.assigned_to || ''}
                                onChange={(e) => handleUpdateLeadAssignee(lead.id, e.target.value)}
                                className="w-full text-xs px-2 py-1 rounded border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer focus:outline-none focus:border-[var(--amber)]"
                              >
                                <option value="">Unassigned</option>
                                {teamMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.email}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-3 border-r border-[var(--paper-line)] font-medium tabular-nums text-[11px] text-[var(--ink)]/50 whitespace-nowrap">
                              {formatStudioTime(lead.last_contacted_at || lead.created_at, { timeFormat, timezone })}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setCurrentView('pipeline');
                                  setMobileTab('chat');
                                }}
                                className="px-2.5 py-1 rounded bg-[var(--paper)] hover:bg-[var(--amber)] hover:text-[var(--text-on-amber)] border border-[var(--paper-line)] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                Open Chat
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-12 text-center text-[var(--ink)]/50">
                            No leads match current sheet filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sheet Footer summary */}
                <div className="p-3 border-t border-[var(--paper-line)] bg-[var(--paper)] text-xs font-medium tabular-nums text-[var(--ink)]/60 flex items-center justify-between">
                  <span>Displaying {filteredLeads.length} of {leads.length} recorded inquiries</span>
                  <span>Spreadsheet live synced with Supabase Postgres</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: FUNNEL & CAMPAIGN ATTRIBUTION */}
          {currentView === 'analytics' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)]">Funnel &amp; Campaign Attribution</h2>
                <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                  Real-time pipeline progression and Meta Click-to-WhatsApp ad attribution metrics
                </p>
              </div>

              {/* Visual Step-by-Step Conversion Funnel */}
              <div className="p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
                    <BarChart3 size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                    <span>Inbound Conversion Funnel</span>
                  </h3>
                  <span className="text-xs font-medium text-[var(--ink)]/50">Calculated from genuine lead state</span>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Step 1: Captured */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ink)]">1. Inbound Inquiries Captured</span>
                      <span className="font-medium tabular-nums text-[var(--ink)]/80">{totalLeadsCount} leads (100%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
                      <div className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Step 2: Contacted / Discovery */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ink)]">2. Discovery Engaged (Contacted)</span>
                      <span className="font-medium tabular-nums text-[var(--ink)]/80">
                        {contactedCount} leads ({totalLeadsCount > 0 ? Math.round((contactedCount / totalLeadsCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalLeadsCount > 0 ? (contactedCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 3: AI Qualified */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ink)]">3. AI Qualified (LPI ≥ {qualificationThreshold})</span>
                      <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {qualifiedCount} leads ({totalLeadsCount > 0 ? Math.round((qualifiedCount / totalLeadsCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalLeadsCount > 0 ? (qualifiedCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 4: Consult Booked */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ink)]">4. Senior Partner Consult Booked</span>
                      <span className="font-bold tabular-nums text-sky-600 dark:text-sky-400">
                        {bookedCount} leads ({totalLeadsCount > 0 ? Math.round((bookedCount / totalLeadsCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalLeadsCount > 0 ? (bookedCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 5: Won */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ink)]">5. Retained / Won Projects</span>
                      <span className="font-bold tabular-nums text-[var(--amber-deep)] dark:text-[var(--amber)]">
                        {wonCount} leads ({totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--amber)] rounded-full transition-all duration-500"
                        style={{ width: `${totalLeadsCount > 0 ? (wonCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Attribution Performance Table */}
              <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-[var(--ink)]">Meta Ad &amp; Channel Attribution</h3>
                    <p className="text-xs text-[var(--ink)]/60">Extracted from WhatsApp referral data &amp; UTM tags</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--paper-raised)] border border-[var(--paper-line)]">
                    {campaignAttributionList.length} Channels Tracked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--paper-raised)] text-[var(--ink)]/60 font-semibold uppercase tracking-wider text-[11px] border-b border-[var(--paper-line)]">
                      <tr>
                        <th className="p-3.5">Campaign Name</th>
                        <th className="p-3.5">Source Channel</th>
                        <th className="p-3.5">Sample Ad ID</th>
                        <th className="p-3.5 text-center">Total Inbound</th>
                        <th className="p-3.5 text-center">Qualified</th>
                        <th className="p-3.5 text-center">Consults</th>
                        <th className="p-3.5 text-right">Qual. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--paper-line)] font-medium tabular-nums">
                      {campaignAttributionList.map((item: any, idx: number) => {
                        const rate = item.total > 0 ? Math.round((item.qualified / item.total) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-[var(--paper)] transition-colors">
                            <td className="p-3.5 font-sans font-semibold text-[var(--ink)]">{item.name}</td>
                            <td className="p-3.5 capitalize text-[var(--ink)]/70">{item.source}</td>
                            <td className="p-3.5 text-[var(--ink)]/50">{item.topAdId}</td>
                            <td className="p-3.5 text-center font-bold text-[var(--ink)]">{item.total}</td>
                            <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.qualified}</td>
                            <td className="p-3.5 text-center font-bold text-sky-600 dark:text-sky-400">{item.booked}</td>
                            <td className="p-3.5 text-right font-bold text-[var(--amber-deep)] dark:text-[var(--amber)]">{rate}%</td>
                          </tr>
                        );
                      })}
                      {campaignAttributionList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[var(--ink)]/50">
                            No campaign data logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Meta Click-to-WhatsApp Campaign Link Generator */}
              {(() => {
                const cleanPhone = (campaignStudioNumber || whatsappPhoneNumberId || '').replace(/[^\d]/g, '');
                const formattedCampaignTag = (campaignNameInput || 'direct_ad').trim().replace(/\s+/g, '_').toLowerCase();
                const effectiveMessage = (campaignMessageInput || "Hi ArchScale, I'm reaching out from your Instagram ad regarding an architectural project. [Ref: {{campaign}}]")
                  .replace(/{{campaign}}/g, formattedCampaignTag);
                const computedCampaignUrl = cleanPhone 
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(effectiveMessage)}`
                  : `https://wa.me/?text=${encodeURIComponent(effectiveMessage)}`;

                return (
                  <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
                          <Sparkles size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                          <span>Click-to-WhatsApp Campaign Link &amp; Tag Generator</span>
                        </h3>
                        <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                          Create Meta Ad destination URLs that automatically embed campaign attribution when clients message on WhatsApp
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
                        Meta Graph Compliant
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[var(--ink)]/70">Studio WhatsApp Number / ID</label>
                        <input
                          type="text"
                          placeholder="e.g. +15551234567 or Phone ID"
                          value={campaignStudioNumber}
                          onChange={(e) => setCampaignStudioNumber(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[var(--ink)]/70">Campaign Name / Identifier</label>
                        <input
                          type="text"
                          placeholder="e.g. luxury_villas_2026, penthouse_instagram"
                          value={campaignNameInput}
                          onChange={(e) => setCampaignNameInput(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--ink)]/70">
                        Inbound Starter Message (Pre-populates prospective client's WhatsApp composer)
                      </label>
                      <input
                        type="text"
                        placeholder="Hi ArchScale, I saw your ad... [Ref: {{campaign}}]"
                        value={campaignMessageInput}
                        onChange={(e) => setCampaignMessageInput(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                      />
                    </div>

                    {/* Generated Destination URL Box */}
                    <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
                          Generated Meta Ad Destination URL
                        </span>
                        {copiedCampaignUrl && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check size={11} /> Copied to Clipboard!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={computedCampaignUrl}
                          className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] select-all truncate"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(computedCampaignUrl);
                            setCopiedCampaignUrl(true);
                            setTimeout(() => setCopiedCampaignUrl(false), 2500);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                        >
                          <Copy size={13} />
                          <span>Copy</span>
                        </button>
                        <a
                          href={computedCampaignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                        >
                          <ExternalLink size={13} />
                          <span>Test</span>
                        </a>
                      </div>
                      <p className="text-[10px] text-[var(--ink)]/50 font-medium">
                        Copy and paste this URL as the destination link in Meta Ads Manager (Facebook &amp; Instagram) with CTA set to "Send WhatsApp Message".
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW 5: STUDIO KNOWLEDGE BASE MANAGER */}
          {currentView === 'knowledge' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-4 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
                    <BookOpen size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                    <span>Studio Knowledge Base &amp; Offerings</span>
                  </h2>
                  <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                    Live reference document injected into AI system prompts for contextual responses and scope matching.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".txt,.md,.text,.markdown,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
                  >
                    <Upload size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                    <span>Upload .txt / .md</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadStarterTemplate}
                    className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Load Template</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingKnowledge}
                    onClick={handleSaveKnowledge}
                    className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-4 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingKnowledge ? (
                      <span>Saving...</span>
                    ) : knowledgeSavedToast ? (
                      <>
                        <CheckCheck size={14} />
                        <span>Saved to Database!</span>
                      </>
                    ) : (
                      <span>Save Knowledge</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Editor Window */}
              <div className="flex-1 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col min-h-[450px] overflow-hidden shadow-xs">
                <div className="p-3 border-b border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs font-medium tabular-nums text-[var(--ink)]/60">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live Markdown / Text Editor</span>
                  </span>
                  <span>
                    {knowledgeBase.trim() ? `${knowledgeBase.trim().split(/\s+/).length} words · ${knowledgeBase.length} characters` : '0 words'}
                  </span>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="flex-1 p-4 flex flex-col"
                >
                  <textarea
                    value={knowledgeBase}
                    onChange={(e) => setKnowledgeBase(e.target.value)}
                    placeholder={`# Studio Overview\nDescribe your studio, focus areas, and philosophy...\n\n## Packages & Offerings\n• Starter Package: description & scope\n• Growth Package: description & scope\n• Enterprise / Custom: description & scope\n\n## Target Audience & Pricing\n• Pricing notes or minimum engagement\n• Ideal client requirements\n\n## WhatsApp Assistant Instructions\n• Guidelines on tone, consultation booking, or specific rules...`}
                    className="w-full flex-1 min-h-[380px] p-4 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--amber)] resize-y placeholder:text-[var(--ink)]/30"
                  />
                </div>

                <div className="p-3 border-t border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs text-[var(--ink)]/60">
                  <span>Tip: You can drag and drop any .txt or .md studio brochure directly into the editor.</span>
                  {knowledgeSavedToast && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check size={13} /> Active in Azure OpenAI prompts
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: TEAM SPECIALISTS & ROSTER */}
          {currentView === 'team' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
                  <Users size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                  <span>Team Specialists &amp; Partner Roster</span>
                </h2>
                <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                  Manage senior specialists, role tiers, and lead assignment routing
                </p>
              </div>

              {/* Shareable Invite Card */}
              <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ink)]/70">Shareable Studio Invite Link</span>
                  {copiedLink && (
                    <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                      <Check size={11} /> Link Copied!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://scale.sampod.site'}/join/${team?.invite_code || 'arch8899'}`}
                    className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/70 select-all"
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="px-4 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Invite Partner Form */}
              <form onSubmit={handleInvite} className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
                <p className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <UserPlus size={14} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                  <span>Invite New Specialist Partner</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Partner name (e.g. David)"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
                  />
                  <input
                    type="email"
                    required
                    placeholder="partner@studio.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      list="specialist-designations-view"
                      placeholder="Specialty / Designation (e.g. Commercial Architecture, BIM, Interior FF&E...)"
                      value={inviteSpecialty}
                      onChange={(e) => setInviteSpecialty(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
                    />
                    <datalist id="specialist-designations-view">
                      <option value="Commercial Architecture" />
                      <option value="High-End Residential" />
                      <option value="Turnkey Renovation" />
                      <option value="Interior Architecture & FF&E" />
                      <option value="Landscape Architecture" />
                      <option value="Urban Design & Master Planning" />
                      <option value="Sustainable & Passive House" />
                      <option value="BIM & Computational Design" />
                    </datalist>
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs disabled:opacity-50 shrink-0"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invite'}
                  </button>
                </div>
              </form>

              {/* Active Specialists Roster Grid */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/50">Active Roster ({teamMembers.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamMembers.map((member) => {
                    const emailDisplay = member.email || member.contact || 'specialist@studio.com';
                    const initial = (member.name || emailDisplay).charAt(0).toUpperCase();
                    const isEditing = editingMemberId === member.id;

                    if (isEditing) {
                      return (
                        <div key={member.id} className="p-4 rounded-2xl border border-[var(--amber)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
                          <p className="font-semibold text-xs text-[var(--ink)]">Edit Specialist Profile</p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                            />
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                            >
                              <option value="specialist">Specialist Partner</option>
                              <option value="owner">Studio Owner</option>
                              <option value="admin">Administrator</option>
                              <option value="collaborator">Collaborator</option>
                            </select>
                            <input
                              type="text"
                              value={editSpecialty}
                              onChange={(e) => setEditSpecialty(e.target.value)}
                              placeholder="Specialty / Role"
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingMemberId(null)}
                              className="px-2.5 py-1 rounded text-xs border border-[var(--paper-line)] text-[var(--ink)]/60 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingMember}
                              onClick={() => handleSaveMemberEdit(member.id)}
                              className="px-3 py-1 rounded bg-[var(--amber)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer shadow-2xs"
                            >
                              {isSavingMember ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={member.id} className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-center justify-between shadow-xs hover:border-[var(--amber)]/40 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center font-bold text-sm shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-xs text-[var(--ink)] truncate">{member.name || emailDisplay}</p>
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60">
                                {member.role || 'Partner'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--ink)]/50 font-medium truncate">{emailDisplay}</p>
                            <p className="text-[11px] text-[var(--amber-deep)] dark:text-[var(--amber)] font-medium mt-0.5 truncate">
                              {member.specialty || 'Architecture Specialist'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingMember(member)}
                            className="p-1.5 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer transition-colors"
                            title="Edit specialist"
                          >
                            <Pencil size={13} />
                          </button>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automated Scope-to-Specialist Routing Matrix */}
              <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
                      <Layers size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                      <span>Automated Scope-to-Specialist Routing Matrix</span>
                    </h3>
                    <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                      How incoming architectural project briefs automatically route to practice partners upon AI qualification
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
                    Auto-Dispatch Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--paper)] text-[var(--ink)]/60 text-[11px] border-b border-[var(--paper-line)]">
                      <tr>
                        <th className="p-3">Inbound Typology / Scope</th>
                        <th className="p-3">Matching Rule</th>
                        <th className="p-3">Routed Specialist Partner</th>
                        <th className="p-3 text-right">Routing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--paper-line)]">
                      {[
                        { scope: 'Commercial Architecture', keyword: 'commercial' },
                        { scope: 'High-End Residential', keyword: 'residential' },
                        { scope: 'Turnkey Renovation', keyword: 'renovation' },
                        { scope: 'Interior Architecture & FF&E', keyword: 'interior' },
                        { scope: 'Landscape Architecture', keyword: 'landscape' },
                        { scope: 'Urban Design & Master Planning', keyword: 'urban' },
                      ].map((item, idx) => {
                        const matched = teamMembers.find((m) => {
                          if (!m.specialty) return false;
                          const spec = m.specialty.toLowerCase();
                          return spec.includes(item.keyword) || item.keyword.includes(spec);
                        });
                        const partnerName = matched ? matched.name || matched.email : (teamMembers[0]?.name || 'Studio Principal (Default)');
                        const partnerRole = matched ? (matched.role || 'Specialist') : 'Practice Default';

                        return (
                          <tr key={idx} className="hover:bg-[var(--paper)] transition-colors">
                            <td className="p-3 font-sans font-semibold text-[var(--ink)]">{item.scope}</td>
                            <td className="p-3 text-[var(--ink)]/60">
                              match: <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-bold">"{item.keyword}"</span>
                            </td>
                            <td className="p-3 font-sans">
                              <span className="font-medium text-[var(--ink)]">{partnerName}</span>
                              <span className="text-[10px] text-[var(--ink)]/50 font-medium ml-1.5">({partnerRole})</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Routed</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: CENTRALIZED SETTINGS CENTER */}
          {currentView === 'settings' && (
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
              {settingsTab === 'integrations' && (() => {
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
                    tag: 'Cloud API v25.0',
                    enabled: isWhatsAppConfigured,
                    icon: (
                      <svg className="w-5 h-5 text-[#25D366] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.16C10.57 20.16 9.12 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.05 20.16ZM16.57 14.33C16.32 14.2 15.1 13.6 14.87 13.52C14.65 13.43 14.48 13.39 14.32 13.64C14.15 13.89 13.67 14.46 13.52 14.63C13.38 14.8 13.23 14.82 12.98 14.7C12.73 14.57 11.93 14.31 10.98 13.47C10.24 12.81 9.74 11.99 9.6 11.74C9.45 11.49 9.58 11.36 9.71 11.23C9.82 11.12 9.96 10.94 10.08 10.8C10.21 10.66 10.25 10.55 10.33 10.39C10.41 10.22 10.37 10.08 10.31 9.95C10.25 9.83 9.75 8.6 9.55 8.09C9.35 7.59 9.14 7.66 8.99 7.65C8.84 7.65 8.68 7.64 8.51 7.64C8.34 7.64 8.08 7.7 7.85 7.95C7.62 8.2 6.98 8.8 6.98 10.02C6.98 11.24 7.87 12.41 8 12.58C8.12 12.75 9.75 15.25 12.24 16.33C12.83 16.59 13.29 16.74 13.65 16.85C14.25 17.04 14.79 17.02 15.22 16.95C15.7 16.88 16.7 16.35 16.91 15.77C17.11 15.19 17.11 14.69 17.05 14.59C16.99 14.49 16.82 14.45 16.57 14.33Z" />
                      </svg>
                    ),
                  },
                  {
                    id: 'ai',
                    name: 'OpenAI & Azure',
                    tag: 'Lead Reasoning & LPI',
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
                    tag: 'Broadcast Bot Alerts',
                    enabled: isTelegramConfigured,
                    icon: (
                      <svg className="w-5 h-5 text-[#24A1DE] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    ),
                  },
                  {
                    id: 'email',
                    name: 'Resend Email',
                    tag: 'Transactional SMTP',
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
                    tag: 'Channel Webhook Alerts',
                    enabled: isDiscordConfigured,
                    icon: (
                      <svg className="w-5 h-5 text-[#5865F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    ),
                  },
                  {
                    id: 'facebook',
                    name: 'Facebook',
                    tag: 'Meta Lead Ads & Forms',
                    enabled: isFacebookConfigured,
                    icon: (
                      <svg className="w-5 h-5 text-[#1877F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    ),
                  },
                  {
                    id: 'google',
                    name: 'Google',
                    tag: 'Workspace & Sheets Sync',
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
                    name: 'Custom Webhook',
                    tag: 'Zapier, Make & n8n',
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
                  <div className="space-y-6">
                    {/* Guidance Banner */}
                    <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-start gap-3.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center shrink-0 mt-0.5">
                        <Key size={16} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-[var(--ink)]">Client &amp; Buyer Dashboard Credentials Center</p>
                        <p className="text-[11px] text-[var(--ink)]/60 leading-relaxed">
                          Configure all your live external Cloud APIs and tokens below. Click any provider in the list to open its configuration pop-up, verify credentials, and test live connections.
                        </p>
                      </div>
                    </div>

                    {/* Providers Table (Matching Reference Screenshot) */}
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
                        All saved credentials persist immediately into your secure PostgreSQL database and take effect across background cron jobs, WhatsApp webhooks, and AI qualification.
                      </p>
                      <button
                        type="button"
                        disabled={isSavingIntegrations}
                        onClick={handleSaveIntegrationSettings}
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

                    {/* Pop-Up Modal Dialog ("then a pop up will come...") */}
                    {activeIntegrationModal && (
                      <div
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) setActiveIntegrationModal(null);
                        }}
                      >
                        <div
                          className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 relative z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Modal Header */}
                          <div className="p-5 border-b border-[var(--paper-line)] flex items-center justify-between bg-[var(--paper)]/40 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shrink-0">
                                {providers.find((p) => p.id === activeIntegrationModal)?.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm text-[var(--ink)]">
                                    {activeIntegrationModal === 'meta' && 'Meta WhatsApp Cloud API (v25.0)'}
                                    {activeIntegrationModal === 'ai' && 'AI Lead Qualification & Reasoning Model'}
                                    {activeIntegrationModal === 'telegram' && 'Telegram Lead Broadcast Bot'}
                                    {activeIntegrationModal === 'email' && 'Transactional Email Alerts (Resend)'}
                                    {activeIntegrationModal === 'discord' && 'Discord Lead Alerts Channel'}
                                    {activeIntegrationModal === 'facebook' && 'Facebook & Meta Lead Ads'}
                                    {activeIntegrationModal === 'google' && 'Google Workspace & Sheets Sync'}
                                    {activeIntegrationModal === 'webhooks' && 'Custom REST Webhook Dispatcher'}
                                  </h3>
                                  {providers.find((p) => p.id === activeIntegrationModal)?.enabled ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Enabled
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper)] text-[var(--ink)]/50 border border-[var(--paper-line)]">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[var(--ink)]/60">
                                  {activeIntegrationModal === 'meta' && 'Live Omnichannel WhatsApp Discovery & Webhooks'}
                                  {activeIntegrationModal === 'ai' && 'Multi-factor LPI scoring and conversational discovery'}
                                  {activeIntegrationModal === 'telegram' && 'Real-time high-priority push notifications to Telegram'}
                                  {activeIntegrationModal === 'email' && 'Dispatches structured dossiers to the studio owner & team'}
                                  {activeIntegrationModal === 'discord' && 'Stream incoming lead dossiers to your Discord server'}
                                  {activeIntegrationModal === 'facebook' && 'Sync Meta Instant Forms & Click-to-WhatsApp ad leads'}
                                  {activeIntegrationModal === 'google' && 'Automated export to Google Sheets & Workspace'}
                                  {activeIntegrationModal === 'webhooks' && 'HTTP POST webhook dispatcher for Zapier, Make, and n8n'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveIntegrationModal(null)}
                              className="w-8 h-8 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer transition-colors shrink-0"
                              title="Close modal (Esc)"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Modal Body */}
                          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                            {/* 1. Meta WhatsApp Modal Body */}
                            {activeIntegrationModal === 'meta' && (
                              <div className="space-y-4">
                                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs flex items-center gap-2.5 text-[var(--ink)]/80">
                                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Credential Security:</strong> Tokens and IDs are encrypted &amp; stored in PostgreSQL. Raw secret keys are hidden from judges and visitors, with on-demand replacement available via <strong>Change</strong>.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                  {renderSecretField('meta_phone', 'Phone Number ID', whatsappPhoneNumberId, setWhatsappPhoneNumberId, {
                                    placeholder: 'e.g. 1230168753524014',
                                    isIdField: true,
                                  })}

                                  {renderSecretField('meta_waba', 'WABA Account ID', whatsappBusinessAccountId, setWhatsappBusinessAccountId, {
                                    placeholder: 'e.g. 1774852886868045',
                                    isIdField: true,
                                  })}

                                  <div className="sm:col-span-2">
                                    {renderSecretField('meta_token', 'System User Permanent Access Token', whatsappAccessToken, setWhatsappAccessToken, {
                                      placeholder: 'Paste replacement token (EAAZ...)',
                                    })}
                                  </div>

                                  {renderSecretField('meta_secret', 'Meta App Secret (HMAC-SHA256)', metaAppSecret, setMetaAppSecret, {
                                    placeholder: 'App secret for payload verification',
                                  })}

                                  {renderSecretField('meta_verify', 'Webhook Verify Token (hub.challenge)', whatsappVerifyToken, setWhatsappVerifyToken, {
                                    placeholder: 'e.g. gucsyt-marcas-jePmi5',
                                  })}

                                  <div className="sm:col-span-2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                      Follow-up HSM Template Name (Out-of-24h Window)
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
                                      <Globe size={13} /> Webhook Callback URL:
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
                                    Configure this exact URL in your <strong>Meta App Dashboard &rarr; WhatsApp &rarr; Configuration &rarr; Callback URL</strong>, along with the Webhook Verify Token above.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 2. OpenAI / Azure Modal Body */}
                            {activeIntegrationModal === 'ai' && (
                              <div className="space-y-4">
                                <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs flex items-center gap-2.5 text-[var(--ink)]/80">
                                  <ShieldCheck size={16} className="text-purple-500 shrink-0" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Model Key Protection:</strong> AI API keys are encrypted in PostgreSQL &amp; hidden from demo viewers. Click <strong>Change</strong> to provide a new key.
                                  </p>
                                </div>

                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1.5">
                                    Provider Architecture
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
                                      Azure OpenAI Enterprise
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
                                      OpenAI Direct
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {renderSecretField('ai_key', aiProvider === 'azure' ? 'Azure OpenAI API Key' : 'OpenAI API Key', aiApiKey, setAiApiKey, {
                                    placeholder: aiProvider === 'azure' ? 'azure-openai-key-...' : 'sk-...',
                                  })}

                                  {aiProvider === 'azure' ? (
                                    <>
                                      <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                          Azure OpenAI Endpoint URL
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
                                <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs flex items-center gap-2.5 text-[var(--ink)]/80">
                                  <ShieldCheck size={16} className="text-sky-500 shrink-0" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Bot Token Protection:</strong> Telegram bot tokens and chat IDs are securely encrypted and masked from viewers.
                                  </p>
                                </div>

                                <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--ink)]">Enable Telegram Push Broadcast</p>
                                    <p className="text-[11px] text-[var(--ink)]/60">Dispatch instant notifications for qualified architectural leads</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextVal = !telegramEnabled;
                                      setTelegramEnabled(nextVal);
                                      handleUpdateSetting('telegram_enabled', nextVal);
                                    }}
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
                                  {renderSecretField('tg_token', 'Telegram Bot HTTP API Token', telegramBotToken, setTelegramBotToken, {
                                    placeholder: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
                                    onBlur: (val) => handleUpdateSetting('telegram_bot_token', val),
                                  })}

                                  {renderSecretField('tg_chat', 'Destination Chat or Channel ID', telegramChatId, setTelegramChatId, {
                                    placeholder: '-1001234567890 or @channelname',
                                    isIdField: true,
                                    onBlur: (val) => handleUpdateSetting('telegram_chat_id', val),
                                  })}
                                </div>

                                <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-1.5">
                                  <p className="font-semibold text-sky-600 dark:text-sky-400">Telegram 3-Step Setup Guide:</p>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    1. Message <span className="font-mono font-semibold">@BotFather</span> on Telegram to generate your HTTP token.<br />
                                    2. Add your new bot as an Administrator to your studio channel or lead alerts group.<br />
                                    3. Get your Chat ID using <span className="font-mono font-semibold">@userinfobot</span> and test the live connection below.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 4. Resend Email Modal Body */}
                            {activeIntegrationModal === 'email' && (
                              <div className="space-y-4">
                                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs flex items-center gap-2.5 text-[var(--ink)]/80">
                                  <ShieldCheck size={16} className="text-amber-500 shrink-0" />
                                  <p className="text-[11px] leading-relaxed">
                                    <strong>Email Key Protection:</strong> Resend transactional keys are encrypted and hidden from demo viewers.
                                  </p>
                                </div>

                                <div>
                                  {renderSecretField('resend_key', 'Resend API Key', resendApiKey, setResendApiKey, {
                                    placeholder: 're_123456789...',
                                  })}
                                </div>

                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                                    Alert Notification Destination Email
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
                                  <p className="font-semibold text-amber-600 dark:text-amber-400">Automated Delivery Matrix:</p>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    When an inbound inquiry scores ≥ 60% qualification, a branded architectural dossier is delivered directly to this inbox with budget, scope, and WhatsApp deep-link.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 5. Discord Modal Body */}
                            {activeIntegrationModal === 'discord' && (
                              <div className="space-y-4">
                                <div>
                                  {renderSecretField('discord_url', 'Discord Webhook URL', discordWebhookUrl, (val) => {
                                    setDiscordWebhookUrl(val);
                                    if (typeof window !== 'undefined') localStorage.setItem('studio_discord_webhook', val);
                                  }, {
                                    placeholder: 'https://discord.com/api/webhooks/1234567890/...',
                                  })}
                                </div>

                                <div className="p-3.5 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 text-xs space-y-1.5">
                                  <p className="font-semibold text-[#5865F2]">Discord Integration Guide:</p>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    1. In your Discord server, go to <strong>Server Settings &rarr; Integrations &rarr; Webhooks</strong>.<br />
                                    2. Click <strong>New Webhook</strong>, select your alerts channel, and click <strong>Copy Webhook URL</strong>.<br />
                                    3. Paste the URL above and click <strong>Test Connection</strong> to verify delivery.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 6. Facebook / Meta Ads Modal Body */}
                            {activeIntegrationModal === 'facebook' && (
                              <div className="space-y-4">
                                <div>
                                  {renderSecretField('fb_account', 'Meta Ad Account ID', facebookAdAccountId, (val) => {
                                    setFacebookAdAccountId(val);
                                    if (typeof window !== 'undefined') localStorage.setItem('studio_fb_account', val);
                                  }, {
                                    placeholder: 'act_1234567890',
                                    isIdField: true,
                                  })}
                                </div>

                                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-2">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                                    Instant Form Webhook Subscription:
                                  </span>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    For Click-to-WhatsApp ads and Facebook Instant Forms, ArchScale ingests inbound campaign parameters through <code className="font-mono bg-[var(--paper)] px-1 py-0.5 rounded border border-[var(--paper-line)]">/api/whatsapp/webhook</code>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 7. Google Workspace Modal Body */}
                            {activeIntegrationModal === 'google' && (
                              <div className="space-y-4">
                                <div>
                                  {renderSecretField('google_sheet', 'Google Apps Script Webhook URL', googleSheetUrl, (val) => {
                                    setGoogleSheetUrl(val);
                                    if (typeof window !== 'undefined') localStorage.setItem('studio_google_sheet', val);
                                  }, {
                                    placeholder: 'https://script.google.com/macros/s/.../exec',
                                  })}
                                </div>

                                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs space-y-1.5">
                                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">Google Sheets Sync Guide:</p>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    Deploy a standard Google Apps Script Web App that receives HTTP POST requests and appends incoming lead fields directly to your studio spreadsheet.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 8. Custom REST Webhook Modal Body */}
                            {activeIntegrationModal === 'webhooks' && (
                              <div className="space-y-4">
                                <div>
                                  {renderSecretField('custom_webhook', 'Outbound REST Webhook Endpoint URL', customWebhookUrl, (val) => {
                                    setCustomWebhookUrl(val);
                                    if (typeof window !== 'undefined') localStorage.setItem('studio_custom_webhook', val);
                                  }, {
                                    placeholder: 'https://hooks.zapier.com/hooks/catch/... or https://hook.eu1.make.com/...',
                                  })}
                                </div>

                                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs space-y-1">
                                  <p className="font-semibold text-indigo-600 dark:text-indigo-400">Zapier, Make &amp; n8n Dispatcher:</p>
                                  <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
                                    ArchScale sends real-time JSON payloads containing client contact info, LPI qualification score, budget tier, and summary whenever a lead completes discovery.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Modal Footer */}
                          <div className="p-4 sm:p-5 border-t border-[var(--paper-line)] bg-[var(--paper)]/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            {/* Connection Diagnostics Status */}
                            <div className="text-xs w-full sm:w-auto">
                              {testStatuses[activeIntegrationModal]?.loading && (
                                <span className="text-xs font-medium text-amber-500 animate-pulse flex items-center gap-1.5">
                                  <RefreshCw size={12} className="animate-spin" /> Verifying live connection...
                                </span>
                              )}
                              {testStatuses[activeIntegrationModal]?.success && (
                                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5">
                                  <CheckCircle2 size={13} /> {testStatuses[activeIntegrationModal].message}
                                </span>
                              )}
                              {testStatuses[activeIntegrationModal]?.error && (
                                <span className="text-xs font-medium text-rose-500 flex items-center gap-1.5">
                                  <AlertTriangle size={13} /> {testStatuses[activeIntegrationModal].error}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              {/* Test Button (Supported on meta, ai, telegram, email, discord, webhooks) */}
                              {['meta', 'ai', 'telegram', 'email', 'discord', 'webhooks'].includes(activeIntegrationModal) && (
                                <button
                                  type="button"
                                  disabled={
                                    testStatuses[activeIntegrationModal]?.loading ||
                                    (activeIntegrationModal === 'meta' && (!whatsappAccessToken || !whatsappPhoneNumberId)) ||
                                    (activeIntegrationModal === 'ai' && !aiApiKey) ||
                                    (activeIntegrationModal === 'telegram' && (!telegramBotToken || !telegramChatId)) ||
                                    (activeIntegrationModal === 'email' && !resendApiKey) ||
                                    (activeIntegrationModal === 'discord' && !discordWebhookUrl) ||
                                    (activeIntegrationModal === 'webhooks' && !customWebhookUrl)
                                  }
                                  onClick={() => handleTestIntegration(activeIntegrationModal as any)}
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

                              {/* Close Modal Button */}
                              <button
                                type="button"
                                onClick={() => setActiveIntegrationModal(null)}
                                className="px-3 py-2 rounded-xl border border-[var(--paper-line)] text-xs text-[var(--ink)]/70 hover:text-[var(--ink)] bg-[var(--paper)] cursor-pointer transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  <h3 className="font-semibold text-sm text-[var(--ink)]">Regional Time &amp; Localization</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 block mb-1">
                        Time Format
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--paper-line)]">
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('time_format', '12h')}
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
                          onClick={() => handleUpdateSetting('time_format', '24h')}
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
                        onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
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
                            handleUpdateSetting('qualification_threshold', val);
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
                            handleUpdateSetting('qualification_threshold', parseInt((e.target as HTMLInputElement).value));
                          }}
                          onTouchEnd={(e) => {
                            handleUpdateSetting('qualification_threshold', parseInt((e.target as HTMLInputElement).value));
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
                            handleUpdateSetting('qualification_threshold', preset.val);
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
                      onClick={() => handleUpdateSetting('discovery_interviewer_enabled', !discoveryInterviewerEnabled)}
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
                          onClick={() => handleUpdateSetting('returning_client_mode', mode.id)}
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
                        onChange={(e) => handleUpdateSetting('followup_interval_hours', parseInt(e.target.value) || 24)}
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
          )}

        </main>
      </div>

      {/* Real Lead Capture Modal */}
      {isLeadModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLeadModalOpen(false);
          }}
        >
          <div
            className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-base text-[var(--ink)]">Capture New Lead</h3>
                <p className="text-xs text-[var(--ink)]/60">Submit inquiry directly into the live AI qualification pipeline</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLeadModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCaptureLead} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                  Client / Lead Name
                </label>
                <input
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Sampod or Architecture Client"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                    Contact (Phone / Email)
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadContact}
                    onChange={(e) => setNewLeadContact(e.target.value)}
                    placeholder="+8801645512513"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                    Channel Source
                  </label>
                  <select
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="web">Web Landing Page Brief</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                  Client Inquiry Brief
                </label>
                <textarea
                  required
                  rows={3}
                  value={newLeadMessage}
                  onChange={(e) => setNewLeadMessage(e.target.value)}
                  placeholder="Project specifications, typology, or budget details..."
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-raised)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="px-5 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmittingLead ? 'Processing AI...' : 'Submit & Qualify Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
