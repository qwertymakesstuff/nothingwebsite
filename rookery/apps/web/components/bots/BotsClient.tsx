'use client';

import {
  CUSTOM_ID,
  CUSTOM_MAX_ELO,
  CUSTOM_MIN_ELO,
  customPersona,
  describeStrength,
  displayRating,
  getOpening,
  OPENINGS,
  ROSTER,
  strengthProfile,
  tierInfo,
  type Persona,
  type Tier,
} from '@rookery/ai';
import { START_FEN, TIME_CONTROLS } from '@rookery/chess-core';
import { Bot, ChevronDown, Cpu, History, Microscope, Shuffle, SlidersHorizontal, Swords, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { ANALYSIS_HANDOFF_KEY } from '@/components/play/PlayClient';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/States';
import { Segmented, Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { clearBotGames, outcomeOf, recordAgainst, useBotGames, type BotGameRecord } from '@/lib/botHistory';
import { replaySan } from '@/lib/chess';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Side } from '@/lib/types';
import type { BotGameSettings } from '@/lib/useBotGame';
import { BotGame } from './BotGame';
import { PersonaPortrait, SpeechBubble, TraitMeter } from './BotBits';

type ColorChoice = 'white' | 'random' | 'black';

export function BotsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const tiers = useMemo(() => tierInfo(), []);
  const [customElo, setCustomElo] = useState(1500);
  const [customMax, setCustomMax] = useState(false);
  const initialId = params.get('bot') ?? 'theo';
  const [selectedId, setSelectedId] = useState(ROSTER.some((p) => p.id === initialId) || initialId === CUSTOM_ID ? initialId : 'theo');
  const persona = useMemo<Persona>(
    () => (selectedId === CUSTOM_ID ? customPersona(customMax ? 'max' : customElo) : ROSTER.find((p) => p.id === selectedId)!),
    [selectedId, customElo, customMax],
  );
  const [openTier, setOpenTier] = useState<Tier | 'custom' | null>(selectedId === CUSTOM_ID ? 'custom' : persona.tier);
  const [color, setColor] = useState<ColorChoice>('random');
  const [timeControl, setTimeControl] = useState('none');
  const [openingId, setOpeningId] = useState('auto');
  const [takebacks, setTakebacks] = useState(true);
  const [active, setActive] = useState<BotGameSettings | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const games = useBotGames();

  const choose = (id: string) => {
    setSelectedId(id);
    router.replace(`/bots?bot=${id}`, { scroll: false });
  };

  const start = () => {
    const playerColor: Side = color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color;
    setActive({ persona, playerColor, timeControl, openingId: openingId === 'auto' ? undefined : openingId, takebacks });
    setGameKey((k) => k + 1);
  };

  if (active) {
    return (
      <BotGame
        key={gameKey}
        settings={active}
        onRematch={() => {
          setActive((a) => (a ? { ...a, playerColor: a.playerColor === 'white' ? 'black' : 'white' } : a));
          setGameKey((k) => k + 1);
        }}
        onExit={() => setActive(null)}
      />
    );
  }

  const previewFen = openingId !== 'auto' ? replaySan(getOpening(openingId)!.moves.split(' ')).fen : START_FEN;
  const record = recordAgainst(games, persona.id);
  const profile = strengthProfile(persona.strength.elo, persona.strength.movetimeMs);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-start">
      <BoardFrame
        top={<PlayerStrip name={persona.name} rating={displayRating(persona)} country={persona.country} avatar={<PersonaPortrait persona={persona} size="sm" className="size-8" />} />}
        bottom={<PlayerStrip name="You" muted />}
        board={<ChessBoard fen={previewFen} orientation={color === 'black' ? 'black' : 'white'} label="Starting position" />}
      />

      <GamePanel
        title="Computer opponents"
        icon={<Bot className="size-5" />}
        footer={
          <div className="space-y-3">
            <Button variant="primary" size="lg" block icon={<Swords className="size-5" />} onClick={start}>
              Play {persona.name}
            </Button>
          </div>
        }
      >
        <Tabs
          label="Computer opponents"
          listClassName="px-3"
          items={[
            {
              value: 'opponents',
              label: 'Opponents',
              icon: <Bot className="size-4" />,
              content: (
                <>
                  {/* Selected opponent */}
                  <div className="border-b border-line p-5">
                    <div className="flex gap-4">
                      <PersonaPortrait persona={persona} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-[family-name:var(--font-display)] text-xl font-semibold">{persona.name}</span>
                          <span className="tabular text-sm text-fg-subtle">{displayRating(persona)}</span>
                        </p>
                        <p className="text-sm text-fg-muted">{persona.tagline}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {persona.style.map((s) => (
                            <Badge key={s} tone="gold">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {persona.id !== CUSTOM_ID && <SpeechBubble text={persona.dialogue.greeting![0]!} className="mt-4" />}
                    <p className="mt-3 text-[13px] leading-relaxed text-fg-subtle">{persona.bio}</p>

                    {persona.id === CUSTOM_ID && (
                      <div className="mt-4 space-y-3 rounded-[12px] border border-line p-4">
                        <label className="flex items-center justify-between text-sm font-semibold" htmlFor="custom-elo">
                          Strength
                          <span className="tabular text-gold-300">{customMax ? 'Full strength' : customElo}</span>
                        </label>
                        <input
                          id="custom-elo"
                          type="range"
                          min={CUSTOM_MIN_ELO}
                          max={CUSTOM_MAX_ELO}
                          step={10}
                          value={customElo}
                          disabled={customMax}
                          onChange={(e) => setCustomElo(Number(e.target.value))}
                          className="w-full accent-[var(--color-gold-500)]"
                        />
                        <Switch checked={customMax} onChange={setCustomMax} label="Full strength (no limit)" />
                      </div>
                    )}

                    <div className="mt-4 space-y-2 rounded-[12px] bg-surface-2/60 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
                        <Cpu className="size-3.5 text-gold-400" aria-hidden /> {describeStrength(profile)}
                      </p>
                      {persona.id !== CUSTOM_ID && (
                        <div className="grid gap-2.5 pt-2">
                          <TraitMeter label="Aggression" value={persona.personality.aggression} left="Calm" right="Attacking" />
                          <TraitMeter label="Risk" value={persona.personality.risk} left="Safe" right="Daring" />
                          <TraitMeter label="Chattiness" value={persona.personality.chattiness} left="Quiet" right="Chatty" />
                        </div>
                      )}
                      {(persona.openings.white.length > 0 || persona.openings.black.length > 0) && (
                        <p className="pt-1 text-xs text-fg-subtle">
                          Favourite openings:{' '}
                          <span className="text-fg-muted">
                            {[...new Set([...persona.openings.white, ...persona.openings.black].map((l) => getOpening(l.opening)?.name))].join(', ')}
                          </span>
                        </p>
                      )}
                      <p className="tabular pt-1 text-xs text-fg-subtle">
                        Your record:{' '}
                        {record.games ? (
                          <span className="text-fg-muted">
                            <span className="text-win">{record.wins}W</span> · <span className="text-draw">{record.draws}D</span> · <span className="text-loss">{record.losses}L</span>
                          </span>
                        ) : (
                          'no games yet'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Game options */}
                  <div className="space-y-3 border-b border-line p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <SlidersHorizontal className="size-4 text-gold-400" aria-hidden /> Game options
                    </p>
                    <Segmented
                      label="Play as"
                      value={color}
                      onChange={setColor}
                      options={[
                        { value: 'white', label: 'White' },
                        { value: 'random', label: 'Random', icon: <Shuffle className="size-3.5" /> },
                        { value: 'black', label: 'Black' },
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        label="Time control"
                        value={timeControl}
                        onChange={setTimeControl}
                        options={[{ value: 'none', label: 'No clock' }, ...TIME_CONTROLS.map((t) => ({ value: t.id, label: t.label }))]}
                      />
                      <Select
                        label="Opening"
                        value={openingId}
                        onChange={setOpeningId}
                        options={[{ value: 'auto', label: 'Normal start' }, ...OPENINGS.map((o) => ({ value: o.id, label: o.name, description: o.blurb }))]}
                      />
                    </div>
                    <Switch checked={takebacks} onChange={setTakebacks} label="Allow takebacks" description="Undo your last move (and the reply)." />
                  </div>

                  {/* Roster */}
                  <div className="p-3">
                    {tiers.map((t) => {
                      const list = ROSTER.filter((b) => b.tier === t.id);
                      const open = openTier === t.id;
                      return (
                        <TierGroup key={t.id} open={open} onToggle={() => setOpenTier(open ? null : t.id)} title={t.name} range={t.range} blurb={t.blurb} portraits={list.slice(0, 3)} count={list.length}>
                          <div className="grid grid-cols-3 gap-2 px-1">
                            {list.map((b) => (
                              <OpponentCard key={b.id} persona={b} selected={selectedId === b.id} onSelect={() => choose(b.id)} record={recordAgainst(games, b.id)} />
                            ))}
                          </div>
                        </TierGroup>
                      );
                    })}
                    <TierGroup
                      open={openTier === 'custom'}
                      onToggle={() => {
                        setOpenTier(openTier === 'custom' ? null : 'custom');
                        choose(CUSTOM_ID);
                      }}
                      title="Custom strength"
                      range={`${CUSTOM_MIN_ELO}–${CUSTOM_MAX_ELO}+`}
                      blurb="Plain Stockfish at any strength you choose."
                      portraits={[customPersona(1500)]}
                      count={1}
                    >
                      <p className="px-2 text-xs text-fg-subtle">Adjust the strength slider above.</p>
                    </TierGroup>
                  </div>
                </>
              ),
            },
            { value: 'history', label: 'History', icon: <History className="size-4" />, count: games.length, content: <HistoryPanel games={games} /> },
          ]}
        />
      </GamePanel>
    </div>
  );
}

function TierGroup({
  open,
  onToggle,
  title,
  range,
  blurb,
  portraits,
  count,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  range: string;
  blurb: string;
  portraits: Persona[];
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-surface-2">
        <span className="flex -space-x-2">
          {portraits.map((b) => (
            <PersonaPortrait key={b.id} persona={b} size="sm" className="size-7 ring-2 ring-surface-1" />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span className="tabular block text-xs text-fg-subtle">{range}</span>
        </span>
        <span className="text-xs text-fg-subtle">{count}</span>
        <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="animate-fade-in pb-2">
          <p className="px-2 pb-2 text-xs text-fg-subtle">{blurb}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function OpponentCard({ persona, selected, onSelect, record }: { persona: Persona; selected: boolean; onSelect: () => void; record: { wins: number; draws: number; losses: number; games: number } }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center rounded-[12px] border p-2.5 text-center transition-colors duration-150',
        selected ? 'border-gold-500/60 bg-gold-500/10' : 'border-line hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <PersonaPortrait persona={persona} size="md" />
      <span className="mt-2 w-full truncate text-[13px] font-semibold text-fg">{persona.name}</span>
      <span className="tabular text-[11px] text-fg-subtle">{displayRating(persona)}</span>
      {record.games > 0 && (
        <span className="tabular mt-1 text-[10px] text-fg-subtle">
          {record.wins}–{record.draws}–{record.losses}
        </span>
      )}
    </button>
  );
}

function HistoryPanel({ games }: { games: BotGameRecord[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const total = recordAgainst(games);
  if (!games.length) {
    return (
      <EmptyState icon={<History className="size-5" />} title="No games yet">
        Games against computer opponents are saved here, on this device.
      </EmptyState>
    );
  }
  const analyse = (g: BotGameRecord) => {
    try {
      sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, g.pgn);
    } catch {
      /* ignore */
    }
    router.push('/analysis');
  };
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
        <span className="tabular text-fg-muted">
          {total.games} games · <span className="text-win">{total.wins}W</span> <span className="text-draw">{total.draws}D</span> <span className="text-loss">{total.losses}L</span>
        </span>
        <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirm(true)}>
          Clear
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {games.map((g) => {
          const o = outcomeOf(g);
          const persona = ROSTER.find((p) => p.id === g.botId);
          return (
            <li key={g.id} className="flex items-center gap-3 px-5 py-3">
              {persona ? <PersonaPortrait persona={persona} size="sm" className="size-9" /> : <span className="grid size-9 place-items-center rounded-[28%] bg-surface-3"><Cpu className="size-4 text-fg-subtle" /></span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  vs {g.botName} <span className="tabular font-normal text-fg-subtle">({g.botRating})</span>
                </p>
                <p className="truncate text-xs text-fg-subtle">
                  {g.playerColor === 'white' ? 'White' : 'Black'} · {Math.ceil(g.plies / 2)} moves · {g.termination} · {formatDate(g.playedAt)}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', o === 'win' ? 'bg-win/15 text-win' : o === 'loss' ? 'bg-loss/15 text-loss' : 'bg-draw/15 text-draw')}>
                {o === 'win' ? 'Won' : o === 'loss' ? 'Lost' : 'Draw'}
              </span>
              <button type="button" className="grid size-8 place-items-center rounded-[8px] text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Open in analysis" title="Open in analysis" onClick={() => analyse(g)}>
                <Microscope className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear game history?"
        description="This removes every saved game against computer opponents from this device."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearBotGames();
                setConfirm(false);
              }}
            >
              Clear history
            </Button>
          </>
        }
      />
    </div>
  );
}
