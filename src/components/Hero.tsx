"use client";

import { useState } from "react";
import DemoModal from "./DemoModal";
import ServiceIcon from "./ServiceIcon";

const workflowSteps = [
 {
  step: "Step 1",
  tool: "WhatsApp",
  title: "Client Inquiry Ingested",
  description: "Captures project brief & contact details via Meta Cloud Webhook",
  badge: "Ingested",
 },
 {
  step: "Step 2",
  tool: "OpenAI",
  title: "AI Budget & Scope Analysis",
  description: "Identifies $150k budget & Commercial typology; score: 2/2",
  badge: "Qualified",
 },
 {
  step: "Step 3",
  tool: "Supabase",
  title: "Assigned to Practice Partner",
  description: "Routes lead to Commercial Practice Lead in PostgreSQL",
  badge: "Routed",
 },
 {
  step: "Step 4",
  tool: "WhatsApp",
  title: "Instant Outbound Follow-up",
  description: "Sends bespoke consultation invitation back to client in < 5 seconds",
  badge: "Delivered",
 },
];

export default function Hero() {
 const [isDemoOpen, setIsDemoOpen] = useState(false);

 return (
  <section id="top" className="pt-20 sm:pt-22 md:pt-24 lg:pt-24 pb-12 sm:pb-16 md:pb-20 lg:pb-24 bg-[var(--paper)] overflow-hidden">
   <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">
    {/* Left Column: Value Proposition & CTAs */}
    <div className="w-full min-w-0">

     <h1 className="font-display text-3xl sm:text-5xl md:text-6xl leading-[1.12] sm:leading-[1.08] tracking-tight text-[var(--ink)] font-semibold max-w-2xl break-words">
      <span className="inline-block overflow-hidden pb-1 sm:pb-1.5 -mb-1 sm:-mb-1.5 align-top">
       <span className="inline-block animate-kinetic-1">
        Give a 10-person studio
       </span>
      </span>{" "}
      <span className="inline-block overflow-hidden pb-1 sm:pb-1.5 -mb-1 sm:-mb-1.5 align-top">
       <span className="inline-block animate-kinetic-2 text-[var(--amber)]">
        the automation of
       </span>
      </span>{" "}
      <span className="inline-block overflow-hidden pb-1 sm:pb-1.5 -mb-1 sm:-mb-1.5 align-top">
       <span className="inline-block animate-kinetic-3">
        a 100-person firm.
       </span>
      </span>
     </h1>
     <p className="animate-hero-subtext mt-4 sm:mt-5 text-base sm:text-lg text-[var(--ink)]/75 max-w-xl leading-relaxed break-words">
      ArchScale unifies your Instagram, WhatsApp, and portfolio channels into an automated lead machine. Never lose high-budget architectural commissions to delayed DM replies.
     </p>

     <div className="animate-hero-cta mt-6 sm:mt-8 flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4">
      <a
       href="#pricing"
       className="inline-flex justify-center items-center rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] px-6 py-3.5 text-sm font-semibold hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-xs cursor-pointer min-h-[48px]"
      >
       Start free trial
      </a>

      <button
       type="button"
       onClick={() => setIsDemoOpen(true)}
       className="group inline-flex justify-center items-center gap-2.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] px-5 py-3.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--ink)]/30 hover:bg-[var(--paper-deep)] active:scale-[0.98] transition-all cursor-pointer min-h-[48px]"
      >
       <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--amber)]/15 text-[var(--amber-deep)] shrink-0 transition-transform group-hover:scale-110">
        <svg viewBox="0 0 10 12" className="w-2.5 h-2.5 translate-x-0.5 fill-current" aria-hidden="true">
         <path d="M0 0 L10 6 L0 12 Z" />
        </svg>
       </span>
       <span>Watch 2-min demo</span>
      </button>
     </div>

     <div className="animate-hero-cta mt-4 sm:mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink)]/55">
      <span className="flex items-center gap-1.5">
       <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
       </svg>
       Free 14-day trial
      </span>
      <span className="text-[var(--ink)]/30">•</span>
      <span>No credit card required</span>
      <span className="text-[var(--ink)]/30">•</span>
      <span>2-minute setup</span>
     </div>
    </div>

    {/* Right Column: Clean Workflow Automation Preview */}
    <div className="relative w-full min-w-0 max-w-2xl lg:max-w-none mx-auto lg:translate-y-10 animate-hero-card">
     {/* Ambient Glow Backdrop */}
     <div
      aria-hidden="true"
      className="ambient-glow-backdrop absolute -inset-3 sm:-inset-6 rounded-3xl bg-gradient-to-tr from-[var(--amber)]/15 via-teal-500/10 to-indigo-500/15 blur-2xl -z-10 pointer-events-none"
     />

     <div className="relative rounded-xl sm:rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-xl overflow-hidden">
      {/* Ambient Beam Sweep Light Effect */}
      <div
       aria-hidden="true"
       className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
       <div className="animate-beam-sweep w-3/4 h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      </div>

      {/* Window Chrome Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--paper-line)] bg-[var(--paper)]">
       <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
         <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
         <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
         <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <span className="ml-2 text-xs font-medium text-[var(--ink)]/75 truncate">
         ArchScale Studio Lead Pipeline
        </span>
       </div>
       <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
         <span className="relative flex h-2 w-2">
          <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
         </span>
         <span>4 steps connected</span>
        </span>
       </div>
      </div>

      {/* Workflow Steps Flow */}
      <div className="p-3.5 sm:p-5 flex flex-col">
       {workflowSteps.map((step, idx) => (
        <div key={step.title} className="flex flex-col">
         <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] dark:bg-[var(--paper-deep)] hover:border-[var(--amber)]/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-2xs min-w-0 group cursor-default">
          <div className="flex items-center gap-3 min-w-0">
           <div className="w-9 h-9 rounded-lg bg-[var(--paper-raised)] dark:bg-[var(--paper-raised)] border border-[var(--paper-line)] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 group-hover:border-[var(--amber)]/30 transition-all duration-200">
            <ServiceIcon name={step.tool} className="w-4 h-4" />
           </div>
           <div className="min-w-0">
            <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-[var(--ink)]">
              {step.tool}
             </span>
             <span className="text-[var(--ink)]/30 text-xs">•</span>
             <span className="text-xs text-[var(--ink)]/55 font-medium">
              {step.step}
             </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--ink)] mt-0.5 leading-snug">
             {step.title}
            </p>
            <p className="text-[11px] text-[var(--ink)]/65 mt-0.5 leading-relaxed">
             {step.description}
            </p>
           </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium group-hover:bg-emerald-500/15 transition-colors">
           <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
           </svg>
           <span className="hidden xs:inline">{step.badge}</span>
          </div>
         </div>

         {idx < workflowSteps.length - 1 && (
          <div className="flex items-center justify-center my-1 relative group/arrow">
           <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--paper-raised)] border border-[var(--paper-line)] text-[var(--ink)]/40 shadow-2xs transition-all duration-200 group-hover/arrow:border-[var(--amber)]/40 group-hover/arrow:text-[var(--amber)]">
            <svg className="w-3 h-3 transition-transform duration-200 group-hover/arrow:translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
           </div>
          </div>
         )}
        </div>
       ))}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-3 border-t border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs text-[var(--ink)]/65">
       <span className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
         <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Runs automatically on every new Meta & WhatsApp inquiry
       </span>
       <span className="text-xs font-medium text-[var(--amber-deep)]">
        Autonomous
       </span>
      </div>
     </div>
    </div>
   </div>

   <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
  </section>
 );
}
