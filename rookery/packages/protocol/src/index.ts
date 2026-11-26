// Every message between browser and realtime server, validated with zod on both ends.
// Phase 0 only defines the health/ping messages; game, queue and chat messages arrive in Phase 4.

import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

/** Client → server over WebSocket. */
export const ClientMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('ping'), id: z.number().int().nonnegative() }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

/** Server → client over WebSocket. */
export const ServerMessage = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hello'), protocol: z.number().int(), serverTime: z.number() }),
  z.object({ t: z.literal('pong'), id: z.number().int().nonnegative(), serverTime: z.number() }),
  z.object({ t: z.literal('error'), code: z.string(), message: z.string() }),
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

const Uci = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

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
