// A game of chess between two sides: the rules engine plus everything a match needs on top of
// it: who is playing (two people or a person and the computer), resignation, draw agreement,
// undo for casual games and the final result. No DOM.

import { Chess, WHITE, BLACK, START_FEN, parseSquare, squareName, colorOf, typeOf, KING } from './engine.js';

export const REASONS = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  'insufficient-material': 'Insufficient material',
  'threefold-repetition': 'Threefold repetition',
  'fifty-move-rule': 'Fifty-move rule',
  resignation: 'Resignation',
  agreement: 'Draw agreed',
};

export const other = c => (c === WHITE ? BLACK : WHITE);
export const colorName = c => (c === WHITE ? 'White' : 'Black');

export class ChessGame {
  constructor({ mode = 'ai', human = WHITE, level = 'casual', fen = START_FEN } = {}) {
    this.mode = mode;           // 'ai' | 'local'
    this.human = human;         // the person's colour in 'ai' mode
    this.level = level;
    this.chess = new Chess(fen);
    this.ended = null;          // { result, reason, winner }
    this.moveList = [];         // verbose moves as played, for history and animation
  }

  get turn() { return this.chess.turn; }
  get over() { return !!this.ended; }
  isComputerTurn() { return this.mode === 'ai' && !this.over && this.turn !== this.human; }
  isHumanTurn() { return !this.over && (this.mode === 'local' || this.turn === this.human); }

  // Legal destinations from a square for the side to move.
  targets(sq) {
    return this.chess.moves({ square: sq }).filter((m, i, all) => all.findIndex(x => x.to === m.to) === i)
      .map(m => ({ to: m.to, capture: !!m.captured, promotion: !!m.promotion }));
  }

  needsPromotion(from, to) {
    return this.chess.moves({ square: from }).some(m => m.to === to && m.promotion);
  }

  // Why can't from -> to be played? Returns a short, human explanation.
  explainIllegal(from, to) {
    if (this.over) return 'The game is over.';
    const p = this.chess.get(from);
    if (!p) return 'There is no piece on that square.';
    if (colorOf(p) !== this.turn) return `It’s ${colorName(this.turn)}’s turn.`;
    if (this.mode === 'ai' && colorOf(p) !== this.human) return 'That’s the computer’s piece.';
    if (to < 0) return this.targets(from).length ? 'Choose where to move it.' : 'That piece has no legal moves right now.';
    const pseudo = this.chess.pseudoMoves(from).some(m => m.to === to);
    if (pseudo) {
      if (typeOf(p) === KING && Math.abs(to - from) === 2) return 'You can’t castle out of, through or into check.';
      return this.chess.inCheck() ? 'You’re in check: that move doesn’t get your king out of it.' : 'That move would leave your king in check.';
    }
    if (typeOf(p) === KING && Math.abs((to & 7) - (from & 7)) === 2 && (to >> 3) === (from >> 3)) {
      return 'Castling needs the king and that rook unmoved, with the squares between them empty.';
    }
    return `A ${['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'][typeOf(p)]} can’t move from ${squareName(from)} to ${squareName(to)}.`;
  }

  // Play a move; returns the move (with SAN) or null if illegal.
  play({ from, to, promotion }) {
    if (this.over) return null;
    const m = this.chess.move({
      from: typeof from === 'string' ? parseSquare(from) : from,
      to: typeof to === 'string' ? parseSquare(to) : to,
      promotion,
    });
    if (!m) return null;
    this.moveList.push(m);
    const st = this.chess.status();
    if (st.over) this.ended = { result: st.result, reason: st.reason, winner: st.result === '1-0' ? WHITE : st.result === '0-1' ? BLACK : null };
    return m;
  }

  resign(color) {
    if (this.over) return null;
    const winner = other(color);
    this.ended = { result: winner === WHITE ? '1-0' : '0-1', reason: 'resignation', winner, resigned: color };
    return this.ended;
  }

  agreeDraw() {
    if (this.over) return null;
    this.ended = { result: '1/2-1/2', reason: 'agreement', winner: null };
    return this.ended;
  }

  // Undo is for casual play: one ply in a two-player game; against the computer, back to the
  // person's previous turn (so both their move and the reply are taken back).
  canUndo() {
    if (this.over && this.ended.reason === 'resignation') return false;
    if (this.mode === 'local') return this.moveList.length > 0;
    return this.moveList.some(m => m.color === this.human);
  }

  undo() {
    if (!this.canUndo()) return 0;
    let n = 0;
    const back = () => { this.chess.undo(); this.moveList.pop(); n++; };
    this.ended = null;
    if (this.mode === 'local') back();
    else {
      while (this.moveList.length && this.turn === this.human) back();      // computer's reply
      while (this.moveList.length && this.turn !== this.human) back();      // the person's move
    }
    return n;
  }

  // Result from the person's point of view (ai mode): 'win' | 'loss' | 'draw' | null.
  outcomeFor(color = this.human) {
    if (!this.ended) return null;
    if (!this.ended.winner) return 'draw';
    return this.ended.winner === color ? 'win' : 'loss';
  }

  checkSquare() { return this.chess.inCheck() ? this.chess.kings[this.turn] : -1; }

  // Material captured by each side, for the scoreboard.
  captured() {
    const out = { w: [], b: [] };
    for (const m of this.moveList) if (m.captured) out[m.color].push(typeOf(m.captured));
    for (const c of ['w', 'b']) out[c].sort((a, b) => b - a);
    return out;
  }

  // Move pairs for the history panel: [{ n, white, black }].
  history() {
    const sans = this.chess.sanHistory();
    const startBlack = this.moveList.length && this.moveList[0].color === BLACK;
    const rows = [];
    let n = this.chess.fullmove - Math.floor((sans.length + (startBlack ? 1 : 0)) / 2);
    let i = 0;
    if (startBlack) { rows.push({ n, white: '…', black: sans[0] }); i = 1; n++; }
    for (; i < sans.length; i += 2, n++) rows.push({ n, white: sans[i], black: sans[i + 1] || '' });
    return rows;
  }
}
