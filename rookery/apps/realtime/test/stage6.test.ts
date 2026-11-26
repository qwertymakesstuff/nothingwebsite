import { describe, expect, it } from 'vitest';
import { applyResult, pairArena, pointsFor, standings, type ArenaPlayer } from '../src/game/arena';
import { filterChat, isPreset } from '../src/game/chatFilter';
import { checkPuzzleMoves, hintSquare, type StoredPuzzle } from '../src/game/puzzles';

// Black has just played ...Qd8-h4?? style blunder setups are not needed: a small known line.
// Position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?; the puzzle starts with 4.Nxe5?? then ...Qg5.
const puzzle: StoredPuzzle = {
  id: 'testpuzzle1',
  fen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  first_move: 'f3e5',
  solution: ['d8g5', 'e5f7', 'g5g2'],
  rating: 900,
  rd: 150,
  volatility: 0.06,
};

describe('puzzle checking', () => {
  it('accepts the solution move by move, with the opponent’s replies', () => {
    expect(checkPuzzleMoves(puzzle, ['d8g5'])).toEqual({ status: 'continue', reply: 'e5f7' });
    expect(checkPuzzleMoves(puzzle, ['d8g5', 'g5g2'])).toEqual({ status: 'solved' });
  });

  it('a wrong (legal) move fails; illegal or out-of-sequence moves are invalid', () => {
    expect(checkPuzzleMoves(puzzle, ['d8h4'])).toEqual({ status: 'failed' });
    expect(checkPuzzleMoves(puzzle, ['d8d1'])).toEqual({ status: 'invalid' }); // illegal
    expect(checkPuzzleMoves(puzzle, ['d8h4', 'g5g2'])).toEqual({ status: 'invalid' }); // earlier move wasn't accepted
    expect(checkPuzzleMoves(puzzle, [])).toEqual({ status: 'invalid' });
    expect(checkPuzzleMoves(puzzle, ['d8g5', 'g5g2', 'a7a6'])).toEqual({ status: 'invalid' });
  });

  it('any move that gives checkmate is accepted', () => {
    const mate: StoredPuzzle = { ...puzzle, fen: '6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1', first_move: 'g8h8', solution: ['a1a8'] };
    expect(checkPuzzleMoves(mate, ['a1a8'])).toEqual({ status: 'solved' });
    expect(checkPuzzleMoves(mate, ['a1a7'])).toEqual({ status: 'failed' });
  });

  it('hints show the piece to move', () => {
    expect(hintSquare(puzzle, 0)).toBe('d8');
    expect(hintSquare(puzzle, 1)).toBe('g5');
  });
});

describe('chat filter', () => {
  it('masks profanity, blocks threats and slurs, strips invisible characters', () => {
    expect(filterChat('good game!')).toEqual({ text: 'good game!', blocked: false, flagged: false });
    expect(filterChat('what the fuck')).toEqual({ text: 'what the ****', blocked: false, flagged: true });
    expect(filterChat('just kys')?.blocked).toBe(true);
    expect(filterChat('k y s')?.blocked).toBe(true);
    expect(filterChat('go kill yourself')?.blocked).toBe(true);
    expect(filterChat('hi​‮ there')?.text).toBe('hi there');
    expect(filterChat('   ')).toBeNull();
    expect(filterChat('x'.repeat(500))?.text.length).toBe(140);
    expect(isPreset('Good game!')).toBe(true);
    expect(isPreset('good game')).toBe(false);
  });
});

const ap = (userId: string, o: Partial<ArenaPlayer> = {}): ArenaPlayer => ({
  userId, username: userId, rating: 500, score: 0, games: 0, wins: 0, draws: 0, losses: 0, streak: 0, active: true, gameId: null, lastOpponent: null, colorBalance: 0, joinedAt: 0, ...o,
});

describe('arena', () => {
  it('scores 2/1/0, doubled while on a streak of two wins', () => {
    expect(pointsFor('win', 0)).toBe(2);
    expect(pointsFor('win', 2)).toBe(4);
    expect(pointsFor('draw', 2)).toBe(2);
    let p = ap('a');
    for (const r of ['1-0', '1-0', '1-0', '1/2-1/2', '1-0'] as const) p = applyResult(p, 'white', r);
    expect(p.score).toBe(2 + 2 + 4 + 2 + 2); // the draw comes while on fire, so it scores 2
    expect([p.wins, p.draws, p.losses, p.games, p.streak]).toEqual([4, 1, 0, 5, 1]);
    expect(applyResult(ap('b', { streak: 3 }), 'black', '1-0').streak).toBe(0);
  });

  it('pairs waiting players by standings, avoids immediate rematches, balances colours', () => {
    const players = [ap('a', { score: 6, lastOpponent: 'b' }), ap('b', { score: 5, lastOpponent: 'a' }), ap('c', { score: 4, colorBalance: 1 }), ap('d', { score: 0 }), ap('e', { gameId: 'x' }), ap('f', { active: false })];
    const pairs = pairArena(players, () => true).map((p) => [p.white.userId, p.black.userId].sort().join('-'));
    expect(pairs).toEqual(['a-c', 'b-d']);
    const colours = pairArena([ap('x', { colorBalance: 2 }), ap('y', { colorBalance: -1 })], () => true)[0]!;
    expect(colours.white.userId).toBe('y');
    // Only two waiting and they just played: they play again rather than wait.
    expect(pairArena([ap('a', { lastOpponent: 'b' }), ap('b', { lastOpponent: 'a' })], () => true).length).toBe(1);
    // Players not connected aren't paired.
    expect(pairArena([ap('a'), ap('b')], (p) => p.userId !== 'b')).toEqual([]);
  });

  it('standings: score, then fewer games, then rating', () => {
    const order = standings([ap('a', { score: 4, games: 3 }), ap('b', { score: 4, games: 2 }), ap('c', { score: 6 })]).map((p) => p.userId);
    expect(order).toEqual(['c', 'b', 'a']);
  });
});
