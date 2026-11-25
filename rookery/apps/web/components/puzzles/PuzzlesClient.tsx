'use client';

import { CalendarDays, Flame, Lightbulb, Puzzle, RotateCcw, SkipForward, Tags, Target, Timer } from 'lucide-react';
import { useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { Badge, ComingSoon } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { cn } from '@/lib/cn';
import { formatCount, formatDate } from '@/lib/format';
import type { DataSource, PuzzleSummary } from '@/lib/types';

export function PuzzlesClient({
  puzzles,
  daily,
  themes,
  rating,
  ratingHistory,
  source,
}: {
  puzzles: PuzzleSummary[];
  daily: PuzzleSummary;
  themes: string[];
  rating: number;
  ratingHistory: number[];
  source: DataSource;
}) {
  const [current, setCurrent] = useState<PuzzleSummary>(puzzles[0]!);
  const best = Math.max(...ratingHistory);
  const progress = Math.min(1, Math.max(0, (rating % 100) / 100));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={
          <div className="flex h-11 items-center gap-3">
            <span className={cn('size-3 rounded-full ring-1 ring-inset', current.toMove === 'white' ? 'bg-[#ece6da] ring-black/10' : 'bg-[#2b2925] ring-white/20')} />
            <p className="text-sm font-semibold">
              {current.toMove === 'white' ? 'White' : 'Black'} to move
              <span className="ml-2 font-normal text-fg-subtle">· {current.themes[0]}</span>
            </p>
            <SampleNotice source={source} className="ml-auto" />
          </div>
        }
        board={<ChessBoard fen={current.fen} lastMove={current.lastMove} orientation={current.toMove} label={`Puzzle: ${current.title}`} />}
      />

      <GamePanel
        title="Puzzles"
        icon={<Puzzle className="size-5" />}
        action={<ComingSoon stage={6} />}
        footer={
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2">
              <Button variant="secondary" icon={<Lightbulb className="size-4" />} disabled title="Puzzle solving arrives in Stage 6">
                Hint
              </Button>
              <Button variant="secondary" icon={<RotateCcw className="size-4" />} disabled title="Puzzle solving arrives in Stage 6">
                Retry
              </Button>
              <Button
                variant="primary"
                iconRight={<SkipForward className="size-4" />}
                onClick={() => setCurrent(puzzles[(puzzles.indexOf(current) + 1) % puzzles.length]!)}
              >
                Next position
              </Button>
            </div>
            <p className="text-center text-xs text-fg-subtle">Move checking, ratings and streaks are connected in Stage 6.</p>
          </div>
        }
      >
        {/* Rating */}
        <div className="border-b border-line p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-fg-subtle">Puzzle rating</p>
              <p className="tabular font-[family-name:var(--font-display)] text-3xl font-semibold">{rating.toLocaleString('en-US')}</p>
            </div>
            <div className="text-right text-xs text-fg-subtle">
              <p className="flex items-center justify-end gap-1">
                <Flame className="size-3.5 text-gold-400" aria-hidden /> 6 in a row
              </p>
              <p className="tabular">Best {best.toLocaleString('en-US')}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Current puzzle */}
        <div className="border-b border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Current position</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">{current.title}</p>
          {current.teaser && <p className="mt-1 text-sm text-fg-muted">{current.teaser}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {current.themes.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            <Badge tone="gold">Rated {current.rating}</Badge>
          </div>
        </div>

        {/* Modes */}
        <div className="grid grid-cols-2 gap-2 border-b border-line p-4">
          <Mode icon={<Target />} title="Rated" text="Adapts to your level" />
          <Mode icon={<CalendarDays />} title="Daily" text={formatDate(daily.date ?? '2026-11-25')} onClick={() => setCurrent(daily)} active={current.id === daily.id} />
          <Mode icon={<Timer />} title="Sprint" text="Solve as many as you can in 3 min" />
          <Mode icon={<Tags />} title="By theme" text="Drill one motif" />
        </div>

        {/* Daily */}
        <div className="border-b border-line p-5">
          <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
            Daily puzzle <span className="tabular normal-case tracking-normal">{formatCount(daily.solvedBy ?? 0)} solved</span>
          </p>
          <button type="button" onClick={() => setCurrent(daily)} className="mt-2 text-left">
            <span className="block font-semibold text-fg hover:text-gold-300">{daily.title}</span>
            <span className="block text-sm text-fg-muted">{daily.teaser}</span>
          </button>
        </div>

        {/* Themes */}
        <div className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Themes</p>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <span key={t} className="rounded-full border border-line px-3 py-1 text-[13px] text-fg-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </GamePanel>
    </div>
  );
}

function Mode({ icon, title, text, onClick, active }: { icon: React.ReactNode; title: string; text: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors duration-150',
        active ? 'border-gold-500/50 bg-gold-500/10' : 'border-line',
        onClick ? 'hover:border-line-strong hover:bg-surface-2' : 'cursor-default opacity-60',
      )}
    >
      <span className="text-gold-400 [&>svg]:size-4">{icon}</span>
      <span className="text-sm font-semibold text-fg">{title}</span>
      <span className="text-xs leading-snug text-fg-subtle">{text}</span>
    </button>
  );
}
