// SAMPLE DATA: three real tactical positions taken from public-domain games (the solutions are
// genuine). Ratings, solve counts and dates are made up. Stage 6 replaces this with the Lichess
// CC0 puzzle database. See ./README.md.

import { replaySan, sanTokens } from '../chess';
import type { PuzzleSummary } from '../types';
import { IMMORTAL_GAME, OPERA_GAME } from './games';

function positionAfter(pgn: string, plies: number) {
  const tokens = sanTokens(pgn).slice(0, plies);
  return replaySan(tokens);
}

const opera = positionAfter(OPERA_GAME, 30); // after 15...Nxd7: 16.Qb8+! Nxb8 17.Rd8#
const immortal = positionAfter(IMMORTAL_GAME, 42); // after 21...Kd8: 22.Qf6+! Nxf6 23.Be7#
const scholar = replaySan(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']); // Qxf7#

export const SAMPLE_DAILY_PUZZLE: PuzzleSummary = {
  id: 'daily-2026-11-25',
  fen: immortal.fen,
  lastMove: immortal.lastMove,
  toMove: 'white',
  rating: 1840,
  themes: ['Mate in 2', 'Queen sacrifice', 'Attraction'],
  title: 'The quiet bishop',
  teaser: 'White has given away almost everything. Finish the job.',
  solvedBy: 48_210,
  date: '2026-11-25',
};

export const SAMPLE_PUZZLES: PuzzleSummary[] = [
  {
    id: 'p-opera',
    fen: opera.fen,
    lastMove: opera.lastMove,
    toMove: 'white',
    rating: 1520,
    themes: ['Mate in 2', 'Queen sacrifice', 'Back rank'],
    title: 'Opera box',
    teaser: 'Your queen is the key, and the door.',
  },
  SAMPLE_DAILY_PUZZLE,
  {
    id: 'p-scholar',
    fen: scholar.fen,
    lastMove: scholar.lastMove,
    toMove: 'white',
    rating: 420,
    themes: ['Mate in 1', 'Opening trap'],
    title: 'Too many knights',
    teaser: 'Black defended the wrong square.',
  },
];

export const PUZZLE_THEMES = [
  'Mate in 1', 'Mate in 2', 'Forks', 'Pins', 'Skewers', 'Discovered attack', 'Back rank',
  'Sacrifice', 'Endgame', 'Promotion', 'Deflection', 'Zwischenzug',
];
