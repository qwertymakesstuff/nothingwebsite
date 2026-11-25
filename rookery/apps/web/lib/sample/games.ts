// SAMPLE DATA: game history. Moves are real, legal sequences (validated by replaying them at
// build time); players and dates are fictional. See ./README.md.

import { getTimeControl } from '@rookery/chess-core';
import { replaySan, sanTokens } from '../chess';
import type { GameResult, GameSummary, PlayerRef } from '../types';
import { daysAgo } from './random';
import { sampleProfile } from './players';

interface Seed {
  id: string;
  white: string;
  black: string;
  result: GameResult;
  termination: string;
  tc: string;
  opening: string;
  pgn: string;
  ago: [days: number, hours: number];
  accuracy?: [number, number];
}

export const OPERA_GAME =
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';

export const IMMORTAL_GAME =
  '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#';

const SEEDS: Seed[] = [
  { id: 'k3Ve9pQa', white: 'nightowl', black: 'brassbishop', result: '1-0', termination: 'checkmate', tc: '5+0', opening: 'Philidor Defence', pgn: OPERA_GAME, ago: [0, 2], accuracy: [94, 61] },
  { id: 'Rf72mXoe', white: 'sixty4', black: 'nightowl', result: '0-1', termination: 'resignation', tc: '5+0', opening: 'Sicilian Defence: Najdorf', pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5', ago: [0, 5], accuracy: [71, 83] },
  { id: 'Lq0dW4sz', white: 'nightowl', black: 'gambit_glen', result: '1/2-1/2', termination: 'agreement', tc: '10+0', opening: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6', ago: [1, 3] },
  { id: 'Bn5tYc1u', white: 'quietrook', black: 'nightowl', result: '1-0', termination: 'checkmate', tc: '3+2', opening: "King's Gambit Accepted", pgn: IMMORTAL_GAME, ago: [1, 9], accuracy: [88, 52] },
  { id: 'Zx81PomA', white: 'nightowl', black: 'tactical_tide', result: '1-0', termination: 'checkmate', tc: '1+0', opening: 'Italian Game', pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#', ago: [2, 1] },
  { id: 'Hh2ue6Rw', white: 'opposite_colors', black: 'nightowl', result: '1/2-1/2', termination: 'repetition', tc: '10+5', opening: "Queen's Gambit Declined", pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6', ago: [3, 4] },
  { id: 'Mw4kAq7n', white: 'nightowl', black: 'pawnstorm_pia', result: '1-0', termination: 'timeout', tc: '5+0', opening: 'Caro-Kann Defence', pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 e6 11. Bd2 Ngf6 12. O-O-O Be7', ago: [4, 6] },
  { id: 'Gp0vNs3e', white: 'mosaic_mate', black: 'nightowl', result: '1-0', termination: 'resignation', tc: '15+10', opening: 'London System', pgn: '1. d4 d5 2. Bf4 Nf6 3. e3 c5 4. c3 Nc6 5. Nd2 e6 6. Ngf3 Bd6 7. Bg3 O-O 8. Bd3 b6 9. Ne5 Bb7 10. f4', ago: [6, 2] },
];

function ref(username: string): PlayerRef {
  const p = sampleProfile(username);
  return { username, displayName: p?.displayName, country: p?.country };
}

export const SAMPLE_GAMES: GameSummary[] = SEEDS.map((s) => {
  const r = replaySan(sanTokens(s.pgn));
  const tc = getTimeControl(s.tc)!;
  const white = ref(s.white);
  const black = ref(s.black);
  const cat = tc.category;
  white.rating = sampleProfile(s.white)?.ratings.find((x) => x.category === cat)?.rating;
  black.rating = sampleProfile(s.black)?.ratings.find((x) => x.category === cat)?.rating;
  return {
    id: s.id,
    white,
    black,
    result: s.result,
    termination: s.termination,
    timeControl: s.tc,
    category: cat,
    rated: true,
    plies: r.uci.length,
    playedAt: daysAgo(s.ago[0], s.ago[1]),
    opening: s.opening,
    fen: r.fen,
    lastMove: r.lastMove,
    accuracy: s.accuracy ? { white: s.accuracy[0], black: s.accuracy[1] } : undefined,
  };
});

export function sampleGamesFor(username: string): GameSummary[] {
  const u = username.toLowerCase();
  const own = SAMPLE_GAMES.filter((g) => g.white.username === u || g.black.username === u);
  return own.length ? own : SAMPLE_GAMES.slice(0, 5);
}
