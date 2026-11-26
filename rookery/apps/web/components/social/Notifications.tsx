'use client';

import { Award, Bell, Check, Flag, ShieldAlert, Trophy, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { RequireAuth, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl, fetchAchievementNames } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { acceptFriendRequest, fetchNotifications, markNotificationsRead, removeFriendship, unreadCount, type NotificationRow } from '@/lib/platform';
import { supabase } from '@/lib/supabase/client';

/** Bell with the unread count (checked every minute, on focus and on navigation). */
export function NotificationBell({ className }: { className?: string }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (status === 'signedIn') unreadCount().then(setCount).catch(() => undefined);
  }, [status]);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('rookery:notifications', refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('rookery:notifications', refresh);
    };
  }, [refresh, pathname]);
  if (status !== 'signedIn') return null;
  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
      className={cn('relative grid size-10 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-surface-2 hover:text-fg', className)}
    >
      <Bell className="size-5" />
      {count > 0 && <span className="tabular absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-[#1a1612]">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}

export function NotificationsClient() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}

function NotificationsInner() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [n, a] = await Promise.all([fetchNotifications(), fetchAchievementNames()]);
      setRows(n);
      setNames(a);
      if (n.some((x) => !x.read_at)) {
        await markNotificationsRead();
        window.dispatchEvent(new Event('rookery:notifications'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Inbox" title="Notifications" />
      <Card>
        {error ? (
          <ErrorState>{error}</ErrorState>
        ) : !rows ? (
          <LoadingState label="Loading notifications…" />
        ) : !rows.length ? (
          <EmptyState icon={<Bell className="size-5" />} title="Nothing yet">Friend requests, achievements and tournament results appear here.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className={cn('flex items-start gap-3 px-5 py-4', !n.read_at && 'bg-gold-500/[0.05]')}>
                <Icon n={n} />
                <div className="min-w-0 flex-1 text-sm">
                  <Text n={n} names={names} />
                  <p className="mt-0.5 text-xs text-fg-subtle">{formatDate(n.created_at)}</p>
                  {n.kind === 'friend_request' && n.actor && <FriendRequestActions username={n.actor.username} me={userId!} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FriendRequestActions({ username, me }: { username: string; me: string }) {
  const [state, setState] = useState<'idle' | 'accepted' | 'declined' | 'gone'>('idle');
  const [requesterId, setRequesterId] = useState<string | null>(null);
  useEffect(() => {
    void supabase()
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return setState('gone');
        setRequesterId(data.id as string);
        const { data: f } = await supabase().from('friendships').select('status').eq('requester_id', data.id).eq('addressee_id', me).maybeSingle();
        if (!f) setState('gone');
        else if (f.status === 'accepted') setState('accepted');
      });
  }, [username, me]);
  if (state === 'accepted') return <p className="mt-2 text-xs text-win">You’re friends.</p>;
  if (state === 'declined' || state === 'gone') return <p className="mt-2 text-xs text-fg-subtle">Request no longer pending.</p>;
  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" variant="primary" icon={<Check className="size-4" />} disabled={!requesterId} onClick={() => void acceptFriendRequest(requesterId!, me).then(() => setState('accepted'))}>
        Accept
      </Button>
      <Button size="sm" variant="ghost" disabled={!requesterId} onClick={() => void removeFriendship(requesterId!, me).then(() => setState('declined'))}>
        Decline
      </Button>
    </div>
  );
}

function Icon({ n }: { n: NotificationRow }) {
  if (n.actor) return <PlayerAvatar name={n.actor.username} src={avatarUrl(n.actor.avatar_path)} size="sm" />;
  const cls = 'grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-gold-300 [&>svg]:size-4';
  const icon = { achievement: <Award />, tournament_started: <Trophy />, tournament_finished: <Trophy />, report_resolved: <Flag />, restriction: <ShieldAlert />, friend_request: <UserPlus />, friend_accepted: <Users /> }[n.kind];
  return <span className={cls}>{icon}</span>;
}

function Text({ n, names }: { n: NotificationRow; names: Map<string, string> }) {
  const d = n.data as Record<string, string | number | boolean | null>;
  const who = n.actor ? (
    <Link href={`/u/${n.actor.username}`} className="font-semibold hover:text-gold-300">
      {n.actor.username}
    </Link>
  ) : (
    'Someone'
  );
  const t = (id: unknown, name: unknown) => (
    <Link href={`/tournament?id=${id}`} className="font-semibold hover:text-gold-300">
      {String(name ?? 'A tournament')}
    </Link>
  );
  switch (n.kind) {
    case 'friend_request':
      return <p>{who} wants to be friends.</p>;
    case 'friend_accepted':
      return <p>{who} accepted your friend request.</p>;
    case 'achievement':
      return (
        <p>
          Achievement unlocked: <b>{names.get(String(d.achievement_id)) ?? String(d.achievement_id)}</b>
        </p>
      );
    case 'tournament_started':
      return <p>{t(d.tournament_id, d.name)} has started. Open it to get paired.</p>;
    case 'tournament_finished':
      return (
        <p>
          {t(d.tournament_id, d.name)} finished: you placed <b>#{String(d.rank)}</b> of {String(d.players)}.
        </p>
      );
    case 'report_resolved':
      return <p>Your report was {d.status === 'resolved' ? 'reviewed and acted on' : 'reviewed; no action was needed'}. Thank you.</p>;
    case 'restriction':
      return d.lifted ? (
        <p>A restriction on your account has been lifted.</p>
      ) : (
        <p>
          Your account has a restriction ({String(d.kind).replace('_', ' ')}): {String(d.reason)}
          {d.expires_at ? ` Until ${formatDate(String(d.expires_at))}.` : ''}
        </p>
      );
  }
}
