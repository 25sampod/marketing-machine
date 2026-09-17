'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Layers, LayoutGrid, FileSpreadsheet, BarChart3, BookOpen, Users, 
  Settings, Activity, Globe, LogOut, ChevronLeft, ChevronRight, X 
} from 'lucide-react';
import { DashboardView, TeamMember } from './types';

interface SidebarProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  leadsCount: number;
  teamMembers: TeamMember[];
  currentUser: any;
  knowledgeBaseActive: boolean;
  onSignOut: () => void;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  leadsCount,
  teamMembers,
  currentUser,
  knowledgeBaseActive,
  onSignOut,
}: SidebarProps) {
  const currentUserName = teamMembers.find((m) => m.user_id === currentUser?.id)?.name || 'Studio Principal';
  const currentUserEmail = currentUser?.email || 'studio@archscale.com';

  return (
    <>
      {/* Collapsible Left Sidebar (Desktop) */}
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
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
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
                  {leadsCount}
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
                {knowledgeBaseActive && (
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
            <button
              type="button"
              onClick={() => setCurrentView('platform')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentView === 'platform'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
              title="Live Platform Telemetry"
            >
              <Activity size={16} className={currentView === 'platform' ? 'text-[var(--text-on-amber)] shrink-0' : 'text-emerald-500 shrink-0'} />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Platform Health</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'platform' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`} />
                </div>
              )}
            </button>

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
                  {currentUserName}
                </p>
                <p className="text-[10px] text-[var(--ink)]/50 font-medium truncate">
                  {currentUserEmail}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={onSignOut}
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
              <span className="font-display font-bold text-sm text-[var(--ink)]">Scale Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg border border-[var(--paper-line)] text-[var(--ink)]/60 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer ${
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
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('platform');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    currentView === 'platform'
                      ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold'
                      : 'text-[var(--ink)]/70 hover:bg-[var(--paper)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity size={16} className={currentView === 'platform' ? 'text-[var(--text-on-amber)]' : 'text-emerald-500'} />
                    <span>Platform Health</span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'platform' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`} />
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--ink)]/70 hover:bg-[var(--paper)]"
                >
                  <Globe size={16} className="text-sky-500" />
                  <span>Public Website</span>
                </Link>
                <button
                  type="button"
                  onClick={onSignOut}
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
    </>
  );
}
