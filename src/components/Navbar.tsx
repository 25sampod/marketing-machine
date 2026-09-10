"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { nav } from "@/lib/content";
import { useTheme } from "./ThemeProvider";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isDark = mounted && theme === "dark";
  const isLoggedIn = mounted && (Boolean(user) || hasSession);

  useEffect(() => {
    setMounted(true);

    // 1. Instant check from localStorage
    try {
      if (localStorage.getItem('archscale_has_session') === 'true') {
        setHasSession(true);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item?.user) {
            setUser(item.user);
            setHasSession(true);
          }
        }
      }
    } catch (e) {}

    // 2. Supabase getSession (fast local token check)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setHasSession(true);
      }
    });

    // 3. Supabase getUser (server-validated check)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setHasSession(true);
      }
    }).catch(() => {});

    // 4. Realtime auth change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setHasSession(false);
        try {
          localStorage.removeItem('archscale_has_session');
        } catch (e) {}
      } else if (session?.user) {
        setUser(session.user);
        setHasSession(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
        },
      });
    } catch (err) {
      console.error("Error signing in with Google:", err);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 border-b transition-colors ${
        scrolled || open
          ? "bg-[var(--paper)]/95 backdrop-blur border-[var(--paper-line)]"
          : "bg-transparent border-transparent"
      }`}
    >
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <a
          href="#top"
          className="font-display font-bold text-xl tracking-tight text-[var(--ink)] flex items-center gap-2"
        >
          <span className="w-6 h-6 rounded-md bg-[var(--amber)] text-[var(--text-on-amber)] flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
            AS
          </span>
          <span>ArchScale</span>
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-sm text-[var(--ink)]/80 hover:text-[var(--ink)] transition-colors font-medium"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            suppressHydrationWarning
            className="relative w-10 h-10 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] flex items-center justify-center hover:bg-[var(--paper-line)] active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden group"
          >
            <div className="transition-transform duration-300 ease-out group-hover:rotate-12">
              {isDark ? (
                <svg className="w-5 h-5 text-[var(--ink)] transition-transform duration-300 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[var(--ink)] transition-transform duration-300 animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          </button>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-sm font-semibold px-4 py-2.5 hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            >
              <span>Dashboard</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="text-sm text-[var(--ink)]/80 hover:text-[var(--ink)] transition-colors font-medium cursor-pointer"
              >
                Sign in
              </button>
              <a
                href="#pricing"
                className="inline-flex items-center rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-sm font-semibold px-4 py-2.5 hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
              >
                Start free trial
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden relative w-11 h-11 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)]/60 hover:bg-[var(--paper-line)]/50 flex flex-col items-center justify-center gap-[5px] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--amber)] cursor-pointer"
        >
          <span
            className={`block h-[2px] w-5 bg-[var(--ink)] transition-transform duration-200 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-5 bg-[var(--ink)] transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-[2px] w-5 bg-[var(--ink)] transition-transform duration-200 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      <div
        id="mobile-menu"
        className={`md:hidden transition-[max-height] duration-300 ease-in-out bg-[var(--paper)]/95 backdrop-blur-xl border-t border-[var(--paper-line)] shadow-xl ${
          open ? "max-h-[calc(100dvh-4rem)] overflow-y-auto" : "max-h-0 overflow-hidden"
        }`}
      >
        <ul className="px-4 sm:px-6 py-4 flex flex-col gap-1">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-3.5 text-base font-medium text-[var(--ink)] border-b border-[var(--paper-line)] last:border-none active:text-[var(--amber-deep)] transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="px-4 sm:px-6 pb-6 pt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            suppressHydrationWarning
            className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] text-base font-medium text-[var(--ink)] cursor-pointer hover:bg-[var(--paper-line)]/50 transition-colors"
          >
            <span suppressHydrationWarning>{isDark ? "Light mode" : "Dark mode"}</span>
            {isDark ? (
              <svg className="w-5 h-5 text-[var(--ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="inline-flex justify-center items-center gap-1.5 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-sm font-semibold px-4 py-3.5 hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-xs"
            >
              <span>Dashboard</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleGoogleSignIn();
                }}
                className="text-sm text-center py-2 text-[var(--ink)]/80 hover:text-[var(--ink)] cursor-pointer"
              >
                Sign in
              </button>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="inline-flex justify-center items-center rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-sm font-semibold px-4 py-3.5 hover:bg-[var(--amber-deep)] active:scale-[0.98] transition-all shadow-xs"
              >
                Start free trial
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
