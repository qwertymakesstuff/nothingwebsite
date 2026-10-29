// The club computer: alpha-beta search over the rules engine with a material + piece-square
// evaluation, quiescence search on captures, MVV-LVA move ordering and iterative deepening.
// Difficulty changes search depth, thinking time and how often it deliberately plays a weaker
// move, so each level plays noticeably differently. It sees only the board, like a human.

import { Chess, WHITE, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, typeOf } from './engine.js';

export const LEVELS = [
  { id: 'beginner', name: 'Beginner', depth: 1, timeMs: 200, quiesce: false, blunder: 0.35, noise: 220,
    blurb: 'Looks one move ahead and often plays a careless move.' },
  { id: 'casual', name: 'Casual', depth: 2, timeMs: 400, quiesce: false, blunder: 0.12, noise: 70,
    blurb: 'Sees simple threats; still misses tactics.' },
  { id: 'club', name: 'Club player', depth: 3, timeMs: 1200, quiesce: true, blunder: 0, noise: 15,
    blurb: 'Searches three moves deep and spots most captures.' },
  { id: 'master', name: 'Club master', depth: 6, timeMs: 2500, quiesce: true, blunder: 0, noise: 0,
    blurb: 'Deepest search the browser allows in a couple of seconds.' },
];
export const getLevel = id => LEVELS.find(l => l.id === id) || LEVELS[1];

const VALUE = [0, 100, 320, 330, 500, 900, 0];
// Piece-square tables from white's point of view, a8 first (index 0 = a8), as usually printed.
const PST = {
  [PAWN]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [KNIGHT]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [BISHOP]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [ROOK]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [QUEEN]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  [KING]: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  KING_END: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};
// Engine squares have a1 = 0; tables list a8 first.
const pstIndex = (sq, white) => (white ? (7 - (sq >> 3)) * 8 + (sq & 7) : sq);

const MATE = 100000;

// Static evaluation in centipawns from the side to move's point of view.
export function evaluate(chess) {
  const b = chess.board;
  let score = 0, nonPawn = 0;
  for (let sq = 0; sq < 64; sq++) { const t = typeOf(b[sq]); if (t > PAWN && t < KING) nonPawn += VALUE[t]; }
  const endgame = nonPawn <= 2600;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const t = typeOf(p), white = p > 0;
    const table = t === KING && endgame ? PST.KING_END : PST[t];
    const v = VALUE[t] + table[pstIndex(sq, white)];
    score += white ? v : -v;
  }
  return chess.turn === WHITE ? score : -score;
}

const orderScore = m => (m.captured ? 10 * VALUE[typeOf(m.captured)] - VALUE[typeOf(m.piece)] + 10000 : 0) + (m.promotion ? 8000 + VALUE[m.promotion] : 0);
const byOrder = (a, b) => orderScore(b) - orderScore(a);

class Timeout extends Error {}

export class Searcher {
  constructor({ now = () => Date.now() } = {}) { this.now = now; }

  quiesce(chess, alpha, beta, ply) {
    this.tick();
    const stand = evaluate(chess);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    const caps = chess.moves().filter(m => m.captured || m.promotion).sort(byOrder);
    for (const m of caps) {
      chess.makeRaw(m);
      const score = -this.quiesce(chess, -beta, -alpha, ply + 1);
      chess.unmakeRaw();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(chess, depth, alpha, beta, ply) {
    this.tick();
    const moves = chess.moves();
    if (!moves.length) return chess.inCheck() ? -MATE + ply : 0;
    if (ply > 0 && (chess.halfmove >= 100 || chess.insufficientMaterial())) return 0;
    if (depth <= 0) return this.quiesceOn ? this.quiesce(chess, alpha, beta, ply) : evaluate(chess);
    moves.sort(byOrder);
    for (const m of moves) {
      chess.makeRaw(m);
      const score = -this.negamax(chess, depth - 1, -beta, -alpha, ply + 1);
      chess.unmakeRaw();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  tick() {
    if (++this.nodes % 1024 === 0 && this.now() > this.deadline) throw new Timeout();
  }

  // Scores every root move at increasing depth until time runs out; returns the deepest
  // completed list of { move, score } sorted best first.
  // exact: score every root move precisely (needed when choosing among near-best moves);
  // otherwise only the best move's score is exact and the rest are upper bounds.
  scoreMoves(chess, { depth, timeMs, quiesce, exact = false }) {
    const work = new Chess(chess.fen());
    this.quiesceOn = quiesce;
    this.nodes = 0;
    this.deadline = this.now() + timeMs;
    let root = work.moves().sort(byOrder).map(move => ({ move, score: 0 }));
    let completed = null, reached = 0;
    for (let d = 1; d <= depth && root.length; d++) {
      try {
        let alpha = -Infinity;
        const scored = [];
        for (const entry of root) {
          work.makeRaw(entry.move);
          const s = -this.negamax(work, d - 1, -MATE - 1, exact ? MATE + 1 : -alpha, 1);
          work.unmakeRaw();
          scored.push({ move: entry.move, score: s });
          if (s > alpha) alpha = s;
        }
        scored.sort((a, b) => b.score - a.score);
        root = completed = scored;
        reached = d;
        if (scored[0].score >= MATE - 100) break; // forced mate found
      } catch (e) {
        if (!(e instanceof Timeout)) throw e;
        break;
      }
    }
    return { scored: completed || root, depth: reached, nodes: this.nodes };
  }
}

// Choose a move for the side to move. rng is injectable for tests.
export function chooseMove(chess, levelId = 'casual', { rng = Math.random, now } = {}) {
  const level = getLevel(levelId);
  const exact = level.noise > 0 || level.blunder > 0;
  const { scored, depth, nodes } = new Searcher({ now }).scoreMoves(chess, { ...level, exact });
  if (!scored.length) return null;
  const best = scored[0].score;
  let pick = scored[0];
  if (best < MATE - 100) {
    if (level.blunder && rng() < level.blunder) pick = scored[Math.floor(rng() * scored.length)];
    else if (level.noise) {
      const close = scored.filter(s => s.score >= best - level.noise);
      pick = close[Math.floor(rng() * close.length)];
    }
  }
  const { from, to, promotion } = pick.move;
  return { from, to, promotion, score: pick.score, depth, nodes };
}

// Would the computer (to move or not) accept a draw? Only when it's not ahead.
export function acceptsDraw(chess, aiColor) {
  const s = evaluate(chess) * (chess.turn === aiColor ? 1 : -1);
  return s <= 30;
}
