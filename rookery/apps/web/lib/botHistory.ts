'use client';

// Games played against computer opponents, kept in this browser (real data, not sample).
// When accounts arrive (Stage 2) these are uploaded to the `games` table with source 'bot'.

import type { BotGameSubmission } from '@rookery/protocol';
import { START_FEN } from '@rookery/chess-core';
import { Chess } from 'chess.js';
import { useCallback, useEffect, useState } from 'react';
import type { GameResult, Side } from './types';

export interface BotGameRecord {
  id: string;
  botId: string;
  botName: string;
  botRating: string;
  playerColor: Side;
  result: GameResult;
  termination: string;
  pgn: string;
  plies: number;
  timeControl: string; // "none" or e.g. "10+0"
  opening?: string;
  /** Catalogue id of the starting opening, when one was chosen (needed to upload the game). */
  openingId?: string;
  playedAt: string; // ISO
}

export interface BotRecord {
  wins: number;
  draws: number;
  losses: number;
  games: number;
}

const KEY = 'rookery.botGames.v1';
const MAX = 200;
const EVENT = 'rookery:bot-history';

export function loadBotGames(): BotGameRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BotGameRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveBotGame(rec: BotGameRecord): void {
  try {
    const all = [rec, ...loadBotGames().filter((g) => g.id !== rec.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage full or blocked: the game still happened, it just isn't remembered */
  }
}

export function clearBotGames(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function outcomeOf(g: BotGameRecord): 'win' | 'loss' | 'draw' {
  if (g.result === '1/2-1/2') return 'draw';
  return (g.result === '1-0') === (g.playerColor === 'white') ? 'win' : 'loss';
}

export function recordAgainst(games: BotGameRecord[], botId?: string): BotRecord {
  const r: BotRecord = { wins: 0, draws: 0, losses: 0, games: 0 };
  for (const g of games) {
    if (botId && g.botId !== botId) continue;
    const o = outcomeOf(g);
    r.games++;
    if (o === 'win') r.wins++;
    else if (o === 'loss') r.losses++;
    else r.draws++;
  }
  return r;
}

/** Live view of the stored games (updates when a game is saved or cleared, in any tab). */
export function useBotGames(): BotGameRecord[] {
  const [games, setGames] = useState<BotGameRecord[]>([]);
  const refresh = useCallback(() => setGames(loadBotGames()), []);
  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);
  return games;
}

/** Rebuilds the server submission for a game saved on this device (for "upload to my account"). */
export function toSubmission(g: BotGameRecord): BotGameSubmission | null {
  try {
    const chess = new Chess();
    chess.loadPgn(g.pgn);
    const moves = chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    const custom = g.botId === 'custom';
    return {
      clientRef: g.id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64).padEnd(6, '0'),
      botId: g.botId,
      ...(custom ? { customElo: g.botRating === '3000+' ? ('max' as const) : Number(g.botRating) } : {}),
      playerColor: g.playerColor,
      timeControl: g.timeControl,
      initialFen: START_FEN,
      moves,
      result: g.result,
      termination: g.termination as BotGameSubmission['termination'],
      ...(g.openingId ? { openingId: g.openingId } : {}),
      endedAt: g.playedAt,
    };
  } catch {
    return null;
  }
}
