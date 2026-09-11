'use client';

import React from 'react';

interface MetricsStripProps {
  totalLeadsCount: number;
  qualifiedCount: number;
  qualificationThreshold: number;
  bookedCount: number;
  wonCount: number;
}

export default function MetricsStrip({
  totalLeadsCount,
  qualifiedCount,
  qualificationThreshold,
  bookedCount,
  wonCount,
}: MetricsStripProps) {
  return (
    <div className="border-b border-[var(--paper-line)] bg-[var(--paper)] px-4 sm:px-6 lg:px-8 py-3.5 shrink-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Total Inbound Leads</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="font-display text-2xl font-bold text-[var(--ink)]">{totalLeadsCount}</p>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">100% genuine</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
            AI Qualified (LPI ≥ {qualificationThreshold})
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="font-display text-2xl font-bold text-emerald-500">{qualifiedCount}</p>
            <span className="text-[10px] font-medium tabular-nums text-[var(--ink)]/60">
              {totalLeadsCount > 0 ? Math.round((qualifiedCount / totalLeadsCount) * 100) : 0}% rate
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Consultations Booked</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="font-display text-2xl font-bold text-sky-500">{bookedCount}</p>
            <span className="text-[10px] font-medium text-[var(--ink)]/60">Stage 4 Pipeline</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">Won Engagements</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="font-display text-2xl font-bold text-[var(--amber-deep)] dark:text-[var(--amber)]">{wonCount}</p>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold">Active Clients</span>
          </div>
        </div>
      </div>
    </div>
  );
}
