'use client';

import { Chess } from 'chess.js';
import type { GameRow } from './db';

export type Outcome = 'win' | 'loss' | 'draw';

export function perspective(g: GameRow, userId: string) {
  const side: 'white' | 'black' = g.white_id === userId ? 'white' : 'black';
  const outcome: Outcome = g.result === '1/2-1/2' ? 'draw' : (g.result === '1-0') === (side === 'white') ? 'win' : 'loss';
  const opponent =
    g.source === 'bot'
      ? { name: g.bot_name ?? 'Computer', rating: g.bot_elo === 3200 ? '3000+' : g.bot_elo ? String(g.bot_elo) : undefined, href: g.bot_id && g.bot_id !== 'custom' ? `/bots?bot=${g.bot_id}` : '/bots', bot: true }
      : { name: (side === 'white' ? g.black?.username : g.white?.username) ?? 'Deleted player', rating: undefined, href: `/u/${side === 'white' ? g.black?.username : g.white?.username}`, bot: false };
  return { side, outcome, opponent };
}

/** PGN of a stored game (moves are UCI in the database). */
export function gamePgn(g: GameRow, whiteName: string, blackName: string): string {
  const chess = new Chess(g.initial_fen);
  for (const m of g.moves ? g.moves.split(' ') : []) chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  chess.setHeader('Event', g.source === 'bot' ? 'Rookery: game vs computer' : 'Rookery');
  chess.setHeader('Site', 'chess.missing.website');
  chess.setHeader('Date', g.ended_at.slice(0, 10).replace(/-/g, '.'));
  chess.setHeader('White', whiteName);
  chess.setHeader('Black', blackName);
  chess.setHeader('Result', g.result);
  chess.setHeader('Termination', g.termination);
  return chess.pgn();
}

export const ANALYSIS_HANDOFF_KEY = 'rookery.analysis.import';

export function sendToAnalysis(pgn: string): void {
  try {
    sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, pgn);
  } catch {
    /* ignore */
  }
}

export function winRate(wins: number, draws: number, games: number): string {
  if (!games) return '–';
  return `${Math.round(((wins + draws / 2) / games) * 100)}%`;
}
