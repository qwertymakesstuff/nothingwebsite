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
