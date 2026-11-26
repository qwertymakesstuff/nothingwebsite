'use client';

import { Ban, Check, Flag, Gavel, History, MessageSquare, Search, ShieldCheck, Swords, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { inputClass } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { RequireAuth, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import {
  addRestriction,
  fetchGameChat,
  fetchModLog,
  fetchReports,
  fetchUserDetail,
  findUsers,
  liftRestriction,
  setBan,
  setReportStatus,
  type LogItem,
  type ReportItem,
  type UserDetail,
  type UserLookup,
} from '@/lib/moderation';
import { fetchGame, useStaffRole } from '@/lib/platform';
import type { GameRow } from '@/lib/db';

export function AdminClient() {
  return (
    <RequireAuth>
      <Gate />
    </RequireAuth>
  );
}

function Gate() {
  const { userId } = useAuth();
  const role = useStaffRole(userId);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!role) return checked ? <EmptyState icon={<ShieldCheck className="size-5" />} title="Staff only">This area is for Rookery moderators and admins.</EmptyState> : <LoadingState label="Checking access…" />;
  return <Admin role={role} />;
}

function Admin({ role }: { role: 'admin' | 'moderator' }) {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get('tab') as 'reports' | 'users' | 'games' | 'log' | null) ?? 'reports';
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={role === 'admin' ? 'Admin' : 'Moderation'} title="Moderation" description="Reports, players, games and chat. Every action is recorded in the moderation log." />
      <Card className="overflow-hidden">
        <Tabs
          label="Moderation sections"
          value={tab}
          onChange={(v) => router.replace(`/admin?tab=${v}`)}
          listClassName="px-3 pt-1"
          items={[
            { value: 'reports', label: 'Reports', content: <Reports role={role} /> },
            { value: 'users', label: 'Players', content: <Users role={role} initial={params.get('user')} /> },
            { value: 'games', label: 'Games', content: <Games initial={params.get('game')} /> },
            { value: 'log', label: 'Log', content: <Log /> },
          ]}
        />
      </Card>
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────────────────
function Reports({ role }: { role: 'admin' | 'moderator' }) {
  const [status, setStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [rows, setRows] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setRows(null);
    fetchReports(status)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);
  return (
    <div>
      <div className="flex gap-2 border-b border-line p-3">
        {(['open', 'resolved', 'dismissed'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', status === s ? 'bg-surface-4 text-fg' : 'text-fg-subtle hover:text-fg')}>
            {s}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorState>{error}</ErrorState>
      ) : !rows ? (
        <LoadingState label="Loading reports…" />
      ) : !rows.length ? (
        <EmptyState icon={<Flag className="size-5" />} title={status === 'open' ? 'No open reports' : `No ${status} reports`} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <ReportRow key={r.id} r={r} role={role} onDone={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportRow({ r, role, onDone }: { r: ReportItem; role: 'admin' | 'moderator'; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (p: Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await p;
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
      setBusy(false);
    }
  };
  return (
    <li className="space-y-2 px-5 py-4 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone="gold">{r.reason.replace('_', ' ')}</Badge>
        <Link href={`/admin?tab=users&user=${r.target_id}`} className="font-semibold hover:text-gold-300">
          {r.target?.username ?? 'deleted user'}
        </Link>
        <span className="text-fg-subtle">reported by {r.reporter?.username ?? 'deleted user'} · {formatDate(r.created_at)}</span>
        {r.game_id && (
          <Link href={`/admin?tab=games&game=${r.game_id}`} className="text-xs font-semibold text-gold-300 hover:underline">
            game & chat
          </Link>
        )}
      </p>
      {r.details && <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-fg-muted">{r.details}</p>}
      {r.status !== 'open' ? (
        <p className="text-xs text-fg-subtle">
          {r.status} by {r.resolver?.username ?? '—'} {r.resolved_at && `· ${formatDate(r.resolved_at)}`} {r.resolution && `· “${r.resolution}”`}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (shown in the log)" maxLength={1000} className={cn(inputClass, 'h-9 max-w-xs flex-1 border-line text-sm')} />
          <Button size="sm" variant="primary" icon={<Check className="size-4" />} disabled={busy} onClick={() => void act(setReportStatus(r.id, 'resolved', note))}>
            Resolve
          </Button>
          <Button size="sm" variant="ghost" icon={<X className="size-4" />} disabled={busy} onClick={() => void act(setReportStatus(r.id, 'dismissed', note))}>
            Dismiss
          </Button>
          <Button size="sm" variant="ghost" icon={<MessageSquare className="size-4" />} disabled={busy} onClick={() => void act(addRestriction(r.target_id, 'mute', `Report #${r.id}: ${note || r.reason}`, 1).then(() => setReportStatus(r.id, 'resolved', note || 'Muted for 24 hours')))}>
            Mute 24h + resolve
          </Button>
          {role === 'admin' && (
            <Button size="sm" variant="danger" icon={<Ban className="size-4" />} disabled={busy} onClick={() => void act(setBan(r.target_id, true, `Report #${r.id}: ${note || r.reason}`, 7).then(() => setReportStatus(r.id, 'resolved', note || 'Banned for 7 days')))}>
              Ban 7d + resolve
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-loss">{error}</p>}
    </li>
  );
}

// ── Players ──────────────────────────────────────────────────────────────────────────────
function Users({ role, initial }: { role: 'admin' | 'moderator'; initial: string | null }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserLookup[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  useEffect(() => {
    const t = setTimeout(() => void findUsers(q).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="grid gap-0 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="border-b border-line p-3 md:border-r md:border-b-0">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Username" aria-label="Find a player" className={cn(inputClass, 'h-9 border-line pl-9 text-sm')} />
        </div>
        <ul className="mt-2 space-y-0.5">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => setSelected(h.id)} className={cn('flex w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-sm', selected === h.id ? 'bg-surface-3' : 'hover:bg-surface-2')}>
                {h.username}
                {h.is_banned && <Badge tone="loss">banned</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 p-5">{selected ? <UserPanel userId={selected} role={role} /> : <EmptyState icon={<UserRound className="size-5" />} title="Find a player">Search by username, or open one from a report.</EmptyState>}</div>
    </div>
  );
}

function UserPanel({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) {
  const { userId: me } = useAuth();
  const [d, setD] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'mute' | 'no_play' | 'no_tournaments' | 'ban'>('mute');
  const [days, setDays] = useState<number | null>(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setError(null);
    fetchUserDetail(userId)
      .then(setD)
      .catch((e) => setError(e.message));
  }, [userId]);
  useEffect(load, [load]);
  if (error) return <ErrorState>{error}</ErrorState>;
  if (!d) return <LoadingState label="Loading player…" />;

  const apply = async () => {
    if (reason.trim().length < 3) return setError('Give a reason (it’s shown to the player).');
    setBusy(true);
    try {
      if (kind === 'ban') await setBan(userId, true, reason.trim(), days ?? undefined);
      else await addRestriction(userId, kind, reason.trim(), days);
      setReason('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };
  const active = d.restrictions.filter((r) => !r.lifted_at && (!r.expires_at || Date.parse(r.expires_at) > Date.now()));

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{d.profile.username}</h2>
        {d.profile.is_banned && <Badge tone="loss">banned</Badge>}
        {d.staffRole && <Badge tone="gold">{d.staffRole}</Badge>}
        <Link href={`/u/${d.profile.username}`} className="ml-auto text-xs font-semibold text-gold-300 hover:underline">
          Public profile
        </Link>
      </div>
      <p className="text-xs text-fg-subtle">Joined {formatDate(d.profile.created_at)}{d.profile.bio ? ` · bio: “${d.profile.bio}”` : ''}</p>

      {!d.staffRole && (
        <section className="rounded-[12px] border border-line p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Gavel className="size-4 text-gold-400" /> Restrict
          </h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['mute', 'Mute chat'],
                ['no_play', 'No online games'],
                ['no_tournaments', 'No tournaments'],
                ...(role === 'admin' ? [['ban', 'Ban (blocks sign-in)'] as const] : []),
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', kind === k ? 'border-gold-500/60 bg-gold-500/10 text-gold-200' : 'border-line text-fg-muted')}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 3, 7, 30, null].map((n) => (
              <button key={String(n)} type="button" onClick={() => setDays(n)} className={cn('rounded-full border px-3 py-1 text-xs', days === n ? 'border-line-strong bg-surface-3 text-fg' : 'border-line text-fg-subtle')}>
                {n ? `${n} day${n > 1 ? 's' : ''}` : 'Permanent'}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason (shown to the player)" className={cn(inputClass, 'h-9 flex-1 border-line text-sm')} />
            <Button size="sm" variant={kind === 'ban' ? 'danger' : 'primary'} disabled={busy} onClick={() => void apply()}>
              Apply
            </Button>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-semibold">Restrictions ({active.length} active)</h3>
        {d.restrictions.length ? (
          <ul className="space-y-1.5">
            {d.restrictions.map((r) => {
              const live = !r.lifted_at && (!r.expires_at || Date.parse(r.expires_at) > Date.now());
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={live ? 'loss' : 'neutral'}>{r.kind.replace('_', ' ')}</Badge>
                  <span className="text-fg-muted">{r.reason}</span>
                  <span className="text-xs text-fg-subtle">
                    by {r.creator?.username ?? '—'} · {formatDate(r.created_at)}
                    {r.expires_at && ` · until ${formatDate(r.expires_at)}`}
                    {r.lifted_at && ' · lifted'}
                  </span>
                  {live && (r.kind !== 'ban' || role === 'admin') && (
                    <Button size="sm" variant="ghost" onClick={() => void (r.kind === 'ban' ? setBan(userId, false, 'Lifted by staff') : liftRestriction(r.id, me!)).then(load).catch((e) => setError(e.message))}>
                      Lift
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-fg-subtle">None.</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Reports against them ({d.reportsAgainst.length})</h3>
        {d.reportsAgainst.length ? (
          <ul className="space-y-1">
            {d.reportsAgainst.map((r) => (
              <li key={r.id} className="text-fg-muted">
                <Badge>{r.status}</Badge> {r.reason.replace('_', ' ')} · by {r.reporter?.username ?? '—'} · {formatDate(r.created_at)}
                {r.details && <span className="text-fg-subtle"> · “{r.details}”</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-subtle">None.</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Recent chat ({d.chat.length})</h3>
        {d.chat.length ? (
          <ul className="rk-scroll max-h-56 space-y-1 overflow-y-auto">
            {d.chat.map((c) => (
              <li key={c.id} className={cn(c.flagged && 'text-loss')}>
                <Link href={`/admin?tab=games&game=${c.game_id}`} className="text-xs text-fg-subtle hover:text-gold-300">
                  {formatDate(c.created_at)}
                </Link>{' '}
                {c.body} {c.flagged && <Badge tone="loss">flagged</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-subtle">No chat messages.</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Recent games</h3>
        {d.games.length ? (
          <ul className="space-y-1">
            {d.games.map((g) => (
              <li key={g.id} className="flex gap-2 text-fg-muted">
                <Link href={`/admin?tab=games&game=${g.id}`} className="font-[family-name:var(--font-mono)] text-xs hover:text-gold-300">
                  {g.id}
                </Link>
                {g.source} · {g.result} · {g.termination} · {formatDate(g.ended_at)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-subtle">No games.</p>
        )}
      </section>
    </div>
  );
}

// ── Games ────────────────────────────────────────────────────────────────────────────────
function Games({ initial }: { initial: string | null }) {
  const [id, setId] = useState(initial ?? '');
  const [game, setGame] = useState<GameRow | null | undefined>(undefined);
  const [chat, setChat] = useState<Awaited<ReturnType<typeof fetchGameChat>>>([]);
  const [loading, setLoading] = useState(false);
  const look = useCallback(async (gid: string) => {
    if (!/^[A-Za-z0-9]{8,24}$/.test(gid)) return;
    setLoading(true);
    const [g, c] = await Promise.all([fetchGame(gid), fetchGameChat(gid)]);
    setGame(g);
    setChat(c);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (initial) void look(initial);
  }, [initial, look]);
  return (
    <div className="space-y-4 p-5 text-sm">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void look(id.trim());
        }}
      >
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Game id" aria-label="Game id" className={cn(inputClass, 'h-9 flex-1 border-line font-[family-name:var(--font-mono)] text-sm')} />
        <Button size="sm" type="submit" variant="secondary" icon={<Search className="size-4" />}>
          Look up
        </Button>
      </form>
      {loading ? (
        <LoadingState label="Loading…" />
      ) : game === undefined ? null : (
        <>
          {game ? (
            <div className="space-y-1">
              <p className="font-semibold">
                {game.white?.username ?? game.bot_name ?? '?'} vs {game.black?.username ?? game.bot_name ?? '?'} · {game.result} ({game.termination})
              </p>
              <p className="text-xs text-fg-subtle">
                {game.source} · {game.rated ? 'rated' : 'casual'} · {game.time_control} · {formatDate(game.ended_at)} · {game.plies} plies
              </p>
              <Link href={`/review?id=${game.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-300 hover:underline">
                <Swords className="size-3.5" /> Replay & engine review
              </Link>
            </div>
          ) : (
            <p className="text-fg-subtle">No recorded game with that id (it may be unfinished or aborted). Chat, if any, is below.</p>
          )}
          <div>
            <h3 className="mb-2 font-semibold">Chat ({chat.length})</h3>
            {chat.length ? (
              <ul className="space-y-1">
                {chat.map((c) => (
                  <li key={c.id} className={cn(c.flagged && 'text-loss')}>
                    <span className="text-xs text-fg-subtle">{new Date(c.created_at).toLocaleTimeString()}</span> <b>{c.author?.username ?? '—'}</b>: {c.body} {c.flagged && <Badge tone="loss">flagged</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-fg-subtle">No chat in this game.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Log ──────────────────────────────────────────────────────────────────────────────────
function Log() {
  const [rows, setRows] = useState<LogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchModLog()
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorState>{error}</ErrorState>;
  if (!rows) return <LoadingState label="Loading the log…" />;
  if (!rows.length) return <EmptyState icon={<History className="size-5" />} title="No moderation actions yet" />;
  return (
    <ul className="divide-y divide-line text-sm">
      {rows.map((l) => (
        <li key={l.id} className="flex flex-wrap gap-x-2 px-5 py-2.5">
          <span className="text-xs text-fg-subtle">{formatDate(l.created_at)}</span>
          <b>{l.actor?.username ?? 'system'}</b>
          <span className="text-fg-muted">{l.action.replace(':', ' ').replace('_', ' ')}</span>
          {l.target && <span>{l.target.username}</span>}
          {typeof l.details.reason === 'string' && <span className="text-fg-subtle">“{l.details.reason}”</span>}
          {typeof l.details.resolution === 'string' && <span className="text-fg-subtle">“{l.details.resolution}”</span>}
        </li>
      ))}
    </ul>
  );
}
