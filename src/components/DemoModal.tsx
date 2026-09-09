"use client";

import { useEffect, useRef } from "react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Trap focus inside modal on mount
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      aria-describedby="demo-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-4xl bg-[var(--paper)] border border-[var(--paper-line)] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden focus:outline-none flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--amber)]" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[var(--ink)]/60">
                Product Tour
              </span>
            </div>
            <h2
              id="demo-modal-title"
              className="font-display text-lg sm:text-xl font-semibold text-[var(--ink)] tracking-tight"
            >
              See Nova in Action
            </h2>
            <p id="demo-modal-desc" className="sr-only">
              A 2-minute product walkthrough video showcasing Nova&apos;s project management and workflow automation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo modal"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--paper-line)] text-xs text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper-line)]/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)] cursor-pointer min-h-[44px]"
          >
            <span className="hidden sm:inline font-mono text-[10px] text-[var(--ink)]/40 bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--paper-line)]">
              ESC
            </span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="p-4 sm:p-6 bg-[var(--paper)]">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-[var(--paper-line)] shadow-lg">
            <iframe
              src="https://www.youtube-nocookie.com/embed/9Q5BoiIFBiY?autoplay=1&rel=0&modestbranding=1"
              title="Nova Platform Product Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-[var(--ink)]/60 hidden sm:block">
            Want to see how Nova works with your stack?
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper-line)]/50 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              Dismiss
            </button>
            <a
              href="#pricing"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--ink)] text-[var(--text-on-ink)] text-xs font-semibold hover:bg-[var(--amber-deep)] hover:text-[var(--text-on-amber)] active:scale-[0.98] transition-all cursor-pointer shadow-xs min-h-[44px]"
            >
              <span>Start Free Trial</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
