'use client';

import { Swords, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Button } from '@/components/ui/Button';
import { avatarUrl } from '@/lib/db';
import { useLobby } from '@/lib/realtime/lobby';
import { tcLabel } from '@/lib/realtime/useOnlineGame';

/** Live notifications (incoming challenges, declines, lobby errors), bottom-right on every page. */
export function Notifications() {
  const { notices, dismiss, decline, lastError } = useLobby();
  const router = useRouter();
  if (!notices.length && !lastError) return null;
  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4" aria-live="polite">
      {lastError && (
        <div className="pointer-events-auto rounded-[14px] border border-loss/40 bg-surface-1/95 px-4 py-3 text-sm text-fg shadow-[var(--shadow-pop)] backdrop-blur animate-pop-in" role="alert">
          {lastError}
        </div>
      )}
      {notices.map((n) => (
        <div key={n.id} className="pointer-events-auto rounded-[14px] border border-line-strong bg-surface-1/95 p-4 shadow-[var(--shadow-pop)] backdrop-blur animate-pop-in" role="status">
          <div className="flex items-start gap-3">
            {n.challenge ? (
              <PlayerAvatar name={n.challenge.from.username} src={avatarUrl(n.challenge.from.avatarPath)} size="sm" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-surface-3 text-gold-300">
                <Swords className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{n.text}</p>
              {n.challenge && (
                <p className="text-xs text-fg-subtle">
                  {tcLabel(n.challenge.tc)} · {n.challenge.rated ? 'Rated' : 'Casual'} · {n.challenge.from.rating}
                  {n.challenge.from.provisional ? '?' : ''}
                </p>
              )}
            </div>
            <button type="button" aria-label="Dismiss" className="text-fg-subtle hover:text-fg" onClick={() => dismiss(n.id)}>
              <X className="size-4" />
            </button>
          </div>
          {n.challenge && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" onClick={() => decline(n.challenge!.id)}>
                Decline
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  dismiss(n.id);
                  router.push(`/game?id=${n.challenge!.id}`);
                }}
              >
                Accept
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
