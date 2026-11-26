// The Lobby: a single Durable Object every signed-in player connects to while on the site.
// It runs the matchmaking queue, creates games, and delivers challenges and notifications.
// Games themselves live in their own GameRoom objects; the lobby only creates them.

import { DurableObject } from 'cloudflare:workers';
import { getTimeControl } from '@rookery/chess-core';
import { parseClientMessage, PROTOCOL_VERSION, type ChallengeInfo, type ClientMessage, type ServerMessage } from '@rookery/protocol';
import type { Env } from './index';
import { ERROR_TEXT } from './game/room';
import { findPairs, poolKey, rangeFor, type Seek } from './game/matchmaking';
import { playerInfo, randomId } from './game/players';
import { SupabaseAdmin } from './supabase';

interface Attachment {
  userId: string | null;
}

interface Pending {
  info: ChallengeInfo;
  fromId: string;
  toId: string;
}

const TICK_MS = 2_000;
const CHALLENGES_PER_MINUTE = 5;
/** Abuse prevention: this many aborted games within the window blocks new games for a while. */
export const ABORT_LIMIT = { count: 4, windowMs: 30 * 60_000, blockMs: 15 * 60_000 };

export class Lobby extends DurableObject<Env> {
  private seeks = new Map<string, Seek>();
  private pending = new Map<string, Pending>();
  private recentChallenges = new Map<string, number[]>();
  private aborts = new Map<string, number[]>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('"heartbeat"', '"heartbeat"'));
    void ctx.blockConcurrencyWhile(async () => {
      this.seeks = new Map((await ctx.storage.get<[string, Seek][]>('seeks')) ?? []);
      this.pending = new Map((await ctx.storage.get<[string, Pending][]>('pending')) ?? []);
      this.aborts = new Map((await ctx.storage.get<[string, number[]][]>('aborts')) ?? []);
    });
  }

  // ── RPC from game rooms ──────────────────────────────────────────────────────────────────

  /** A challenge room was accepted, cancelled, declined or expired: drop it from notifications. */
  async challengeClosed(gameId: string, status: string): Promise<void> {
    const p = this.pending.get(gameId);
    if (!p) return;
    this.pending.delete(gameId);
    await this.persist();
    this.sendChallenges(p.toId);
    if (status === 'declined') this.toUser(p.fromId, { t: 'challenge-declined', gameId, by: '' });
  }

  /** A game was aborted because of this player (they didn't move, or clicked abort). */
  async recordAbort(userId: string): Promise<void> {
    const now = Date.now();
    this.aborts.set(userId, [...(this.aborts.get(userId) ?? []).filter((t) => now - t < ABORT_LIMIT.windowMs + ABORT_LIMIT.blockMs), now]);
    await this.ctx.storage.put('aborts', [...this.aborts].filter(([, ts]) => ts.length));
  }

  // ── Sockets ──────────────────────────────────────────────────────────────────────────────

  override async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId: null } satisfies Attachment);
    send(server, { t: 'hello', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const msg = parseClientMessage(raw);
    if (!msg) return fail(ws, 'bad_message');
    if (msg.t === 'ping') return send(ws, { t: 'pong', id: msg.id, serverTime: Date.now() });
    const att = ws.deserializeAttachment() as Attachment;
    if (!att.userId) {
      if (msg.t !== 'auth') return fail(ws, 'auth_required');
      return this.authenticate(ws, msg.token);
    }
    await this.handle(ws, att.userId, msg);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
    await this.dropIfGone(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropIfGone(ws);
  }

  override async alarm(): Promise<void> {
    await this.match();
    for (const s of this.seeks.values()) this.toUser(s.userId, this.seekingMessage(s));
    if (this.seeks.size) await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // ── Internals ────────────────────────────────────────────────────────────────────────────

  private async authenticate(ws: WebSocket, token: string): Promise<void> {
    if (!this.env.SUPABASE_SECRET_KEY) return fail(ws, 'server_error', 'Live games are not configured on this server yet.');
    const user = await this.admin().userFromToken(token).catch(() => null);
    if (!user) {
      fail(ws, 'auth_failed');
      return ws.close(4001, 'auth_failed');
    }
    ws.serializeAttachment({ userId: user.id } satisfies Attachment);
    send(ws, { t: 'authed', userId: user.id, serverTime: Date.now() });
    send(ws, { t: 'challenges', incoming: this.incoming(user.id) });
    const seek = this.seeks.get(user.id);
    if (seek) send(ws, this.seekingMessage(seek));
    this.broadcastStats();
  }

  private async handle(ws: WebSocket, userId: string, msg: ClientMessage): Promise<void> {
    switch (msg.t) {
      case 'seek':
        return this.seek(ws, userId, msg.tc, msg.rated);
      case 'unseek':
        this.seeks.delete(userId);
        await this.persist();
        this.toUser(userId, { t: 'unseeked' });
        return this.broadcastStats();
      case 'challenge':
        return this.challenge(ws, userId, msg);
      case 'challenge-decline': {
        const p = this.pending.get(msg.id);
        if (!p || p.toId !== userId) return fail(ws, 'no_offer', 'That challenge is no longer open.');
        await this.room(msg.id).decline(userId); // the room calls challengeClosed back
        return;
      }
      default:
        return fail(ws, 'bad_message');
    }
  }

  /** Why this player may not start a game now (restriction or too many aborts), or null. */
  private async blockedReason(userId: string): Promise<string | null> {
    if (await this.admin().isRestricted(userId, 'no_play').catch(() => false)) return 'Your account can’t start games right now.';
    const now = Date.now();
    const recent = (this.aborts.get(userId) ?? []).filter((t) => now - t < ABORT_LIMIT.windowMs);
    if (recent.length >= ABORT_LIMIT.count) {
      const until = recent[recent.length - 1]! + ABORT_LIMIT.blockMs;
      if (now < until) return `Too many aborted games. You can play again in ${Math.ceil((until - now) / 60_000)} minutes.`;
    }
    return null;
  }

  private async seek(ws: WebSocket, userId: string, tcId: string, rated: boolean): Promise<void> {
    const tc = getTimeControl(tcId);
    if (!tc) return fail(ws, 'bad_message', 'Unknown time control.');
    const blocked = await this.blockedReason(userId);
    if (blocked) return fail(ws, 'restricted', blocked);
    const card = await this.admin().player(userId, tc.category);
    if (!card) return fail(ws, 'not_a_player', 'Your account has no player profile.');
    const seek: Seek = { userId, tc: tc.id, rated, rating: card.glicko.rating, since: Date.now() };
    this.seeks.set(userId, seek);
    await this.persist();
    this.toUser(userId, this.seekingMessage(seek));
    await this.match();
    if (this.seeks.size) await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
    this.broadcastStats();
  }

  private async match(): Promise<void> {
    const pairs = findPairs([...this.seeks.values()], Date.now());
    if (!pairs.length) return;
    const admin = this.admin();
    for (const [a, b] of pairs) {
      const tc = getTimeControl(a.tc)!;
      const [ca, cb] = await Promise.all([admin.player(a.userId, tc.category), admin.player(b.userId, tc.category)]);
      if (!ca || !cb) continue;
      const aWhite = crypto.getRandomValues(new Uint8Array(1))[0]! < 128;
      const id = randomId();
      await this.room(id).init({
        id,
        source: 'online',
        rated: a.rated,
        tc: { id: tc.id, initialMs: tc.initialMs, incrementMs: tc.incrementMs, category: tc.category },
        white: playerInfo(aWhite ? ca : cb),
        black: playerInfo(aWhite ? cb : ca),
      });
      this.seeks.delete(a.userId);
      this.seeks.delete(b.userId);
      this.toUser(a.userId, { t: 'matched', gameId: id });
      this.toUser(b.userId, { t: 'matched', gameId: id });
    }
    await this.persist();
    this.broadcastStats();
  }

  private async challenge(ws: WebSocket, userId: string, msg: Extract<ClientMessage, { t: 'challenge' }>): Promise<void> {
    const now = Date.now();
    const recent = (this.recentChallenges.get(userId) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= CHALLENGES_PER_MINUTE) return fail(ws, 'rate_limited', 'You’ve sent a lot of challenges. Wait a minute.');
    this.recentChallenges.set(userId, [...recent, now]);

    const tc = getTimeControl(msg.tc);
    if (!tc) return fail(ws, 'bad_message', 'Unknown time control.');
    const blocked = await this.blockedReason(userId);
    if (blocked) return fail(ws, 'restricted', blocked);
    const admin = this.admin();
    const me = await admin.player(userId, tc.category);
    if (!me) return fail(ws, 'not_a_player', 'Your account has no player profile.');

    let invited: { userId: string; username: string } | null = null;
    if (msg.to) {
      const target = await admin.playerByUsername(msg.to, tc.category);
      if (!target) return fail(ws, 'no_such_player', `There’s no player called ${msg.to}.`);
      if (target.id === userId) return fail(ws, 'not_allowed', 'You can’t challenge yourself.');
      const accepts = target.allowChallenges === 'all' || (target.allowChallenges === 'friends' && (await admin.areFriends(userId, target.id).catch(() => false)));
      if (!accepts) return fail(ws, 'not_accepting', `${target.username} isn’t accepting challenges right now.`);
      invited = { userId: target.id, username: target.username };
    }

    const creator = msg.color === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0]! < 128 ? 'white' : 'black') : msg.color;
    const id = randomId();
    const info = playerInfo(me);
    await this.room(id).init({
      id,
      source: 'challenge',
      rated: msg.rated,
      tc: { id: tc.id, initialMs: tc.initialMs, incrementMs: tc.incrementMs, category: tc.category },
      white: creator === 'white' ? info : null,
      black: creator === 'black' ? info : null,
      creator,
      invited,
    });
    send(ws, { t: 'challenge-created', gameId: id });
    if (invited) {
      this.pending.set(id, { info: { id, from: info, tc: tc.id, rated: msg.rated, color: msg.color, createdAt: now }, fromId: userId, toId: invited.userId });
      await this.persist();
      this.sendChallenges(invited.userId);
    }
  }

  private incoming(userId: string): ChallengeInfo[] {
    return [...this.pending.values()].filter((p) => p.toId === userId).map((p) => p.info);
  }

  private sendChallenges(userId: string): void {
    this.toUser(userId, { t: 'challenges', incoming: this.incoming(userId) });
  }

  private seekingMessage(s: Seek): ServerMessage {
    const range = rangeFor(Date.now() - s.since);
    const players = [...this.seeks.values()].filter((o) => poolKey(o) === poolKey(s)).length;
    return { t: 'seeking', tc: s.tc, rated: s.rated, since: s.since, range: Number.isFinite(range) ? range : -1, players };
  }

  private broadcastStats(): void {
    const users = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const id = (ws.deserializeAttachment() as Attachment).userId;
      if (id) users.add(id);
    }
    const seeking: Record<string, number> = {};
    for (const s of this.seeks.values()) seeking[s.tc] = (seeking[s.tc] ?? 0) + 1;
    const msg: ServerMessage = { t: 'lobby', online: users.size, seeking };
    for (const ws of this.ctx.getWebSockets()) if ((ws.deserializeAttachment() as Attachment).userId) safeSend(ws, msg);
  }

  /** When a player's last lobby connection closes, they leave the queue (no ghost pairings). */
  private async dropIfGone(ws: WebSocket): Promise<void> {
    const userId = (ws.deserializeAttachment() as Attachment | null)?.userId;
    if (!userId) return;
    const still = this.ctx.getWebSockets().some((o) => o !== ws && o.readyState === WebSocket.OPEN && (o.deserializeAttachment() as Attachment).userId === userId);
    if (!still && this.seeks.delete(userId)) await this.persist();
    this.broadcastStats();
  }

  private toUser(userId: string, msg: ServerMessage): void {
    for (const ws of this.ctx.getWebSockets()) {
      if ((ws.deserializeAttachment() as Attachment).userId === userId) safeSend(ws, msg);
    }
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put({ seeks: [...this.seeks], pending: [...this.pending] });
  }

  private room(id: string) {
    return this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(id));
  }

  private admin(): SupabaseAdmin {
    return new SupabaseAdmin({ SUPABASE_URL: this.env.SUPABASE_URL, SUPABASE_SECRET_KEY: this.env.SUPABASE_SECRET_KEY! });
  }
}

/** Sends, ignoring sockets that closed meanwhile (e.g. the client left during sign-in). */
function send(ws: WebSocket, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* already closed */
  }
}

function safeSend(ws: WebSocket, msg: ServerMessage): void {
  try {
    send(ws, msg);
  } catch {
    /* closing */
  }
}

function fail(ws: WebSocket, code: string, message?: string): void {
  safeSend(ws, { t: 'error', code, message: message ?? (ERROR_TEXT as Record<string, string>)[code] ?? 'Something went wrong.' });
}
