'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, ArrowRight } from 'lucide-react';
import AuthModal from '@/components/AuthModal';

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [memberName, setMemberName] = useState('');
  const [memberSpecialty, setMemberSpecialty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        setMemberName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '');
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setMemberName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [code]);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !code || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: code,
          userId: currentUser.id,
          email: currentUser.email,
          name: memberName.trim() || currentUser.email?.split('@')[0],
          specialty: memberSpecialty.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
        setJoined(true);
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setError(data.error || 'Could not join team');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInAndJoin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/join/${code}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center mx-auto shadow-xs">
          <Users size={24} />
        </div>

        {joined ? (
          <div className="space-y-3 animate-fade-in">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
            <h1 className="font-display font-bold text-xl text-[var(--ink)]">
              Joined {team?.name || 'Studio Team'}!
            </h1>
            <p className="text-xs text-[var(--ink)]/60">
              Redirecting to your live studio dashboard...
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="text-center">
              <h1 className="font-display font-bold text-xl text-[var(--ink)]">
                Join Studio Team
              </h1>
              <p className="text-xs text-[var(--ink)]/60 mt-1">
                You&apos;ve been invited to collaborate as a specialist partner on Scale.
              </p>
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-500 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            {!currentUser ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <span>Sign in with Password / Demo to Join</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <form onSubmit={handleJoin} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="e.g. Biplabi Roy"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                    Your Specialty / Designation
                  </label>
                  <input
                    type="text"
                    list="designation-suggestions"
                    value={memberSpecialty}
                    onChange={(e) => setMemberSpecialty(e.target.value)}
                    placeholder="e.g. Fullstack Developer, UI/UX Designer, Lead Architect..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                  />
                  <datalist id="designation-suggestions">
                    <option value="Fullstack Web Developer" />
                    <option value="UI/UX Product Designer" />
                    <option value="Lead Architect" />
                    <option value="Interior Architecture & FF&E" />
                    <option value="Digital Marketing Strategist" />
                    <option value="BIM & Computational Design" />
                    <option value="Commercial Architecture" />
                    <option value="Project Manager" />
                  </datalist>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                >
                  <span>{isSubmitting ? 'Joining Team...' : 'Confirm & Join Team'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signin"
      />
    </div>
  );
}
