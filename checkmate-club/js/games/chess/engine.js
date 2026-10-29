// Chess rules engine. No DOM: board state, legal move generation, make/undo, SAN, FEN and every
// game-ending rule (checkmate, stalemate, insufficient material, threefold repetition and the
// fifty-move rule). Squares are 0..63 with a1 = 0, h1 = 7, a8 = 56. Pieces are integers:
// 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king; positive for white, negative for black.

export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
export const WHITE = 'w', BLACK = 'b';
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const LETTERS = ' pnbrqk';
const CASTLE = { K: 1, Q: 2, k: 4, q: 8 };
const KNIGHT_STEPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// Precomputed targets per square so generation never re-checks board edges.
const NEIGHBOURS = steps => Array.from({ length: 64 }, (_, sq) => {
  const f = sq & 7, r = sq >> 3, out = [];
  for (const [df, dr] of steps) { const nf = f + df, nr = r + dr; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(nr * 8 + nf); }
  return out;
});
const RAYS = dirs => Array.from({ length: 64 }, (_, sq) => dirs.map(([df, dr]) => {
  const ray = []; let f = (sq & 7) + df, r = (sq >> 3) + dr;
  while (f >= 0 && f < 8 && r >= 0 && r < 8) { ray.push(r * 8 + f); f += df; r += dr; }
  return ray;
}));
const KNIGHT_TO = NEIGHBOURS(KNIGHT_STEPS);
const KING_TO = NEIGHBOURS(KING_STEPS);
const ROOK_RAYS = RAYS(ROOK_DIRS);
const BISHOP_RAYS = RAYS(BISHOP_DIRS);

// Castling rights lost when anything moves from or to these squares.
const CASTLE_MASK = new Uint8Array(64).fill(15);
CASTLE_MASK[4] = 15 & ~(CASTLE.K | CASTLE.Q); CASTLE_MASK[0] = 15 & ~CASTLE.Q; CASTLE_MASK[7] = 15 & ~CASTLE.K;
CASTLE_MASK[60] = 15 & ~(CASTLE.k | CASTLE.q); CASTLE_MASK[56] = 15 & ~CASTLE.q; CASTLE_MASK[63] = 15 & ~CASTLE.k;

export const squareName = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1);
export function parseSquare(name) {
  if (!/^[a-h][1-8]$/.test(name)) return -1;
  return (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
}
export const colorOf = p => (p > 0 ? WHITE : p < 0 ? BLACK : null);
export const typeOf = p => Math.abs(p);
export const isLightSquare = sq => ((sq & 7) + (sq >> 3)) % 2 === 1;
export const pieceLetter = p => (p > 0 ? LETTERS[p].toUpperCase() : LETTERS[-p]);

export class Chess {
  constructor(fen = START_FEN) { this.load(fen); }

  load(fen) {
    const parts = String(fen).trim().split(/\s+/);
    if (parts.length < 4) throw new Error('invalid FEN');
    const [placement, turn, castling, ep, half = '0', full = '1'] = parts;
    const rows = placement.split('/');
    if (rows.length !== 8) throw new Error('invalid FEN: needs 8 ranks');
    const board = new Int8Array(64);
    rows.forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) f += +ch;
        else {
          const t = LETTERS.indexOf(ch.toLowerCase());
          if (t < 1 || f > 7) throw new Error(`invalid FEN piece: ${ch}`);
          board[(7 - i) * 8 + f] = ch === ch.toUpperCase() ? t : -t;
          f++;
        }
      }
      if (f !== 8) throw new Error('invalid FEN: rank length');
    });
    if (turn !== 'w' && turn !== 'b') throw new Error('invalid FEN: side to move');
    this.board = board;
    this.turn = turn;
    this.castling = castling === '-' ? 0 : [...castling].reduce((m, c) => m | (CASTLE[c] || 0), 0);
    this.ep = ep === '-' ? -1 : parseSquare(ep);
    this.halfmove = parseInt(half, 10) || 0;
    this.fullmove = parseInt(full, 10) || 1;
    this.kings = { w: board.indexOf(KING), b: board.indexOf(-KING) };
    if (this.kings.w < 0 || this.kings.b < 0) throw new Error('invalid FEN: both kings required');
    this.history = [];
    this.positions = new Map();
    this.countPosition(1);
    return this;
  }

  fen() {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[r * 8 + f];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        s += pieceLetter(p);
      }
      if (empty) s += empty;
      if (r) s += '/';
    }
    const c = Object.entries(CASTLE).filter(([, b]) => this.castling & b).map(([k]) => k).join('') || '-';
    return `${s} ${this.turn} ${c} ${this.ep >= 0 ? squareName(this.ep) : '-'} ${this.halfmove} ${this.fullmove}`;
  }

  get(sq) { return this.board[sq]; }

  // Repetition key: placement, side, castling and an en passant square only when a capture there
  // is actually possible (FIDE's definition of "the same position").
  positionKey() {
    const f = this.fen().split(' ');
    let ep = '-';
    if (this.ep >= 0) {
      const us = this.turn === WHITE ? 1 : -1;
      const from = this.ep - 8 * us;
      for (const df of [-1, 1]) {
        const sq = from + df;
        if ((sq >> 3) === (from >> 3) && this.board[sq] === us * PAWN) { ep = f[3]; break; }
      }
    }
    return `${f[0]} ${f[1]} ${f[2]} ${ep}`;
  }

  countPosition(delta) {
    const k = this.positionKey();
    const n = (this.positions.get(k) || 0) + delta;
    if (n > 0) this.positions.set(k, n); else this.positions.delete(k);
    return n;
  }

  // ---- attack detection ----

  isAttacked(sq, by) {
    const b = this.board, s = by === WHITE ? 1 : -1;
    // pawns: a white pawn attacks diagonally upward, so look one rank below the square
    const pr = (sq >> 3) - s, pf = sq & 7;
    if (pr >= 0 && pr < 8) {
      if (pf > 0 && b[pr * 8 + pf - 1] === s * PAWN) return true;
      if (pf < 7 && b[pr * 8 + pf + 1] === s * PAWN) return true;
    }
    for (const t of KNIGHT_TO[sq]) if (b[t] === s * KNIGHT) return true;
    for (const t of KING_TO[sq]) if (b[t] === s * KING) return true;
    for (const ray of ROOK_RAYS[sq]) for (const t of ray) { const p = b[t]; if (p) { if (p === s * ROOK || p === s * QUEEN) return true; break; } }
    for (const ray of BISHOP_RAYS[sq]) for (const t of ray) { const p = b[t]; if (p) { if (p === s * BISHOP || p === s * QUEEN) return true; break; } }
    return false;
  }

  inCheck(color = this.turn) { return this.isAttacked(this.kings[color], color === WHITE ? BLACK : WHITE); }

  // ---- move generation ----

  pseudoMoves(only = -1) {
    const b = this.board, us = this.turn, s = us === WHITE ? 1 : -1, them = us === WHITE ? BLACK : WHITE;
    const moves = [];
    const add = (from, to, flags = '') => {
      const piece = b[from], captured = flags.includes('e') ? -s * PAWN : b[to];
      if (typeOf(piece) === PAWN && ((to >> 3) === 7 || (to >> 3) === 0)) {
        for (const promotion of [QUEEN, ROOK, BISHOP, KNIGHT]) moves.push({ from, to, piece, captured, promotion, flags: flags + 'p' });
      } else moves.push({ from, to, piece, captured, promotion: 0, flags });
    };
    for (let from = 0; from < 64; from++) {
      if (only >= 0 && from !== only) continue;
      const p = b[from];
      if (!p || Math.sign(p) !== s) continue;
      const t = typeOf(p);
      if (t === PAWN) {
        const one = from + 8 * s, rank = from >> 3, file = from & 7;
        if (!b[one]) {
          add(from, one);
          const two = one + 8 * s;
          if (rank === (s > 0 ? 1 : 6) && !b[two]) add(from, two, 'b');
        }
        for (const df of [-1, 1]) {
          if (file + df < 0 || file + df > 7) continue;
          const to = one + df;
          if (b[to] && Math.sign(b[to]) === -s) add(from, to, 'c');
          else if (to === this.ep) add(from, to, 'ce');
        }
      } else if (t === KNIGHT || t === KING) {
        for (const to of (t === KNIGHT ? KNIGHT_TO : KING_TO)[from]) {
          if (!b[to]) add(from, to);
          else if (Math.sign(b[to]) === -s) add(from, to, 'c');
        }
        if (t === KING) {
          const home = s > 0 ? 4 : 60;
          if (from === home && !this.isAttacked(home, them)) {
            if (this.castling & (s > 0 ? CASTLE.K : CASTLE.k) && b[home + 3] === s * ROOK && !b[home + 1] && !b[home + 2]
              && !this.isAttacked(home + 1, them) && !this.isAttacked(home + 2, them)) add(from, home + 2, 'k');
            if (this.castling & (s > 0 ? CASTLE.Q : CASTLE.q) && b[home - 4] === s * ROOK && !b[home - 1] && !b[home - 2] && !b[home - 3]
              && !this.isAttacked(home - 1, them) && !this.isAttacked(home - 2, them)) add(from, home - 2, 'q');
          }
        }
      } else {
        const rays = t === ROOK ? ROOK_RAYS[from] : t === BISHOP ? BISHOP_RAYS[from] : [...ROOK_RAYS[from], ...BISHOP_RAYS[from]];
        for (const ray of rays) for (const to of ray) {
          if (!b[to]) { add(from, to); continue; }
          if (Math.sign(b[to]) === -s) add(from, to, 'c');
          break;
        }
      }
    }
    return moves;
  }

  // Legal moves, optionally only those from one square (a square index or name).
  moves({ square } = {}) {
    const only = square == null ? -1 : typeof square === 'string' ? parseSquare(square) : square;
    const us = this.turn, legal = [];
    for (const m of this.pseudoMoves(only)) {
      this.makeRaw(m);
      if (!this.inCheck(us)) legal.push(m);
      this.unmakeRaw();
    }
    return legal;
  }

  // ---- making moves ----

  makeRaw(m) {
    const b = this.board, s = this.turn === WHITE ? 1 : -1;
    this.history.push({ move: m, castling: this.castling, ep: this.ep, halfmove: this.halfmove, fullmove: this.fullmove });
    b[m.from] = 0;
    b[m.to] = m.promotion ? s * m.promotion : m.piece;
    if (m.flags.includes('e')) b[m.to - 8 * s] = 0;
    if (m.flags.includes('k')) { b[m.to + 1] = 0; b[m.to - 1] = s * ROOK; }
    if (m.flags.includes('q')) { b[m.to - 2] = 0; b[m.to + 1] = s * ROOK; }
    if (typeOf(m.piece) === KING) this.kings[this.turn] = m.to;
    this.castling &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
    this.ep = m.flags.includes('b') ? m.from + 8 * s : -1;
    this.halfmove = typeOf(m.piece) === PAWN || m.captured ? 0 : this.halfmove + 1;
    if (this.turn === BLACK) this.fullmove++;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
  }

  unmakeRaw() {
    const h = this.history.pop();
    if (!h) return null;
    const m = h.move, b = this.board;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    const s = this.turn === WHITE ? 1 : -1;
    b[m.from] = m.piece;
    b[m.to] = m.flags.includes('e') ? 0 : m.captured;
    if (m.flags.includes('e')) b[m.to - 8 * s] = m.captured;
    if (m.flags.includes('k')) { b[m.to - 1] = 0; b[m.to + 1] = s * ROOK; }
    if (m.flags.includes('q')) { b[m.to + 1] = 0; b[m.to - 2] = s * ROOK; }
    if (typeOf(m.piece) === KING) this.kings[this.turn] = m.from;
    this.castling = h.castling; this.ep = h.ep; this.halfmove = h.halfmove; this.fullmove = h.fullmove;
    return m;
  }

  // Play a legal move given as {from, to, promotion} (squares as names or indices) or SAN.
  // Returns the move with its SAN, or null if illegal.
  move(input) {
    const legal = this.moves();
    let m = null;
    if (typeof input === 'string') m = legal.find(x => this.san(x, legal) === input.replace(/[+#?!]+$/, '') || this.san(x, legal).replace(/[+#]$/, '') === input.replace(/[+#?!]+$/, ''));
    else if (input) {
      const from = typeof input.from === 'string' ? parseSquare(input.from) : input.from;
      const to = typeof input.to === 'string' ? parseSquare(input.to) : input.to;
      const promo = typeof input.promotion === 'string' ? LETTERS.indexOf(input.promotion.toLowerCase()) : input.promotion || 0;
      m = legal.find(x => x.from === from && x.to === to && (!x.promotion || x.promotion === (promo || QUEEN)));
    }
    if (!m) return null;
    const san = this.san(m, legal);
    this.makeRaw(m);
    const after = this.moves().length;
    const check = this.inCheck();
    const full = san + (check ? (after ? '+' : '#') : '');
    this.history[this.history.length - 1].san = full;
    this.countPosition(1);
    return { ...m, san: full, fromName: squareName(m.from), toName: squareName(m.to), color: colorOf(m.piece) };
  }

  undo() {
    if (!this.history.length) return null;
    this.countPosition(-1);
    const san = this.history[this.history.length - 1].san;
    const m = this.unmakeRaw();
    return { ...m, san };
  }

  // SAN without check marks (move() appends + or #).
  san(m, legal = this.moves()) {
    if (m.flags.includes('k')) return 'O-O';
    if (m.flags.includes('q')) return 'O-O-O';
    const t = typeOf(m.piece), to = squareName(m.to);
    if (t === PAWN) {
      const base = m.captured ? `${'abcdefgh'[m.from & 7]}x${to}` : to;
      return m.promotion ? `${base}=${LETTERS[m.promotion].toUpperCase()}` : base;
    }
    let dis = '';
    const rivals = legal.filter(x => x.piece === m.piece && x.to === m.to && x.from !== m.from);
    if (rivals.length) {
      const sameFile = rivals.some(x => (x.from & 7) === (m.from & 7));
      const sameRank = rivals.some(x => (x.from >> 3) === (m.from >> 3));
      if (!sameFile) dis = 'abcdefgh'[m.from & 7];
      else if (!sameRank) dis = String((m.from >> 3) + 1);
      else dis = squareName(m.from);
    }
    return LETTERS[t].toUpperCase() + dis + (m.captured ? 'x' : '') + to;
  }

  sanHistory() { return this.history.map(h => h.san); }
  lastMove() { return this.history.length ? this.history[this.history.length - 1].move : null; }

  // ---- game end ----

  insufficientMaterial() {
    const minors = [];
    for (let sq = 0; sq < 64; sq++) {
      const t = typeOf(this.board[sq]);
      if (!t || t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      minors.push({ t, sq });
    }
    if (minors.length <= 1) return true; // K v K, K+N v K, K+B v K
    // Any number of bishops, all on squares of one colour, and nothing else: no mate is possible.
    return minors.every(m => m.t === BISHOP) && new Set(minors.map(m => isLightSquare(m.sq))).size === 1;
  }

  repetitions() { return this.positions.get(this.positionKey()) || 0; }

  // { over, result: '1-0' | '0-1' | '1/2-1/2' | null, reason }
  status() {
    const legal = this.moves().length;
    const check = this.inCheck();
    if (!legal && check) return { over: true, result: this.turn === WHITE ? '0-1' : '1-0', reason: 'checkmate', check };
    if (!legal) return { over: true, result: '1/2-1/2', reason: 'stalemate', check };
    if (this.insufficientMaterial()) return { over: true, result: '1/2-1/2', reason: 'insufficient-material', check };
    if (this.repetitions() >= 3) return { over: true, result: '1/2-1/2', reason: 'threefold-repetition', check };
    if (this.halfmove >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty-move-rule', check };
    return { over: false, result: null, reason: null, check };
  }
}

// Count leaf nodes to a depth: the standard check that move generation is exactly right.
export function perft(chess, depth) {
  if (depth === 0) return 1;
  const moves = chess.moves();
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) { chess.makeRaw(m); n += perft(chess, depth - 1); chess.unmakeRaw(); }
  return n;
}
