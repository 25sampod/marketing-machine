import WaitlistForm from "./WaitlistForm";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section id="cta" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[var(--paper-raised)] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center min-w-0">
        <Reveal variant="reveal-left" className="w-full min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight max-w-lg leading-[1.15] sm:leading-[1.1] font-semibold text-[var(--ink)] break-words">
            Ready to automate your studio&apos;s lead intake?
          </h2>
          <p className="mt-3 sm:mt-5 text-sm sm:text-base text-[var(--ink)]/70 max-w-md leading-relaxed break-words">
            Give your practice the speed and responsiveness of an enterprise firm. Qualify high-value commissions on day one.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4">
            <a
              href="#pricing"
              className="inline-flex justify-center items-center rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-xs cursor-pointer min-h-[44px] sm:min-h-[48px]"
            >
              Start free trial
            </a>
            <a
              href="#product"
              className="inline-flex justify-center items-center rounded-lg border border-[var(--paper-line)] px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-[var(--ink)] hover:border-[var(--ink)]/40 hover:bg-[var(--paper-deep)]/50 active:scale-[0.98] transition-all cursor-pointer min-h-[44px] sm:min-h-[48px]"
            >
              Explore platform
            </a>
          </div>
        </Reveal>

        <Reveal className="w-full min-w-0" style={{ transitionDelay: "150ms" }}>
          <div className="bg-[var(--paper)] dark:bg-[var(--paper-deep)] border border-[var(--paper-line)] p-4 sm:p-8 md:p-10 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden min-w-0">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-teal font-medium">
                Instant Onboarding
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl text-[var(--ink)] mb-2 relative z-10 font-semibold break-words">
              Test Inbound Intake
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink)]/65 mb-5 sm:mb-6 leading-relaxed relative z-10 break-words">
              Enter your contact details to experience how our autonomous AI qualifies client briefs in real time.
            </p>
            <div className="relative z-10">
              <WaitlistForm />
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--paper-line)] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[var(--ink)]/55 relative z-10">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                14-day free Team trial
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                SOC 2 Type II Certified
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
