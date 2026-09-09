"use client";

import { useState, useRef, useEffect } from "react";
import { solutions } from "@/lib/content";
import Reveal from "./Reveal";

export default function Solutions() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const button = tabRefs.current[activeTab];
    if (!container || !button) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (activeTab === 0) {
        container.scrollLeft = 0;
        return;
      }
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const currentScroll = container.scrollLeft;
    const scrollTarget = currentScroll + (buttonRect.left - containerRect.left) - (container.clientWidth - buttonRect.width) / 2;
    container.scrollTo({ left: Math.max(0, scrollTarget), behavior: "smooth" });
  }, [activeTab]);

  return (
    <section id="solutions" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[var(--paper)] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[var(--ink)] break-words">
            Built around how your team already works
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
            NOVA adapts to the specific workflows of each team, integrating directly with the tools you rely on every day.
          </p>
        </Reveal>

        {/* Role Switcher Segmented Control */}
        <Reveal className="w-full">
          <div
            ref={scrollContainerRef}
            className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-none pb-3 pt-1 scroll-smooth snap-x snap-proximity scroll-px-4 relative flex"
          >
            <div className="flex min-w-full px-4 sm:px-0 w-max">
              <div className="flex-1" aria-hidden="true"></div>
              <div
                role="tablist"
                aria-label="Department Solutions"
                className="inline-flex p-1.5 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] gap-1.5 shadow-2xs shrink-0"
              >
                {solutions.map((item, idx) => {
                  const isActive = activeTab === idx;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        tabRefs.current[idx] = el;
                      }}
                      id={`solution-tab-${item.id}`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`solution-panel-${item.id}`}
                      type="button"
                      onClick={() => setActiveTab(idx)}
                      className={`px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer select-none min-h-[44px] flex items-center shrink-0 snap-start active:scale-[0.98] ${
                        isActive
                          ? "bg-[var(--amber)] text-[var(--text-on-amber)] shadow-xs font-semibold"
                          : "text-[var(--ink)]/65 hover:text-[var(--ink)] hover:bg-[var(--paper-line)]/50"
                      }`}
                    >
                      {item.role}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1" aria-hidden="true"></div>
            </div>
          </div>
        </Reveal>

        {/* Active Solution Interactive Preview Card with Stacked Grid Crossfade */}
        <Reveal className="w-full">
          <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-4 sm:p-7 md:p-8 lg:p-10 shadow-xs relative overflow-hidden">
            {/* Stacked CSS Grid: Locks container height to tallest panel, eliminating any layout shift */}
            <div className="w-full min-w-0 grid grid-cols-1 grid-rows-1 items-start">
              {solutions.map((sol, idx) => {
                const isActive = activeTab === idx;
                return (
                  <div
                    key={sol.id}
                    id={`solution-panel-${sol.id}`}
                    role="tabpanel"
                    aria-labelledby={`solution-tab-${sol.id}`}
                    aria-hidden={!isActive}
                    className={`col-start-1 row-start-1 w-full min-w-0 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.15fr_1fr] gap-6 md:gap-8 lg:gap-10 items-start transition-all duration-350 ease-out ${
                      isActive
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 translate-y-3 scale-[0.985] pointer-events-none"
                    }`}
                  >
                    {/* Left: Solution Details */}
                    <div className="w-full min-w-0">
                      <h3 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl text-[var(--ink)] font-semibold tracking-tight mb-3 sm:mb-4 leading-snug break-words">
                        {sol.headline}
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base text-[var(--ink)]/75 leading-relaxed mb-5 sm:mb-8 max-w-xl break-words">
                        {sol.description}
                      </p>

                      {/* Integrated Tools Badges */}
                      <div className="mb-5 sm:mb-6">
                        <span className="text-[11px] sm:text-xs font-mono text-[var(--ink)]/50 uppercase tracking-wider block mb-2">
                          Native Tool Integrations
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {sol.tools.map((tool) => (
                            <span
                              key={tool}
                              className="px-2.5 sm:px-3 py-1 rounded-md bg-[var(--paper)] border border-[var(--paper-line)] text-xs font-medium text-[var(--ink)]/80 shadow-2xs hover:border-[var(--amber)]/40 transition-colors"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Verified Metric Pill */}
                      <div className="pt-4 sm:pt-6 border-t border-[var(--paper-line)] flex items-baseline gap-2 flex-wrap">
                        <span className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[var(--amber-deep)]">
                          {sol.metric}
                        </span>
                        <span className="text-xs sm:text-sm text-[var(--ink)]/65 font-medium">
                          {sol.metricLabel}
                        </span>
                      </div>
                    </div>

                    {/* Right: Real-Time Workflows Box */}
                    <div className="w-full min-w-0 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] dark:bg-[var(--paper-deep)] p-3.5 sm:p-5 md:p-6 shadow-2xs flex flex-col gap-3 sm:gap-4">
                      <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[var(--paper-line)]">
                        <span className="text-[11px] sm:text-xs font-semibold text-[var(--ink)]/75 uppercase tracking-wider font-mono">
                          Prebuilt Automations
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[var(--ink)]/55 bg-[var(--paper-raised)] dark:bg-[var(--paper-raised)] px-2 sm:px-2.5 py-0.5 rounded border border-[var(--paper-line)]">
                          3 included
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-3">
                        {sol.workflows.map((wf, i) => (
                          <div
                            key={wf.name}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)]/60 dark:bg-[var(--paper-raised)] hover:bg-[var(--paper-raised)] active:scale-[0.99] transition-all text-xs gap-2 min-w-0"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[var(--amber)]/15 text-[var(--amber-deep)] font-mono text-[10px] sm:text-xs font-semibold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <span className="font-medium text-[var(--ink)] truncate">
                                {wf.name}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] sm:text-[11px] text-[var(--ink)]/55 px-2 py-0.5 rounded bg-[var(--paper)] dark:bg-[var(--paper-deep)] border border-[var(--paper-line)] shrink-0 font-medium">
                              {wf.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-1.5 sm:pt-2 text-center">
                        <a
                          href="#pricing"
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--amber-deep)] hover:underline active:text-[var(--amber)] transition-colors flex-wrap"
                        >
                          <span className="break-words">Explore all {sol.role.toLowerCase()} templates</span>
                          <span aria-hidden="true">&rarr;</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
