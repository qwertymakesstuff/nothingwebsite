// One Durable Object per live game: the single, authoritative copy of that game.
//
// - Every socket must authenticate first (Supabase access token, verified with Supabase). Only
//   the two seated players can connect; a player's colour comes from their seat, never from a
//   message, so nobody can act for the other side.
// - The rules, clocks and deadlines live in ./game/room.ts (pure, unit-tested). This class feeds
//   it messages and alarms, stores the result, and broadcasts each player's view.
// - Clocks are measured with this server's time only. An alarm wakes the room exactly when a flag
//   would fall, a first move is overdue or a disconnected player's grace period ends.
// - Finished games are written once, with the Glicko-2 rating update, by record_online_game.
// Uses the WebSocket Hibernation API: idle games cost nothing between moves.

import { DurableObject } from 'cloudflare:workers';
import { inflateRd, rateGame, type Rating, type Score } from '@rookery/chess-core';
import { parseClientMessage, PROTOCOL_VERSION, type ClientMessage, type PlayerInfo, type ServerMessage } from '@rookery/protocol';
import type { Env } from './index';
import * as R from './game/room';
import { playerInfo, randomId } from './game/players';
import { SupabaseAdmin, type StoredRating } from './supabase';

interface Attachment {
  userId: string | null;
  color: 'white' | 'black' | null;
}

export interface RoomInit {
  id: string;
  source: 'online' | 'challenge';
  rated: boolean;
  tc: R.TimeControlSpec;
  white: PlayerInfo | null;
  black: PlayerInfo | null;
  creator?: 'white' | 'black' | null;
  invited?: { userId: string; username: string } | null;
}

const KEEP_FINISHED_MS = 7 * 24 * 60 * 60_000;
const RECORD_RETRY_MS = 15_000;
const MAX_MESSAGES_PER_10S = 60;

export class GameRoom extends DurableObject<Env> {
  private room: R.RoomState | null = null;
  private recording = false;
  private rate = new Map<WebSocket, { n: number; since: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answered without waking the object, so heartbeats cost nothing.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('"heartbeat"', '"heartbeat"'));
    void ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<R.RoomState>('room')) ?? null;
    });
  }

  // ── Called by the Lobby (or a finished room, for rematches) ──────────────────────────────

  /** Creates the game. Idempotent: a second call for the same id changes nothing. */
  async init(init: RoomInit): Promise<{ ok: true }> {
    if (this.room) return { ok: true };
    const timing: Partial<R.RoomTiming> = {};
    if (this.env.FIRST_MOVE_MS) timing.firstMoveMs = Number(this.env.FIRST_MOVE_MS);
    if (this.env.DISCONNECT_GRACE_MS) timing.awayMs = Number(this.env.DISCONNECT_GRACE_MS);
    this.room = R.createRoom({ ...init, now: Date.now(), timing });
    await this.save();
    return { ok: true };
  }

  /** The invited player declined, from their notifications. */
  async decline(userId: string): Promise<boolean> {
    if (!this.room) return false;
    const step = R.decline(this.room, userId);
    if (step.error) return false;
    await this.apply(step);
    return true;
  }

  /** Summary for the lobby's challenge list. */
  async summary(): Promise<R.RoomState | null> {
    return this.room;
  }

  // ── Sockets ──────────────────────────────────────────────────────────────────────────────

  override async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server); // hibernatable accept, never server.accept()
    server.serializeAttachment({ userId: null, color: null } satisfies Attachment);
    send(server, { t: 'hello', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.allow(ws)) return fail(ws, 'rate_limited');
    const msg = parseClientMessage(raw);
    if (!msg) return fail(ws, 'bad_message');
    if (msg.t === 'ping') return send(ws, { t: 'pong', id: msg.id, serverTime: Date.now() });

    const att = ws.deserializeAttachment() as Attachment;
    if (!att.userId) {
      if (msg.t !== 'auth') return fail(ws, 'auth_required');
      return this.authenticate(ws, msg.token);
    }
    if (!this.room || !att.color) return fail(ws, 'not_a_player');
    await this.handle(ws, att.color, msg);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    this.rate.delete(ws);
    ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
    await this.presenceChanged(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    this.rate.delete(ws);
    await this.presenceChanged(ws);
  }

  override async alarm(): Promise<void> {
    if (!this.room) return;
    const now = Date.now();
    if (this.room.endedAt !== null && now - this.room.endedAt >= KEEP_FINISHED_MS) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'expired');
      await this.ctx.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.apply(R.settle(this.room, now));
    if (this.room.status === 'ended' && !this.room.recorded) await this.record();
  }

  // ── Internals ────────────────────────────────────────────────────────────────────────────

  private async authenticate(ws: WebSocket, token: string): Promise<void> {
    if (!this.env.SUPABASE_SECRET_KEY) return fail(ws, 'server_error', 'Live games are not configured on this server yet.');
    const admin = this.admin();
    const user = await admin.userFromToken(token).catch(() => null);
    if (!user) {
      fail(ws, 'auth_failed');
      return ws.close(4001, 'auth_failed');
    }
    if (!this.room) {
      fail(ws, 'not_found', 'This game doesn’t exist or has expired.');
      return ws.close(4004, 'not_found');
    }
    let color = R.seatOf(this.room, user.id);
    if (!color && this.room.status === 'waiting') {
      const card = await admin.player(user.id, this.room.tc.category);
      if (!card) return fail(ws, 'not_a_player');
      const step = R.join(this.room, playerInfo(card), Date.now());
      if (step.error) {
        fail(ws, step.error);
        return ws.close(4003, step.error);
      }
      await this.apply(step);
      color = R.seatOf(this.room, user.id);
    }
    if (!color) {
      fail(ws, 'not_a_player');
      return ws.close(4003, 'not_a_player');
    }
    ws.serializeAttachment({ userId: user.id, color } satisfies Attachment);
    send(ws, { t: 'authed', userId: user.id, serverTime: Date.now() });
    await this.apply(R.presence(this.room, color, true, Date.now()));
    this.sendState(ws); // in case presence didn't change anything
  }

  private async handle(ws: WebSocket, color: 'white' | 'black', msg: ClientMessage): Promise<void> {
    const s = this.room!;
    const now = Date.now();
    let step: R.Step;
    switch (msg.t) {
      case 'move':
        step = R.move(s, color, msg.uci, msg.ply, now);
        break;
      case 'resign':
        step = R.resign(s, color, msg.ply, now);
        break;
      case 'abort':
        step = R.abort(s, now);
        break;
      case 'draw':
        step = R.draw(s, color, msg.action, msg.ply, now);
        break;
      case 'rematch':
        step = R.rematch(s, color, msg.action);
        break;
      case 'cancel':
        step = R.cancel(s, color);
        break;
      case 'sync':
        return this.sendState(ws);
      default:
        return fail(ws, 'bad_message');
    }
    if (step.error) {
      fail(ws, step.error);
      this.sendState(ws); // resynchronise the sender
    }
    await this.apply(step);
  }

  /** Stores a step's state, wakes the room at its next deadline, tells both players, and runs side effects. */
  private async apply(step: R.Step): Promise<void> {
    const changed = step.state !== this.room;
    this.room = step.state;
    if (changed) await this.save();
    if (changed) this.broadcast();
    if (step.challengeClosed) await this.lobby().challengeClosed(this.room.id, this.room.status).catch((e) => console.error('lobby notify', e));
    if (step.ended) await this.record();
    if (step.rematch) await this.createRematch();
  }

  private async save(): Promise<void> {
    const s = this.room!;
    await this.ctx.storage.put('room', s);
    const now = Date.now();
    const candidates = [R.nextDeadline(s)];
    if (s.status === 'ended' && !s.recorded) candidates.push(now + RECORD_RETRY_MS);
    if (s.endedAt !== null) candidates.push(s.endedAt + KEEP_FINISHED_MS);
    const next = candidates.filter((t): t is number => t !== null).sort((a, b) => a - b)[0];
    if (next !== undefined) await this.ctx.storage.setAlarm(Math.max(next, now + 1));
    else await this.ctx.storage.deleteAlarm();
  }

  /** Saves the finished game and both rating changes. Retried by the alarm if Supabase is unreachable. */
  private async record(): Promise<void> {
    const s = this.room;
    if (!s || s.status !== 'ended' || s.recorded || this.recording || !s.white || !s.black || !s.result) return;
    if (!this.env.SUPABASE_SECRET_KEY) return;
    this.recording = true;
    try {
      const admin = this.admin();
      for (let attempt = 0; attempt < 4; attempt++) {
        const stored = s.rated ? await admin.ratings([s.white.id, s.black.id], s.tc.category) : null;
        const w = stored?.get(s.white.id);
        const b = stored?.get(s.black.id);
        if (s.rated && (!w || !b)) throw new Error('missing ratings');
        const score: Score = s.result === '1-0' ? 1 : s.result === '0-1' ? 0 : 0.5;
        const after = s.rated ? rateGame(effective(w!), effective(b!), score) : null;
        const res = await admin.recordOnlineGame(
          {
            id: s.id,
            white_id: s.white.id,
            black_id: s.black.id,
            source: s.source,
            rated: s.rated,
            category: s.tc.category,
            time_control: s.tc.id,
            initial_fen: R.START_FEN,
            moves: s.moves.join(' '),
            plies: s.moves.length,
            result: s.result,
            termination: s.termination,
            started_at: new Date(s.startedAt ?? s.createdAt).toISOString(),
            ended_at: new Date(s.endedAt ?? Date.now()).toISOString(),
          },
          after ? { before: w, after: after.white } : null,
          after ? { before: b, after: after.black } : null,
        );
        if (res.staleRatings) continue; // another game changed a rating meanwhile: recompute
        const change = after && !res.duplicate ? { white: Math.round(after.white.rating - w!.rating), black: Math.round(after.black.rating - b!.rating) } : (this.room?.ratingChange ?? null);
        this.room = R.recordedWith(this.room!, change);
        await this.save();
        this.broadcast();
        return;
      }
      throw new Error('ratings kept changing');
    } catch (e) {
      console.error('record failed (will retry)', e);
    } finally {
      this.recording = false;
    }
  }

  private async createRematch(): Promise<void> {
    const s = this.room!;
    if (!s.white || !s.black || s.rematch.gameId) return;
    const admin = this.admin();
    const [nextWhite, nextBlack] = await Promise.all([admin.player(s.black.id, s.tc.category), admin.player(s.white.id, s.tc.category)]);
    const id = randomId();
    await this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(id)).init({
      id,
      source: s.source,
      rated: s.rated,
      tc: s.tc,
      white: nextWhite ? playerInfo(nextWhite) : s.black,
      black: nextBlack ? playerInfo(nextBlack) : s.white,
    });
    await this.apply({ state: R.rematchCreated(s, id) });
  }

  private async presenceChanged(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att?.color || !this.room) return;
    const still = this.sockets().some((o) => o !== ws && o.readyState === WebSocket.OPEN && (o.deserializeAttachment() as Attachment).color === att.color);
    await this.apply(R.presence(this.room, att.color, still, Date.now()));
    this.broadcast(); // connection dots, even when nothing else changed
  }

  private connected(): { white: boolean; black: boolean } {
    const c = { white: false, black: false };
    for (const ws of this.sockets()) {
      const a = ws.deserializeAttachment() as Attachment;
      if (a.color && ws.readyState === WebSocket.OPEN) c[a.color] = true;
    }
    return c;
  }

  private sockets(): WebSocket[] {
    return this.ctx.getWebSockets();
  }

  private broadcast(): void {
    for (const ws of this.sockets()) this.sendState(ws);
  }

  private sendState(ws: WebSocket): void {
    const att = ws.deserializeAttachment() as Attachment;
    if (!this.room || !att.color) return;
    const now = Date.now();
    try {
      send(ws, { t: 'state', game: R.view(this.room, att.color, this.connected(), now), serverTime: now });
    } catch {
      /* socket already closing */
    }
  }

  /** Simple per-socket flood limit (the hibernation API may forget it; that's fine). */
  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const r = this.rate.get(ws);
    if (!r || now - r.since > 10_000) {
      this.rate.set(ws, { n: 1, since: now });
      return true;
    }
    r.n++;
    return r.n <= MAX_MESSAGES_PER_10S;
  }

  private admin(): SupabaseAdmin {
    return new SupabaseAdmin({ SUPABASE_URL: this.env.SUPABASE_URL, SUPABASE_SECRET_KEY: this.env.SUPABASE_SECRET_KEY! });
  }

  private lobby() {
    return this.env.LOBBY.get(this.env.LOBBY.idFromName('main'));
  }
}

/** A stored rating with its RD grown for the days since it last changed. */
function effective(r: StoredRating): Rating {
  const idleDays = Math.floor((Date.now() - r.updatedAt) / 86_400_000);
  return inflateRd({ rating: r.rating, rd: r.rd, volatility: r.volatility }, idleDays);
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function fail(ws: WebSocket, code: keyof typeof R.ERROR_TEXT | 'not_found', message?: string): void {
  try {
    send(ws, { t: 'error', code, message: message ?? (R.ERROR_TEXT as Record<string, string>)[code] ?? 'Something went wrong.' });
  } catch {
    /* closed */
  }
}
