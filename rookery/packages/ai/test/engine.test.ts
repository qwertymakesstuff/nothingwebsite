// Integration tests against the real Stockfish WASM engine (run in Node). Every opponent plays
// complete games; every move must be legal and every game must end in a recognised way.

import { Chess } from 'chess.js';
import { boardOutcome, START_FEN } from '@rookery/chess-core';
import { afterAll, describe, expect, it } from 'vitest';
import { BotBrain, ROSTER, sampleProfile, type Persona } from '../src';
import { NEUTRAL, playGame, seededRng, type Player } from '../scripts/match';
import { createNodeEngine } from '../scripts/nodeEngine';

const engines = Array.from({ length: 3 }, () => createNodeEngine());
afterAll(() => engines.forEach((e) => e.terminate()));

const SCALE = 0.15; // engine-limited opponents search ~100ms instead of ~700ms in tests

function brainPlayer(p: Persona, engine = engines[0]!, seed = 1): Player & { brain: BotBrain } {
  const brain = new BotBrain(p, engine, seededRng(seed), SCALE);
  return { label: p.id, profile: brain.profile, brain, choose: async (fen, moves) => (await brain.move({ initialFen: fen, moves })).uci };
}

describe('engine basics', () => {
  it('returns a legal best move and evaluations', async () => {
    const r = await engines[0]!.search({ fen: START_FEN, depth: 8, multiPv: 3 });
    const legal = new Chess().moves({ verbose: true }).map((m) => m.from + m.to);
    expect(legal).toContain(r.bestmove);
    expect(r.candidates.length).toBe(3);
  });

  it('strong opponents find mate in one; nobody moves in a finished game', async () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    for (const id of ['selene', 'corvus']) {
      const b = new BotBrain(ROSTER.find((p) => p.id === id)!, engines[0]!, seededRng(2), SCALE);
      expect((await b.move({ initialFen: fen, moves: [] })).uci).toBe('h5f7');
    }
    const mated = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    const pip = new BotBrain(ROSTER[0]!, engines[0]!, seededRng(2));
    await expect(pip.move({ initialFen: mated, moves: [] })).rejects.toThrow(/over/);
  });

  it('a hopeless strong opponent resigns; a beginner never does', async () => {
    const fen = '4k3/8/8/8/8/8/QQQ5/4K3 b - - 0 1'; // black: bare king vs three queens
    const amara = new BotBrain(ROSTER.find((p) => p.id === 'amara')!, engines[1]!, seededRng(1), SCALE);
    const pip = new BotBrain(ROSTER[0]!, engines[1]!, seededRng(1));
    let moves: string[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new Chess(fen);
      for (const m of moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4) });
      if (c.isGameOver()) break;
      const m = await amara.move({ initialFen: fen, moves });
      await pip.move({ initialFen: fen, moves }); // evaluate the same position
      moves = [...moves, m.uci];
      const reply = new Chess(new Chess(fen).fen());
      for (const x of moves) reply.move({ from: x.slice(0, 2), to: x.slice(2, 4) });
      const w = reply.moves({ verbose: true })[0];
      if (!w) break;
      moves = [...moves, w.from + w.to];
    }
    expect(amara.shouldResign()).toBe(true);
    expect(pip.shouldResign()).toBe(false);
  });
});

describe('every opponent plays complete, legal games', () => {
  const sparring: Player = { label: 'sparring', profile: sampleProfile(0.5), personality: NEUTRAL };
  const VALID = new Set(['checkmate', 'stalemate', 'insufficient', 'repetition', 'fifty-move', 'adjudicated']);

  for (const [i, persona] of ROSTER.entries()) {
    it(`${persona.name} (${persona.strength.elo})`, async () => {
      const engine = engines[i % engines.length]!;
      const bot = brainPlayer(persona, engine, i + 1);
      await bot.brain.newGame();
      const botWhite = i % 2 === 0;
      const rec = await playGame(botWhite ? bot : sparring, botWhite ? sparring : bot, { white: engine, black: engine, judge: engine }, { rng: seededRng(i), maxPlies: 240 });
      expect(rec.illegal).toBeUndefined();
      expect(VALID.has(rec.reason)).toBe(true);
      // Independent check of the final position with chess.js
      const c = new Chess();
      for (const m of rec.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      if (rec.reason !== 'adjudicated') expect(boardOutcome(c)?.termination).toBe(rec.reason);
    }, 300_000);
  }
});

describe('strength ordering', () => {
  it('much stronger opponents beat much weaker ones', async () => {
    const pairs: [string, string][] = [['corvus', 'theo'], ['kofi', 'pip'], ['archivist', 'marlow']];
    for (const [strongId, weakId] of pairs) {
      let score = 0;
      for (let g = 0; g < 2; g++) {
        const strong = brainPlayer(ROSTER.find((p) => p.id === strongId)!, engines[1]!, 10 + g);
        const weak = brainPlayer(ROSTER.find((p) => p.id === weakId)!, engines[2]!, 20 + g);
        await strong.brain.newGame();
        await weak.brain.newGame();
        const rec = await playGame(g ? weak : strong, g ? strong : weak, { white: engines[g ? 2 : 1]!, black: engines[g ? 1 : 2]!, judge: engines[0]! }, { rng: seededRng(g) });
        expect(rec.illegal).toBeUndefined();
        const strongWhite = g === 0;
        score += rec.result === '1/2-1/2' ? 0.5 : (rec.result === '1-0') === strongWhite ? 1 : 0;
      }
      expect(score, `${strongId} vs ${weakId}`).toBeGreaterThanOrEqual(1.5);
    }
  }, 600_000);
});
