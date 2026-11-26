'use client';

import { getTimeControl } from '@rookery/chess-core';
import { CalendarClock, Crown, Plus, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimeControlPicker } from '@/components/play/TimeControlPicker';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, FormMessage } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { createTournament, fetchTournaments, type TournamentRow } from '@/lib/platform';

export function TournamentsClient() {
  const { status } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchTournaments>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchTournaments()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load tournaments.'));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compete"
        title="Tournaments"
        description="Arena tournaments: play as many games as you can before the clock runs out. Win 2, draw 1, and after two wins in a row every win is worth double."
        actions={
          status === 'signedIn' ? (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Create tournament
            </Button>
          ) : (
            <ButtonLink href="/login?next=/tournaments" variant="secondary">
              Sign in to play
            </ButtonLink>
          )
        }
      />
      {error ? (
        <ErrorState action={<button className="font-semibold text-gold-300" onClick={load}>Try again</button>}>{error}</ErrorState>
      ) : !data ? (
        <LoadingState label="Loading tournaments…" />
      ) : (
        <Card>
          <Tabs
            label="Tournaments"
            defaultValue={data.live.length ? 'live' : 'upcoming'}
            items={[
              { value: 'live', label: 'Live now', count: data.live.length, content: <List rows={data.live} empty="No tournament is running right now." /> },
              { value: 'upcoming', label: 'Upcoming', count: data.upcoming.length, content: <List rows={data.upcoming} empty="No tournaments are scheduled. Create one!" /> },
              { value: 'finished', label: 'Finished', count: data.finished.length, content: <List rows={data.finished} empty="No finished tournaments yet." /> },
            ]}
          />
        </Card>
      )}
      <CreateTournament open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function List({ rows, empty }: { rows: TournamentRow[]; empty: string }) {
  if (!rows.length) return <EmptyState icon={<Trophy className="size-5" />} title={empty} />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((t) => (
        <li key={t.id}>
          <Link href={`/tournament?id=${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-2/60">
            <span className="grid size-10 place-items-center rounded-[10px] bg-gold-500/12 text-gold-300">
              <Trophy className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{t.name}</span>
              <span className="block text-xs text-fg-subtle">
                {getTimeControl(t.time_control)?.label ?? t.time_control} · {t.rated ? 'Rated' : 'Casual'} · {t.duration_minutes} min
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Users className="size-3.5" /> {t.player_count}
            </span>
            <span className="text-right text-xs text-fg-muted">
              {t.status === 'scheduled' && (
                <>
                  <CalendarClock className="mr-1 inline size-3.5" />
                  {new Date(t.starts_at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </>
              )}
              {t.status === 'running' && <Badge tone="gold">Live</Badge>}
              {t.status === 'finished' && t.winner && (
                <>
                  <Crown className="mr-1 inline size-3.5 text-gold-300" />
                  {t.winner.username}
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STARTS = [
  { v: 2, l: 'In 2 minutes' },
  { v: 5, l: 'In 5 minutes' },
  { v: 15, l: 'In 15 minutes' },
  { v: 60, l: 'In an hour' },
  { v: 24 * 60, l: 'This time tomorrow' },
];
const DURATIONS = [20, 30, 45, 60, 90];

function CreateTournament({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tc, setTc] = useState('3+2');
  const [rated, setRated] = useState(true);
  const [starts, setStarts] = useState(5);
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 3) return setError('Give the tournament a name (3–40 characters).');
    setBusy(true);
    try {
      const { id } = await createTournament({ name: name.trim(), tc, rated, startsInMinutes: starts, durationMinutes: duration });
      router.push(`/tournament?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the tournament.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a tournament"
      description="An arena: players are paired continuously until time runs out."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Field label="Name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Friday night blitz" />
        <div>
          <p className="mb-2 text-sm font-medium">Time control</p>
          <TimeControlPicker value={tc} onChange={setTc} />
        </div>
        <Switch checked={rated} onChange={setRated} label="Rated" description="Games change players’ ratings." />
        <Choice label="Starts" value={starts} onChange={setStarts} options={STARTS.map((s) => ({ value: s.v, label: s.l }))} />
        <Choice label="Length" value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} />
      </div>
    </Modal>
  );
}

function Choice({ label, value, onChange, options }: { label: string; value: number; onChange: (v: number) => void; options: { value: number; label: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('h-9 rounded-[var(--radius-control)] px-3 text-sm font-semibold', value === o.value ? 'bg-gold-500/15 text-gold-200 shadow-[0_0_0_1.5px_var(--color-gold-500)_inset]' : 'bg-surface-3 text-fg-muted hover:text-fg')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
