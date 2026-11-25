import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CallbackView } from '@/components/auth/CallbackView';

export const metadata: Metadata = { title: 'Signing in' };

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackView />
    </Suspense>
  );
}
