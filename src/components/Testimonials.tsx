"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { testimonials } from "@/lib/content";


export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [firstAnimationDone, setFirstAnimationDone] = useState(false);
  const hasTriggeredFirst = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const total = testimonials.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // FIRST ANIMATION (Scroll animation):
  // When the card reaches the middle of the viewing page,
  // execute the slide from Card 1 (OrbitScale, index 0) to Card 2 (Halcyon Systems, index 1).
  useEffect(() => {
    if (hasTriggeredFirst.current) return;

    const checkMiddle = () => {
      if (hasTriggeredFirst.current) return;
      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const cardCenter = rect.top + rect.height / 2;
      const viewportCenter = vh / 2;

      // Card is in the middle of the viewing page:
      // When scrolling down, the card center reaches the viewport middle area (within 80px),
      // or when the card center is within 20% of the screen center.
      const isInMiddle =
        (cardCenter <= viewportCenter + 80 && rect.top < vh * 0.65 && rect.bottom > vh * 0.25) ||
        Math.abs(cardCenter - viewportCenter) <= Math.max(vh * 0.2, 140);

      if (isInMiddle) {
        hasTriggeredFirst.current = true;
        window.removeEventListener("scroll", handleScroll);

        // Brief 200ms settle so user clearly sees Card 1 in the middle, then slides 0 -> 1
        setTimeout(() => {
          setActiveIndex(1);
          setFirstAnimationDone(true);
        }, 200);
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkMiddle();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    checkMiddle();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // SECOND ANIMATION:
  // Only occurs AFTER the first animation happens.
  // Runs automatically every 5 seconds (5000ms), advancing 2 -> 3 -> 4 -> 5 -> 1...
  // Runs continuously regardless of mouse position (no hover pausing).
  useEffect(() => {
    if (!firstAnimationDone) return;

    const timer = setInterval(() => {
      if (document.hidden) return;
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [firstAnimationDone, nextSlide, activeIndex]);

  // Reliable touch swipe support: tracks both X and Y to avoid hijacking vertical scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Only swipe if horizontal motion clearly dominates vertical scrolling
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "ArrowRight") nextSlide();
  };

  return (
    <section
      className="py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden bg-[var(--paper)]"
      aria-roledescription="carousel"
      aria-label="Customer Testimonials"
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs font-mono text-[var(--amber-deep)] mb-3 sm:mb-4">
              <span>★ 4.9/5</span>
              <span className="text-[var(--ink)]/55">across 300+ engineering teams</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight max-w-md font-medium text-[var(--ink)]">
              Teams notice the difference in the first week
            </h2>
          </div>

          {/* Controls with accessible 44px touch targets */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous testimonial"
              className="w-11 h-11 rounded-full border border-[var(--paper-line)] flex items-center justify-center text-[var(--ink)]/70 hover:border-[var(--amber)] hover:text-[var(--amber-deep)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-[var(--ink)]/50 font-mono px-1">
              {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next testimonial"
              className="w-11 h-11 rounded-full border border-[var(--paper-line)] flex items-center justify-center text-[var(--ink)]/70 hover:border-[var(--amber)] hover:text-[var(--amber-deep)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel Viewport */}
        <div ref={cardRef}>
          <div
            className="relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
          <div
            className="flex transition-transform duration-600 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {testimonials.map((t, index) => (
              <div
                key={t.name}
                className="w-full shrink-0 px-1"
                aria-hidden={activeIndex !== index}
              >
                <figure className="bg-[var(--paper-raised)] border border-[var(--paper-line)] p-4 sm:p-8 md:p-14 flex flex-col justify-between min-h-[280px] sm:min-h-[320px] rounded-xl sm:rounded-2xl relative overflow-hidden shadow-sm">

                  {/* Top Bar: Company Badge & Quantified Result */}
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-[var(--paper-line)] relative z-10">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)] text-xs font-mono font-bold text-[var(--amber-deep)] flex items-center justify-center">
                        {t.companyBadge}
                      </span>
                      <span className="font-display font-medium text-sm sm:text-base text-[var(--ink)]">
                        {t.company}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-[var(--amber)]/10 border border-[var(--amber)]/20 text-xs font-mono text-[var(--amber-deep)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)]" />
                      <span className="font-bold">{t.metric}</span>
                      <span className="text-[var(--ink)]/55">{t.metricLabel}</span>
                    </div>
                  </div>

                  {/* Star Rating & Quote */}
                  <div className="relative z-10 my-1 sm:my-2">
                    <div className="flex items-center gap-1 text-[var(--amber)] mb-3 sm:mb-4" aria-label="5 star rating">
                      {[...Array(5)].map((_, starIdx) => (
                        <svg key={starIdx} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <blockquote className="text-base sm:text-lg md:text-xl lg:text-2xl text-[var(--ink)]/90 font-light leading-relaxed max-w-3xl break-words">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>

                  {/* Author Figcaption */}
                  <figcaption className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[var(--paper-line)] flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] text-xs font-mono font-medium text-[var(--ink)] flex items-center justify-center shrink-0">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--ink)]">
                          {t.name}
                        </p>
                        <p className="text-[11px] sm:text-xs text-[var(--ink)]/55">
                          {t.role} • {t.company}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-teal bg-teal/10 px-2 sm:px-2.5 py-1 rounded border border-teal/20 shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Verified</span>
                    </span>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Indicator dots with 36px touch targets */}
        <div className="flex items-center justify-center gap-1 mt-6 sm:mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              aria-current={activeIndex === i ? "true" : undefined}
              className="p-2 cursor-pointer flex items-center justify-center"
            >
              <span
                className={`h-1.5 rounded-full transition-all duration-300 block ${
                  activeIndex === i
                    ? "w-8 bg-[var(--amber)]"
                    : "w-2 bg-[var(--paper-line)] hover:bg-[var(--ink)]/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
