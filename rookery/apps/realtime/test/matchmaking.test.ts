import { describe, expect, it } from 'vitest';
import { findPairs, rangeFor, type Seek } from '../src/game/matchmaking';

const seek = (userId: string, rating: number, since = 0, tc = '5+0', rated = true): Seek => ({ userId, rating, since, tc, rated });

describe('matchmaking', () => {
  it('widens the acceptable rating range while waiting', () => {
    expect(rangeFor(0)).toBe(100);
    expect(rangeFor(20_000)).toBe(300);
    expect(rangeFor(59_000)).toBe(600);
    expect(rangeFor(60_000)).toBe(Infinity);
  });

  it('pairs only within the same time control and rated/casual pool', () => {
    expect(findPairs([seek('a', 1500), seek('b', 1500, 0, '3+0')], 0)).toEqual([]);
    expect(findPairs([seek('a', 1500), seek('b', 1500, 0, '5+0', false)], 0)).toEqual([]);
    expect(findPairs([seek('a', 1500), seek('b', 1550)], 0).length).toBe(1);
  });

  it('respects both players’ ranges, then relaxes with time', () => {
    const pool = [seek('a', 1500, 0), seek('b', 1900, 0)];
    expect(findPairs(pool, 1_000)).toEqual([]);
    expect(findPairs(pool, 30_000).length).toBe(1); // ±400 after 30 s
  });

  it('prefers the closest rating and never pairs a player with themselves', () => {
    const pairs = findPairs([seek('a', 1500, 0), seek('far', 1580, 1), seek('near', 1510, 2), seek('a', 1500, 3)], 5_000);
    expect(pairs.map(([x, y]) => [x.userId, y.userId])).toEqual([['a', 'near']]);
  });
});
