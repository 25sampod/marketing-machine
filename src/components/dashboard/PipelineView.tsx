'use client';

import React, { useState, useMemo } from 'react';
import ChatInbox from '@/components/ChatInbox';
import { formatStudioTime } from '@/lib/formatTime';
import { Lead, TeamMember } from './types';

interface PipelineViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  selectedLead: Lead | null;
  setSelectedLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  teamMembers: TeamMember[];
  timeFormat: '12h' | '24h';
  timezone: string;
  qualificationThreshold: number;
  currentUser: any;
}

export default function PipelineView({
  leads,
  setLeads,
  selectedLead,
  setSelectedLead,
  teamMembers,
  timeFormat,
  timezone,
  qualificationThreshold,
  currentUser,
}: PipelineViewProps) {
  const [mobileTab, setMobileTab] = useState<'pipeline' | 'chat'>('pipeline');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'returning' | 'review'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'budget'>('match');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMobileTab = localStorage.getItem('archscale_mobile_tab') as 'pipeline' | 'chat' | null;
      if (savedMobileTab === 'pipeline' || savedMobileTab === 'chat') {
        setMobileTab(savedMobileTab);
      }
    }
  }, []);

  const handleMobileTabChange = (tab: 'pipeline' | 'chat') => {
    setMobileTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('archscale_mobile_tab', tab);
      } catch (e) {}
    }
  };

  const getAssigneeName = (assignedToId?: string | null) => {
    if (!assignedToId) return 'Unassigned';
    const member = teamMembers.find((m) => m.user_id === assignedToId || m.id === assignedToId);
    return member?.name || 'Assigned Partner';
  };

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (activeFilter === 'mine' && lead.assigned_to !== currentUser?.id) {
          return false;
        }
        if (priorityFilter === 'urgent') {
          const lpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
          return lead.priority_tier === 'urgent' || lpi >= 80;
        }
        if (priorityFilter === 'high') {
          const lpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
          return lead.priority_tier === 'high' || (lpi >= 60 && lpi < 80);
        }
        if (priorityFilter === 'returning') {
          return Boolean(lead.is_returning_client);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') {
          const scoreA = typeof a.score === 'number' ? a.score : (a.qualification_percentage || 0);
          const scoreB = typeof b.score === 'number' ? b.score : (b.qualification_percentage || 0);
          return scoreB - scoreA;
        }
        if (sortBy === 'recent') {
          return new Date(b.last_contacted_at || b.created_at).getTime() - new Date(a.last_contacted_at || a.created_at).getTime();
        }
        if (sortBy === 'budget') {
          const hasBudgetA = Boolean(a.estimated_budget || a.budget_mentioned);
          const hasBudgetB = Boolean(b.estimated_budget || b.budget_mentioned);
          return (hasBudgetB ? 1 : 0) - (hasBudgetA ? 1 : 0);
        }
        return 0;
      });
  }, [leads, activeFilter, priorityFilter, sortBy, currentUser]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row p-4 sm:p-5 lg:p-5 xl:p-6 gap-4 xl:gap-5 w-full min-h-0 h-full lg:overflow-hidden">
      {/* Mobile View Switcher Pill */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] shrink-0">
        <button
          type="button"
          onClick={() => handleMobileTabChange('pipeline')}
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
          onClick={() => handleMobileTabChange('chat')}
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
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
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
                      handleMobileTabChange('chat');
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
  );
}
