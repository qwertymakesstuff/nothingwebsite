'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { AuthCard, safeNext } from './AuthCard';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (status === 'signedIn') router.replace(next);
  }, [status, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setBusy(true);
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!err) return router.replace(next);
    if (/not confirmed/i.test(err.message)) {
      setUnconfirmed(true);
      setError('Please verify your email address first. Check your inbox for the link.');
    } else if (/invalid login credentials/i.test(err.message)) {
      setError('That email and password don’t match an account.');
    } else {
      setError(err.message);
    }
  };

  const resend = async () => {
    await supabase().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setResent(true);
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to play rated games, keep your history and sync your settings."
      footer={
        <>
          New to Rookery?{' '}
          <Link href={`/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-gold-300 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {unconfirmed && (
          <div className="text-sm">
            {resent ? (
              <FormMessage tone="success">Sent. Check your inbox (and spam folder).</FormMessage>
            ) : (
              <button type="button" onClick={resend} className="font-semibold text-gold-300 hover:underline">
                Resend the verification email
              </button>
            )}
          </div>
        )}
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          status={
            <Link href="/forgot-password" className="font-semibold text-gold-300 hover:underline">
              Forgot password?
            </Link>
          }
        />
        <Button type="submit" variant="primary" size="lg" block disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
