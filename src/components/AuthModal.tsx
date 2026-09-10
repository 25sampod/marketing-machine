'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'signin',
}: AuthModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(defaultMode);
    setError(null);
    setSuccessMsg(null);
  }, [defaultMode, isOpen]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1-Click Hackathon Judge Quick Access
  const handleDemoQuickLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setDemoLoading(true);

    const demoEmail = 'demo@archscale.com';
    const demoPassword = 'Hackathon2026!';
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      // 1. Ensure the demo user is provisioned in Supabase
      try {
        await fetch('/api/auth/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: demoEmail, password: demoPassword }),
        });
      } catch (e) {
        // Fallback directly to client auth
      }

      // 2. Sign in with password
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (signInErr) {
        // If signInWithPassword fails because account was not yet created, attempt sign-up
        const { error: signUpErr } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
        });

        if (signUpErr) {
          setError(signUpErr.message || 'Demo login failed');
          setDemoLoading(false);
          return;
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('archscale_has_session', 'true');
      }

      setSuccessMsg('Demo credentials verified! Launching dashboard...');
      setTimeout(() => {
        onClose();
        router.push('/dashboard');
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo account.');
    } finally {
      setDemoLoading(false);
    }
  };

  // Standard Email & Password submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        // Check if demo user provision needed
        if (email.toLowerCase().includes('demo@')) {
          try {
            await fetch('/api/auth/demo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
          } catch (e) {}
        }

        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) {
          setError(signInErr.message);
          setLoading(false);
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('archscale_has_session', 'true');
        }

        setSuccessMsg('Authenticated successfully! Redirecting...');
        setTimeout(() => {
          onClose();
          router.push('/dashboard');
        }, 500);
      } else {
        // Sign up
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) {
          setError(signUpErr.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('archscale_has_session', 'true');
          }
          setSuccessMsg('Account created! Launching your studio...');
          setTimeout(() => {
            onClose();
            router.push('/dashboard');
          }, 600);
        } else {
          setSuccessMsg('Account created! You can now sign in with your password.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Optional Google OAuth fallback
  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[var(--paper)] border border-[var(--paper-line)] rounded-2xl shadow-2xl overflow-hidden focus:outline-none flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--paper-line)] bg-[var(--paper-raised)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[var(--amber)] text-[var(--text-on-amber)] flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
              AS
            </span>
            <h2 className="font-semibold text-sm text-[var(--ink)]">
              {mode === 'signin' ? 'Sign in to ArchScale' : 'Create Studio Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--ink)]/50 hover:text-[var(--ink)] hover:bg-[var(--paper-line)]/50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Hackathon Judge 1-Click Fast Access */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Hackathon Judge Quick Access
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                1-Click Demo
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink)]/70 leading-relaxed">
              No registration required. Pre-loaded with demo architecture leads, LPI scores, and test pipelines.
            </p>
            <button
              type="button"
              onClick={handleDemoQuickLogin}
              disabled={demoLoading || loading}
              className="w-full py-2 px-3 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {demoLoading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Logging in as Demo Judge...</span>
                </>
              ) : (
                <>
                  <Zap size={13} />
                  <span>1-Click Hackathon Judge Login</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-[var(--ink)]/40 my-1">
            <div className="h-[1px] bg-[var(--paper-line)] flex-1" />
            <span>Or use Email &amp; Password</span>
            <div className="h-[1px] bg-[var(--paper-line)] flex-1" />
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--ink)]/60 block mb-1 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
                <input
                  type="email"
                  required
                  placeholder="architect@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-mono pl-9 pr-3 py-2.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[var(--ink)]/60 block mb-1 font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-mono pl-9 pr-10 py-2.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40 hover:text-[var(--ink)] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-xs font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign in with Password' : 'Create Account'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Alternative Google Sign In */}
          <div className="pt-2 border-t border-[var(--paper-line)]/60">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || demoLoading}
              className="w-full py-2 px-3 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper-line)]/50 text-[var(--ink)] text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Or continue with Google</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
            >
              {mode === 'signin' ? (
                <>
                  New to ArchScale? <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-semibold underline">Create an account</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-semibold underline">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
