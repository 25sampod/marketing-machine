"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#top"
      aria-label="Back to top"
      className={`fixed right-3.5 sm:right-6 md:right-8 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-40 w-11 h-11 rounded-full bg-[var(--ink)]/90 backdrop-blur-sm text-[var(--text-on-ink)] border border-[var(--paper-line)]/20 flex items-center justify-center shadow-md sm:shadow-lg transition-all duration-300 hover:bg-[var(--amber-deep)] hover:text-[var(--text-on-amber)] active:scale-95 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
        <path
          d="M10 15V5M10 5L5 10M10 5l5 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
