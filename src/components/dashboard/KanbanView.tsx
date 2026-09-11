'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, Search, ChevronLeft, ChevronRight, Clock 
} from 'lucide-react';
import { formatStudioTime } from '@/lib/formatTime';
import { Lead, TeamMember, KANBAN_STAGES } from './types';

interface KanbanViewProps {
  leads: Lead[];
  teamMembers: TeamMember[];
  timeFormat: '12h' | '24h';
  timezone: string;
  onUpdateLeadStatus: (leadId: string, newStatus: string) => Promise<void> | void;
  onSelectLead: (lead: Lead) => void;
}

export const getLeadKanbanStage = (lead: any): string => {
  const s = lead?.status?.toLowerCase();
  if (s === 'consultation_booked') return 'consultation_booked';
  if (s === 'converted') return 'converted';
  if (s === 'lost' || s === 'dead') return 'lost';
  if (s === 'qualified') return 'qualified';
  if (s === 'contacted') return 'contacted';
  return 'new';
};

export default function KanbanView({
  leads,
  teamMembers,
  timeFormat,
  timezone,
  onUpdateLeadStatus,
  onSelectLead,
}: KanbanViewProps) {
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  return (
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
                  onUpdateLeadStatus(leadId, col.id);
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
                        onClick={() => onSelectLead(lead)}
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
                              if (colIdx > 0) onUpdateLeadStatus(lead.id, KANBAN_STAGES[colIdx - 1].id);
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
                              onSelectLead(lead);
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
                              onUpdateLeadStatus(lead.id, e.target.value);
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
                              if (colIdx < KANBAN_STAGES.length - 1) onUpdateLeadStatus(lead.id, KANBAN_STAGES[colIdx + 1].id);
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
  );
}
