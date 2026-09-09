'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ChatInbox from '@/components/ChatInbox';
import { useTheme } from '@/components/ThemeProvider';
import { Users, Filter, CheckCircle2, MessageSquare, Plus, Activity, Clock, ArrowLeft, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
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
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: teamData } = await supabase.from('team_members').select('*');
    if (leadsData) setLeads(leadsData);
    if (teamData) setTeamMembers(teamData);
  };

  const getAssigneeName = (id: string) => {
    if (!id) return 'Unassigned';
    return teamMembers.find(t => t.id === id)?.name || 'Unknown';
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
              ArchScale Studio Engine
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60 uppercase">
              AS-05
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={simulateInboundWhatsAppLead}
            className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-3 sm:px-3.5 py-2 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Simulate Inbound Lead</span>
            <span className="xs:hidden">New Lead</span>
          </button>

          <button
            type="button"
            onClick={triggerCron}
            className="text-xs font-semibold flex items-center gap-1.5 border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] px-3 sm:px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Clock size={14} />
            <span className="hidden xs:inline">Trigger Follow-up Cron</span>
            <span className="xs:hidden">Cron</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] flex items-center justify-center text-[var(--ink)] cursor-pointer shrink-0"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Metrics Banner */}
      <div className="border-b border-[var(--paper-line)] bg-[var(--paper)] px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
            <p className="text-[11px] font-mono text-[var(--ink)]/60 uppercase">Total Inbound Leads</p>
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
      <div className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-6 max-w-7xl w-full mx-auto">
        
        {/* Leads Table */}
        <div className="flex-1 flex flex-col bg-[var(--paper-raised)] rounded-2xl shadow-xs border border-[var(--paper-line)] overflow-hidden min-w-0">
          <div className="p-4 border-b border-[var(--paper-line)] flex items-center justify-between bg-[var(--paper)]">
            <div>
              <h2 className="font-display font-semibold text-base text-[var(--ink)]">Inbound Lead Pipeline</h2>
              <p className="text-xs text-[var(--ink)]/60">Live Postgres Realtime channel active</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
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
                {leads.map((lead) => (
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
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[var(--ink)]/50">
                      No inquiries captured yet. Click <strong>Simulate Inbound Lead</strong> or text your Meta WhatsApp number.
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
    </div>
  );
}
