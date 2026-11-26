import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, inflateRd, rate, rateGame, ratePeriod } from '../src/glicko';

describe('Glicko-2', () => {
  it("matches Glickman's worked example (tau 0.5)", () => {
    const r = ratePeriod(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [
        { opponent: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 },
        { opponent: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 },
        { opponent: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 },
      ],
      0.5,
    );
    expect(r.rating).toBeCloseTo(1464.06, 1);
    expect(r.rd).toBeCloseTo(151.52, 1);
    expect(r.volatility).toBeCloseTo(0.05999, 4);
  });

  it('is symmetric for equal players and conserves direction', () => {
    const { white, black } = rateGame(DEFAULT_RATING, DEFAULT_RATING, 1);
    expect(white.rating).toBeGreaterThan(1500);
    expect(black.rating).toBeLessThan(1500);
    expect(white.rating - 1500).toBeCloseTo(1500 - black.rating, 6);
    expect(white.rd).toBeLessThan(350);
    const draw = rateGame(DEFAULT_RATING, DEFAULT_RATING, 0.5);
    expect(draw.white.rating).toBeCloseTo(1500, 6);
  });

  it('rewards upsets more than expected wins, and settles with experience', () => {
    const strong = { rating: 1900, rd: 60, volatility: 0.06 };
    const weak = { rating: 1300, rd: 60, volatility: 0.06 };
    const expectedWin = rate(strong, weak, 1).rating - strong.rating;
    const upset = rate(weak, strong, 1).rating - weak.rating;
    expect(upset).toBeGreaterThan(expectedWin * 5);
    const newcomer = rate(DEFAULT_RATING, DEFAULT_RATING, 1).rating - 1500;
    const veteran = rate({ rating: 1500, rd: 60, volatility: 0.06 }, { rating: 1500, rd: 60, volatility: 0.06 }, 1).rating - 1500;
    expect(newcomer).toBeGreaterThan(veteran * 3);
  });

  it('keeps RD within bounds and grows it with inactivity', () => {
    let r = DEFAULT_RATING;
    for (let i = 0; i < 300; i++) r = rate(r, DEFAULT_RATING, (i % 2) as 0 | 1);
    expect(r.rd).toBeGreaterThanOrEqual(45);
    expect(inflateRd({ rating: 1500, rd: 60, volatility: 0.06 }, 365).rd).toBeGreaterThan(60);
    expect(inflateRd({ rating: 1500, rd: 340, volatility: 0.06 }, 10_000).rd).toBe(350);
  });
});
