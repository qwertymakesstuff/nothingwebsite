// Server-side validation of a submitted game against a computer opponent. Pure (no I/O), so it is
// unit-tested directly. Nothing the browser claims is stored without being checked here.

import { customPersona, getOpening, getPersona, numericRating } from '@rookery/ai';
import { boardOutcome, categoryFor, getTimeControl, replay, START_FEN } from '@rookery/chess-core';
import type { BotGameSubmission } from '@rookery/protocol';

export interface GameRow {
  white_id: string | null;
  black_id: string | null;
  bot_id: string;
  bot_name: string;
  bot_elo: number;
  source: 'bot';
  rated: false;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'untimed';
  time_control: string;
  initial_fen: string;
  moves: string;
  plies: number;
  move_times: number[] | null;
  result: string;
  termination: string;
  opening: string | null;
  client_ref: string;
  started_at: string | null;
  ended_at: string;
}

export type Validation = { ok: true; row: GameRow } | { ok: false; error: string; message: string };

const NON_BOARD = new Set(['resign', 'timeout', 'agreement', 'abandon']);
/** Bots don't resign or flag in the first moves; a "win" claimed earlier is not credible. */
export const MIN_PLIES_FOR_CLAIMED_WIN = 20;
const MAX_AGE_MS = 365 * 24 * 3600 * 1000;

const fail = (error: string, message: string): Validation => ({ ok: false, error, message });

export function validateBotGame(sub: BotGameSubmission, userId: string, now = Date.now()): Validation {
  // Opponent: from the server's roster, never from the payload.
  let botName: string;
  let botElo: number;
  if (sub.botId === 'custom') {
    if (sub.customElo === undefined) return fail('invalid_bot', 'Custom games need a strength.');
    const p = customPersona(sub.customElo);
    botName = p.name;
    botElo = numericRating(p);
  } else {
    const p = getPersona(sub.botId);
    if (!p) return fail('invalid_bot', 'Unknown computer opponent.');
    if (sub.customElo !== undefined) return fail('invalid_bot', 'Only custom opponents take a strength.');
    botName = p.name;
    botElo = numericRating(p);
  }

  if (sub.initialFen !== START_FEN) return fail('invalid_position', 'Games must start from the standard position.');

  let chess;
  try {
    chess = replay(sub.moves, START_FEN);
  } catch (e) {
    return fail('illegal_move', e instanceof Error ? e.message : 'Illegal move.');
  }

  // The claimed ending must agree with the final position.
  const outcome = boardOutcome(chess);
  if (outcome) {
    if (outcome.termination !== sub.termination || outcome.result !== sub.result) {
      return fail('result_mismatch', `The final position is ${outcome.termination} (${outcome.result}).`);
    }
  } else {
    if (!NON_BOARD.has(sub.termination)) return fail('result_mismatch', `The final position is not ${sub.termination}.`);
    if (sub.termination === 'agreement' && sub.result !== '1/2-1/2') return fail('result_mismatch', 'A draw by agreement must be a draw.');
    if ((sub.termination === 'resign' || sub.termination === 'abandon') && sub.result === '1/2-1/2') return fail('result_mismatch', 'A resignation cannot be a draw.');
    const playerWon = sub.result === (sub.playerColor === 'white' ? '1-0' : '0-1');
    if (playerWon && sub.termination !== 'agreement' && sub.moves.length < MIN_PLIES_FOR_CLAIMED_WIN) {
      return fail('result_mismatch', 'Too few moves for that result.');
    }
  }

  // Opening: only a catalogue id, and the game must actually start with it.
  let opening: string | null = null;
  if (sub.openingId) {
    const o = getOpening(sub.openingId);
    if (!o) return fail('invalid_opening', 'Unknown opening.');
    if (!startsWithSan(sub.moves, o.moves.split(' '))) return fail('invalid_opening', 'The game does not start with that opening.');
    opening = o.name;
  }

  const tc = sub.timeControl === 'none' ? null : getTimeControl(sub.timeControl);
  if (sub.timeControl !== 'none' && !tc) return fail('invalid_time_control', 'Unknown time control.');

  const ended = clampDate(sub.endedAt, now) ?? new Date(now).toISOString();
  const started = clampDate(sub.startedAt, now);

  return {
    ok: true,
    row: {
      white_id: sub.playerColor === 'white' ? userId : null,
      black_id: sub.playerColor === 'black' ? userId : null,
      bot_id: sub.botId,
      bot_name: botName,
      bot_elo: botElo,
      source: 'bot',
      rated: false,
      category: tc ? categoryFor(tc.initialMs, tc.incrementMs) : 'untimed',
      time_control: sub.timeControl,
      initial_fen: START_FEN,
      moves: sub.moves.join(' '),
      plies: sub.moves.length,
      move_times: sub.moveTimes && sub.moveTimes.length === sub.moves.length ? sub.moveTimes : null,
      result: sub.result,
      termination: sub.termination,
      opening,
      client_ref: sub.clientRef,
      started_at: started,
      ended_at: ended,
    },
  };
}

function startsWithSan(uciMoves: string[], san: string[]): boolean {
  if (uciMoves.length < san.length) return false;
  try {
    const played = replay(uciMoves.slice(0, san.length)).history();
    return san.every((m, i) => played[i] === m);
  } catch {
    return false;
  }
}

/** Accepts client timestamps only within the last year and not in the future. */
function clampDate(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t) || t > now + 60_000 || t < now - MAX_AGE_MS) return null;
  return new Date(t).toISOString();
}
