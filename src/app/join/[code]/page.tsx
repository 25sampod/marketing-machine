'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    init();
  }, [code]);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user && code) {
      // User is logged in: automatically join!
      try {
        const res = await fetch('/api/teams/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: code,
            userId: user.id,
            email: user.email,
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
        setError(err.message);
      }
    }
    setLoading(false);
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
          <div className="space-y-4">
            <div>
              <h1 className="font-display font-bold text-xl text-[var(--ink)]">
                Join Studio Team
              </h1>
              <p className="text-xs text-[var(--ink)]/60 mt-1">
                You&apos;ve been invited to collaborate as an architectural specialist on ArchScale.
              </p>
            </div>

            {error && (
              <p className="text-xs font-mono text-rose-500 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            {!currentUser ? (
              <button
                type="button"
                onClick={handleSignInAndJoin}
                className="w-full py-3 px-4 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <span>Sign in with Google to Join</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={init}
                className="w-full py-3 px-4 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <span>Accept Invitation</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
