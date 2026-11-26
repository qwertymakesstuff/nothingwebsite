// The authoritative state of one live game, as a pure state machine: every function takes the
// current state plus "now" (server time) and returns the next state. The GameRoom Durable Object
// feeds it socket messages and alarms; nothing here trusts the client beyond "this authenticated
// player wants to do X at position N".

import {
  boardOutcome,
  createClock,
  flagAt,
  other,
  press,
  remaining,
  replay,
  resignOutcome,
  sideToMove,
  START_FEN,
  start,
  stop,
  timeoutOutcome,
  tryMove,
  type ClockState,
  type Color,
  type Outcome,
} from '@rookery/chess-core';
import type { GameStatus, GameView, PlayerInfo } from '@rookery/protocol';

export interface RoomTiming {
  /** Time each side has for its first move before the game is aborted. */
  firstMoveMs: number;
  /** How long a player may be disconnected before the game is lost by abandonment. */
  awayMs: number;
  /** How long an unanswered challenge or invitation stays open. */
  waitingMs: number;
}

export const DEFAULT_TIMING: RoomTiming = { firstMoveMs: 30_000, awayMs: 60_000, waitingMs: 2 * 60 * 60_000 };

export interface TimeControlSpec {
  id: string;
  initialMs: number;
  incrementMs: number;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
}

export interface RoomState {
  id: string;
  version: number;
  status: GameStatus;
  source: 'online' | 'challenge' | 'tournament';
  rated: boolean;
  tc: TimeControlSpec;
  white: PlayerInfo | null;
  black: PlayerInfo | null;
  /** Arena tournament this game belongs to. */
  tournamentId?: string | null;
  /** The challenger, for challenges (only they may cancel). */
  creator: Color | null;
  invited: { userId: string; username: string } | null;
  moves: string[];
  /** Server-measured thinking time of each move (ms), parallel to `moves`. */
  moveTimes?: number[];
  /** When the last move was made (server time). */
  lastMoveAt?: number | null;
  clock: ClockState;
  firstMoveDeadline: number | null;
  away: { white: number | null; black: number | null };
  /** Whether each player has connected at least once (White's clock starts when both have). */
  seen?: { white: boolean; black: boolean };
  drawOffer: { by: Color; ply: number } | null;
  lastDrawOffer: { white: number; black: number };
  rematch: { offeredBy: Color | null; declined: boolean; gameId: string | null };
  result: Outcome['result'] | null;
  termination: string | null;
  ratingChange: { white: number; black: number } | null;
  recorded: boolean;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  expiresAt: number | null;
  timing: RoomTiming;
}

export type RoomError =
  | 'not_active'
  | 'not_your_turn'
  | 'stale'
  | 'illegal_move'
  | 'too_late_to_abort'
  | 'no_offer'
  | 'too_soon'
  | 'not_allowed'
  | 'not_finished'
  | 'seat_taken'
  | 'not_invited';

export const ERROR_TEXT: Record<RoomError | 'not_a_player' | 'auth_required' | 'auth_failed' | 'bad_message' | 'rate_limited' | 'server_error', string> = {
  not_active: 'This game isn’t in progress.',
  not_your_turn: 'It’s not your turn.',
  stale: 'The position changed before your action arrived. Try again.',
  illegal_move: 'That move isn’t legal.',
  too_late_to_abort: 'The game can only be aborted before both players have moved.',
  no_offer: 'There’s no offer to answer.',
  too_soon: 'You offered a draw only a moment ago.',
  not_allowed: 'You can’t do that here.',
  not_finished: 'The game isn’t over yet.',
  not_a_player: 'You’re not a player in this game.',
  auth_required: 'Sign in first.',
  auth_failed: 'Your session has expired. Sign in again.',
  bad_message: 'Unrecognised message.',
  seat_taken: 'This game already has two players.',
  not_invited: 'This challenge was sent to someone else.',
  rate_limited: 'Slow down a little.',
  server_error: 'Something went wrong on our side.',
};

export interface Step {
  state: RoomState;
  error?: RoomError;
  /** Game just finished (record it). */
  ended?: boolean;
  /** Both players agreed to a rematch (create the next game). */
  rematch?: boolean;
  /** A waiting challenge just closed (accepted, cancelled or expired). */
  challengeClosed?: boolean;
}

export function createRoom(init: {
  id: string;
  source: 'online' | 'challenge' | 'tournament';
  tournamentId?: string | null;
  rated: boolean;
  tc: TimeControlSpec;
  white: PlayerInfo | null;
  black: PlayerInfo | null;
  creator?: Color | null;
  invited?: { userId: string; username: string } | null;
  now: number;
  timing?: Partial<RoomTiming>;
}): RoomState {
  const timing = { ...DEFAULT_TIMING, ...init.timing };
  const both = init.white !== null && init.black !== null;
  return {
    id: init.id,
    version: 1,
    status: both ? 'active' : 'waiting',
    source: init.source,
    tournamentId: init.tournamentId ?? null,
    rated: init.rated,
    tc: init.tc,
    white: init.white,
    black: init.black,
    creator: init.creator ?? null,
    invited: init.invited ?? null,
    moves: [],
    moveTimes: [],
    lastMoveAt: null,
    clock: createClock(init.tc.initialMs, init.tc.incrementMs),
    firstMoveDeadline: both ? init.now + timing.firstMoveMs : null,
    away: { white: null, black: null },
    seen: { white: false, black: false },
    drawOffer: null,
    lastDrawOffer: { white: -100, black: -100 },
    rematch: { offeredBy: null, declined: false, gameId: null },
    result: null,
    termination: null,
    ratingChange: null,
    recorded: false,
    createdAt: init.now,
    startedAt: both ? init.now : null,
    endedAt: null,
    expiresAt: both ? null : init.now + timing.waitingMs,
    timing,
  };
}

/** Which seat `userId` holds, if any. */
export function seatOf(s: RoomState, userId: string): Color | null {
  if (s.white?.id === userId) return 'white';
  if (s.black?.id === userId) return 'black';
  return null;
}

/** A second player taking the empty seat of a waiting challenge. */
export function join(s: RoomState, player: PlayerInfo, now: number): Step {
  if (s.status !== 'waiting') return { state: s, error: 'seat_taken' };
  if (s.invited && s.invited.userId !== player.id) return { state: s, error: 'not_invited' };
  if (seatOf(s, player.id)) return { state: s };
  const color: Color = s.white ? 'black' : 'white';
  return {
    state: bump({
      ...s,
      [color]: player,
      status: 'active',
      startedAt: now,
      expiresAt: null,
      firstMoveDeadline: now + s.timing.firstMoveMs,
    }),
    challengeClosed: true,
  };
}

export function move(s: RoomState, color: Color, uci: string, ply: number, now: number): Step {
  const pre = settle(s, now);
  if (pre.ended) return pre;
  s = pre.state;
  if (s.status !== 'active') return { state: s, error: 'not_active' };
  if (ply !== s.moves.length) return { state: s, error: 'stale' };
  const chess = replay(s.moves);
  if (sideToMove(chess) !== color) return { state: s, error: 'not_your_turn' };
  if (!tryMove(chess, uci)) return { state: s, error: 'illegal_move' };

  let clock = s.clock;
  const plies = s.moves.length + 1;
  // Each side has a deadline for its first move (no-shows abort the game, unrated).
  const firstMoveDeadline = plies === 1 ? now + s.timing.firstMoveMs : null;
  if (clock.running === color) {
    // The mover's clock has been running since their turn began: charge it, add the increment.
    const pressed = press(clock, now);
    if (pressed.flagged) return finish({ ...s, clock: pressed.clock }, timeoutOutcome(replay(s.moves), color), now);
    clock = pressed.clock;
  } else {
    // White moved before the clocks started (the opponent hadn't connected yet): start Black's.
    clock = start(clock, other(color), now);
  }
  // Thinking time: since the previous move, or (first move) since this side's turn began.
  const turnBegan = s.lastMoveAt ?? s.clock.startedAt ?? s.startedAt ?? now;
  const next: RoomState = {
    ...s,
    moves: [...s.moves, uci],
    moveTimes: [...(s.moveTimes ?? []), Math.max(0, now - turnBegan)],
    lastMoveAt: now,
    clock,
    firstMoveDeadline,
    // Moving instead of answering declines the opponent's offer; your own offer stands.
    drawOffer: s.drawOffer && s.drawOffer.by !== color ? null : s.drawOffer,
  };
  const outcome = boardOutcome(chess);
  return outcome ? finish(next, outcome, now) : { state: bump(next) };
}

export function resign(s: RoomState, color: Color, ply: number, now: number): Step {
  const pre = settle(s, now);
  if (pre.ended) return pre;
  s = pre.state;
  if (s.status !== 'active') return { state: s, error: 'not_active' };
  // A resignation is meant for the position the player saw; allow one move of latency.
  if (ply > s.moves.length || ply < s.moves.length - 1) return { state: s, error: 'stale' };
  if (s.moves.length < 2) return abortGame(s, now);
  return finish(s, resignOutcome(color), now);
}

export function abort(s: RoomState, now: number): Step {
  const pre = settle(s, now);
  if (pre.ended) return pre;
  s = pre.state;
  if (s.status !== 'active') return { state: s, error: 'not_active' };
  if (s.moves.length >= 2) return { state: s, error: 'too_late_to_abort' };
  return abortGame(s, now);
}

export function draw(s: RoomState, color: Color, action: 'offer' | 'accept' | 'decline', ply: number, now: number): Step {
  const pre = settle(s, now);
  if (pre.ended) return pre;
  s = pre.state;
  if (s.status !== 'active') return { state: s, error: 'not_active' };
  if (ply !== s.moves.length) return { state: s, error: 'stale' };
  const theirs = s.drawOffer?.by === other(color);
  if (action === 'offer') {
    if (theirs) return finish(s, { result: '1/2-1/2', termination: 'agreement', winner: null }, now);
    if (s.moves.length < 2) return { state: s, error: 'not_allowed' };
    if (s.drawOffer?.by === color || s.moves.length - s.lastDrawOffer[color] < 4) return { state: s, error: 'too_soon' };
    return { state: bump({ ...s, drawOffer: { by: color, ply }, lastDrawOffer: { ...s.lastDrawOffer, [color]: ply } }) };
  }
  if (!theirs) return { state: s, error: 'no_offer' };
  if (action === 'accept') return finish(s, { result: '1/2-1/2', termination: 'agreement', winner: null }, now);
  return { state: bump({ ...s, drawOffer: null }) };
}

export function rematch(s: RoomState, color: Color, action: 'offer' | 'accept' | 'decline'): Step {
  if (s.status !== 'ended') return { state: s, error: 'not_finished' };
  if (s.source === 'tournament') return { state: s, error: 'not_allowed' }; // the arena pairs the next game
  if (s.rematch.gameId) return { state: s };
  const theirs = s.rematch.offeredBy === other(color);
  if (action === 'offer' && !theirs) {
    if (s.rematch.offeredBy === color) return { state: s };
    return { state: bump({ ...s, rematch: { offeredBy: color, declined: false, gameId: null } }) };
  }
  if (action === 'decline') {
    if (!theirs) return { state: s, error: 'no_offer' };
    return { state: bump({ ...s, rematch: { offeredBy: null, declined: true, gameId: null } }) };
  }
  if (!theirs) return { state: s, error: 'no_offer' };
  return { state: s, rematch: true }; // the room creates the game, then calls rematchCreated
}

export function rematchCreated(s: RoomState, gameId: string): RoomState {
  return bump({ ...s, rematch: { offeredBy: s.rematch.offeredBy, declined: false, gameId } });
}

/** The challenger withdraws an unanswered challenge. */
export function cancel(s: RoomState, color: Color): Step {
  if (s.status !== 'waiting' || s.creator !== color) return { state: s, error: 'not_allowed' };
  return { state: bump({ ...s, status: 'cancelled', expiresAt: null }), challengeClosed: true };
}

/** The invited player turns a challenge down. */
export function decline(s: RoomState, userId: string): Step {
  if (s.status !== 'waiting' || s.invited?.userId !== userId) return { state: s, error: 'not_allowed' };
  return { state: bump({ ...s, status: 'declined', expiresAt: null }), challengeClosed: true };
}

/** A player's last connection closed (away) or one came back (present). */
export function presence(s: RoomState, color: Color, present: boolean, now: number): Step {
  if (s.status !== 'active') return { state: s };
  const seen = s.seen ?? { white: true, black: true }; // games stored before this field existed
  const nowSeen = present && !seen[color] ? { ...seen, [color]: true } : seen;
  const deadline = present ? null : (s.away[color] ?? now + s.timing.awayMs);
  // White's turn begins (and their clock starts) once both players have the board in front of them.
  const startClock = nowSeen.white && nowSeen.black && s.moves.length === 0 && s.clock.running === null;
  if (s.away[color] === deadline && nowSeen === seen && !startClock) return { state: s };
  return {
    state: bump({
      ...s,
      seen: nowSeen,
      away: { ...s.away, [color]: deadline },
      clock: startClock ? start(s.clock, 'white', now) : s.clock,
      // The first-move window also counts from when White's turn really begins.
      firstMoveDeadline: startClock ? now + s.timing.firstMoveMs : s.firstMoveDeadline,
    }),
  };
}

/**
 * Applies whatever deadline has passed by `now`, earliest first: a flag falling, a missed first
 * move (abort), a player who never came back (abandonment), or an unanswered challenge expiring.
 */
export function settle(s: RoomState, now: number): Step {
  if (s.status === 'waiting') {
    if (s.expiresAt !== null && now >= s.expiresAt) return { state: bump({ ...s, status: 'expired', expiresAt: null }), challengeClosed: true };
    return { state: s };
  }
  if (s.status !== 'active') return { state: s };
  const events: { at: number; apply: () => Step }[] = [];
  const flag = flagAt(s.clock);
  if (flag !== null) events.push({ at: flag, apply: () => finish(s, timeoutOutcome(replay(s.moves), s.clock.running!), flag) });
  if (s.firstMoveDeadline !== null) events.push({ at: s.firstMoveDeadline, apply: () => abortGame(s, s.firstMoveDeadline!) });
  for (const c of ['white', 'black'] as const) {
    const at = s.away[c];
    if (at === null) continue;
    events.push({
      at,
      apply: () => {
        if (s.moves.length < 2) return abortGame(s, at);
        const o = timeoutOutcome(replay(s.moves), c);
        return finish(s, { ...o, termination: 'abandon' }, at);
      },
    });
  }
  const due = events.filter((e) => e.at <= now).sort((a, b) => a.at - b.at)[0];
  return due ? due.apply() : { state: s };
}

/** When the room next needs waking up (alarm), or null. */
export function nextDeadline(s: RoomState): number | null {
  const times: number[] = [];
  if (s.status === 'waiting' && s.expiresAt !== null) times.push(s.expiresAt);
  if (s.status === 'active') {
    const flag = flagAt(s.clock);
    if (flag !== null) times.push(flag);
    if (s.firstMoveDeadline !== null) times.push(s.firstMoveDeadline);
    if (s.away.white !== null) times.push(s.away.white);
    if (s.away.black !== null) times.push(s.away.black);
  }
  return times.length ? Math.min(...times) : null;
}

export function recordedWith(s: RoomState, ratingChange: { white: number; black: number } | null): RoomState {
  return bump({ ...s, recorded: true, ratingChange });
}

/** What one player (or nobody) sees, with clocks measured at `now`. */
export function view(s: RoomState, you: Color | 'none', connected: { white: boolean; black: boolean }, now: number): GameView {
  const awayColor = s.away.white !== null ? 'white' : s.away.black !== null ? 'black' : null;
  return {
    id: s.id,
    version: s.version,
    status: s.status,
    source: s.source,
    tournamentId: s.tournamentId ?? null,
    rated: s.rated,
    tc: s.tc,
    white: s.white,
    black: s.black,
    invited: s.invited ? { username: s.invited.username } : null,
    moves: s.moves,
    moveTimes: s.moveTimes ?? [],
    turnStartedAt: s.status === 'active' ? (s.lastMoveAt ?? s.clock.startedAt ?? null) : null,
    clock: { whiteMs: remaining(s.clock, 'white', now), blackMs: remaining(s.clock, 'black', now), running: s.clock.running, at: now },
    firstMoveDeadline: s.firstMoveDeadline,
    connected,
    away: awayColor ? { color: awayColor, deadline: s.away[awayColor]! } : null,
    drawOffer: s.drawOffer,
    rematch: s.rematch,
    result: s.result,
    termination: s.termination,
    ratingChange: s.ratingChange,
    recorded: s.recorded,
    you,
  };
}

export { START_FEN };

function finish(s: RoomState, outcome: Outcome, at: number): Step {
  return {
    state: bump({
      ...s,
      status: 'ended',
      result: outcome.result,
      termination: outcome.termination,
      clock: stop(s.clock, at),
      firstMoveDeadline: null,
      away: { white: null, black: null },
      drawOffer: null,
      endedAt: at,
    }),
    ended: true,
  };
}

function abortGame(s: RoomState, at: number): Step {
  return {
    state: bump({ ...s, status: 'aborted', clock: stop(s.clock, at), firstMoveDeadline: null, away: { white: null, black: null }, drawOffer: null, endedAt: at }),
  };
}

function bump(s: RoomState): RoomState {
  return { ...s, version: s.version + 1 };
}
