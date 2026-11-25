import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  boardOutcome,
  categoryFor,
  createClock,
  flagAt,
  getTimeControl,
  legalDests,
  press,
  remaining,
  replay,
  resignOutcome,
  start,
  stop,
  timeoutOutcome,
  TIME_CONTROLS,
  tryMove,
} from '../src';

describe('time controls', () => {
  it('has unique ids and sensible categories', () => {
    const ids = TIME_CONTROLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getTimeControl('1+0')?.category).toBe('bullet');
    expect(getTimeControl('2+1')?.category).toBe('bullet');
    expect(getTimeControl('3+0')?.category).toBe('blitz');
    expect(getTimeControl('5+0')?.category).toBe('blitz');
    expect(getTimeControl('10+0')?.category).toBe('rapid');
    expect(getTimeControl('15+10')?.category).toBe('rapid');
    expect(getTimeControl('30+0')?.category).toBe('classical');
    expect(getTimeControl('5+0')?.label).toBe('5 min');
    expect(getTimeControl('3+2')?.label).toBe('3 | 2');
  });

  it('categorises by estimated duration', () => {
    expect(categoryFor(60_000, 2_000)).toBe('bullet'); // 1 + 40*2s = 140s
    expect(categoryFor(180_000, 0)).toBe('blitz');
  });
});

describe('clock', () => {
  it('deducts used time, adds increment and hands over', () => {
    let c = start(createClock(60_000, 2_000), 'white', 1_000);
    const r = press(c, 6_000); // white used 5s
    expect(r.flagged).toBe(false);
    c = r.clock;
    expect(c.whiteMs).toBe(57_000); // 60 - 5 + 2
    expect(c.running).toBe('black');
    expect(remaining(c, 'black', 16_000)).toBe(50_000);
    expect(flagAt(c)).toBe(66_000);
  });

  it('applies lag compensation without refunding more than was used', () => {
    const c = start(createClock(10_000, 0), 'white', 0);
    expect(press(c, 1_000, 300).clock.whiteMs).toBe(9_300);
    expect(press(c, 100, 300).clock.whiteMs).toBe(10_000);
  });

  it('flags when time is gone', () => {
    const c = start(createClock(10_000, 5_000), 'white', 0);
    const r = press(c, 10_001);
    expect(r.flagged).toBe(true);
    expect(r.clock.whiteMs).toBe(0);
    expect(r.clock.running).toBeNull();
  });

  it('stop freezes the running side', () => {
    const c = stop(start(createClock(10_000, 0), 'black', 0), 4_000);
    expect(c.blackMs).toBe(6_000);
    expect(c.running).toBeNull();
    expect(flagAt(c)).toBeNull();
  });
});

describe('game', () => {
  it('rejects malformed and illegal moves', () => {
    const chess = new Chess();
    expect(tryMove(chess, 'e2e5')).toBeNull();
    expect(tryMove(chess, 'hello')).toBeNull();
    expect(tryMove(chess, 'e2e4')?.san).toBe('e4');
  });

  it('detects checkmate', () => {
    const chess = replay(['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(boardOutcome(chess)).toEqual({ result: '0-1', termination: 'checkmate', winner: 'black' });
  });

  it('handles promotion', () => {
    const chess = new Chess('7k/P7/8/8/8/8/8/K7 w - - 0 1');
    expect(tryMove(chess, 'a7a8q')?.san).toBe('a8=Q+');
  });

  it('detects stalemate and insufficient material', () => {
    expect(boardOutcome(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))?.termination).toBe('stalemate');
    expect(boardOutcome(new Chess('8/8/8/4k3/8/8/8/4K1N1 w - - 0 1'))?.termination).toBe('insufficient');
  });

  it('timeout is a draw when the opponent cannot mate', () => {
    const loneKnight = new Chess('8/8/8/4k3/8/8/8/4K1N1 b - - 0 1');
    expect(timeoutOutcome(loneKnight, 'black').result).toBe('1/2-1/2');
    const rook = new Chess('8/8/8/4k3/8/8/8/4K2R b - - 0 1');
    expect(timeoutOutcome(rook, 'black')).toEqual({ result: '1-0', termination: 'timeout', winner: 'white' });
  });

  it('resign and legal destinations', () => {
    expect(resignOutcome('white').result).toBe('0-1');
    const dests = legalDests(new Chess());
    expect(dests.get('e2')).toEqual(['e3', 'e4']);
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3']);
  });

  it('replay throws on an illegal move', () => {
    expect(() => replay(['e2e4', 'e2e4'])).toThrow(/Illegal/);
  });
});
