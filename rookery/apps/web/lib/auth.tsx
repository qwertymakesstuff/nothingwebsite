'use client';

// Session state for the whole site. Supabase Auth issues the session (stored by supabase-js in
// this browser); this provider exposes it plus the signed-in player's profile row.

import type { Session } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LoadingState } from '@/components/ui/States';
import { fetchOwnProfile, type ProfileRow } from './db';
import { supabase } from './supabase/client';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthCtx {
  status: Status;
  session: Session | null;
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  /** Why the profile couldn't be loaded (null while loading or when fine). */
  profileError: string | null;
  /** Re-reads the profile row (after editing it). */
  refreshProfile: () => Promise<void>;
  signOut: (scope?: 'local' | 'global') => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus(s ? 'signedIn' : 'signedOut');
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const loadProfile = useCallback(async () => {
    setProfileError(null);
    if (!userId) return setProfile(null);
    try {
      const p = await fetchOwnProfile(userId);
      setProfile(p);
      if (!p) setProfileError('Your account has no player profile.');
    } catch (e) {
      setProfile(null);
      setProfileError(e instanceof Error ? e.message : 'Could not load your profile.');
    }
  }, [userId]);
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const signOut = useCallback(async (scope: 'local' | 'global' = 'local') => {
    await supabase().auth.signOut({ scope });
    setProfile(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ status, session, userId, email: session?.user.email ?? null, profile, profileError, refreshProfile: loadProfile, signOut }),
    [status, session, userId, profile, profileError, loadProfile, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}

/**
 * Renders children only for signed-in players; everyone else is sent to the sign-in page and
 * brought back afterwards. (The real protection is Row Level Security in the database: this only
 * keeps the interface honest.)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'signedOut') router.replace(`/login?next=${encodeURIComponent(pathname ?? '/dashboard')}`);
  }, [status, router, pathname]);
  if (status !== 'signedIn') return <LoadingState label={status === 'loading' ? 'Checking your session…' : 'Redirecting to sign in…'} />;
  return <>{children}</>;
}
