"use client";

import Reveal from "./Reveal";
import { Radio, Activity } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-[var(--paper)] transition-colors overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)] break-words">
            From connected tools to a running workflow
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
            Four simple steps to automate your daily operations without maintaining custom scripts.
          </p>
        </Reveal>

        {/* 4 Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {/* Card 1: Connect */}
          <Reveal className="h-full" delay={0}>
            <div className="h-full rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-6 flex flex-col justify-between shadow-xs hover:border-[var(--amber)]/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div>
                {/* Header: Number & Main Icon */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-[var(--amber-deep)] bg-[var(--paper)] border border-[var(--paper-line)] px-2.5 py-1 rounded-lg shadow-2xs group-hover:border-[var(--amber)]/30 transition-colors">
                    01
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] border border-[var(--amber)]/20 flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)] leading-snug">
                  Connect your stack
                </h3>

                {/* Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-[var(--ink)]/70 leading-relaxed">
                  Authenticate your everyday tools with 1-click OAuth. Zero custom webhook scripts or API key maintenance.
                </p>
              </div>

              {/* Visual Tool Icons Row */}
              <div className="mt-6 pt-4 border-t border-[var(--paper-line)]">
                <p className="text-[11px] font-medium text-[var(--ink)]/50 uppercase tracking-wider mb-2 font-mono">
                  Supported apps
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* GitHub */}
                  <span className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shadow-2xs text-[var(--ink)]" title="GitHub">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </span>
                  {/* Slack */}
                  <span className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shadow-2xs" title="Slack">
                    <svg className="w-3.5 h-3.5 fill-current text-[#4A154B] dark:text-[#36C5F0]" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                  </span>
                  {/* Linear */}
                  <span className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shadow-2xs" title="Linear">
                    <svg className="w-3.5 h-3.5 fill-current text-[#5E6AD2]" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.542 17.58A10.428 10.428 0 0 1 1.5 12C1.5 6.201 6.201 1.5 12 1.5c2.053 0 3.967.592 5.58 1.615l-14.038 14.465zM5.006 19.088l14.082-14.51c1.024 1.614 1.612 3.528 1.612 5.58 0 5.799-4.701 10.5-10.5 10.5-1.97 0-3.812-.544-5.394-1.49l.2-.08z" />
                    </svg>
                  </span>
                  {/* Notion */}
                  <span className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shadow-2xs text-[var(--ink)]" title="Notion">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.83c-.466-.373-.979-.606-2.007-.513L2.733 2.39c-.42.046-.513.326-.373.56zm.606 3.639v13.623c0 .746.373 1.026 1.213.979l13.868-.793c.746-.047.933-.513.933-1.166V6.772c0-.653-.28-.979-.84-.933l-14.334.84c-.606.046-.84.373-.84.84zm12.655.886c.093.42 0 .84-.42.886l-.7.14v8.397c-.373.233-.793.373-1.213.373-.653 0-1.026-.28-1.586-.979l-4.48-6.904v6.857l1.353.327c.093.046.14.373 0 .466l-3.359.187c-.093 0-.187-.28-.093-.373l1.073-.327V9.693l-1.4-.14c-.093-.047-.046-.42.093-.466l3.593-.234 4.713 7.045V9.413l-1.26-.14c-.093-.047-.046-.42.094-.467z" />
                    </svg>
                  </span>
                  {/* Stripe */}
                  <span className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center shadow-2xs text-[#635BFF]" title="Stripe">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.839 3.771 6.491 6.861 7.607 2.613.972 3.522 1.682 3.522 2.699 0 .974-.834 1.531-2.28 1.531-2.228 0-5.015-1.108-6.986-2.18l-.941 5.569C5.394 23.364 8.243 24 11.499 24c2.612 0 4.819-.653 6.357-1.871 1.62-1.282 2.446-3.146 2.446-5.503 0-4.811-3.649-6.425-6.326-7.476z" />
                    </svg>
                  </span>
                  {/* +200 more */}
                  <span className="text-[11px] font-mono font-medium text-[var(--ink)]/55 px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)]">
                    +200
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Triggers */}
          <Reveal className="h-full" delay={50}>
            <div className="h-full rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-6 flex flex-col justify-between shadow-xs hover:border-[var(--amber)]/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div>
                {/* Header: Number & Main Icon */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-[var(--amber-deep)] bg-[var(--paper)] border border-[var(--paper-line)] px-2.5 py-1 rounded-lg shadow-2xs group-hover:border-[var(--amber)]/30 transition-colors">
                    02
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] border border-[var(--amber)]/20 flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-200">
                    <Radio className="w-5 h-5" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)] leading-snug">
                  Define your triggers
                </h3>

                {/* Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-[var(--ink)]/70 leading-relaxed">
                  Start automations automatically from webhooks, schedules, form submissions, or real-time app events.
                </p>
              </div>

              {/* Visual Trigger Types */}
              <div className="mt-6 pt-4 border-t border-[var(--paper-line)]">
                <p className="text-[11px] font-medium text-[var(--ink)]/50 uppercase tracking-wider mb-2 font-mono">
                  Trigger types
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-[var(--amber-deep)] shrink-0">
                      <Activity className="w-3 h-3" />
                    </span>
                    <span>Real-time webhooks</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-teal shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <span>Scheduled cron jobs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-[#5E6AD2] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </span>
                    <span>Third-party app events</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 3: Automate Logic */}
          <Reveal className="h-full" delay={100}>
            <div className="h-full rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-6 flex flex-col justify-between shadow-xs hover:border-[var(--amber)]/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div>
                {/* Header: Number & Main Icon */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-[var(--amber-deep)] bg-[var(--paper)] border border-[var(--paper-line)] px-2.5 py-1 rounded-lg shadow-2xs group-hover:border-[var(--amber)]/30 transition-colors">
                    03
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] border border-[var(--amber)]/20 flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="6" y1="3" x2="6" y2="15" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9" />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)] leading-snug">
                  Automate multi-step logic
                </h3>

                {/* Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-[var(--ink)]/70 leading-relaxed">
                  Filter incoming data, branch workflows by priority or team, and route human approvals directly inside Slack.
                </p>
              </div>

              {/* Visual Logic Steps */}
              <div className="mt-6 pt-4 border-t border-[var(--paper-line)]">
                <p className="text-[11px] font-medium text-[var(--ink)]/50 uppercase tracking-wider mb-2 font-mono">
                  Workflow capabilities
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-[var(--amber-deep)] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12M9 18h6" />
                      </svg>
                    </span>
                    <span>IF / ELSE conditions</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-emerald-600 shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>1-click Slack approvals</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-teal shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </span>
                    <span>Custom JavaScript / Python</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 4: Monitor */}
          <Reveal className="h-full" delay={150}>
            <div className="h-full rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-6 flex flex-col justify-between shadow-xs hover:border-[var(--amber)]/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div>
                {/* Header: Number & Main Icon */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-[var(--amber-deep)] bg-[var(--paper)] border border-[var(--paper-line)] px-2.5 py-1 rounded-lg shadow-2xs group-hover:border-[var(--amber)]/30 transition-colors">
                    04
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 text-[var(--amber-deep)] border border-[var(--amber)]/20 flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)] leading-snug">
                  Run and monitor
                </h3>

                {/* Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-[var(--ink)]/70 leading-relaxed">
                  NOVA executes steps reliably in the background with automated retries, error alerting, and complete audit logs.
                </p>
              </div>

              {/* Visual Reliability Highlights */}
              <div className="mt-6 pt-4 border-t border-[var(--paper-line)]">
                <p className="text-[11px] font-medium text-[var(--ink)]/50 uppercase tracking-wider mb-2 font-mono">
                  Reliability &amp; safety
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-emerald-600 shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </span>
                    <span>Automated retry backoff</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-[var(--amber-deep)] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                    <span>Instant failure alerts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                    <span className="w-5 h-5 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center text-teal shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <span>SOC 2 audit logging</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Trust & Simplicity Footer */}
        <Reveal className="mt-10 sm:mt-12 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 sm:px-6 py-2.5 rounded-full border border-[var(--paper-line)] bg-[var(--paper-raised)] text-xs text-[var(--ink)]/70">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No complex scripting</span>
            </span>
            <span className="hidden sm:inline text-[var(--ink)]/25" aria-hidden="true">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Live in under 15 minutes</span>
            </span>
            <span className="hidden sm:inline text-[var(--ink)]/25" aria-hidden="true">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>SOC 2 Type II certified</span>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
