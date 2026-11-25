'use client';

// Landing page for links in Supabase emails (sign-up verification, email change). supabase-js
// exchanges the one-time code in the URL for a session automatically (PKCE); we wait for it.

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormMessage } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { AuthCard, safeNext } from './AuthCard';

export function CallbackView() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useAuth();
  const next = safeNext(params.get('next'));
  const linkError = params.get('error_description') ?? (typeof window !== 'undefined' ? new URLSearchParams(location.hash.slice(1)).get('error_description') : null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === 'signedIn') {
      const t = setTimeout(() => router.replace(next), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [status, router, next]);

  if (linkError || (timedOut && status !== 'signedIn')) {
    return (
      <AuthCard title="That link didn’t work" subtitle="Verification links expire, and each can be used only once.">
        <FormMessage tone="error">{linkError ?? 'We couldn’t sign you in from this link.'}</FormMessage>
        <p className="mt-4 text-sm text-fg-muted">
          Try{' '}
          <Link href="/login" className="font-semibold text-gold-300 hover:underline">
            signing in
          </Link>
          ; if your email isn’t verified yet you can request a new link there. Open the link in the same browser you signed up with.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={status === 'signedIn' ? 'You’re in' : 'Verifying…'} subtitle={status === 'signedIn' ? 'Email verified. Taking you to the club…' : 'One moment while we confirm your link.'}>
      <Spinner />
    </AuthCard>
  );
}
