'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // The answer is the same whether or not the address has an account (no account enumeration).
    await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/reset` });
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We’ll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-gold-300 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <FormMessage tone="success">If an account uses {email.trim()}, a reset link is on its way. It expires in one hour.</FormMessage>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" block disabled={busy || !email.includes('@')}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
