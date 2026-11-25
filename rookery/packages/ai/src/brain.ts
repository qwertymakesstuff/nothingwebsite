// A computer opponent: persona (personality) + strength profile + an engine. Decides moves,
// when to resign, how to answer draw offers and what to say. Has no UI and no timers, so the
// same class runs in the browser and in the Node tests.

import { Chess } from 'chess.js';
import { bookMove } from './book';
import type { UciEngine } from './engine';
import { pickLine } from './dialogue';
import type { MoveFeatures } from './features';
import type { DialogueEvent, Persona } from './schema';
import { selectMove, type Rng } from './select';
import { strengthProfile, type StrengthProfile } from './strength';
import { START_FEN } from '@rookery/chess-core';

export interface GamePosition {
  initialFen: string;
  /** All moves so far (UCI), from initialFen. */
  moves: string[];
}

export interface BotMove {
  uci: string;
  san: string;
  /** Engine evaluation from the bot's point of view after its search (null for book moves). */
  evalCp: number | null;
  source: 'book' | 'engine' | 'style' | 'sample' | 'mistake' | 'random' | 'only-move';
  lossCp: number;
  searchMs: number;
  /** Extra delay the UI should wait so the move doesn't appear instantly. */
  thinkDelayMs: number;
  features: MoveFeatures | null;
}

export interface Reaction {
  event: DialogueEvent;
  line: string;
}

export class BotBrain {
  readonly profile: StrengthProfile;
  private evals: number[] = [];
  private lastLine: string | undefined;
  private announcedWinning = false;
  private announcedLosing = false;

  constructor(
    readonly persona: Persona,
    private engine: UciEngine,
    private rng: Rng = Math.random,
    /** Multiplies engine search time (tests use < 1 for speed; the site uses 1). */
    private movetimeScale = 1,
  ) {
    this.profile = strengthProfile(persona.strength.elo, persona.strength.movetimeMs);
  }

  async newGame(): Promise<void> {
    this.evals = [];
    this.announcedLosing = this.announcedWinning = false;
    await this.engine.newGame();
  }

  say(event: DialogueEvent): Reaction | null {
    const line = pickLine(this.persona, event, this.rng, this.lastLine);
    if (!line) return null;
    this.lastLine = line;
    return { event, line };
  }

  /** Chooses the bot's move in the given position (it must be the bot's turn). */
  async move(pos: GamePosition): Promise<BotMove> {
    const chess = new Chess(pos.initialFen);
    for (const m of pos.moves) chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    if (chess.isGameOver()) throw new Error('Game is already over');
    const fen = chess.fen();
    const color = chess.turn() === 'w' ? 'white' : 'black';
    const legalMoves = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    const delay = this.thinkDelay(legalMoves.length);

    // Opening book (only from the standard start).
    if (pos.initialFen === START_FEN) {
      const san = bookMove(this.persona, color, chess.history(), this.rng);
      if (san) {
        const m = new Chess(fen).move(san);
        return { uci: m.from + m.to + (m.promotion ?? ''), san: m.san, evalCp: null, source: 'book', lossCp: 0, searchMs: 0, thinkDelayMs: delay, features: null };
      }
    }

    const p = this.profile;
    const result = await this.engine.search({
      fen: pos.initialFen,
      moves: pos.moves,
      multiPv: Math.min(p.multiPv, legalMoves.length),
      ...(p.kind === 'engine' ? { movetimeMs: Math.max(50, p.movetimeMs * this.movetimeScale), uciElo: p.uciElo } : { depth: p.depth }),
    });
    const sel = selectMove({
      fen,
      ply: pos.moves.length,
      candidates: result.candidates,
      bestmove: result.bestmove,
      legalMoves,
      profile: p,
      personality: this.persona.personality,
      rng: this.rng,
    });
    const evalCp = result.candidates[0]?.score.cp ?? null;
    if (evalCp !== null) this.evals.push(evalCp);
    const san = new Chess(fen).move({ from: sel.uci.slice(0, 2), to: sel.uci.slice(2, 4), promotion: sel.uci[4] }).san;
    return {
      uci: sel.uci,
      san,
      evalCp,
      source: sel.reason,
      lossCp: sel.lossCp,
      searchMs: result.ms,
      thinkDelayMs: Math.max(0, delay - result.ms),
      features: sel.features,
    };
  }

  /** Human-like pause: quick when there's little to think about. */
  private thinkDelay(legalCount: number): number {
    const { minMs, maxMs } = this.persona.personality.thinking;
    if (legalCount === 1) return Math.min(minMs, 300);
    return minMs + this.rng() * Math.max(0, maxMs - minMs);
  }

  /** Reactions to the evaluation trend after its own search. */
  evalReactions(prevEval: number | null, evalCp: number | null): DialogueEvent[] {
    const out: DialogueEvent[] = [];
    if (evalCp === null) return out;
    if (prevEval !== null && evalCp - prevEval >= 250 && evalCp > 150) out.push('playerBlunder');
    if (!this.announcedWinning && evalCp >= 400) {
      this.announcedWinning = true;
      out.push('botWinning');
    }
    if (!this.announcedLosing && evalCp <= -400) {
      this.announcedLosing = true;
      out.push('botLosing');
    }
    return out;
  }

  /** Whether to resign now, based on its recent evaluations. */
  shouldResign(): boolean {
    const r = this.persona.personality.resign;
    if (!r || this.evals.length < r.moves) return false;
    return this.evals.slice(-r.moves).every((e) => e <= r.belowCp);
  }

  /** Answer to the player's draw offer. */
  acceptsDraw(ply: number): boolean {
    const within = this.persona.personality.acceptDrawWithinCp;
    const last = this.evals[this.evals.length - 1];
    if (within === null || ply < 40 || last === undefined) return false;
    return Math.abs(last) <= within || last < -within; // also takes a draw when it is worse
  }

  get lastEval(): number | null {
    return this.evals[this.evals.length - 1] ?? null;
  }
}
