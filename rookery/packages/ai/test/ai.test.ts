import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  bookMove,
  CandidateCollector,
  DIALOGUE_EVENTS,
  getOpening,
  mateToCp,
  numericRating,
  OPENINGS,
  parseInfo,
  pickLine,
  ROSTER,
  selectMove,
  skillForElo,
  strengthProfile,
  type Candidate,
  type Persona,
} from '../src';
import { NEUTRAL, seededRng } from '../scripts/match';

describe('roster', () => {
  it('has at least 10 valid, uniquely named opponents from beginner to grandmaster', () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ROSTER.map((p) => p.id)).size).toBe(ROSTER.length);
    const ratings = ROSTER.map(numericRating);
    expect(Math.min(...ratings)).toBeLessThan(600);
    expect(Math.max(...ratings)).toBeGreaterThanOrEqual(2500);
    // Sorted by strength
    expect([...ratings].sort((a, b) => a - b)).toEqual(ratings);
  });

  it('every opening a persona prefers exists', () => {
    for (const p of ROSTER) for (const l of [...p.openings.white, ...p.openings.black]) expect(getOpening(l.opening), `${p.id}: ${l.opening}`).toBeDefined();
  });

  it('every persona maps to a real engine configuration', () => {
    for (const p of ROSTER) {
      const prof = strengthProfile(p.strength.elo, p.strength.movetimeMs);
      if (p.strength.elo === 'max') expect(prof.kind === 'engine' && prof.uciElo === undefined).toBe(true);
      else if (p.strength.elo >= 1320) expect(prof).toMatchObject({ kind: 'engine', uciElo: p.strength.elo });
      else expect(prof.kind).toBe('sample');
    }
  });

  it('weaker targets get weaker sampled settings', () => {
    const skills = [300, 600, 900, 1200].map(skillForElo);
    for (let i = 1; i < skills.length; i++) expect(skills[i]!).toBeGreaterThan(skills[i - 1]!);
  });

  it('dialogue only uses known events and every persona greets', () => {
    for (const p of ROSTER) {
      expect(p.dialogue.greeting?.length).toBeGreaterThan(0);
      for (const k of Object.keys(p.dialogue)) expect(DIALOGUE_EVENTS).toContain(k);
    }
  });
});

describe('openings', () => {
  it('every catalogue line is legal', () => {
    for (const o of OPENINGS) {
      const c = new Chess();
      for (const san of o.moves.split(' ')) expect(() => c.move(san), `${o.id}: ${san}`).not.toThrow();
    }
  });

  it('book follows a matching line and stops after a deviation', () => {
    const theo = ROSTER.find((p) => p.id === 'theo')!;
    const always = { ...theo, openings: { ...theo.openings, fidelity: 1 } };
    expect(bookMove(always, 'white', [], seededRng(1))).toBe('e4');
    expect(bookMove(always, 'white', ['e4', 'e5'], seededRng(1))).toBe('Nf3');
    expect(bookMove(always, 'white', ['e4', 'c5'], seededRng(1))).toBeNull();
    expect(bookMove({ ...always, openings: { ...always.openings, fidelity: 0 } }, 'white', [], seededRng(1))).toBeNull();
  });
});

describe('uci parsing', () => {
  it('parses scores, mates and multipv', () => {
    const a = parseInfo('info depth 12 seldepth 18 multipv 2 score cp -35 nodes 100 pv e7e5 g1f3');
    expect(a).toMatchObject({ uci: 'e7e5', depth: 12, multipv: 2, score: { cp: -35, mate: null } });
    const m = parseInfo('info depth 5 multipv 1 score mate 2 nodes 10 pv d1h5 g7g6');
    expect(m?.score).toEqual({ cp: mateToCp(2), mate: 2 });
    expect(parseInfo('info depth 3 currmove e2e4 currmovenumber 1')).toBeNull();
  });

  it('collector keeps the deepest exact line per slot, best first', () => {
    const c = new CandidateCollector();
    c.push('info depth 1 multipv 1 score cp 10 pv a2a3');
    c.push('info depth 2 multipv 1 score cp 50 pv e2e4');
    c.push('info depth 2 multipv 2 score cp 20 pv d2d4');
    c.push('info depth 3 multipv 1 score cp 90 lowerbound pv g1f3');
    expect(c.result().map((x) => x.uci)).toEqual(['e2e4', 'd2d4']);
  });
});

function fakeCandidates(fen: string): { legal: string[]; cands: Candidate[] } {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
  const cands = legal.map((uci, i) => ({ uci, score: { cp: 100 - i * 40, mate: null }, depth: 5, pv: [uci] }));
  return { legal, cands };
}

describe('move selection', () => {
  const positions = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    '8/P6k/8/8/8/8/6p1/K7 w - - 0 1',
  ];

  it('always returns a legal move, at every strength', () => {
    for (const p of ROSTER) {
      const profile = strengthProfile(p.strength.elo);
      for (const fen of positions) {
        const { legal, cands } = fakeCandidates(fen);
        for (let seed = 0; seed < 30; seed++) {
          const sel = selectMove({ fen, ply: 10, candidates: cands, bestmove: cands[0]!.uci, legalMoves: legal, profile, personality: p.personality, rng: seededRng(seed) });
          expect(legal).toContain(sel.uci);
        }
      }
    }
  });

  it('ignores illegal engine suggestions', () => {
    const fen = positions[0]!;
    const { legal } = fakeCandidates(fen);
    const bogus: Candidate[] = [{ uci: 'e2e5', score: { cp: 900, mate: null }, depth: 9, pv: [] }];
    const sel = selectMove({ fen, ply: 0, candidates: bogus, bestmove: 'e2e5', legalMoves: legal, profile: strengthProfile(2000), personality: NEUTRAL, rng: seededRng(1) });
    expect(legal).toContain(sel.uci);
  });

  it('engine-limited play never strays beyond the style window', () => {
    const fen = positions[1]!;
    const { legal, cands } = fakeCandidates(fen);
    const aggressive: Persona['personality'] = { ...NEUTRAL, aggression: 1, risk: 1 };
    const prof = strengthProfile(2400);
    for (let seed = 0; seed < 20; seed++) {
      const sel = selectMove({ fen, ply: 6, candidates: cands, bestmove: cands[0]!.uci, legalMoves: legal, profile: prof, personality: aggressive, rng: seededRng(seed) });
      expect(sel.lossCp).toBeLessThanOrEqual(prof.styleWindowCp);
    }
  });

  it('weaker sampled levels lose more on average than stronger ones', () => {
    const fen = positions[0]!;
    const { legal, cands } = fakeCandidates(fen);
    const avgLoss = (elo: number) => {
      let total = 0;
      for (let seed = 0; seed < 400; seed++) total += selectMove({ fen, ply: 12, candidates: cands, bestmove: null, legalMoves: legal, profile: strengthProfile(elo), personality: NEUTRAL, rng: seededRng(seed) }).lossCp;
      return total / 400;
    };
    const [weak, mid, strong] = [300, 800, 1250].map(avgLoss);
    expect(weak!).toBeGreaterThan(mid!);
    expect(mid!).toBeGreaterThan(strong!);
  });

  it('plays the only legal move', () => {
    const fen = 'k7/8/8/8/8/8/6q1/7K w - - 0 1'; // white king in check; Kxg2 is the only move
    const legal = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to);
    expect(legal).toHaveLength(1);
    const sel = selectMove({ fen, ply: 50, candidates: [], bestmove: null, legalMoves: legal, profile: strengthProfile(300), personality: NEUTRAL, rng: seededRng(3) });
    expect(sel).toMatchObject({ uci: legal[0], reason: 'only-move' });
  });
});

describe('dialogue', () => {
  it('always speaks for key events, respects chattiness for the rest', () => {
    const selene = ROSTER.find((p) => p.id === 'selene')!;
    const silent = { ...selene, personality: { ...selene.personality, chattiness: 0 } };
    expect(pickLine(silent, 'greeting', seededRng(1))).toBeTruthy();
    expect(pickLine(silent, 'botWins', seededRng(1))).toBeTruthy();
    expect(pickLine(silent, 'playerBlunder', seededRng(1))).toBeNull();
    expect(pickLine(silent, 'botCapture', seededRng(1))).toBeNull(); // no lines for it at all
  });

  it('avoids repeating the previous line when it can', () => {
    const pip = ROSTER.find((p) => p.id === 'pip')!;
    const first = pickLine(pip, 'greeting', seededRng(1))!;
    for (let s = 0; s < 10; s++) expect(pickLine(pip, 'greeting', seededRng(s), first)).not.toBe(first);
  });
});
