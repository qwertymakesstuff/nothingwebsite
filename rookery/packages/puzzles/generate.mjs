#!/usr/bin/env node
// Rookery puzzle generator.
//
// Makes tactics puzzles from real games played by Stockfish against itself at deliberately weakened,
// varied strengths (so the games contain genuine human-like mistakes). Every candidate is then
// verified with a deeper search, and kept only if each move the solver must find is clearly the
// single best move. Nothing is invented: positions, solutions and difficulty all come from the
// engine, and the script is reproducible (same seed, same puzzles).
//
// Difficulty: each puzzle starts with an *estimated* rating from how deep the engine has to search
// before it finds every solution move (easy tactics are found at depth 1-3, deep ones need 10+).
// After launch, puzzle ratings are updated from players' real attempts (Glicko-2), like lichess.
//
// Usage: node generate.mjs --out puzzles.jsonl --count 1500 --workers 4 [--seed 1] [--bench]
// Engine: the vendored Stockfish 19 lite WASM build in packages/ai/engine (GPL-3.0).

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const ENGINE = fileURLToPath(new URL('../ai/engine/stockfish-19-lite-single.js', import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
);
const OUT = args.out ?? 'puzzles.jsonl';
const TARGET = Number(args.count ?? 1500);
const WORKERS = Number(args.workers ?? 4);
const SEED = Number(args.seed ?? 1);

const VERIFY_DEPTH = 16; // deep check of every candidate
const PLAY_DEPTH = 9; // search depth while playing the source games
const DIFFICULTY_DEPTH = 14;
const WIN_CP = 250; // the solver's side must be winning by at least this much
const UNIQUE_GAP = 180; // ...and the second-best move must be this much worse
const MATE = 100_000;

// ── UCI engine ──────────────────────────────────────────────────────────────────────────────
class Engine {
  constructor() {
    this.child = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'ignore'] });
    this.buf = '';
    this.listeners = [];
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (d) => {
      this.buf += d;
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        for (const l of [...this.listeners]) l(line);
      }
    });
  }
  send(cmd) {
    this.child.stdin.write(cmd + '\n');
  }
  until(pred, onLine) {
    return new Promise((resolve) => {
      const l = (line) => {
        onLine?.(line);
        if (pred(line)) {
          this.listeners.splice(this.listeners.indexOf(l), 1);
          resolve(line);
        }
      };
      this.listeners.push(l);
    });
  }
  async init() {
    this.send('uci');
    await this.until((l) => l === 'uciok');
    this.send('setoption name Hash value 32');
    this.send('isready');
    await this.until((l) => l === 'readyok');
  }
  /**
   * Searches `fen` to `depth` with `multipv` lines. Returns { lines: [{uci, cp, mate, pv}] best first,
   * byDepth: Map<depth, bestUci> } (byDepth from multipv 1 only).
   */
  async analyse(fen, depth, multipv = 1) {
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send('ucinewgame');
    this.send(`position fen ${fen}`);
    const slots = new Map();
    const byDepth = new Map();
    this.send(`go depth ${depth}`);
    await this.until(
      (l) => l.startsWith('bestmove'),
      (l) => {
        const m = /^info .*\bdepth (\d+)\b.*\bscore (cp|mate) (-?\d+)\b(.*?)\bpv (.+)$/.exec(l);
        if (!m || / (lowerbound|upperbound)/.test(l)) return;
        const d = Number(m[1]);
        const k = Number(/\bmultipv (\d+)/.exec(l)?.[1] ?? 1);
        const v = Number(m[3]);
        const pv = m[5].trim().split(/\s+/);
        const entry = { uci: pv[0], cp: m[2] === 'mate' ? (v > 0 ? MATE - v : -MATE - v) : v, mate: m[2] === 'mate' ? v : null, pv, depth: d };
        const prev = slots.get(k);
        if (!prev || d >= prev.depth) slots.set(k, entry);
        if (k === 1) byDepth.set(d, pv[0]);
      },
    );
    const lines = [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, e]) => e);
    return { lines, byDepth };
  }
  quit() {
    this.send('quit');
    setTimeout(() => this.child.kill(), 300).unref();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
}
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function material(chess, color) {
  let m = 0;
  for (const row of chess.board()) for (const p of row) if (p) m += (p.color === color ? 1 : -1) * VALUE[p.type];
  return m;
}
function pieceCount(chess) {
  return chess.board().flat().filter((p) => p && p.type !== 'k' && p.type !== 'p').length;
}
function play(chess, uci) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}
/** Unique and winning: the best move wins (>= WIN_CP or mate) and the second-best is clearly worse. */
function clearBest(lines) {
  const [a, b] = lines;
  if (!a) return false;
  if (a.mate !== null && a.mate > 0) return !b || b.mate === null || b.mate <= 0; // only one move mates
  if (a.cp < WIN_CP) return false;
  return !b || (b.mate === null || b.mate < 0) && a.cp - b.cp >= UNIQUE_GAP;
}

// ── Source games ───────────────────────────────────────────────────────────────────────────
/**
 * One game of Stockfish against itself. Each side picks among the engine's top moves with a
 * temperature that varies by game, so the games include realistic mistakes. Yields every position
 * after a move together with whether that move threw away a lot (a candidate puzzle start).
 */
async function* sourceGame(engine, rand) {
  const chess = new Chess();
  const temperature = 40 + rand() * 160; // centipawns: higher = sloppier play
  let prevBest = null; // best eval for side to move before the last move
  for (let ply = 0; ply < 140 && !chess.isGameOver(); ply++) {
    const fen = chess.fen();
    const { lines } = await engine.analyse(fen, PLAY_DEPTH, 4);
    if (!lines.length) break;
    const best = lines[0].cp;
    // The previous move was a mistake if the mover's prospects dropped by >= 200 cp and the side to
    // move is now winning: that position is a puzzle candidate.
    if (prevBest !== null && ply >= 6) {
      const moverBefore = prevBest;
      const moverAfter = -best;
      if (moverBefore - moverAfter >= 200 && best >= WIN_CP) yield { before: prevFen, mistake: lastMove, fen, ply };
    }
    // Opening variety: the first plies pick more freely.
    const t = ply < 8 ? 120 : temperature;
    const weights = lines.map((l) => Math.exp((Math.max(-2000, Math.min(2000, l.cp)) - best) / t));
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    let pick = lines[0];
    for (let i = 0; i < lines.length; i++) if ((r -= weights[i]) <= 0) {
      pick = lines[i];
      break;
    }
    var prevFen = fen;
    var lastMove = pick.uci;
    prevBest = best;
    play(chess, pick.uci);
  }
}

// ── Turning a candidate into a verified puzzle ────────────────────────────────────────────
async function buildPuzzle(engine, cand) {
  const chess = new Chess(cand.fen);
  const solver = chess.turn();
  const startMaterial = material(chess, solver);
  const solution = [];
  let mateLine = false;
  for (let step = 0; step < 4; step++) {
    const { lines } = await engine.analyse(chess.fen(), VERIFY_DEPTH, 2);
    if (!clearBest(lines)) break; // the solver's move here isn't forced: the puzzle ends before it
    const best = lines[0];
    if (step === 0) mateLine = best.mate !== null && best.mate > 0;
    if (mateLine !== (best.mate !== null && best.mate > 0)) break;
    play(chess, best.uci);
    solution.push(best.uci);
    if (chess.isCheckmate()) break;
    // Non-mate puzzles stop once the material is won (no long quiet follow-ups).
    if (!mateLine) {
      const after = material(chess, solver) - startMaterial;
      const reply = await engine.analyse(chess.fen(), VERIFY_DEPTH - 4, 1);
      const r = reply.lines[0];
      if (!r) break;
      const probe = new Chess(chess.fen());
      play(probe, r.uci);
      const settled = material(probe, solver) - startMaterial;
      if (after >= 2 && settled >= 2) break; // won material that can't be won back at once
      if (step === 2) break;
      play(chess, r.uci);
      solution.push(r.uci);
      continue;
    }
    // Mate puzzles continue with the defender's best reply.
    const reply = await engine.analyse(chess.fen(), VERIFY_DEPTH - 4, 1);
    if (!reply.lines[0]) break;
    play(chess, reply.lines[0].uci);
    solution.push(reply.lines[0].uci);
  }
  // Must end on the solver's move.
  if (solution.length % 2 === 0) solution.pop();
  if (!solution.length) return null;
  const end = new Chess(cand.fen);
  for (const m of solution) play(end, m);
  const solverMoves = Math.ceil(solution.length / 2);
  if (mateLine) {
    if (!end.isCheckmate()) return null;
  } else {
    // Confirm the final position is decisively better than the start, in material and by engine.
    // Material must stay won after the opponent's best reply (no "wins" that are recaptured).
    const final = await engine.analyse(end.fen(), VERIFY_DEPTH - 2, 1);
    const evalForSolver = -(final.lines[0]?.cp ?? 0);
    const reply = final.lines[0];
    if (!reply || evalForSolver < WIN_CP) return null;
    const probe = new Chess(end.fen());
    play(probe, reply.uci);
    if (material(probe, solver) - startMaterial < 2) return null;
  }

  // Difficulty: shallowest depth from which the engine keeps choosing each solution move.
  let hardest = 1;
  const walk = new Chess(cand.fen);
  for (let i = 0; i < solution.length; i++) {
    if (i % 2 === 0) {
      const { byDepth } = await engine.analyse(walk.fen(), DIFFICULTY_DEPTH, 1);
      let found = DIFFICULTY_DEPTH + 2;
      for (let d = DIFFICULTY_DEPTH; d >= 1; d--) {
        if (byDepth.get(d) === solution[i]) found = d;
        else if (byDepth.has(d)) break;
      }
      hardest = Math.max(hardest, found);
    }
    play(walk, solution[i]);
  }
  const rating = Math.round(Math.max(250, Math.min(2400, 200 + 95 * hardest + 110 * (solverMoves - 1) + (mateLine ? 0 : 40))));

  return {
    fen: cand.before,
    moves: [cand.mistake, ...solution],
    rating,
    themes: themes(cand, solution, mateLine, solverMoves),
    meta: { sourcePly: cand.ply, searchDepth: hardest },
  };
}

function themes(cand, solution, mate, solverMoves) {
  const t = new Set();
  const chess = new Chess(cand.fen);
  const solver = chess.turn();
  const ply = cand.ply;
  const minors = pieceCount(chess);
  t.add(ply < 20 && minors >= 10 ? 'opening' : minors <= 4 ? 'endgame' : 'middlegame');
  if (mate) {
    t.add('mate');
    t.add(solverMoves >= 4 ? 'mateIn4' : `mateIn${solverMoves}`);
  } else t.add(solverMoves === 1 ? 'oneMove' : 'advantage');
  t.add(solverMoves === 1 ? 'short' : solverMoves === 2 ? 'short' : 'long');

  const first = solution[0];
  const before = new Chess(cand.fen);
  const captured = before.get(first.slice(2, 4));
  const startMat = material(before, solver);
  const mv = play(before, first);
  if (mv.san.includes('+')) t.add('check');
  if (first.length === 5) t.add('promotion');
  for (let i = 0; i < solution.length; i += 2) if (solution[i].length === 5) t.add('promotion');
  // Hanging piece: the first move simply takes an undefended piece worth 3+.
  if (captured && VALUE[captured.type] >= 3 && before.attackers(first.slice(2, 4), solver === 'w' ? 'b' : 'w').length === 0) t.add('hangingPiece');
  // Fork: the moved piece now attacks two or more enemy pieces worth more than itself (or the king).
  const movedTo = first.slice(2, 4);
  const mover = before.get(movedTo);
  if (mover) {
    let targets = 0;
    for (const row of before.board())
      for (const p of row)
        if (p && p.color !== solver && (p.type === 'k' || VALUE[p.type] > VALUE[mover.type]) && before.attackers(p.square, solver).includes(movedTo)) targets++;
    if (targets >= 2) t.add('fork');
  }
  // Sacrifice: the solver gives up material on the way to the win.
  const line = new Chess(cand.fen);
  // (judged after the first move and the reply: the solver is down material yet the line wins)
  play(line, solution[0]);
  if (solution[1]) {
    play(line, solution[1]);
    if (material(line, solver) - startMat <= -2) t.add('sacrifice');
  }
  // Back-rank mate: mated king on its first rank, hemmed in by its own pawns.
  const end = new Chess(cand.fen);
  for (const m of solution) play(end, m);
  if (end.isCheckmate()) {
    const loser = end.turn();
    const king = end.board().flat().find((p) => p && p.type === 'k' && p.color === loser);
    if (king && (king.square[1] === (loser === 'w' ? '1' : '8'))) t.add('backRankMate');
  }
  return [...t];
}

// ── Main ───────────────────────────────────────────────────────────────────────────────────
const seen = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).fen) : []);
let made = seen.size;

async function worker(index) {
  const engine = new Engine();
  await engine.init();
  const rand = rng(SEED * 7919 + index * 104729 + made);
  let games = 0;
  while (made < TARGET) {
    games++;
    for await (const cand of sourceGame(engine, rand)) {
      if (made >= TARGET) break;
      if (seen.has(cand.before)) continue;
      const p = await buildPuzzle(engine, cand);
      if (!p || seen.has(p.fen)) continue;
      seen.add(p.fen);
      const id = createHash('sha1').update(p.fen + p.moves.join(' ')).digest('base64url').slice(0, 10);
      appendFileSync(OUT, JSON.stringify({ id, ...p }) + '\n');
      made++;
      if (made % 25 === 0) console.log(`${new Date().toISOString().slice(11, 19)} ${made}/${TARGET} puzzles (worker ${index}, game ${games})`);
    }
  }
  engine.quit();
}

if (args.bench) {
  const e = new Engine();
  await e.init();
  const t = Date.now();
  const r = await e.analyse('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', VERIFY_DEPTH, 2);
  console.log(`depth ${VERIFY_DEPTH} multipv 2: ${Date.now() - t} ms, best ${r.lines[0]?.uci} (${r.lines[0]?.cp})`);
  const t2 = Date.now();
  await e.analyse('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', PLAY_DEPTH, 4);
  console.log(`depth ${PLAY_DEPTH} multipv 4: ${Date.now() - t2} ms`);
  e.quit();
} else {
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  console.log(`done: ${made} puzzles in ${OUT}`);
}
