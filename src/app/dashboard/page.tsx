'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';
import { Menu, Plus, Clock, Sun, Moon, LogOut, CheckCircle2, X } from 'lucide-react';
import { formatStudioTime } from '@/lib/formatTime';

import { DashboardView, SettingsTab, Lead, TeamMember, ModularKnowledgeItem } from '@/components/dashboard/types';
import MetricsStrip from '@/components/dashboard/MetricsStrip';
import Sidebar from '@/components/dashboard/Sidebar';
import PipelineView from '@/components/dashboard/PipelineView';
import KanbanView from '@/components/dashboard/KanbanView';
import SheetView from '@/components/dashboard/SheetView';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import KnowledgeView from '@/components/dashboard/KnowledgeView';
import TeamView from '@/components/dashboard/TeamView';
import SettingsView from '@/components/dashboard/SettingsView';
import { LeadCaptureModal } from '@/components/dashboard/modals/LeadCaptureModal';
import { KnowledgeItemModal } from '@/components/dashboard/modals/KnowledgeItemModal';

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Navigation & View state
  const [currentView, setCurrentView] = useState<DashboardView>('pipeline');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Studio Settings state
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

  // Integration test connection feedback state
  const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean; success?: boolean; message?: string; error?: string }>>({});
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [integrationsSavedToast, setIntegrationsSavedToast] = useState(false);

  // Studio Knowledge Base State
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [knowledgeSavedToast, setKnowledgeSavedToast] = useState(false);

  // Modular Knowledge Base State
  const [modularItems, setModularItems] = useState<ModularKnowledgeItem[]>([]);
  const [isLoadingModular, setIsLoadingModular] = useState(false);
  const [isModularModalOpen, setIsModularModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModularKnowledgeItem | null>(null);
  const [isSavingModularItem, setIsSavingModularItem] = useState(false);
  const [isSplittingRaw, setIsSplittingRaw] = useState(false);
  const [modularToast, setModularToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Lead Capture Modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Cron execution state & real-time feedback
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [sweepResultToast, setSweepResultToast] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: Array<{ leadId: string; name: string; action: string; note?: string }>;
  } | null>(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('studio_time_format') as '12h' | '24h' | null;
      if (savedFormat) setTimeFormat(savedFormat);
      const savedTz = localStorage.getItem('studio_timezone');
      if (savedTz) setTimezone(savedTz);
    }

    fetchData();

    const leadChannel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => (l.id === payload.new.id ? (payload.new as Lead) : l)));
          if (selectedLead?.id === payload.new.id) {
            setSelectedLead(payload.new as Lead);
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
        if (settings.whatsappPhoneNumberId) setWhatsappPhoneNumberId(settings.whatsappPhoneNumberId);
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
        if (settingsData.telegram_bot_token) setTelegramBotToken('••••••••••••••••••••••••');
        if (settingsData.telegram_chat_id) setTelegramChatId('••••••••••••••••');
        if (settingsData.telegram_enabled !== undefined) setTelegramEnabled(Boolean(settingsData.telegram_enabled));
        if (settingsData.followup_interval_hours) setFollowupIntervalHours(settingsData.followup_interval_hours);
        if (typeof settingsData.qualification_threshold === 'number') setQualificationThreshold(settingsData.qualification_threshold);

        if (settingsData.whatsapp_phone_number_id) setWhatsappPhoneNumberId('••••••••••••••••');
        if (settingsData.whatsapp_access_token) setWhatsappAccessToken('••••••••••••••••••••••••');
        if (settingsData.whatsapp_business_account_id) setWhatsappBusinessAccountId('••••••••••••••••');
        if (settingsData.meta_app_secret) setMetaAppSecret('••••••••••••••••');
        if (settingsData.whatsapp_verify_token) setWhatsappVerifyToken('••••••••••••••••');
        if (settingsData.whatsapp_followup_template_name) setWhatsappFollowupTemplateName(settingsData.whatsapp_followup_template_name);

        if (settingsData.ai_provider) setAiProvider(settingsData.ai_provider);
        if (settingsData.ai_api_key) setAiApiKey('••••••••••••••••••••••••');
        if (settingsData.ai_endpoint) setAiEndpoint(settingsData.ai_endpoint);
        if (settingsData.ai_deployment_name) setAiDeploymentName(settingsData.ai_deployment_name);
        if (settingsData.ai_api_version) setAiApiVersion(settingsData.ai_api_version);

        if (settingsData.resend_api_key) setResendApiKey('••••••••••••••••••••••••');
        if (settingsData.notification_email) setNotificationEmail(settingsData.notification_email);
      }
    }
    await fetchModularItems();
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

  const handleSaveIntegrationSettings = async (draftInputs: Record<string, string> = {}) => {
    setIsSavingIntegrations(true);
    try {
      const payload: Record<string, any> = {
        ai_provider: aiProvider,
        ai_deployment_name: aiDeploymentName.trim() || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano'),
        ai_api_version: aiApiVersion.trim() || '2024-12-01-preview',
        whatsapp_followup_template_name: whatsappFollowupTemplateName.trim() || 'lead_reengagement',
        telegram_enabled: telegramEnabled,
        notification_email: notificationEmail.trim() || null,
      };

      if (aiEndpoint && !aiEndpoint.includes('••')) {
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
        if (s.telegramBotToken) setTelegramBotToken(s.telegramBotToken);
        if (s.telegramChatId) setTelegramChatId(s.telegramChatId);
        if (s.resendApiKey) setResendApiKey(s.resendApiKey);

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

  const handleTestIntegration = async (
    type: 'meta' | 'ai' | 'telegram' | 'email' | 'discord' | 'webhooks' | 'google',
    draftInputs: Record<string, string> = {}
  ) => {
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
          endpoint: aiEndpoint || undefined,
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
          webhookUrl: draftInputs['discord_url'] !== undefined ? draftInputs['discord_url'] : undefined,
        };
      } else if (type === 'webhooks') {
        config = {
          targetUrl: draftInputs['custom_webhook'] !== undefined ? draftInputs['custom_webhook'] : undefined,
        };
      } else if (type === 'google') {
        config = {
          scriptUrl: draftInputs['google_sheet'] !== undefined ? draftInputs['google_sheet'] : undefined,
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

  const fetchModularItems = async () => {
    try {
      setIsLoadingModular(true);
      const res = await fetch('/api/knowledge?studioId=default');
      const data = await res.json();
      if (data.items) {
        setModularItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch modular knowledge items:', err);
    } finally {
      setIsLoadingModular(false);
    }
  };

  const handleAutoSplitRaw = async () => {
    if (isSplittingRaw) return;
    setIsSplittingRaw(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split_from_raw',
          studioId: 'default',
          rawText: knowledgeBase || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to auto-split knowledge base');
      }
      setModularToast({
        type: 'success',
        message: data.message || `Successfully generated ${data.items?.length || 0} modular knowledge sections!`,
      });
      setTimeout(() => setModularToast(null), 4500);
      await fetchModularItems();
    } catch (err: any) {
      console.error('Error auto-splitting knowledge base:', err);
      setModularToast({
        type: 'error',
        message: err.message || 'Error auto-splitting raw knowledge',
      });
      setTimeout(() => setModularToast(null), 4500);
    } finally {
      setIsSplittingRaw(false);
    }
  };

  const handleOpenCreateItem = (defaultCategory: any = 'catalog') => {
    setEditingItem({
      category: ['overview', 'catalog', 'pricing_delivery', 'policies', 'faq'].includes(defaultCategory)
        ? defaultCategory
        : 'catalog',
      title: '',
      content: '',
      tags: [],
      tagsInput: '',
      is_active: true,
    });
    setIsModularModalOpen(true);
  };

  const handleOpenEditItem = (item: ModularKnowledgeItem) => {
    setEditingItem({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags || [],
      tagsInput: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      is_active: item.is_active !== false,
    });
    setIsModularModalOpen(true);
  };

  const handleSaveModularItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) {
      alert('Title and Content are required.');
      return;
    }
    setIsSavingModularItem(true);
    try {
      const method = editingItem.id ? 'PUT' : 'POST';
      const cleanTags = editingItem.tagsInput
        ? editingItem.tagsInput.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : editingItem.tags || [];

      const payload: any = {
        studioId: 'default',
        category: editingItem.category,
        title: editingItem.title.trim(),
        content: editingItem.content.trim(),
        tags: cleanTags,
        is_active: editingItem.is_active,
      };
      if (editingItem.id) {
        payload.id = editingItem.id;
      }

      const res = await fetch('/api/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save knowledge section');
      }

      setModularToast({
        type: 'success',
        message: editingItem.id ? 'Knowledge section updated!' : 'Knowledge section created!',
      });
      setTimeout(() => setModularToast(null), 3000);
      setIsModularModalOpen(false);
      setEditingItem(null);
      await fetchModularItems();
    } catch (err: any) {
      console.error('Error saving modular item:', err);
      alert(err.message || 'Failed to save modular item');
    } finally {
      setIsSavingModularItem(false);
    }
  };

  const handleDeleteModularItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete section');
      }
      setModularToast({
        type: 'success',
        message: `Deleted "${title}" successfully.`,
      });
      setTimeout(() => setModularToast(null), 3000);
      await fetchModularItems();
    } catch (err: any) {
      console.error('Error deleting modular item:', err);
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleToggleModularActive = async (item: ModularKnowledgeItem) => {
    try {
      const nextActive = !item.is_active;
      setModularItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextActive } : i)));

      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update active state');
      }
    } catch (err: any) {
      console.error('Error toggling active state:', err);
      await fetchModularItems();
    }
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

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('archscale_has_session');
      } catch (e) {}
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Funnel and Analytics Aggregations
  const totalLeadsCount = leads.length;
  const qualifiedCount = leads.filter((l) =>
    l.status === 'qualified' ||
    l.status === 'consultation_booked' ||
    l.status === 'consult_booked' ||
    l.status === 'converted' ||
    l.status === 'won' ||
    (l.score ?? l.qualification_percentage ?? 0) >= qualificationThreshold
  ).length;
  const bookedCount = leads.filter((l) =>
    l.status === 'consultation_booked' ||
    l.status === 'consult_booked' ||
    l.status === 'converted' ||
    l.status === 'won'
  ).length;
  const wonCount = leads.filter((l) => l.status === 'converted' || l.status === 'won').length;

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
        
        {/* Modular Sidebar Component */}
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          leadsCount={leads.length}
          teamMembers={teamMembers}
          currentUser={currentUser}
          knowledgeBaseActive={Boolean(knowledgeBase?.trim() || modularItems.some((i) => i.is_active))}
          onSignOut={handleSignOut}
        />

        {/* Main Work Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--paper)]">
          {/* Top Metrics Strip Component */}
          <MetricsStrip
            totalLeadsCount={totalLeadsCount}
            qualifiedCount={qualifiedCount}
            qualificationThreshold={qualificationThreshold}
            bookedCount={bookedCount}
            wonCount={wonCount}
          />

          {/* Dynamic View Switcher */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {currentView === 'pipeline' && (
              <PipelineView
                leads={leads}
                setLeads={setLeads}
                selectedLead={selectedLead}
                setSelectedLead={setSelectedLead}
                teamMembers={teamMembers}
                timeFormat={timeFormat}
                timezone={timezone}
                qualificationThreshold={qualificationThreshold}
                currentUser={currentUser}
              />
            )}

            {currentView === 'kanban' && (
              <KanbanView
                leads={leads}
                teamMembers={teamMembers}
                timeFormat={timeFormat}
                timezone={timezone}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onSelectLead={(lead) => {
                  setSelectedLead(lead);
                  setCurrentView('pipeline');
                }}
              />
            )}

            {currentView === 'sheet' && (
              <SheetView
                leads={leads}
                teamMembers={teamMembers}
                timeFormat={timeFormat}
                timezone={timezone}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onUpdateLeadAssignee={handleUpdateLeadAssignee}
                onOpenLeadChat={(lead) => {
                  setSelectedLead(lead);
                  setCurrentView('pipeline');
                }}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView
                leads={leads}
                qualificationThreshold={qualificationThreshold}
                whatsappPhoneNumberId={whatsappPhoneNumberId}
              />
            )}

            {currentView === 'knowledge' && (
              <KnowledgeView
                modularItems={modularItems}
                isLoadingModular={isLoadingModular}
                isSplittingRaw={isSplittingRaw}
                onAutoSplitRaw={handleAutoSplitRaw}
                onOpenCreateItem={handleOpenCreateItem}
                onOpenEditItem={handleOpenEditItem}
                onToggleModularActive={handleToggleModularActive}
                onDeleteModularItem={handleDeleteModularItem}
                knowledgeBase={knowledgeBase}
                setKnowledgeBase={setKnowledgeBase}
                onSaveKnowledge={handleSaveKnowledge}
                isSavingKnowledge={isSavingKnowledge}
                knowledgeSavedToast={knowledgeSavedToast}
                modularToast={modularToast}
                setModularToast={setModularToast}
              />
            )}

            {currentView === 'team' && (
              <TeamView
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                team={team}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                whatsappPhoneNumberId={whatsappPhoneNumberId}
                setWhatsappPhoneNumberId={setWhatsappPhoneNumberId}
                whatsappAccessToken={whatsappAccessToken}
                setWhatsappAccessToken={setWhatsappAccessToken}
                whatsappBusinessAccountId={whatsappBusinessAccountId}
                setWhatsappBusinessAccountId={setWhatsappBusinessAccountId}
                metaAppSecret={metaAppSecret}
                setMetaAppSecret={setMetaAppSecret}
                whatsappVerifyToken={whatsappVerifyToken}
                setWhatsappVerifyToken={setWhatsappVerifyToken}
                whatsappFollowupTemplateName={whatsappFollowupTemplateName}
                setWhatsappFollowupTemplateName={setWhatsappFollowupTemplateName}
                aiProvider={aiProvider}
                setAiProvider={setAiProvider}
                aiApiKey={aiApiKey}
                setAiApiKey={setAiApiKey}
                aiEndpoint={aiEndpoint}
                setAiEndpoint={setAiEndpoint}
                aiDeploymentName={aiDeploymentName}
                setAiDeploymentName={setAiDeploymentName}
                aiApiVersion={aiApiVersion}
                setAiApiVersion={setAiApiVersion}
                resendApiKey={resendApiKey}
                setResendApiKey={setResendApiKey}
                notificationEmail={notificationEmail}
                setNotificationEmail={setNotificationEmail}
                telegramBotToken={telegramBotToken}
                setTelegramBotToken={setTelegramBotToken}
                telegramChatId={telegramChatId}
                setTelegramChatId={setTelegramChatId}
                telegramEnabled={telegramEnabled}
                setTelegramEnabled={setTelegramEnabled}
                autoReplyEnabled={autoReplyEnabled}
                setAutoReplyEnabled={setAutoReplyEnabled}
                emailAlertsEnabled={emailAlertsEnabled}
                setEmailAlertsEnabled={setEmailAlertsEnabled}
                discoveryInterviewerEnabled={discoveryInterviewerEnabled}
                setDiscoveryInterviewerEnabled={setDiscoveryInterviewerEnabled}
                returningClientMode={returningClientMode}
                setReturningClientMode={setReturningClientMode}
                timeFormat={timeFormat}
                setTimeFormat={setTimeFormat}
                timezone={timezone}
                setTimezone={setTimezone}
                followupIntervalHours={followupIntervalHours}
                setFollowupIntervalHours={setFollowupIntervalHours}
                qualificationThreshold={qualificationThreshold}
                setQualificationThreshold={setQualificationThreshold}
                studioName={team?.name || 'ArchScale Architecture Studio'}
                studioSlug={team?.slug || 'archscale'}
                onUpdateSetting={handleUpdateSetting}
                onSaveIntegrationSettings={handleSaveIntegrationSettings}
                isSavingIntegrations={isSavingIntegrations}
                integrationsSavedToast={integrationsSavedToast}
                testStatuses={testStatuses}
                onTestIntegration={handleTestIntegration}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <LeadCaptureModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onLeadCaptured={fetchData}
      />

      <KnowledgeItemModal
        isOpen={isModularModalOpen}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        onClose={() => setIsModularModalOpen(false)}
        onSave={handleSaveModularItem}
        isSaving={isSavingModularItem}
      />
    </div>
  );
}
