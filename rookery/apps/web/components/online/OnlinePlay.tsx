'use client';

import { getTimeControl } from '@rookery/chess-core';
import { Globe2, Link2, LogIn, Search, Swords, UserPlus, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl } from '@/lib/db';
import { useLobby } from '@/lib/realtime/lobby';
import { tcLabel } from '@/lib/realtime/useOnlineGame';

type ColorChoice = 'random' | 'white' | 'black';

/** Online play on the Play page: matchmaking, challenges and invitation links. */
export function OnlinePlay({ tcId }: { tcId: string }) {
  const { status: auth } = useAuth();
  const lobby = useLobby();
  const params = useSearchParams();
  const router = useRouter();
  const [rated, setRated] = useState(params.get('rated') !== '0');
  const [to, setTo] = useState(params.get('challenge') ?? '');
  const [color, setColor] = useState<ColorChoice>('random');
  const [busy, setBusy] = useState<'challenge' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSeek = useRef(params.get('seek') === '1');
  const tc = getTimeControl(tcId)!;

  // "New opponent" after a game arrives with ?seek=1: start searching once connected.
  useEffect(() => {
    if (autoSeek.current && lobby.status === 'online') {
      autoSeek.current = false;
      lobby.seek(tcId, rated);
    }
  }, [lobby, lobby.status, tcId, rated]);

  if (auth !== 'signedIn') {
    return (
      <section className="rounded-[14px] border border-gold-500/25 bg-gold-500/[0.05] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Globe2 className="size-4 text-gold-300" /> Play online
        </p>
        <p className="mt-1 text-sm text-fg-muted">Rated games against people at your level, challenges and invitation links. Free, with an account.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ButtonLink href="/signup?next=/play" variant="primary" size="sm">
            Create account
          </ButtonLink>
          <ButtonLink href="/login?next=/play" variant="secondary" size="sm" icon={<LogIn className="size-4" />}>
            Sign in
          </ButtonLink>
        </div>
      </section>
    );
  }

  const connected = lobby.status === 'online';
  const seeking = lobby.seeking;

  const createChallenge = async (kind: 'challenge' | 'link') => {
    setError(null);
    const name = to.trim();
    if (kind === 'challenge' && !/^[A-Za-z0-9_-]{3,20}$/.test(name)) return setError('Enter the username of the player you want to challenge.');
    setBusy(kind);
    try {
      const id = await lobby.challenge({ to: kind === 'challenge' ? name : null, tc: tcId, rated, color });
      router.push(`/game?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the challenge.');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Matchmaking */}
      <section className="rounded-[14px] border border-gold-500/30 bg-gold-500/[0.05] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Globe2 className="size-4 text-gold-300" /> Play online
          </p>
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span className={cn('size-2 rounded-full', connected ? 'bg-win' : 'bg-surface-4')} />
            {connected ? `${lobby.online} online` : lobby.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
          </span>
        </div>
        {seeking ? (
          <Searching
            label={tcLabel(seeking.tc)}
            rated={seeking.rated}
            since={seeking.since}
            range={seeking.range}
            players={seeking.players}
            now={lobby.serverNow}
            onCancel={lobby.unseek}
          />
        ) : (
          <>
            <div className="mt-3">
              <Switch checked={rated} onChange={setRated} label="Rated" description={rated ? 'The result changes both players’ ratings.' : 'Casual: ratings don’t change.'} />
            </div>
            <Button variant="primary" size="lg" block className="mt-3" icon={<Search className="size-5" />} disabled={!connected} onClick={() => lobby.seek(tcId, rated)}>
              Find an opponent · {tc.label}
            </Button>
            {Boolean(lobby.pools[tcId]) && (
              <p className="mt-2 text-center text-xs text-fg-subtle">
                {lobby.pools[tcId]} {lobby.pools[tcId] === 1 ? 'player is' : 'players are'} looking for a {tc.label} game
              </p>
            )}
          </>
        )}
      </section>

      {/* Incoming challenges */}
      {lobby.incoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-fg">Challenges for you</h2>
          <ul className="space-y-2">
            {lobby.incoming.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-[12px] border border-line p-3">
                <PlayerAvatar name={c.from.username} src={avatarUrl(c.from.avatarPath)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.from.displayName || c.from.username}{' '}
                    <span className="font-normal text-fg-subtle">
                      ({c.from.rating}
                      {c.from.provisional ? '?' : ''})
                    </span>
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {tcLabel(c.tc)} · {c.rated ? 'Rated' : 'Casual'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => lobby.decline(c.id)}>
                  Decline
                </Button>
                <ButtonLink size="sm" variant="primary" href={`/game?id=${c.id}`}>
                  Accept
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Challenges and invitation links */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
          <UserPlus className="size-4 text-gold-400" /> Play a friend
        </h2>
        <div className="flex gap-2">
          <input
            className={cn(inputClass, 'flex-1 border-line focus:border-gold-500/60')}
            placeholder="Their username"
            aria-label="Username to challenge"
            value={to}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void createChallenge('challenge')}
          />
          <Button variant="secondary" icon={<Swords className="size-4" />} disabled={!connected || busy !== null} onClick={() => void createChallenge('challenge')}>
            {busy === 'challenge' ? 'Sending…' : 'Challenge'}
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1" role="radiogroup" aria-label="Your colour">
          {(['random', 'white', 'black'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              onClick={() => setColor(c)}
              className={cn('h-8 rounded-[8px] text-xs font-semibold capitalize transition-colors', color === c ? 'bg-surface-4 text-fg' : 'text-fg-subtle hover:text-fg')}
            >
              {c === 'random' ? 'Random colour' : c}
            </button>
          ))}
        </div>
        <Button variant="ghost" block className="mt-2" icon={<Link2 className="size-4" />} disabled={!connected || busy !== null} onClick={() => void createChallenge('link')}>
          {busy === 'link' ? 'Creating…' : 'Create an invitation link instead'}
        </Button>
        <p className="mt-1 text-xs text-fg-subtle">
          {tc.label} · {rated ? 'rated' : 'casual'}. Anyone with the link can accept.
        </p>
        {error && (
          <p className="mt-2 text-sm text-loss" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function Searching({ label, rated, since, range, players, now, onCancel }: { label: string; rated: boolean; since: number; range: number; players: number; now: () => number; onCancel: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now() - since) / 1000));
  return (
    <div className="mt-3 text-center" role="status" aria-live="polite">
      <span className="relative mx-auto mb-3 grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-gold-500/25 motion-reduce:animate-none" />
        <span className="relative grid size-12 place-items-center rounded-full bg-gold-500/15 text-gold-300">
          <Search className="size-5" />
        </span>
      </span>
      <p className="font-semibold text-fg">
        Finding a {rated ? 'rated' : 'casual'} {label} game…
      </p>
      <p className="tabular mt-1 text-xs text-fg-subtle">
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} · {range < 0 ? 'any rating' : `rating ±${range}`} · {players} in the queue
      </p>
      <Button variant="ghost" size="sm" className="mt-3" icon={<X className="size-4" />} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
