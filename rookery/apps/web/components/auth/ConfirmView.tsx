'use client';

// Landing page for links in Rookery's emails (see packages/db/supabase/templates). The link
// carries a one-time token hash, which is verified here, in the browser, by JavaScript. So:
//  - it works in any browser, not only the one used to sign up, and
//  - email security scanners that "pre-open" links (they don't run JavaScript) can't use the
//    token up before the player clicks, which made links look expired.

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FormMessage } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import { supabase } from '@/lib/supabase/client';
import { AuthCard, safeNext } from './AuthCard';

type LinkType = 'email' | 'recovery' | 'email_change';
const TYPES: LinkType[] = ['email', 'recovery', 'email_change'];
const DESTINATION: Record<LinkType, string> = {
  email: '/dashboard',
  recovery: '/auth/reset',
  email_change: '/settings?section=account',
};

export function ConfirmView() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<'verifying' | 'done' | 'failed'>('verifying');
  const [message, setMessage] = useState<string | null>(null);

  const tokenHash = params.get('token_hash');
  const rawType = params.get('type');
  const type = TYPES.includes(rawType as LinkType) ? (rawType as LinkType) : null;
  const next = type === 'recovery' ? DESTINATION.recovery : params.get('next') ? safeNext(params.get('next')) : type ? DESTINATION[type] : '/dashboard';

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!tokenHash || !type) {
      setState('failed');
      setMessage('This link is incomplete. Try copying the whole link from the email.');
      return;
    }
    supabase()
      .auth.verifyOtp({ token_hash: tokenHash, type })
      .then(({ error }) => {
        if (error) {
          setState('failed');
          setMessage(error.message);
          return;
        }
        setState('done');
        setTimeout(() => router.replace(next), 700);
      });
  }, [tokenHash, type, next, router]);

  if (state === 'failed') {
    const verifyLink = type === 'email';
    return (
      <AuthCard title="That link didn’t work" subtitle="Links in our emails work once and expire after an hour.">
        {message && <FormMessage tone="error">{message}</FormMessage>}
        <p className="mt-4 text-sm text-fg-muted">
          {verifyLink ? (
            <>
              If you’ve already used this link, your email is verified: just{' '}
              <Link href="/login" className="font-semibold text-gold-300 hover:underline">
                sign in
              </Link>
              . Otherwise sign in to request a new one.
            </>
          ) : type === 'recovery' ? (
            <Link href="/forgot-password" className="font-semibold text-gold-300 hover:underline">
              Request a new reset link
            </Link>
          ) : (
            <Link href="/login" className="font-semibold text-gold-300 hover:underline">
              Sign in
            </Link>
          )}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={state === 'done' ? (type === 'recovery' ? 'Link confirmed' : 'You’re in') : 'Confirming…'}
      subtitle={state === 'done' ? (type === 'recovery' ? 'Now choose a new password.' : 'Email verified. Taking you to the club…') : 'One moment while we check your link.'}
    >
      <Spinner />
    </AuthCard>
  );
}
