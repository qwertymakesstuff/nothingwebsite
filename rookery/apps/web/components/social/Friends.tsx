'use client';

import { Check, Search, Swords, UserMinus, UserPlus, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { inputClass } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { RequireAuth, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl } from '@/lib/db';
import { acceptFriendRequest, fetchFriendships, removeFriendship, searchPlayers, sendFriendRequest, type FriendRow, type PlayerHit } from '@/lib/platform';

// ── Friends page ─────────────────────────────────────────────────────────────────────────
export function FriendsClient() {
  return (
    <RequireAuth>
      <FriendsInner />
    </RequireAuth>
  );
}

function FriendsInner() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<FriendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!userId) return;
    fetchFriendships(userId)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load friends.'));
  }, [userId]);
  useEffect(load, [load]);

  const me = userId!;
  const other = (f: FriendRow) => (f.requester_id === me ? { id: f.addressee_id, ...f.addressee! } : { id: f.requester_id, ...f.requester! });
  const friends = rows?.filter((f) => f.status === 'accepted') ?? [];
  const incoming = rows?.filter((f) => f.status === 'pending' && f.addressee_id === me) ?? [];
  const outgoing = rows?.filter((f) => f.status === 'pending' && f.requester_id === me) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Community" title="Friends" description="Friends can challenge you even when you only accept challenges from friends, and can chat with you if you limit chat to friends." actions={<ButtonLink href="/players" variant="secondary" icon={<Search className="size-4" />}>Find players</ButtonLink>} />
      {error ? (
        <ErrorState>{error}</ErrorState>
      ) : !rows ? (
        <LoadingState label="Loading friends…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card>
            <CardHeader title={`Your friends (${friends.length})`} />
            {friends.length ? (
              <ul className="divide-y divide-line">
                {friends.map((f) => {
                  const o = other(f);
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                      <PlayerAvatar name={o.username} src={avatarUrl(o.avatar_path)} size="sm" />
                      <Link href={`/u/${o.username}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gold-300">
                        {o.display_name || o.username} {o.display_name && <span className="font-normal text-fg-subtle">@{o.username}</span>}
                      </Link>
                      <CountryTag code={o.country ?? undefined} />
                      <ButtonLink size="sm" variant="secondary" icon={<Swords className="size-4" />} href={`/play?challenge=${encodeURIComponent(o.username)}`}>
                        Challenge
                      </ButtonLink>
                      <Button size="sm" variant="ghost" aria-label={`Unfriend ${o.username}`} icon={<UserMinus className="size-4" />} onClick={() => void removeFriendship(me, o.id).then(load)}>
                        <span className="sr-only sm:not-sr-only">Unfriend</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Users className="size-5" />} title="No friends yet" action={<ButtonLink href="/players" variant="primary">Find players</ButtonLink>}>
                Search for players you know, or add opponents from their profile.
              </EmptyState>
            )}
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader title={`Requests (${incoming.length})`} />
              {incoming.length ? (
                <ul className="divide-y divide-line">
                  {incoming.map((f) => {
                    const o = other(f);
                    return (
                      <li key={o.id} className="flex items-center gap-2 px-5 py-3">
                        <Link href={`/u/${o.username}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gold-300">
                          {o.username}
                        </Link>
                        <Button size="sm" variant="primary" icon={<Check className="size-4" />} onClick={() => void acceptFriendRequest(o.id, me).then(load)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Decline" icon={<X className="size-4" />} onClick={() => void removeFriendship(o.id, me).then(load)} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-sm text-fg-subtle">No pending requests.</p>
              )}
            </Card>
            {outgoing.length > 0 && (
              <Card>
                <CardHeader title={`Sent (${outgoing.length})`} />
                <ul className="divide-y divide-line">
                  {outgoing.map((f) => {
                    const o = other(f);
                    return (
                      <li key={o.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                        <span className="min-w-0 flex-1 truncate">{o.username}</span>
                        <Button size="sm" variant="ghost" onClick={() => void removeFriendship(me, o.id).then(load)}>
                          Cancel
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Friend button on profiles ───────────────────────────────────────────────────────────
export function FriendButton({ targetId }: { targetId: string }) {
  const { userId, status } = useAuth();
  const [state, setState] = useState<'loading' | 'none' | 'sent' | 'received' | 'friends'>('loading');
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    if (!userId) return;
    fetchFriendships(userId)
      .then((rows) => {
        const f = rows.find((r) => r.requester_id === targetId || r.addressee_id === targetId);
        setState(!f ? 'none' : f.status === 'accepted' ? 'friends' : f.requester_id === userId ? 'sent' : 'received');
      })
      .catch(() => setState('none'));
  }, [userId, targetId]);
  useEffect(refresh, [refresh]);
  if (status !== 'signedIn' || !userId || userId === targetId) return null;
  const act = (p: Promise<void>) =>
    p.then(refresh).catch((e) => setError(e instanceof Error ? (e.message.includes('friend_limit') ? 'You’ve sent the maximum number of requests today.' : e.message) : 'Something went wrong.'));
  return (
    <span className="inline-flex flex-col items-end gap-1">
      {state === 'none' && (
        <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => void act(sendFriendRequest(targetId))}>
          Add friend
        </Button>
      )}
      {state === 'sent' && (
        <Button variant="ghost" onClick={() => void act(removeFriendship(userId, targetId))}>
          Request sent · cancel
        </Button>
      )}
      {state === 'received' && (
        <Button variant="primary" icon={<Check className="size-4" />} onClick={() => void act(acceptFriendRequest(targetId, userId))}>
          Accept friend request
        </Button>
      )}
      {state === 'friends' && (
        <Button variant="ghost" icon={<Users className="size-4" />} onClick={() => void act(removeFriendship(userId, targetId))} title="Click to unfriend">
          Friends
        </Button>
      )}
      {error && <span className="text-xs text-loss">{error}</span>}
    </span>
  );
}

// ── Player search ───────────────────────────────────────────────────────────────────────
export function PlayersClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [hits, setHits] = useState<PlayerHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      router.replace(`/players?q=${encodeURIComponent(term)}`, { scroll: false });
      searchPlayers(term)
        .then((h) => {
          setHits(h);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Search failed.'));
    }, 250);
    return () => clearTimeout(t);
  }, [q, router]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Community" title="Find players" />
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username or name"
          aria-label="Search players"
          className={cn(inputClass, 'border-line pl-9 focus:border-gold-500/60')}
        />
      </div>
      <Card>
        {error ? (
          <ErrorState>{error}</ErrorState>
        ) : hits === null ? (
          <EmptyState icon={<Search className="size-5" />} title="Search for a player">Type at least two letters of a username or display name.</EmptyState>
        ) : !hits.length ? (
          <EmptyState icon={<Users className="size-5" />} title="No players found">Check the spelling, or try the start of their username.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {hits.map((p) => (
              <li key={p.id}>
                <Link href={`/u/${p.username}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                  <PlayerAvatar name={p.username} src={avatarUrl(p.avatar_path)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.username}</span>
                    {p.display_name && <span className="block truncate text-xs text-fg-subtle">{p.display_name}</span>}
                  </span>
                  <CountryTag code={p.country ?? undefined} />
                  <span className="tabular text-right text-xs text-fg-muted">
                    Blitz {p.blitz ?? '–'}
                    <span className="block">Rapid {p.rapid ?? '–'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
