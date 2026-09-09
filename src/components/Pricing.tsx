"use client";

import { useState } from "react";
import { plans } from "@/lib/content";
import Reveal from "./Reveal";


export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[var(--paper)] transition-colors overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal variant="reveal-left" className="max-w-xl mb-8 sm:mb-12">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)] break-words">
            Transparent, predictable pricing
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
            Start free, scale as your team&apos;s automation demands grow. Transparent plans with zero surprise overages or hidden charges.
          </p>
        </Reveal>

        {/* Billing Cycle Toggle */}
        <div className="mb-10 sm:mb-12 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none py-2 px-3 min-h-[44px] flex items-center rounded-lg ${
              !isAnnual ? "text-[var(--ink)] font-semibold" : "text-[var(--ink)]/45 hover:text-[var(--ink)]"
            }`}
          >
            Monthly billing
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            aria-label="Switch to annual billing"
            onClick={() => setIsAnnual((v) => !v)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)] ${
              isAnnual ? "bg-[var(--amber)]" : "bg-[var(--paper-line)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-out ${
                isAnnual ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer select-none py-2 px-3 min-h-[44px] rounded-lg ${
              isAnnual ? "text-[var(--ink)] font-semibold" : "text-[var(--ink)]/45 hover:text-[var(--ink)]"
            }`}
          >
            <span>Annual billing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-semibold bg-[var(--amber)]/15 text-[var(--amber-deep)] border border-[var(--amber)]/30">
              Save ~17%
            </span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <Reveal variant="reveal-stagger" className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch min-w-0">
          {plans.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const isPopular = plan.highlighted;

            return (
              <div
                key={plan.name}
                className={`rounded-2xl p-5 sm:p-7 md:px-5 md:py-6 lg:p-8 flex flex-col justify-between relative min-w-0 transform-gpu transition-all duration-350 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  isPopular
                    ? "bg-[var(--paper-raised)] dark:bg-[var(--paper-deep)] border-2 border-[var(--amber)] shadow-md hover:-translate-y-1.5 hover:shadow-2xl"
                    : "bg-[var(--paper)] dark:bg-[var(--paper-raised)] border border-[var(--paper-line)] shadow-xs hover:border-[var(--amber)]/50 hover:-translate-y-1.5 hover:shadow-xl"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="px-3 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-[var(--amber)] text-[var(--text-on-amber)] shadow-xs whitespace-nowrap">
                      Recommended for teams
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-display text-xl text-[var(--ink)] font-semibold">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-sm text-[var(--ink)]/65 mb-5 sm:mb-6 leading-relaxed min-h-[2.5rem]">
                    {plan.description}
                  </p>

                  <div className="mb-6 pb-6 border-b border-[var(--paper-line)]">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span key={price} className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] tracking-tight font-bold tabular-nums inline-block animate-num-fade">
                        {price}
                      </span>
                      <span className="text-xs font-mono text-[var(--ink)]/60">
                        {plan.name === "Team" ? "per member / mo" : plan.period}
                      </span>
                    </div>
                    <div className="mt-2 min-h-[1.25rem] flex items-center">
                      {plan.name === "Team" ? (
                        <span key={isAnnual ? "ann" : "mo"} className={`text-[11px] font-mono transition-colors animate-num-fade ${
                          isAnnual ? "text-[var(--amber-deep)] font-semibold" : "text-[var(--ink)]/50"
                        }`}>
                          {isAnnual ? "Billed annually ($180/yr)" : "Billed monthly ($216/yr)"}
                        </span>
                      ) : plan.name === "Starter" ? (
                        <span className="text-[11px] font-mono text-[var(--ink)]/40">
                          Free forever · No credit card
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-[var(--ink)]/40">
                          Custom terms · Invoiced annually
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-mono uppercase tracking-wider text-[var(--ink)]/50 mb-4 font-semibold">
                    What&apos;s included
                  </p>

                  <ul className="flex flex-col gap-3 sm:gap-3.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--ink)]/80">
                        <svg viewBox="0 0 16 16" className="w-4 h-4 mt-0.5 shrink-0 text-teal" fill="none">
                          <path d="M3.5 8.2l2.6 2.6L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#cta"
                  className={`w-full min-h-[48px] inline-flex justify-center items-center rounded-lg px-5 py-3 text-sm font-semibold active:scale-[0.98] transition-colors duration-200 cursor-pointer ${
                    isPopular
                      ? "bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-deep)] shadow-xs"
                      : "border border-[var(--paper-line)] bg-[var(--paper-raised)]/60 text-[var(--ink)] hover:border-[var(--ink)]/40 hover:bg-[var(--paper-raised)]"
                  }`}
                >
                  {price === "Custom" ? "Contact sales team" : "Start free trial"}
                </a>
              </div>
            );
          })}
        </Reveal>

        {/* Enterprise Trust & Security Guarantees: 2x2 Grid on Mobile, 4-across on Tablet/Desktop */}
        <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-[var(--paper-line)] grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 text-center min-w-0">
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-raised)]/40 border border-[var(--paper-line)]/70 hover:bg-[var(--paper-raised)]/70 transition-colors min-w-0">
            <span className="font-mono text-xs font-bold text-[var(--ink)] uppercase tracking-wider block mb-1">
              SOC 2 Type II
            </span>
            <span className="text-[11px] sm:text-xs text-[var(--ink)]/60 leading-relaxed">
              Enterprise encryption at rest &amp; in transit
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-raised)]/40 border border-[var(--paper-line)]/70 hover:bg-[var(--paper-raised)]/70 transition-colors min-w-0">
            <span className="font-mono text-xs font-bold text-teal uppercase tracking-wider block mb-1">
              99.99% Uptime SLA
            </span>
            <span className="text-[11px] sm:text-xs text-[var(--ink)]/60 leading-relaxed">
              Redundant cloud infrastructure &amp; live health
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-raised)]/40 border border-[var(--paper-line)]/70 hover:bg-[var(--paper-raised)]/70 transition-colors min-w-0">
            <span className="font-mono text-xs font-bold text-[var(--ink)] uppercase tracking-wider block mb-1">
              14-Day Free Trial
            </span>
            <span className="text-[11px] sm:text-xs text-[var(--ink)]/60 leading-relaxed">
              Instant workspace setup with zero credit card
            </span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-raised)]/40 border border-[var(--paper-line)]/70 hover:bg-[var(--paper-raised)]/70 transition-colors min-w-0">
            <span className="font-mono text-xs font-bold text-[var(--amber-deep)] uppercase tracking-wider block mb-1">
              Zero Vendor Lock-In
            </span>
            <span className="text-[11px] sm:text-xs text-[var(--ink)]/60 leading-relaxed">
              1-click JSON/CSV workflow export anytime
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
