'use client';

import { Bot, Flame, Hourglass, Microscope, Timer, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import type { GameRow } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { gamePgn, perspective, sendToAnalysis } from '@/lib/gameUtils';

const ICON: Record<string, typeof Zap> = { bullet: Zap, blitz: Flame, rapid: Timer, classical: Hourglass, untimed: Hourglass };
const STYLE = { win: 'bg-win/15 text-win', loss: 'bg-loss/15 text-loss', draw: 'bg-draw/15 text-draw' };
const LABEL = { win: 'Won', loss: 'Lost', draw: 'Draw' };

/** A player's recorded games (real data from the `games` table). */
export function GamesTable({ games, userId, username, compact }: { games: GameRow[]; userId: string; username: string; compact?: boolean }) {
  const router = useRouter();
  if (!games.length) {
    return (
      <EmptyState icon={<Bot className="size-5" />} title="No games yet">
        Finished games appear here. Try one against a computer opponent.
      </EmptyState>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-fg-subtle">
            <th className="py-2.5 pl-5 font-medium">Type</th>
            <th className="py-2.5 font-medium">Opponent</th>
            <th className="py-2.5 text-center font-medium">Result</th>
            {!compact && <th className="py-2.5 text-right font-medium">Moves</th>}
            <th className="py-2.5 text-right font-medium">Date</th>
            <th className="w-12 py-2.5 pr-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {games.map((g) => {
            const p = perspective(g, userId);
            const Icon = ICON[g.category] ?? Timer;
            const analyse = () => {
              const white = p.side === 'white' ? username : p.opponent.name;
              const black = p.side === 'black' ? username : p.opponent.name;
              sendToAnalysis(gamePgn(g, white, black));
              router.push('/analysis');
            };
            return (
              <tr key={g.id} className="transition-colors hover:bg-surface-2/60">
                <td className="py-3 pl-5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <Icon className="size-4 text-gold-400" aria-hidden />
                    <span className="tabular text-xs">{g.time_control === 'none' ? 'No clock' : g.time_control}</span>
                  </span>
                </td>
                <td className="py-2.5">
                  <Link href={p.opponent.href} className="flex items-center gap-2 hover:text-gold-300">
                    {p.opponent.bot ? (
                      <span className="grid size-6 place-items-center rounded-[28%] bg-surface-3">
                        <Bot className="size-3.5 text-fg-subtle" />
                      </span>
                    ) : (
                      <PlayerAvatar name={p.opponent.name} size="xs" />
                    )}
                    <span className="truncate font-semibold">{p.opponent.name}</span>
                    {p.opponent.rating && <span className="tabular text-xs text-fg-subtle">({p.opponent.rating})</span>}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-subtle">
                    <span className={cn('size-2 rounded-[2px] ring-1 ring-inset', p.side === 'white' ? 'bg-[#ece6da] ring-black/10' : 'bg-[#2b2925] ring-white/15')} />
                    {p.side === 'white' ? 'White' : 'Black'}
                    {g.opening && <> · {g.opening}</>}
                    {g.rated ? ' · rated' : ''}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <span className={cn('inline-flex h-6 min-w-12 items-center justify-center rounded-full px-2 text-xs font-semibold', STYLE[p.outcome])}>{LABEL[p.outcome]}</span>
                  <span className="mt-0.5 block text-[11px] text-fg-subtle capitalize">{g.termination.replace('-', ' ')}</span>
                </td>
                {!compact && <td className="tabular py-3 text-right text-fg-muted">{Math.ceil(g.plies / 2)}</td>}
                <td className="py-3 text-right text-xs whitespace-nowrap text-fg-subtle">{formatDate(g.ended_at)}</td>
                <td className="py-3 pr-4 text-right">
                  <button
                    type="button"
                    onClick={analyse}
                    aria-label="Open in analysis"
                    title="Open in analysis"
                    className="grid size-8 place-items-center rounded-[8px] text-fg-subtle hover:bg-surface-3 hover:text-fg"
                  >
                    <Microscope className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
