// Domain types shared by every page. Real data (Supabase, the realtime server, the engine)
// and sample data (lib/sample) both produce exactly these shapes, so the UI never changes
// when a stage swaps sample data for the real thing.

import type { RatingCategory } from '@rookery/chess-core';

export type Category = RatingCategory | 'puzzle';
export type Side = 'white' | 'black';
export type GameResult = '1-0' | '0-1' | '1/2-1/2';

/** Where a piece of data came from. The UI labels anything that isn't 'live'. */
export type DataSource = 'live' | 'sample';

export interface Sourced<T> {
  data: T;
  source: DataSource;
}

export interface PlayerRef {
  username: string;
  displayName?: string;
  country?: string; // ISO 3166-1 alpha-2
  title?: string; // reserved for verified titles
  rating?: number;
}

export interface RatingSnapshot {
  category: Category;
  rating: number;
  rd: number;
  games: number;
  peak: number;
  /** Recent rating history, oldest first (for sparklines). */
  history: number[];
}

export interface Profile extends PlayerRef {
  bio?: string;
  joinedAt: string; // ISO date
  lastSeenAt: string; // ISO date-time
  online: boolean;
  friends: number;
  ratings: RatingSnapshot[];
  streakDays: number;
  record: { wins: number; draws: number; losses: number };
}

export interface GameSummary {
  id: string;
  white: PlayerRef;
  black: PlayerRef;
  result: GameResult;
  termination: string;
  timeControl: string; // e.g. "5+0"
  category: Category;
  rated: boolean;
  plies: number;
  playedAt: string; // ISO date-time
  opening?: string;
  /** Final position, for mini boards. */
  fen: string;
  lastMove?: [string, string];
  /** Accuracy per side once reviewed. */
  accuracy?: { white: number; black: number };
}

export interface LeaderboardEntry {
  rank: number;
  player: PlayerRef;
  rating: number;
  games: number;
  winRate: number; // 0..1
  trend: number[]; // recent ratings, oldest first
}

export type BotTier = 'newcomer' | 'casual' | 'club' | 'expert' | 'master';

/** Presentation side of a computer opponent. Engine behaviour is configured in Stage 3. */
export interface BotProfile {
  id: string;
  name: string;
  tier: BotTier;
  rating: number;
  country?: string;
  tagline: string;
  bio: string;
  style: string[];
  greeting: string;
  portrait: PortraitSpec;
}

export interface PortraitSpec {
  bg: [string, string];
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bun' | 'curly' | 'bald' | 'mohawk' | 'bob';
  accessory?: 'glasses' | 'beret' | 'headphones' | 'monocle' | 'scarf' | 'cap';
  shirt: string;
}

export interface PuzzleSummary {
  id: string;
  fen: string;
  /** Side to move in the puzzle. */
  toMove: Side;
  rating: number;
  themes: string[];
  title: string;
  teaser?: string;
  lastMove?: [string, string];
  solvedBy?: number;
  date?: string; // for daily puzzles
}
