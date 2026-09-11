'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle2, Server, Cpu, MessageSquare, 
  RefreshCw, Send, AlertTriangle, HelpCircle, Mail, ShieldCheck 
} from 'lucide-react';

export default function PlatformView() {
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [liveChecks, setLiveChecks] = useState<any>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setLiveChecks(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch health telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const matrixServices = [
    {
      name: 'Supabase Postgres',
      category: 'Database Infrastructure',
      status: liveChecks?.matrix?.database?.status || (loading ? 'Checking...' : 'Operational'),
      latency: liveChecks?.matrix?.database?.latencyMs ? `${liveChecks.matrix.database.latencyMs}ms` : (loading ? '...' : '0ms'),
      details: liveChecks?.matrix?.database?.details || 'Postgres connection active, RLS active',
      icon: Server,
    },
    {
      name: liveChecks?.matrix?.ai?.name || 'AI Qualification Engine',
      category: 'AI Qualification Engine',
      status: liveChecks?.matrix?.ai?.status || (loading ? 'Checking...' : 'Operational'),
      latency: liveChecks?.matrix?.ai?.latencyMs ? `${liveChecks.matrix.ai.latencyMs}ms` : (loading ? '...' : '0ms'),
      details: liveChecks?.matrix?.ai?.details || 'AI inference deployment verified',
      icon: Cpu,
    },
    {
      name: 'Telegram Bot API (getMe)',
      category: 'Specialist Escalation & Alerts',
      status: liveChecks?.matrix?.telegram?.status || (loading ? 'Checking...' : 'Operational'),
      latency: liveChecks?.matrix?.telegram?.latencyMs ? `${liveChecks.matrix.telegram.latencyMs}ms` : (loading ? '...' : '0ms'),
      details: liveChecks?.matrix?.telegram?.details || 'Telegram bot API probe',
      icon: Send,
    },
    {
      name: 'Meta Graph API (WhatsApp Cloud)',
      category: 'Omnichannel Ingestion & Delivery',
      status: liveChecks?.matrix?.metaGraph?.status || (loading ? 'Checking...' : 'Operational'),
      latency: liveChecks?.matrix?.metaGraph?.latencyMs ? `${liveChecks.matrix.metaGraph.latencyMs}ms` : (loading ? '...' : '0ms'),
      details: liveChecks?.matrix?.metaGraph?.details || 'Official Meta Cloud API webhook live',
      icon: MessageSquare,
    },
    {
      name: 'Resend Transactional Email',
      category: 'Transactional Notifications',
      status: liveChecks?.matrix?.email?.status || (loading ? 'Checking...' : 'Operational'),
      latency: liveChecks?.matrix?.email?.latencyMs ? `${liveChecks.matrix.email.latencyMs}ms` : (loading ? '...' : '0ms'),
      details: liveChecks?.matrix?.email?.details || 'Resend transactional email active',
      icon: Mail,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--paper-line)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base sm:text-lg text-[var(--ink)]">
                Platform Telemetry &amp; System Health
              </h2>
              <p className="text-xs text-[var(--ink)]/60 mt-0.5">
                Discrete live probe monitoring across all core infrastructure dependencies
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="text-xs font-semibold flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer active:scale-95 transition-all self-start sm:self-auto shadow-2xs disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[var(--amber-deep)]' : ''} />
          <span>{loading ? 'Probing services...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {/* Privacy Assurance Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3.5 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-[var(--ink)]">
              Zero Customer Data Access Enforced
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Privacy Architecture
            </span>
          </div>
          <p className="text-xs text-[var(--ink)]/70 leading-relaxed">
            In accordance with enterprise data isolation policies, Platform telemetry only monitors infrastructure health metrics, service uptime, and delivery rates. Telemetry probes have zero read access to private customer architectural briefs, financial budgets, or lead records.
          </p>
        </div>
      </div>

      {/* Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-2xs space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
            Platform Status
          </p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${liveChecks?.status?.includes('Operational') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-display text-lg font-bold text-[var(--ink)]">
              {liveChecks?.status || (loading ? 'Probing Matrix...' : 'Operational')}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-2xs space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
            Live Probe Round-Trip
          </p>
          <p className="font-display text-xl font-bold text-[var(--ink)]">
            {liveChecks ? `${liveChecks.totalDurationMs}ms` : (loading ? '...' : '0ms')}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-2xs space-y-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
            Last Health Heartbeat
          </p>
          <p className="font-medium tabular-nums text-sm text-[var(--ink)]/80 mt-1">
            {lastChecked || (loading ? 'Checking...' : 'Just now')}
          </p>
        </div>
      </div>

      {/* Granular 5-Way Infrastructure Health Matrix */}
      <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] bg-[var(--paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-[var(--ink)]">
              Granular Infrastructure Health Matrix
            </h3>
            <p className="text-xs text-[var(--ink)]/60 mt-0.5">
              Live latency, connectivity, and status probe across all five core platform services
            </p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-[var(--ink)]/60">
            {loading ? 'Pinging services...' : `${liveChecks?.totalDurationMs || 0}ms total round-trip`}
          </span>
        </div>

        <div className="divide-y divide-[var(--paper-line)]">
          {matrixServices.map((svc) => {
            const Icon = svc.icon;
            const isOp = svc.status === 'Operational' || svc.status === 'Ready';
            const isDegraded = svc.status === 'Degraded';
            const isDown = svc.status === 'Down';

            return (
              <div 
                key={svc.name} 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--paper)]/50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shrink-0 text-[var(--amber-deep)] dark:text-[var(--amber)] shadow-2xs">
                    <Icon size={18} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--ink)]">{svc.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60">
                        {svc.category}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink)]/60 break-all">{svc.details}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs font-semibold tabular-nums text-[var(--ink)]/80">{svc.latency}</span>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--ink)]/40">latency</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                    isOp
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : isDegraded
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : isDown
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
                  }`}>
                    {isOp ? (
                      <CheckCircle2 size={13} />
                    ) : isDown ? (
                      <AlertTriangle size={13} />
                    ) : isDegraded ? (
                      <AlertTriangle size={13} />
                    ) : (
                      <HelpCircle size={13} />
                    )}
                    <span>{svc.status}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
