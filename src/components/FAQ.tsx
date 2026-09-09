"use client";

import { useState } from "react";
import { faqs } from "@/lib/content";
import Reveal from "./Reveal";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[var(--paper)] transition-colors overflow-hidden">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="mb-10 sm:mb-14 text-center sm:text-left">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)] break-words">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
            Everything you need to know about integrations, security protocols, reliability, and team onboarding.
          </p>
        </Reveal>

        <Reveal delay={80} className="border-t border-[var(--paper-line)]">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className="border-b border-[var(--paper-line)]">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-header-${i}`}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full min-h-[48px] flex items-center justify-between gap-3 py-4 sm:py-5 text-left cursor-pointer group select-none"
                  >
                    <span className="font-display text-sm sm:text-base md:text-lg text-[var(--ink)] font-medium group-hover:text-[var(--amber-deep)] transition-colors break-words pr-2">
                      {item.question}
                    </span>
                    <span
                      className="relative w-5 h-5 shrink-0 text-[var(--ink)]/60 group-hover:text-[var(--amber-deep)] transition-colors"
                      aria-hidden
                    >
                      <span className="absolute inset-y-1/2 left-0 w-full h-px bg-current -translate-y-1/2" />
                      <span
                        className={`absolute inset-y-1/2 left-0 w-full h-px bg-current -translate-y-1/2 transition-transform duration-200 ${
                          isOpen ? "rotate-0 scale-x-0" : "rotate-90"
                        }`}
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-header-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className={`pb-5 sm:pb-6 pr-2 sm:pr-8 text-[var(--ink)]/70 leading-relaxed text-xs sm:text-sm md:text-base break-words transition-all duration-300 ease-out ${
                      isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
                    }`}>
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>

        {/* Post-FAQ Support Banner */}
        <Reveal delay={120} className="mt-10 sm:mt-14 p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-[var(--paper-raised)] border border-[var(--paper-line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 shadow-sm">
          <div>
            <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)]">
              Still have questions?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink)]/65 mt-1 leading-relaxed">
              Can&apos;t find what you&apos;re looking for? Our product engineering team responds in under 15 minutes.
            </p>
          </div>
          <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            <a
              href="#cta"
              className="inline-flex justify-center items-center gap-2 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] px-4 py-2.5 text-xs font-semibold hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all cursor-pointer min-h-[44px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat with team</span>
            </a>
            <a
              href="#product"
              className="inline-flex justify-center items-center rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] px-4 py-2.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]/40 active:scale-[0.98] transition-all cursor-pointer min-h-[44px]"
            >
              Browse documentation
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
