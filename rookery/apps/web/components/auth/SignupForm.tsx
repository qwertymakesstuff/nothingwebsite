'use client';

import { CheckCircle2, Loader2, MailCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Dropdown';
import { Field, FormMessage } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth';
import { MIN_SIGNUP_AGE } from '@/lib/config';
import { usernameAvailable } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { AuthCard, safeNext } from './AuthCard';

const USERNAME = /^[A-Za-z0-9_-]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BLOCK_KEY = 'rookery.signup.ineligible';

export function ageOn(birth: Date, today = new Date()): number {
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type NameState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { status } = useAuth();
  const [username, setUsername] = useState('');
  const [nameState, setNameState] = useState<NameState>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [ineligible, setIneligible] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (status === 'signedIn') router.replace(next);
  }, [status, router, next]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BLOCK_KEY)) setIneligible(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Live username check (debounced). The database is the final authority at sign-up.
  useEffect(() => {
    if (!username) return setNameState('idle');
    if (!USERNAME.test(username)) return setNameState('invalid');
    setNameState('checking');
    const t = setTimeout(() => {
      usernameAvailable(username)
        .then((ok) => setNameState(ok ? 'available' : 'taken'))
        .catch(() => setNameState('idle'));
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const birth = day && month && year ? new Date(Number(year), Number(month) - 1, Number(day)) : null;
  const birthValid = birth && birth.getDate() === Number(day) && birth <= new Date();
  const errors = {
    username: nameState === 'invalid' ? '3–20 letters, numbers, _ or -' : nameState === 'taken' ? 'That username is taken or reserved.' : null,
    email: touched && !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : null,
    password:
      touched && password.length < 8
        ? 'Use at least 8 characters.'
        : touched && password.toLowerCase() === username.toLowerCase()
          ? 'Your password can’t be your username.'
          : null,
    birth: touched && !birthValid ? 'Enter your date of birth.' : null,
  };
  const ready = nameState === 'available' && EMAIL.test(email.trim()) && password.length >= 8 && password.toLowerCase() !== username.toLowerCase() && birthValid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!ready || !birth) return;
    if (ageOn(birth) < MIN_SIGNUP_AGE) {
      try {
        sessionStorage.setItem(BLOCK_KEY, '1');
      } catch {
        /* ignore */
      }
      setIneligible(true);
      return;
    }
    setBusy(true);
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const { data, error: err } = await supabase().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, data: { username, birth_date: iso } },
    });
    setBusy(false);
    if (err) {
      // The database trigger re-checks username and age; GoTrue reports its failure generically.
      setError(/database error/i.test(err.message) ? 'We couldn’t create that account. The username may have just been taken; try another.' : err.message);
      if (/database error/i.test(err.message)) setNameState('idle');
      return;
    }
    if (data.session) return router.replace(next); // email confirmation disabled on this project
    setSentTo(email.trim());
  };

  const resend = async () => {
    if (!sentTo) return;
    await supabase().auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setResent(true);
  };

  if (ineligible) {
    return (
      <AuthCard title="Sorry" subtitle="You’re not able to create an account right now.">
        <p className="text-sm text-fg-muted">
          You can still play against computer opponents, solve puzzles and use the analysis board without an account.
        </p>
        <Link href="/" className="mt-5 inline-block font-semibold text-gold-300 hover:underline">
          Back to Rookery
        </Link>
      </AuthCard>
    );
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle={<>We sent a verification link to <strong className="text-fg">{sentTo}</strong>.</>}>
        <div className="flex items-start gap-3 rounded-[12px] bg-surface-2 p-4 text-sm text-fg-muted">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden />
          <p>Open the link to verify your address and sign in. It can take a minute to arrive, so check your spam folder too.</p>
        </div>
        <div className="mt-5 text-sm">
          {resent ? (
            <FormMessage tone="success">Sent again.</FormMessage>
          ) : (
            <button type="button" onClick={resend} className="font-semibold text-gold-300 hover:underline">
              Didn’t get it? Resend the email
            </button>
          )}
        </div>
      </AuthCard>
    );
  }

  const nameStatus =
    nameState === 'checking' ? (
      <span className="flex items-center gap-1 text-fg-subtle">
        <Loader2 className="size-3 animate-spin" /> checking
      </span>
    ) : nameState === 'available' ? (
      <span className="flex items-center gap-1 text-win">
        <CheckCircle2 className="size-3.5" /> available
      </span>
    ) : nameState === 'taken' ? (
      <span className="flex items-center gap-1 text-loss">
        <XCircle className="size-3.5" /> unavailable
      </span>
    ) : null;

  const thisYear = new Date().getFullYear();
  return (
    <AuthCard
      title="Create your account"
      subtitle="Free forever. Rated games, saved history, ratings and achievements."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-gold-300 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Field
          label="Username"
          autoComplete="username"
          required
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          hint="3–20 letters, numbers, _ or -. Shown to other players; can’t be changed later."
          error={errors.username}
          status={nameStatus}
        />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="Never shown to anyone." />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-fg">Date of birth</legend>
          <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <Select label="Day" value={day} onChange={setDay} options={[{ value: '', label: 'Day' }, ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))]} />
            <Select label="Month" value={month} onChange={setMonth} options={[{ value: '', label: 'Month' }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))]} />
            <Select
              label="Year"
              value={year}
              onChange={setYear}
              options={[{ value: '', label: 'Year' }, ...Array.from({ length: 110 }, (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) }))]}
            />
          </div>
          <p className="mt-1.5 text-xs text-fg-subtle">Kept private. Used only to check eligibility for accounts and chat.</p>
          {errors.birth && (
            <p className="mt-1.5 text-xs text-loss" role="alert">
              {errors.birth}
            </p>
          )}
        </fieldset>
        <Button type="submit" variant="primary" size="lg" block disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
