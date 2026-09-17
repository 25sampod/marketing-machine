'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';
import { Menu, Plus, Clock, Sun, Moon, LogOut, CheckCircle2, X } from 'lucide-react';
import { formatStudioTime } from '@/lib/formatTime';

import {
  DashboardView,
  Lead,
  TeamMember,
  MetricsStrip,
  Sidebar,
  PipelineView,
  KanbanView,
  SheetView,
  AnalyticsView,
  KnowledgeView,
  TeamView,
  SettingsView,
  PlatformView,
  LeadCaptureModal,
} from '@/components/dashboard';
import ArchScaleLogo from '@/components/ArchScaleLogo';

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
  const [isHydrated, setIsHydrated] = useState(false);

  // Time & Display settings (synced with studio settings)
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timezone, setTimezone] = useState<string>('Asia/Dhaka');
  const [qualificationThreshold, setQualificationThreshold] = useState<number>(70);

  // Lead Capture Modal
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Follow-Up Sweep Cron execution state
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [sweepResultToast, setSweepResultToast] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: Array<{ leadId: string; name: string; action: string; note?: string }>;
  } | null>(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let initialLeadId: string | null = null;

    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('studio_time_format') as '12h' | '24h' | null;
      if (savedFormat) setTimeFormat(savedFormat);
      const savedTz = localStorage.getItem('studio_timezone');
      if (savedTz) setTimezone(savedTz);

      // Restore view from URL query params or localStorage
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view') as DashboardView | null;
      const validViews: DashboardView[] = ['pipeline', 'kanban', 'sheet', 'analytics', 'knowledge', 'team', 'settings', 'platform'];
      const savedView = (urlView && validViews.includes(urlView))
        ? urlView
        : (localStorage.getItem('archscale_dashboard_view') as DashboardView | null);

      if (savedView && validViews.includes(savedView)) {
        setCurrentView(savedView);
      }

      // Restore selected lead from URL or localStorage
      const urlLeadId = params.get('lead');
      initialLeadId = urlLeadId || localStorage.getItem('archscale_selected_lead_id');
      setIsHydrated(true);
    }

    fetchInitialData(initialLeadId);

    const leadChannel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => (l.id === payload.new.id ? (payload.new as Lead) : l)));
          setSelectedLead((prev) => (prev?.id === payload.new.id ? (payload.new as Lead) : prev));
        }
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('public:studio_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_settings' }, (payload) => {
        if (payload.new) {
          const s = payload.new as any;
          if (typeof s.qualification_threshold === 'number') setQualificationThreshold(s.qualification_threshold);
          if (s.time_format) setTimeFormat(s.time_format);
          if (s.timezone) setTimezone(s.timezone);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // Sync active view and selected lead to URL search params and localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;

    try {
      localStorage.setItem('archscale_dashboard_view', currentView);
      if (selectedLead?.id) {
        localStorage.setItem('archscale_selected_lead_id', selectedLead.id);
      }
    } catch (e) {}

    const params = new URLSearchParams(window.location.search);
    params.set('view', currentView);

    if (currentView === 'pipeline' && selectedLead?.id) {
      params.set('lead', selectedLead.id);
    } else {
      params.delete('lead');
    }

    if (currentView !== 'settings') {
      params.delete('tab');
    }

    const newQuery = params.toString();
    const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [currentView, selectedLead?.id, isHydrated]);

  // Handle browser Back / Forward navigation via popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view') as DashboardView | null;
      const validViews: DashboardView[] = ['pipeline', 'kanban', 'sheet', 'analytics', 'knowledge', 'team', 'settings', 'platform'];
      if (urlView && validViews.includes(urlView)) {
        setCurrentView(urlView);
      }
      const urlLeadId = params.get('lead');
      if (urlLeadId) {
        setSelectedLead((prev) => {
          if (prev?.id === urlLeadId) return prev;
          const found = leads.find((l) => l.id === urlLeadId);
          return found || prev;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [leads]);

  const fetchInitialData = async (targetLeadId?: string | null) => {
    // 1. Current user session
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('archscale_has_session', 'true');
      } catch (e) {}
    }

    // 2. Leads data
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (leadsData && leadsData.length > 0) {
      setLeads(leadsData);

      const effectiveLeadId = targetLeadId || (typeof window !== 'undefined' ? localStorage.getItem('archscale_selected_lead_id') : null);
      let leadToSelect: Lead | undefined;
      if (effectiveLeadId) {
        leadToSelect = leadsData.find((l) => l.id === effectiveLeadId);
      }
      if (!leadToSelect) {
        leadToSelect = leadsData[0];
      }

      setSelectedLead((prev) => {
        if (prev && leadsData.some((l) => l.id === prev.id)) {
          return leadsData.find((l) => l.id === prev.id) || prev;
        }
        return leadToSelect || null;
      });
    }

    // 3. Team & members
    try {
      const teamUrl = user?.id && user?.email
        ? `/api/teams?userId=${user.id}&email=${encodeURIComponent(user.email)}`
        : '/api/teams';
      const res = await fetch(teamUrl);
      const teamRes = await res.json();
      if (teamRes?.team) setTeam(teamRes.team);
      if (teamRes?.members && teamRes.members.length > 0) {
        setTeamMembers(teamRes.members);
      } else {
        const { data: teamData } = await supabase.from('team_members').select('*');
        if (teamData && teamData.length > 0) {
          setTeamMembers(teamData);
        }
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    }

    // 4. Basic Studio Time & Threshold defaults
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data?.settings) {
        if (data.settings.timeFormat) setTimeFormat(data.settings.timeFormat);
        if (data.settings.timezone) setTimezone(data.settings.timezone);
        if (typeof data.settings.qualificationThreshold === 'number') {
          setQualificationThreshold(data.settings.qualificationThreshold);
        }
        if (data.settings.studioName) {
          setTeam((prev: any) => ({
            ...prev,
            name: data.settings.studioName,
            slug: data.settings.studioSlug || prev?.slug || 'archscale',
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load initial studio settings:', err);
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
      fetchInitialData();
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

  // Funnel & KPI counts
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
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            <ArchScaleLogo className="w-7 h-7 rounded-lg" size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-[var(--ink)] truncate max-w-[150px] sm:max-w-none">
                  {team?.name || 'Scale Studio'}
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

      {/* Sweep Notification Banner */}
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

      {/* App Body Container */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* Sidebar */}
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
          knowledgeBaseActive={true}
          onSignOut={handleSignOut}
        />

        {/* Dynamic Workspace Work Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--paper)]">
          <MetricsStrip
            totalLeadsCount={totalLeadsCount}
            qualifiedCount={qualifiedCount}
            qualificationThreshold={qualificationThreshold}
            bookedCount={bookedCount}
            wonCount={wonCount}
          />

          <div className="flex-1 min-h-0 overflow-y-auto relative custom-scrollbar">
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
              />
            )}

            {currentView === 'knowledge' && (
              <KnowledgeView
                studioId="default"
              />
            )}

            {currentView === 'team' && (
              <TeamView
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                team={team}
                onTeamUpdate={(updatedTeam) => setTeam(updatedTeam)}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                studioId="default"
                studioName={team?.name || 'Scale Studio'}
                studioSlug={team?.slug || 'scale'}
                onTimeSettingsChange={(format, tz) => {
                  setTimeFormat(format);
                  setTimezone(tz);
                }}
                onThresholdChange={(threshold) => {
                  setQualificationThreshold(threshold);
                }}
                onStudioNameChange={(name, slug) => {
                  setTeam((prev: any) => ({
                    ...prev,
                    name,
                    slug: slug || prev?.slug || 'archscale',
                  }));
                }}
              />
            )}

            {currentView === 'platform' && (
              <PlatformView />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <LeadCaptureModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onLeadCaptured={fetchInitialData}
      />
    </div>
  );
}
