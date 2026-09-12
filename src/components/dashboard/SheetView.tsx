'use client';

import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatStudioTime } from '@/lib/formatTime';
import { Lead, TeamMember } from './types';

interface SheetViewProps {
  leads: Lead[];
  teamMembers: TeamMember[];
  timeFormat: '12h' | '24h';
  timezone: string;
  onUpdateLeadStatus: (leadId: string, newStatus: string) => Promise<void> | void;
  onUpdateLeadAssignee: (leadId: string, newAssigneeId: string) => Promise<void> | void;
  onOpenLeadChat: (lead: Lead) => void;
}

export default function SheetView({
  leads,
  teamMembers,
  timeFormat,
  timezone,
  onUpdateLeadStatus,
  onUpdateLeadAssignee,
  onOpenLeadChat,
}: SheetViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'budget'>('match');

  const getAssigneeName = (assignedToId?: string | null) => {
    if (!assignedToId) return 'Unassigned';
    const member = teamMembers.find((m) => m.id === assignedToId || m.user_id === assignedToId);
    return member?.name || 'Assigned Partner';
  };

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (statusFilter !== 'all' && lead.status !== statusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            lead.name?.toLowerCase().includes(q) ||
            lead.contact?.toLowerCase().includes(q) ||
            lead.project_type?.toLowerCase().includes(q) ||
            lead.campaign?.toLowerCase().includes(q) ||
            lead.estimated_budget?.toLowerCase().includes(q);
          if (!matches) return false;
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
  }, [leads, statusFilter, searchQuery, sortBy]);

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
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

  return (
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
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto custom-scrollbar">
          <table className="w-full min-w-[1150px] text-left text-xs border-collapse">
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
                const isLeadLost = lead.status === 'lost' || lead.discovery_stage === 'lost';
                const rawLpi = typeof lead.score === 'number' ? lead.score : (lead.qualification_percentage || 0);
                const lpi = isLeadLost ? 0 : rawLpi;
                const isUrgent = !isLeadLost && (lead.priority_tier === 'urgent' || lpi >= 80);
                const isHigh = !isLeadLost && (lead.priority_tier === 'high' || (lpi >= 60 && !isUrgent));
                const tierLabel = isLeadLost ? 'LOST' : (lead.priority_tier || (isUrgent ? 'URGENT' : isHigh ? 'HIGH' : 'MED'));

                return (
                  <tr key={lead.id} className="hover:bg-[var(--paper)]/70 transition-colors">
                    <td className="p-3 border-r border-[var(--paper-line)] text-center font-medium tabular-nums text-[var(--ink)]/40 text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="p-3 border-r border-[var(--paper-line)]">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isLeadLost
                            ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                            : isUrgent
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            : isHigh
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {lpi}/100
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[var(--ink)]/60">
                          {tierLabel}
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
                        onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value)}
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
                        onChange={(e) => onUpdateLeadAssignee(lead.id, e.target.value)}
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
                        onClick={() => onOpenLeadChat(lead)}
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
  );
}
