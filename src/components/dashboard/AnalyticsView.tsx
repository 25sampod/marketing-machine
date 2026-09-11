'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Sparkles, Copy, ExternalLink, Check } from 'lucide-react';
import { Lead } from './types';

interface AnalyticsViewProps {
  leads: Lead[];
  qualificationThreshold: number;
  whatsappPhoneNumberId?: string;
}

export default function AnalyticsView({
  leads,
  qualificationThreshold,
  whatsappPhoneNumberId = '',
}: AnalyticsViewProps) {
  const [campaignStudioNumber, setCampaignStudioNumber] = useState('');
  const [campaignNameInput, setCampaignNameInput] = useState('');
  const [campaignMessageInput, setCampaignMessageInput] = useState('');
  const [copiedCampaignUrl, setCopiedCampaignUrl] = useState(false);

  const totalLeadsCount = leads.length;
  const contactedCount = useMemo(
    () => leads.filter((l) => l.status === 'contacted' || l.status === 'qualified' || l.status === 'consult_booked' || l.status === 'won').length,
    [leads]
  );
  const qualifiedCount = useMemo(
    () => leads.filter((l) => l.status === 'qualified' || l.status === 'consult_booked' || l.status === 'won').length,
    [leads]
  );
  const bookedCount = useMemo(
    () => leads.filter((l) => l.status === 'consult_booked' || l.status === 'won').length,
    [leads]
  );
  const wonCount = useMemo(
    () => leads.filter((l) => l.status === 'won').length,
    [leads]
  );

  const campaignAttributionList = useMemo(() => {
    const map = leads.reduce((acc: any, lead: any) => {
      const key = lead.campaign || (lead.source === 'whatsapp' ? 'Direct WhatsApp (Organic)' : 'Web Landing Brief');
      if (!acc[key]) {
        acc[key] = {
          name: key,
          source: lead.utm_source || lead.source || 'meta',
          total: 0,
          qualified: 0,
          booked: 0,
          topAdId: lead.ad_id || 'N/A',
        };
      }
      acc[key].total += 1;
      if (
        lead.status === 'qualified' ||
        lead.status === 'consult_booked' ||
        lead.status === 'won' ||
        (lead.qualification_percentage || 0) >= qualificationThreshold ||
        (lead.score || 0) >= qualificationThreshold
      ) {
        acc[key].qualified += 1;
      }
      if (lead.status === 'consult_booked' || lead.status === 'won') {
        acc[key].booked += 1;
      }
      return acc;
    }, {});
    return Object.values(map) as any[];
  }, [leads, qualificationThreshold]);

  const cleanPhone = (campaignStudioNumber || whatsappPhoneNumberId || '').replace(/[^\d]/g, '');
  const formattedCampaignTag = (campaignNameInput || 'direct_ad').trim().replace(/\s+/g, '_').toLowerCase();
  const effectiveMessage = (campaignMessageInput || "Hi ArchScale, I'm reaching out from your Instagram ad regarding an architectural project. [Ref: {{campaign}}]")
    .replace(/{{campaign}}/g, formattedCampaignTag);
  const computedCampaignUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(effectiveMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(effectiveMessage)}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-[var(--ink)]">Funnel &amp; Campaign Attribution</h2>
        <p className="text-xs text-[var(--ink)]/60 mt-0.5">
          Real-time pipeline progression and Meta Click-to-WhatsApp ad attribution metrics
        </p>
      </div>

      {/* Visual Step-by-Step Conversion Funnel */}
      <div className="p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
            <span>Inbound Conversion Funnel</span>
          </h3>
          <span className="text-xs font-medium text-[var(--ink)]/50">Calculated from genuine lead state</span>
        </div>

        <div className="space-y-3 pt-2">
          {/* Step 1: Captured */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink)]">1. Inbound Inquiries Captured</span>
              <span className="font-medium tabular-nums text-[var(--ink)]/80">{totalLeadsCount} leads (100%)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
              <div className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Step 2: Contacted / Discovery */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink)]">2. Discovery Engaged (Contacted)</span>
              <span className="font-medium tabular-nums text-[var(--ink)]/80">
                {contactedCount} leads ({totalLeadsCount > 0 ? Math.round((contactedCount / totalLeadsCount) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${totalLeadsCount > 0 ? (contactedCount / totalLeadsCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Step 3: AI Qualified */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink)]">3. AI Qualified (LPI ≥ {qualificationThreshold})</span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {qualifiedCount} leads ({totalLeadsCount > 0 ? Math.round((qualifiedCount / totalLeadsCount) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalLeadsCount > 0 ? (qualifiedCount / totalLeadsCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Step 4: Consult Booked */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink)]">4. Senior Partner Consult Booked</span>
              <span className="font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {bookedCount} leads ({totalLeadsCount > 0 ? Math.round((bookedCount / totalLeadsCount) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${totalLeadsCount > 0 ? (bookedCount / totalLeadsCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Step 5: Won */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink)]">5. Retained / Won Projects</span>
              <span className="font-bold tabular-nums text-[var(--amber-deep)] dark:text-[var(--amber)]">
                {wonCount} leads ({totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
              <div
                className="h-full bg-[var(--amber)] rounded-full transition-all duration-500"
                style={{ width: `${totalLeadsCount > 0 ? (wonCount / totalLeadsCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Attribution Performance Table */}
      <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--ink)]">Meta Ad &amp; Channel Attribution</h3>
            <p className="text-xs text-[var(--ink)]/60">Extracted from WhatsApp referral data &amp; UTM tags</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--paper-raised)] border border-[var(--paper-line)]">
            {campaignAttributionList.length} Channels Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--paper-raised)] text-[var(--ink)]/60 font-semibold uppercase tracking-wider text-[11px] border-b border-[var(--paper-line)]">
              <tr>
                <th className="p-3.5">Campaign Name</th>
                <th className="p-3.5">Source Channel</th>
                <th className="p-3.5">Sample Ad ID</th>
                <th className="p-3.5 text-center">Total Inbound</th>
                <th className="p-3.5 text-center">Qualified</th>
                <th className="p-3.5 text-center">Consults</th>
                <th className="p-3.5 text-right">Qual. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--paper-line)] font-medium tabular-nums">
              {campaignAttributionList.map((item: any, idx: number) => {
                const rate = item.total > 0 ? Math.round((item.qualified / item.total) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-[var(--paper)] transition-colors">
                    <td className="p-3.5 font-sans font-semibold text-[var(--ink)]">{item.name}</td>
                    <td className="p-3.5 capitalize text-[var(--ink)]/70">{item.source}</td>
                    <td className="p-3.5 text-[var(--ink)]/50">{item.topAdId}</td>
                    <td className="p-3.5 text-center font-bold text-[var(--ink)]">{item.total}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.qualified}</td>
                    <td className="p-3.5 text-center font-bold text-sky-600 dark:text-sky-400">{item.booked}</td>
                    <td className="p-3.5 text-right font-bold text-[var(--amber-deep)] dark:text-[var(--amber)]">{rate}%</td>
                  </tr>
                );
              })}
              {campaignAttributionList.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--ink)]/50">
                    No campaign data logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta Click-to-WhatsApp Campaign Link Generator */}
      <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
              <span>Click-to-WhatsApp Campaign Link &amp; Tag Generator</span>
            </h3>
            <p className="text-xs text-[var(--ink)]/60 mt-0.5">
              Create Meta Ad destination URLs that automatically embed campaign attribution when clients message on WhatsApp
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
            Meta Graph Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--ink)]/70">Studio WhatsApp Number / ID</label>
            <input
              type="text"
              placeholder="e.g. +15551234567 or Phone ID"
              value={campaignStudioNumber}
              onChange={(e) => setCampaignStudioNumber(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium tabular-nums"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--ink)]/70">Campaign Name / Identifier</label>
            <input
              type="text"
              placeholder="e.g. luxury_villas_2026, penthouse_instagram"
              value={campaignNameInput}
              onChange={(e) => setCampaignNameInput(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--ink)]/70">
            Inbound Starter Message (Pre-populates prospective client's WhatsApp composer)
          </label>
          <input
            type="text"
            placeholder="Hi ArchScale, I saw your ad... [Ref: {{campaign}}]"
            value={campaignMessageInput}
            onChange={(e) => setCampaignMessageInput(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>

        {/* Generated Destination URL Box */}
        <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--ink)]/60 uppercase">
              Generated Meta Ad Destination URL
            </span>
            {copiedCampaignUrl && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={11} /> Copied to Clipboard!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={computedCampaignUrl}
              className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] select-all truncate"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(computedCampaignUrl);
                setCopiedCampaignUrl(true);
                setTimeout(() => setCopiedCampaignUrl(false), 2500);
              }}
              className="px-3.5 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
            <a
              href={computedCampaignUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
            >
              <ExternalLink size={13} />
              <span>Test</span>
            </a>
          </div>
          <p className="text-[10px] text-[var(--ink)]/50 font-medium">
            Copy and paste this URL as the destination link in Meta Ads Manager (Facebook &amp; Instagram) with CTA set to "Send WhatsApp Message".
          </p>
        </div>
      </div>
    </div>
  );
}
