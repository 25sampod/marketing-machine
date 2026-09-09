'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ChatInbox from '@/components/ChatInbox';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Users, Filter, CheckCircle2, MessageSquare, Plus, Activity, Clock, 
  ArrowLeft, Sun, Moon, LogOut, Copy, Check, UserPlus, X, Shield 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');
  
  // Team invite modal state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('Commercial');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
          { id: '1', name: 'Alice Smith', email: 'alice@archscale.com', role: 'specialist', specialty: 'Commercial', status: 'active' },
          { id: '2', name: 'Bob Jones', email: 'bob@archscale.com', role: 'specialist', specialty: 'Residential', status: 'active' },
          { id: '3', name: 'Charlie Brown', email: 'charlie@archscale.com', role: 'specialist', specialty: 'Renovation', status: 'active' },
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

  const simulateInboundWhatsAppLead = async () => {
    const demoMessages = [
      "Hi! We are looking to design a 6,000 sqft commercial office in Manhattan. Estimated budget is $250,000.",
      "Hello, looking to remodel our modern residential villa. We have a budget of $120,000 ready.",
      "Inquiring about full turnkey renovation for a penthouse. What is your design fee schedule?",
    ];
    const chosen = demoMessages[Math.floor(Math.random() * demoMessages.length)];

    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Client ' + Math.floor(100 + Math.random() * 900),
        contact: '+1 (555) 01' + Math.floor(10 + Math.random() * 89) + '-' + Math.floor(1000 + Math.random() * 9000),
        source: 'whatsapp',
        message: chosen,
      }),
    });
  };

  // Filter leads by active tab
  const filteredLeads = leads.filter((lead) => {
    if (activeFilter === 'mine' && currentUser) {
      // Matches assigned specialist ID or user's email
      const myMember = teamMembers.find(m => m.user_id === currentUser.id || m.email === currentUser.email);
      return myMember && lead.assigned_to === myMember.id;
    }
    return true;
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
            onClick={simulateInboundWhatsAppLead}
            className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-3 sm:px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Simulate Lead</span>
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
          <div className="p-4 border-b border-[var(--paper-line)] flex items-center justify-between bg-[var(--paper)] flex-wrap gap-2">
            <div>
              <h2 className="font-display font-semibold text-base text-[var(--ink)]">Inbound Lead Pipeline</h2>
              <p className="text-xs text-[var(--ink)]/60">Live Postgres Realtime &amp; Resend Email active</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Specialist Filter Tabs */}
              <div className="inline-flex p-1 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  All Leads ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('mine')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeFilter === 'mine'
                      ? 'bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs'
                      : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                  }`}
                >
                  My Assigned
                </button>
              </div>

              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[680px] w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--paper-raised)] text-[var(--ink)]/60 font-mono text-[11px] sticky top-0 z-10 border-b border-[var(--paper-line)]">
                <tr>
                  <th className="p-3.5 font-medium">Lead Client</th>
                  <th className="p-3.5 font-medium">Typology</th>
                  <th className="p-3.5 font-medium">Source</th>
                  <th className="p-3.5 font-medium">AI Score</th>
                  <th className="p-3.5 font-medium">Assigned Partner</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--paper-line)]">
                {filteredLeads.map((lead) => (
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
                      <span className="text-xs text-[var(--ink)]/80">
                        {lead.project_type || 'Pending Extraction'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize font-mono text-xs px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70">
                        {lead.source}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        {lead.score >= 2 ? (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span>{lead.score}/2</span>
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
                      {format(new Date(lead.created_at), 'HH:mm')}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[var(--ink)]/50">
                      {activeFilter === 'mine' 
                        ? 'No leads currently assigned to you.' 
                        : 'No inquiries captured yet. Click Simulate Lead or text your WhatsApp number.'}
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
                  {teamMembers.map((member) => (
                    <div key={member.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center font-bold font-mono text-[11px]">
                          {member.name ? member.name.charAt(0) : member.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--ink)]">{member.name || member.email}</p>
                          <p className="text-[10px] text-[var(--ink)]/50 font-mono">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--paper-raised)] border border-[var(--paper-line)] text-[var(--ink)]/70">
                          {member.specialty || member.role}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Specialist" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
