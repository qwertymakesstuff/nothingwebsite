'use client';

import { START_FEN } from '@rookery/chess-core';
import { Bot, ChevronDown, Shuffle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BotPortrait } from '@/components/avatar/BotPortrait';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { Badge, ComingSoon } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { Segmented } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import type { BotProfile, BotTier, DataSource } from '@/lib/types';

type Tier = { id: BotTier; name: string; range: string; blurb: string };

export function BotsClient({ tiers, bots, source }: { tiers: Tier[]; bots: BotProfile[]; source: DataSource }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = bots.find((b) => b.id === params.get('bot')) ?? bots.find((b) => b.id === 'theo')!;
  const [selected, setSelected] = useState<BotProfile>(initial);
  const [openTier, setOpenTier] = useState<BotTier>(initial.tier);
  const [color, setColor] = useState<'white' | 'random' | 'black'>('random');

  const choose = (b: BotProfile) => {
    setSelected(b);
    router.replace(`/bots?bot=${b.id}`, { scroll: false });
  };
  const orientation = color === 'black' ? 'black' : 'white';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={
          <PlayerStrip
            name={selected.name}
            rating={selected.rating}
            country={selected.country}
            avatar={<BotPortrait spec={selected.portrait} name={selected.name} size="sm" raven={selected.id === 'corvus'} />}
          />
        }
        bottom={<PlayerStrip name="You" muted />}
        board={<ChessBoard fen={START_FEN} orientation={orientation} label="Starting position" />}
      />

      <GamePanel
        title="Computer opponents"
        icon={<Bot className="size-5" />}
        action={<SampleNotice source={source} />}
        footer={
          <div className="space-y-3">
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
            <Button variant="primary" size="lg" block disabled title="Computer opponents arrive in Stage 3">
              Play {selected.name}
            </Button>
            <p className="text-center text-xs text-fg-subtle">
              The engine behind these opponents (Stockfish) is connected in Stage 3.
            </p>
          </div>
        }
      >
        {/* Selected opponent */}
        <div className="border-b border-line p-5">
          <div className="flex gap-4">
            <BotPortrait spec={selected.portrait} name={selected.name} size="lg" raven={selected.id === 'corvus'} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-xl font-semibold">{selected.name}</span>
                <span className="tabular text-sm text-fg-subtle">{selected.rating}</span>
              </p>
              <p className="text-sm text-fg-muted">{selected.tagline}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.style.map((s) => (
                  <Badge key={s} tone="gold">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="relative mt-4 rounded-[12px] bg-surface-2 px-4 py-3 text-sm text-fg before:absolute before:-top-1.5 before:left-7 before:size-3 before:rotate-45 before:bg-surface-2">
            &ldquo;{selected.greeting}&rdquo;
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-fg-subtle">{selected.bio}</p>
        </div>

        {/* Roster */}
        <div className="p-3">
          {tiers.map((t) => {
            const list = bots.filter((b) => b.tier === t.id);
            const open = openTier === t.id;
            return (
              <div key={t.id} className="mb-1">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenTier(open ? ('' as BotTier) : t.id)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="flex -space-x-2">
                    {list.slice(0, 3).map((b) => (
                      <BotPortrait key={b.id} spec={b.portrait} name={b.name} size="sm" className="size-7 ring-2 ring-surface-1" raven={b.id === 'corvus'} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{t.name}</span>
                    <span className="tabular block text-xs text-fg-subtle">{t.range}</span>
                  </span>
                  <span className="text-xs text-fg-subtle">{list.length}</span>
                  <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden />
                </button>
                {open && (
                  <div className="animate-fade-in pb-2">
                    <p className="px-2 pb-2 text-xs text-fg-subtle">{t.blurb}</p>
                    <div className="grid grid-cols-3 gap-2 px-1">
                      {list.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => choose(b)}
                          aria-pressed={selected.id === b.id}
                          className={cn(
                            'flex flex-col items-center rounded-[12px] border p-2.5 text-center transition-colors duration-150',
                            selected.id === b.id ? 'border-gold-500/60 bg-gold-500/10' : 'border-line hover:border-line-strong hover:bg-surface-2',
                          )}
                        >
                          <BotPortrait spec={b.portrait} name={b.name} size="md" raven={b.id === 'corvus'} />
                          <span className="mt-2 w-full truncate text-[13px] font-semibold text-fg">{b.name}</span>
                          <span className="tabular text-[11px] text-fg-subtle">{b.rating}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="mt-2 flex items-center justify-between rounded-[10px] border border-dashed border-line px-3 py-2.5 text-xs text-fg-subtle">
            <span>Adaptive opponent that matches your level</span>
            <ComingSoon stage={3} />
          </div>
        </div>
      </GamePanel>
    </div>
  );
}
