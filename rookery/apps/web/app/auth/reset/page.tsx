'use client';

// Arrived from a password-reset email: supabase-js turns the link's code into a recovery session;
// the player then chooses a new password.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords don’t match.');
    setBusy(true);
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => router.replace('/dashboard'), 1200);
  };

  if (status !== 'signedIn') {
    return waited ? (
      <AuthCard title="This link has expired" subtitle="Reset links work once and expire after an hour.">
        <Link href="/forgot-password" className="font-semibold text-gold-300 hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    ) : (
      <AuthCard title="Checking your link…">
        <Spinner />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      {done ? (
        <FormMessage tone="success">Password updated. Taking you to your dashboard…</FormMessage>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
          <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
