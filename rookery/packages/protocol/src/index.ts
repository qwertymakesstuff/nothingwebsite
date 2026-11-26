// Every message between browser and realtime server, validated with zod on both ends.

import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

const Uci = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
const TcId = z.string().regex(/^\d{1,3}\+\d{1,3}$/);
const GameId = z.string().regex(/^[A-Za-z0-9]{8,24}$/);
const Ply = z.number().int().min(0).max(1000);

/**
 * Client → server over WebSocket. The first message on every socket must be `auth` (a Supabase
 * access token, verified by the server). Every state-changing action names the position it is
 * meant for (`ply`), so a delayed, duplicated or replayed message can never act on a later
 * position: the server rejects it.
 */
export const ClientMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('ping'), id: z.number().int().nonnegative() }),
  z.object({ t: z.literal('auth'), token: z.string().min(20).max(4000) }),
  // Game room
  z.object({ t: z.literal('move'), uci: Uci, ply: Ply }),
  z.object({ t: z.literal('resign'), ply: Ply }),
  z.object({ t: z.literal('abort') }),
  z.object({ t: z.literal('draw'), action: z.enum(['offer', 'accept', 'decline']), ply: Ply }),
  z.object({ t: z.literal('rematch'), action: z.enum(['offer', 'accept', 'decline']) }),
  z.object({ t: z.literal('cancel') }),
  z.object({ t: z.literal('sync') }),
  // Lobby
  z.object({ t: z.literal('seek'), tc: TcId, rated: z.boolean() }),
  z.object({ t: z.literal('unseek') }),
  z.object({
    t: z.literal('challenge'),
    /** Username to challenge, or null for an open invitation link. */
    to: z.string().regex(/^[A-Za-z0-9_-]{3,20}$/).nullable(),
    tc: TcId,
    rated: z.boolean(),
    color: z.enum(['white', 'black', 'random']),
  }),
  z.object({ t: z.literal('challenge-decline'), id: GameId }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export const Color = z.enum(['white', 'black']);
export type Color = z.infer<typeof Color>;

export const PlayerInfo = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarPath: z.string().nullable(),
  country: z.string().nullable(),
  rating: z.number(),
  provisional: z.boolean(),
});
export type PlayerInfo = z.infer<typeof PlayerInfo>;

export const GameStatus = z.enum(['waiting', 'active', 'ended', 'aborted', 'cancelled', 'declined', 'expired']);
export type GameStatus = z.infer<typeof GameStatus>;

/** Everything a player needs to draw the game. Sent in full after every change. */
export const GameView = z.object({
  id: GameId,
  version: z.number().int(),
  status: GameStatus,
  source: z.enum(['online', 'challenge']),
  rated: z.boolean(),
  tc: z.object({ id: TcId, initialMs: z.number(), incrementMs: z.number(), category: z.string() }),
  white: PlayerInfo.nullable(),
  black: PlayerInfo.nullable(),
  /** Who may take the empty seat of a waiting challenge (null: anyone with the link). */
  invited: z.object({ username: z.string() }).nullable(),
  moves: z.array(Uci),
  clock: z.object({
    whiteMs: z.number(),
    blackMs: z.number(),
    running: Color.nullable(),
    /** Server time at which whiteMs/blackMs were measured. */
    at: z.number(),
  }),
  /** Deadline for the side to move's first move (game aborted if missed). */
  firstMoveDeadline: z.number().nullable(),
  connected: z.object({ white: z.boolean(), black: z.boolean() }),
  /** A player who left: the game ends in their opponent's favour at `deadline` unless they return. */
  away: z.object({ color: Color, deadline: z.number() }).nullable(),
  drawOffer: z.object({ by: Color, ply: Ply }).nullable(),
  rematch: z.object({ offeredBy: Color.nullable(), declined: z.boolean(), gameId: GameId.nullable() }),
  result: z.enum(['1-0', '0-1', '1/2-1/2']).nullable(),
  termination: z.string().nullable(),
  ratingChange: z.object({ white: z.number(), black: z.number() }).nullable(),
  /** Whether the result has been saved to both players' histories. */
  recorded: z.boolean(),
  you: z.enum(['white', 'black', 'none']),
});
export type GameView = z.infer<typeof GameView>;

export const ChallengeInfo = z.object({
  id: GameId,
  from: PlayerInfo,
  tc: TcId,
  rated: z.boolean(),
  color: z.enum(['white', 'black', 'random']),
  createdAt: z.number(),
});
export type ChallengeInfo = z.infer<typeof ChallengeInfo>;

/** Server → client over WebSocket. */
export const ServerMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hello'), protocol: z.number().int(), serverTime: z.number() }),
  z.object({ t: z.literal('pong'), id: z.number().int().nonnegative(), serverTime: z.number() }),
  z.object({ t: z.literal('error'), code: z.string(), message: z.string() }),
  z.object({ t: z.literal('authed'), userId: z.string(), serverTime: z.number() }),
  // Game room
  z.object({ t: z.literal('state'), game: GameView, serverTime: z.number() }),
  // Lobby
  z.object({ t: z.literal('seeking'), tc: TcId, rated: z.boolean(), since: z.number(), range: z.number(), players: z.number().int() }),
  z.object({ t: z.literal('unseeked') }),
  z.object({ t: z.literal('matched'), gameId: GameId }),
  z.object({ t: z.literal('challenges'), incoming: z.array(ChallengeInfo) }),
  z.object({ t: z.literal('challenge-created'), gameId: GameId }),
  z.object({ t: z.literal('challenge-declined'), gameId: GameId, by: z.string() }),
  z.object({ t: z.literal('lobby'), online: z.number().int(), seeking: z.record(z.string(), z.number().int()) }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

/** GET /api/health */
export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal('rookery-realtime'),
  protocol: z.number().int(),
  time: z.number(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

/** Parses an incoming WebSocket frame; returns null for anything malformed. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  try {
    const result = ClientMessage.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ── REST API (/api/*) ─────────────────────────────────────────────────────────────────────

/**
 * A finished game against a computer opponent, submitted by the browser. The server replays and
 * checks it; it is stored unrated, and the opponent's name and rating come from the server's
 * own roster, never from this payload.
 */
export const BotGameSubmission = z.object({
  clientRef: z.string().regex(/^[A-Za-z0-9-]{6,64}$/),
  botId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  /** Only for the "custom" opponent: the strength the player chose. */
  customElo: z.union([z.number().int().min(250).max(3190), z.literal('max')]).optional(),
  playerColor: z.enum(['white', 'black']),
  timeControl: z.string().regex(/^(none|\d{1,3}\+\d{1,3})$/),
  initialFen: z.string().max(100),
  moves: z.array(Uci).max(1000),
  result: z.enum(['1-0', '0-1', '1/2-1/2']),
  termination: z.enum(['checkmate', 'stalemate', 'insufficient', 'repetition', 'fifty-move', 'resign', 'timeout', 'agreement', 'abandon']),
  openingId: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});
export type BotGameSubmission = z.infer<typeof BotGameSubmission>;

export const BotGameSaved = z.object({
  id: z.string().nullable(),
  duplicate: z.boolean(),
  achievements: z.array(z.string()),
});
export type BotGameSaved = z.infer<typeof BotGameSaved>;

export const ApiError = z.object({ error: z.string(), message: z.string() });
export type ApiError = z.infer<typeof ApiError>;
