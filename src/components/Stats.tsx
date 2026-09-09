import { stats } from "@/lib/content";
import Reveal from "./Reveal";

export default function Stats() {
  return (
    <section className="border-y border-[var(--paper-line)] py-10 sm:py-16 md:py-20 bg-[var(--paper)] overflow-hidden">
      <Reveal
        variant="reveal-stagger"
        className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 min-w-0"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative p-3.5 sm:p-5 lg:p-6 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)]/40 hover:bg-[var(--paper-raised)]/80 hover:border-[var(--amber)]/40 transition-all shadow-2xs flex flex-col justify-center min-w-0"
          >
            <div className="absolute top-0 left-3 sm:left-4 right-3 sm:right-4 h-0.5 bg-[var(--amber)]/20 rounded-full group-hover:bg-[var(--amber)] transition-colors" />
            <p className="font-display text-xl sm:text-3xl md:text-3xl lg:text-5xl font-bold tracking-tight text-[var(--ink)] flex items-baseline tabular-nums">
              <span>{stat.value}</span>
              <span className="text-[var(--amber-deep)] ml-0.5 text-lg sm:text-2xl md:text-2xl lg:text-4xl">
                {stat.suffix}
              </span>
            </p>
            <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs md:text-sm text-[var(--ink)]/70 font-medium leading-snug break-words">
              {stat.label}
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
