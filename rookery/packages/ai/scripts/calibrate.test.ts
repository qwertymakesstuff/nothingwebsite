// Strength calibration (slow: run with `npm run calibrate -w @rookery/ai`).
//
// Anchor: Stockfish's own UCI_Elo 1320 (its calibrated floor, CCRL 40/4 scale) at the same
// per-move time our engine-limited opponents use. The sampled model at skill 1.0 plays the anchor;
// each lower skill then plays the level above it, so every level gets a rating on the same scale.
// Results are printed and written to docs/AI_CALIBRATION.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { OPENINGS } from '../src/openings';
import { BotBrain } from '../src/brain';
import { getPersona } from '../src/personas';
import { numericRating } from '../src/schema';
import { DEFAULT_ENGINE_MOVETIME_MS, sampleProfile, type StrengthProfile } from '../src/strength';
import { eloDiff, playGame, seededRng, type Player } from './match';
import { createNodeEngine } from './nodeEngine';

const GAMES = Number(process.env.GAMES ?? 24);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);

function player(label: string, profile: StrengthProfile): Player {
  return { label, profile };
}

type PlayerFactory = (engine: ReturnType<typeof createNodeEngine>, seed: number) => Player;

/** A real persona (strength + personality + book), wrapped as a match player. */
function personaPlayer(id: string): PlayerFactory {
  const persona = getPersona(id)!;
  return (engine, seed) => {
    const brain = new BotBrain(persona, engine, seededRng(seed));
    return { label: id, profile: brain.profile, choose: async (fen, moves) => (await brain.move({ initialFen: fen, moves })).uci };
  };
}

async function match(a: Player | PlayerFactory, b: Player | PlayerFactory, games: number, seed: number) {
  const openings = OPENINGS.map((o) => o.moves.split(' ').slice(0, 4));
  let score = 0;
  let next = 0;
  const results: string[] = [];
  const worker = async (w: number) => {
    const engines = { white: createNodeEngine(), black: createNodeEngine(), judge: createNodeEngine() };
    try {
      while (next < games) {
        const g = next++;
        const aWhite = g % 2 === 0;
        const pa = typeof a === 'function' ? a(aWhite ? engines.white : engines.black, seed * 1000 + g) : a;
        const pb = typeof b === 'function' ? b(aWhite ? engines.black : engines.white, seed * 2000 + g) : b;
        const rec = await playGame(aWhite ? pa : pb, aWhite ? pb : pa, engines, {
          openingSan: openings[Math.floor(g / 2) % openings.length],
          rng: seededRng(seed * 1000 + g),
        });
        if (rec.illegal) throw new Error(rec.illegal);
        const aScore = rec.result === '1/2-1/2' ? 0.5 : (rec.result === '1-0') === aWhite ? 1 : 0;
        score += aScore;
        results.push(`${aScore}`);
        process.stdout.write(`  [${pa.label} vs ${pb.label}] game ${g + 1}/${games} (w${w}): ${aScore} by ${rec.reason} in ${rec.plies} plies\n`);
      }
    } finally {
      engines.white.terminate();
      engines.black.terminate();
      engines.judge.terminate();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  return { score: score / games, games };
}

// Modes (environment variables):
//   DIRECT=0.95,0.9      each skill plays Stockfish UCI_Elo 1320 directly (best when scores are mid-range)
//   LADDER=0.75,0.7      chain downward from ANCHOR_SKILL (rating ANCHOR_ELO), each vs the previous
// Results are appended to docs/AI_CALIBRATION.json.
test('calibrate sampled strength model', { timeout: 6 * 60 * 60 * 1000 }, async () => {
  if (!process.env.CALIBRATE) return;
  const sf = player('SF1320', { kind: 'engine', uciElo: 1320, movetimeMs: DEFAULT_ENGINE_MOVETIME_MS, multiPv: 4, styleWindowCp: 0 });
  const rows: { skill: number; elo: number; vs: string; score: number; games: number }[] = [];
  const list = (v?: string) => (v ? v.split(',').map(Number) : []);

  for (const [i, s] of list(process.env.DIRECT).entries()) {
    const p = player(`skill${s}`, sampleProfile(s));
    const { score, games } = await match(p, sf, GAMES, 100 + i);
    const elo = Math.round(1320 + eloDiff(score));
    rows.push({ skill: s, elo, vs: 'SF1320', score, games });
    process.stdout.write(`→ skill ${s}: scored ${(score * 100).toFixed(1)}% vs SF1320 ⇒ ${elo}\n`);
  }

  const ladder = list(process.env.LADDER);
  if (ladder.length) {
    let prev = { p: player(`skill${process.env.ANCHOR_SKILL}`, sampleProfile(Number(process.env.ANCHOR_SKILL))), elo: Number(process.env.ANCHOR_ELO) };
    for (const [i, s] of ladder.entries()) {
      const p = player(`skill${s}`, sampleProfile(s));
      const { score, games } = await match(p, prev.p, GAMES, 200 + i);
      const elo = Math.round(prev.elo + eloDiff(score));
      rows.push({ skill: s, elo, vs: prev.p.label, score, games });
      process.stdout.write(`→ skill ${s}: scored ${(score * 100).toFixed(1)}% vs ${prev.p.label} ⇒ ${elo}\n`);
      prev = { p, elo };
    }
  }

  // VALIDATE=rosa:theo,benedict:rosa  real personas head to head; compares with the expected score.
  const validation: { pair: string; expected: number; score: number; games: number }[] = [];
  for (const [i, pair] of (process.env.VALIDATE ? process.env.VALIDATE.split(',') : []).entries()) {
    const [x, y] = pair.split(':') as [string, string];
    const { score, games } = await match(personaPlayer(x), personaPlayer(y), GAMES, 300 + i);
    const diff = numericRating(getPersona(x)!) - numericRating(getPersona(y)!);
    const expected = 1 / (1 + 10 ** (-diff / 400));
    validation.push({ pair, expected: Math.round(expected * 1000) / 1000, score, games });
    process.stdout.write(`→ ${pair}: scored ${(score * 100).toFixed(1)}% (expected ${(expected * 100).toFixed(1)}% from ratings)\n`);
  }

  const file = new URL('../../../docs/AI_CALIBRATION.json', import.meta.url);
  let doc: { runs: unknown[] } = { runs: [] };
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(doc.runs)) doc = { runs: [] };
  } catch {
    /* first run */
  }
  doc.runs.push({ date: new Date().toISOString(), gamesPerMatch: GAMES, anchorMovetimeMs: DEFAULT_ENGINE_MOVETIME_MS, rows, ...(validation.length ? { validation } : {}) });
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.table(rows);
});
