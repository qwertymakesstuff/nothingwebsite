'use client';

import { RotateCcw } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

// Catches errors thrown while rendering any page, so one broken widget never blanks the site.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      className="py-24"
      title="This page hit a problem"
      action={
        <div className="flex gap-2">
          <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/" variant="ghost">
            Go home
          </ButtonLink>
        </div>
      }
    >
      Something went wrong while showing this page. {error.digest ? `(Reference ${error.digest})` : ''}
    </ErrorState>
  );
}
