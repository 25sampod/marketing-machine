'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ChatInbox from '@/components/ChatInbox';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Users, Filter, CheckCircle2, MessageSquare, Plus, Activity, Clock, 
  ArrowLeft, Sun, Moon, LogOut, Copy, Check, UserPlus, X, Shield, SlidersHorizontal, Sparkles 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'budget'>('match');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'review'>('all');
  
  // Modular studio settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  
  // Team invite modal state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('Commercial');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real Lead Capture modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('Sampod');
  const [newLeadContact, setNewLeadContact] = useState('+8801645512513');
  const [newLeadMessage, setNewLeadMessage] = useState('Hi, looking to design a modern commercial office. Budget is $150,000.');
  const [newLeadSource, setNewLeadSource] = useState<'whatsapp' | 'web'>('whatsapp');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchData();

    const leadChannel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => l.id === payload.new.id ? payload.new : l));
          if (selectedLead?.id === payload.new.id) {
            setSelectedLead(payload.new);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadChannel);
    };
  }, []);

  const fetchData = async () => {
    // 1. Get current logged in user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Fetch leads
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (leadsData) setLeads(leadsData);

    // 3. Fetch user's team & members
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
      // Fallback team for preview when not authenticated
      const { data: teamData } = await supabase.from('team_members').select('*');
      if (teamData && teamData.length > 0) {
        setTeamMembers(teamData);
      } else {
        setTeamMembers([
          { id: '1', name: 'Sampod', email: '25sampod@gmail.com', contact: '25sampod@gmail.com', role: 'owner', specialty: 'Master Planning & Architecture', status: 'active' },
        ]);
      }
    }
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
          specialty: inviteSpecialty,
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setTeamMembers((prev) => [...prev, data.member]);
        setInviteEmail('');
        setInviteName('');
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
    const code = team?.invite_code || 'archscale';
    const link = `${origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getAssigneeName = (id: string) => {
    if (!id) return 'Unassigned';
    return teamMembers.find(t => t.id === id)?.name || 'Specialist Partner';
  };

  const triggerCron = async () => {
    try {
      const res = await fetch('/api/cron/followup', {
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` }
      });
      const data = await res.json();
      alert(data.message || `Follow-up Cron: Checked leads and sent ${data.followUpCount || 0} automated messages!`);
    } catch (e) {
      alert('Error executing follow-up cron.');
    }
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

  // Filter and sort leads by priority and active tab
  const filteredLeads = leads
    .filter((lead) => {
      if (activeFilter === 'mine' && currentUser) {
        const myMember = teamMembers.find(m => m.user_id === currentUser.id || m.email === currentUser.email);
        if (!myMember || lead.assigned_to !== myMember.id) return false;
      }
      if (priorityFilter === 'high') {
        return (lead.qualification_percentage || 0) >= 70 || lead.status === 'qualified';
      }
      if (priorityFilter === 'review') {
        return (lead.qualification_percentage || 0) < 70 && lead.status !== 'qualified';
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'match') {
        const scoreDiff = (b.qualification_percentage || 0) - (a.qualification_percentage || 0);
        if (scoreDiff !== 0) return scoreDiff;
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

  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;
  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--text-on-paper)] flex flex-col font-sans">
      
      {/* Top Bar Navigation */}
      <header className="min-h-16 border-b border-[var(--paper-line)] bg-[var(--paper-raised)]/80 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ink)]/70 hover:text-[var(--ink)] transition-colors px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:border-[var(--amber)]/40 shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Public Landing Page</span>
            <span className="sm:hidden">Landing</span>
          </Link>

          <div className="h-4 w-px bg-[var(--paper-line)] hidden xs:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded bg-[var(--amber)] text-[var(--text-on-amber)] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              AS
            </span>
            <span className="font-display font-semibold text-xs sm:text-sm tracking-tight text-[var(--ink)] truncate max-w-[130px] xs:max-w-none">
              {team?.name || 'ArchScale Studio'}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60 uppercase">
              AS-05
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Team Roster Button */}
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="text-xs font-medium flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Users size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
            <span className="hidden sm:inline">Team Specialists</span>
            <span className="sm:hidden">Team</span>
            <span className="text-[10px] font-mono px-1 rounded bg-[var(--paper-line)]">
              {teamMembers.length}
            </span>
          </button>

          {/* Automation Controls Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-xs font-medium flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <SlidersHorizontal size={13} className="text-sky-500" />
            <span className="hidden sm:inline">Automations</span>
            <span className="sm:hidden">Settings</span>
          </button>

          {/* Platform Telemetry Link */}
          <Link
            href="/dashboard/platform"
            className="text-xs font-medium flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <Activity size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">Platform Health</span>
            <span className="sm:hidden">Health</span>
          </Link>

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
            className="text-xs font-medium flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Clock size={13} />
            <span className="hidden xs:inline">Run Cron</span>
            <span className="xs:hidden">Cron</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] flex items-center justify-center text-[var(--ink)] cursor-pointer shrink-0"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={handleSignOut}
              title={`Sign out (${currentUser.email})`}
              className="w-8 h-8 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500 flex items-center justify-center text-[var(--ink)]/70 cursor-pointer shrink-0 transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Metrics Banner */}
      <div className="border-b border-[var(--paper-line)] bg-[var(--paper)] px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
            <p className="text-[11px] font-mono text-[var(--ink)]/60 uppercase">Studio Inbound</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)] mt-0.5">{leads.length}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
            <p className="text-[11px] font-mono text-[var(--ink)]/60 uppercase">Active Intake (New)</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-sky-500 mt-0.5">{newCount}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
            <p className="text-[11px] font-mono text-[var(--ink)]/60 uppercase">AI Qualified Leads</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-500 mt-0.5">{qualifiedCount}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
            <p className="text-[11px] font-mono text-[var(--ink)]/60 uppercase">Pipeline Health</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--amber-deep)] dark:text-[var(--amber)] mt-0.5">
              {leads.length > 0 ? Math.round((qualifiedCount / leads.length) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-6 max-w-7xl w-full mx-auto min-h-0">
        
        {/* Leads Table */}
        <div className="flex-1 flex flex-col bg-[var(--paper-raised)] rounded-2xl shadow-xs border border-[var(--paper-line)] overflow-hidden min-w-0">
          <div className="p-4 border-b border-[var(--paper-line)] flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--paper)] gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-base text-[var(--ink)]">Inbound Lead Pipeline</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">Prioritized by Azure OpenAI lead readiness percentage</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority Filter */}
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
                  onClick={() => setPriorityFilter('high')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    priorityFilter === 'high'
                      ? 'bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  High (≥70%)
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('review')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    priorityFilter === 'review'
                      ? 'bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  Review (&lt;70%)
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort leads"
                className="text-xs font-mono border border-[var(--paper-line)] bg-[var(--paper)] rounded-lg px-2.5 py-1 text-[var(--ink)] cursor-pointer focus:outline-none focus:border-[var(--amber)]"
              >
                <option value="match">Sort: Highest Match %</option>
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

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[700px] w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--paper-raised)] text-[var(--ink)]/60 font-mono text-[11px] sticky top-0 z-10 border-b border-[var(--paper-line)]">
                <tr>
                  <th className="p-3.5 font-medium">Lead Client</th>
                  <th className="p-3.5 font-medium">Scope &amp; Budget</th>
                  <th className="p-3.5 font-medium">Source</th>
                  <th className="p-3.5 font-medium">AI Qualification</th>
                  <th className="p-3.5 font-medium">Assigned Partner</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--paper-line)]">
                {filteredLeads.map((lead) => {
                  const pct = lead.qualification_percentage || (lead.score >= 2 ? 80 : lead.score === 1 ? 50 : 20);
                  const isUrgent = lead.priority_tier === 'urgent' || pct >= 85;
                  const isHigh = lead.priority_tier === 'high' || (pct >= 70 && !isUrgent);

                  const matchColor = isUrgent
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : isHigh
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : pct >= 40
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-[var(--paper)] border-[var(--paper-line)] text-[var(--ink)]/60';

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id
                          ? 'bg-[var(--amber)]/10 font-medium'
                          : 'hover:bg-[var(--paper)]'
                      }`}
                    >
                      <td className="p-3.5">
                        <p className="font-semibold text-[var(--ink)]">{lead.name}</p>
                        <p className="text-xs text-[var(--ink)]/50 font-mono">{lead.contact}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="text-xs text-[var(--ink)]/85 font-medium">
                          {lead.project_type || 'Pending Extraction'}
                        </p>
                        {lead.estimated_budget ? (
                          <p className="text-[11px] font-mono text-[var(--amber-deep)] dark:text-[var(--amber)] mt-0.5">
                            {lead.estimated_budget}
                          </p>
                        ) : lead.budget_mentioned ? (
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Budget Mentioned
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize font-mono text-xs px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${matchColor}`}>
                              {pct}%
                            </span>
                            <span className="text-[10px] uppercase font-mono tracking-tight opacity-70">
                              {lead.priority_tier || (pct >= 70 ? 'High' : pct >= 40 ? 'Med' : 'Low')}
                            </span>
                          </div>
                          {lead.ai_summary && (
                            <p className="text-[10px] text-[var(--ink)]/55 font-mono max-w-[180px] truncate" title={lead.ai_summary}>
                              {lead.ai_summary}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[var(--amber)]/20 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center text-[10px] font-bold font-mono">
                            {getAssigneeName(lead.assigned_to).charAt(0)}
                          </div>
                          <span className="text-xs text-[var(--ink)]/80">{getAssigneeName(lead.assigned_to)}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                          lead.status === 'qualified'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : lead.status === 'contacted'
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                            : 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-[var(--ink)]/50 font-mono">
                        {lead.last_contacted_at
                          ? format(new Date(lead.last_contacted_at), 'HH:mm')
                          : format(new Date(lead.created_at), 'HH:mm')}
                      </td>
                    </tr>
                  );
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[var(--ink)]/50">
                      {activeFilter === 'mine' 
                        ? 'No leads currently assigned to you.' 
                        : 'No inquiries match the current filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WhatsApp Chat Inbox Console */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <ChatInbox lead={selectedLead} />
        </div>

      </div>

      {/* Team Roster & Invite Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base text-[var(--ink)]">
                    {team?.name || 'Studio Specialists'}
                  </h3>
                  <p className="text-xs text-[var(--ink)]/60">Manage specialist partners &amp; invitations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-[var(--paper-line)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Shareable Invite Link Box */}
              <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-[var(--ink)]/70 font-medium">Shareable Studio Invite Link</span>
                  {copiedLink && (
                    <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                      <Check size={11} /> Copied!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://scale.sampod.site'}/join/${team?.invite_code || 'arch8899'}`}
                    className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)]/70 select-all"
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="px-3 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Specialist Invite Form */}
              <form onSubmit={handleInvite} className="p-4 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] space-y-3">
                <p className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <UserPlus size={14} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                  <span>Invite New Specialist Partner</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Partner name (e.g. David)"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
                  />
                  <input
                    type="email"
                    required
                    placeholder="partner@studio.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={inviteSpecialty}
                    onChange={(e) => setInviteSpecialty(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                  >
                    <option value="Commercial">Commercial Architecture</option>
                    <option value="Residential">High-End Residential</option>
                    <option value="Renovation">Turnkey Renovation</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invite'}
                  </button>
                </div>
              </form>

              {/* Current Members List */}
              <div className="space-y-2">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--ink)]/50">Active Team Roster</p>
                <div className="divide-y divide-[var(--paper-line)] border border-[var(--paper-line)] rounded-xl bg-[var(--paper)] overflow-hidden">
                  {teamMembers.map((member) => {
                    const emailDisplay = member.email || member.contact || '25sampod@gmail.com';
                    const initial = (member.name || emailDisplay || 'S').charAt(0).toUpperCase();
                    return (
                      <div key={member.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center font-bold font-mono text-[11px]">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--ink)]">{member.name || emailDisplay}</p>
                            <p className="text-[10px] text-[var(--ink)]/50 font-mono">{emailDisplay}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--paper-raised)] border border-[var(--paper-line)] text-[var(--ink)]/70">
                            {member.specialty || member.role || 'Specialist'}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Specialist" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Lead Capture Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-base text-[var(--ink)]">Capture New Lead</h3>
                <p className="text-xs text-[var(--ink)]/60">Submit an inquiry directly into the live AI qualification pipeline</p>
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
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink)]/60 mb-1">
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
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                    Contact (Phone / Email)
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadContact}
                    onChange={(e) => setNewLeadContact(e.target.value)}
                    placeholder="+8801645512513"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink)]/60 mb-1">
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
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink)]/60 mb-1">
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

      {/* Modular Studio Automation Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-base text-[var(--ink)]">Studio Automation Settings</h3>
                <p className="text-xs text-[var(--ink)]/60">Configure automated replies and alert thresholds</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Option 1: WhatsApp Automated Reply */}
              <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">WhatsApp Automated Reply</p>
                  <p className="text-[11px] text-[var(--ink)]/60 mt-0.5 leading-relaxed">
                    Instantly send an AI-tailored WhatsApp confirmation when a new client messages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    autoReplyEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Option 2: Resend Email Alerts */}
              <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">Resend Email Lead Alerts</p>
                  <p className="text-[11px] text-[var(--ink)]/60 mt-0.5 leading-relaxed">
                    Dispatch instant high-priority email alerts to studio owner when qualification ≥ 60%.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    emailAlertsEnabled ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Option 3: AI Suggested Reply Drafts */}
              <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                    <p className="text-xs font-semibold text-[var(--ink)]">1-Click AI Reply Drafts</p>
                  </div>
                  <p className="text-[11px] text-[var(--ink)]/60 mt-0.5 leading-relaxed">
                    Displays tailored response drafts above the chat input box for 1-click review and send.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-xs font-semibold hover:bg-[var(--amber-deep)] cursor-pointer"
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
}
