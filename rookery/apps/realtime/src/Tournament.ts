// One Durable Object per arena tournament: the live, authoritative state (who's in, scores,
// pairings), mirrored to Supabase (tournaments, tournament_players) for listings and history.
//
// Lifecycle: scheduled → running (alarm at the start) → finished (alarm at the end; games still in
// progress count, and the tournament closes when the last one ends) or cancelled.
// Players connect to /ws/tournament/<id>; while connected, joined and not paused, they're paired
// as soon as someone else is waiting. Each game is an ordinary GameRoom (source "tournament"),
// which reports its result back here. Spectators can watch without signing in.

import { DurableObject } from 'cloudflare:workers';
import { parseClientMessage, PROTOCOL_VERSION, type ServerMessage, type TournamentView } from '@rookery/protocol';
import type { Env } from './index';
import { applyResult, pairArena, standings, type ArenaPlayer, type Result } from './game/arena';
import { playerInfo, randomId } from './game/players';
import type { TimeControlSpec } from './game/room';
import { SupabaseAdmin } from './supabase';

export interface TournamentInit {
  id: string;
  name: string;
  tc: TimeControlSpec;
  rated: boolean;
  startsAt: number;
  durationMinutes: number;
  /** Length in ms (normally durationMinutes; shorter only under TOURNAMENT_TIME_SCALE in tests). */
  durationMs?: number;
  createdBy: string | null;
}

interface State {
  info: TournamentInit;
  status: 'scheduled' | 'running' | 'finished' | 'cancelled';
  players: Record<string, ArenaPlayer>;
  /** Games in progress: id → players. */
  games: Record<string, { white: string; black: string }>;
  winnerId: string | null;
}

interface Attachment {
  userId: string | null;
}

const PAIR_DELAY_MS = 2_500;
const MAX_PLAYERS = 200;
const STANDINGS_SHOWN = 100;

export class Tournament extends DurableObject<Env> {
  private s: State | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('"heartbeat"', '"heartbeat"'));
    void ctx.blockConcurrencyWhile(async () => {
      this.s = (await ctx.storage.get<State>('state')) ?? null;
    });
  }

  // ── RPC ────────────────────────────────────────────────────────────────────────────────

  async init(info: TournamentInit): Promise<{ ok: true }> {
    if (this.s) return { ok: true };
    this.s = { info, status: 'scheduled', players: {}, games: {}, winnerId: null };
    await this.save();
    return { ok: true };
  }

  async cancel(): Promise<void> {
    if (!this.s || this.s.status === 'finished') return;
    this.s.status = 'cancelled';
    await this.save();
    await this.admin().rest('PATCH', `tournaments?id=eq.${this.s.info.id}`, { status: 'cancelled', finished_at: new Date().toISOString() });
    this.broadcast();
  }

  /** A tournament game ended (`result`) or was aborted (null). */
  async gameFinished(gameId: string, result: Result | null): Promise<void> {
    const s = this.s;
    const g = s?.games[gameId];
    if (!s || !g) return;
    delete s.games[gameId];
    const w = s.players[g.white];
    const b = s.players[g.black];
    if (w && b) {
      if (result) {
        s.players[g.white] = applyResult(w, 'white', result);
        s.players[g.black] = applyResult(b, 'black', result);
      } else {
        s.players[g.white] = { ...w, gameId: null };
        s.players[g.black] = { ...b, gameId: null };
      }
    }
    await this.save();
    if (result) await this.syncPlayers([g.white, g.black]);
    if (s.status === 'finished' && !Object.keys(s.games).length) {
      await this.finalize();
      await this.save();
    } else this.schedulePairing();
    this.broadcast();
  }

  // ── Sockets ────────────────────────────────────────────────────────────────────────────

  override async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId: null } satisfies Attachment);
    send(server, { t: 'hello', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
    if (this.s) this.sendView(server);
    else send(server, { t: 'error', code: 'not_found', message: 'This tournament doesn’t exist.' });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const msg = parseClientMessage(raw);
    if (!msg) return fail(ws, 'bad_message', 'Unrecognised message.');
    if (msg.t === 'ping') return send(ws, { t: 'pong', id: msg.id, serverTime: Date.now() });
    const att = ws.deserializeAttachment() as Attachment;
    if (msg.t === 'auth') {
      const user = this.env.SUPABASE_SECRET_KEY ? await this.admin().userFromToken(msg.token).catch(() => null) : null;
      if (!user) return fail(ws, 'auth_failed', 'Your session has expired. Sign in again.');
      ws.serializeAttachment({ userId: user.id } satisfies Attachment);
      send(ws, { t: 'authed', userId: user.id, serverTime: Date.now() });
      this.sendView(ws);
      this.schedulePairing();
      return;
    }
    if (!att.userId) return fail(ws, 'auth_required', 'Sign in to take part.');
    if (msg.t === 'tournament-join') return this.join(ws, att.userId);
    if (msg.t === 'tournament-pause') return this.pause(att.userId);
    return fail(ws, 'bad_message', 'Unrecognised message.');
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
  }

  override async alarm(): Promise<void> {
    const s = this.s;
    if (!s) return;
    const now = Date.now();
    const endsAt = endOf(s.info);
    if (s.status === 'scheduled' && now >= s.info.startsAt) {
      s.status = 'running';
      await this.admin().rest('PATCH', `tournaments?id=eq.${s.info.id}`, { status: 'running' });
      await this.notifyAll('tournament_started', {});
    }
    if (s.status === 'running' && now >= endsAt) {
      s.status = 'finished';
      if (!Object.keys(s.games).length) await this.finalize();
    }
    if (s.status === 'running') await this.pair();
    await this.save();
    this.broadcast();
  }

  // ── Internals ──────────────────────────────────────────────────────────────────────────

  private async join(ws: WebSocket, userId: string): Promise<void> {
    const s = this.s;
    if (!s || (s.status !== 'scheduled' && s.status !== 'running')) return fail(ws, 'closed', 'This tournament isn’t open.');
    const existing = s.players[userId];
    if (existing) {
      s.players[userId] = { ...existing, active: true };
    } else {
      if (Object.keys(s.players).length >= MAX_PLAYERS) return fail(ws, 'full', 'This tournament is full.');
      const admin = this.admin();
      if ((await admin.isRestricted(userId, 'no_tournaments')) || (await admin.isRestricted(userId, 'no_play'))) {
        return fail(ws, 'restricted', 'Your account can’t join tournaments right now.');
      }
      const card = await admin.player(userId, s.info.tc.category);
      if (!card) return fail(ws, 'not_a_player', 'Your account has no player profile.');
      s.players[userId] = {
        userId,
        username: card.username,
        rating: Math.round(card.glicko.rating),
        score: 0,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        streak: 0,
        active: true,
        gameId: null,
        lastOpponent: null,
        colorBalance: 0,
        joinedAt: Date.now(),
      };
      await admin.rest('POST', 'tournament_players', { tournament_id: s.info.id, user_id: userId, rating: Math.round(card.glicko.rating) }, 'resolution=merge-duplicates');
      await admin.rest('PATCH', `tournaments?id=eq.${s.info.id}`, { player_count: Object.keys(s.players).length });
    }
    await this.save();
    this.broadcast();
    this.schedulePairing();
  }

  private async pause(userId: string): Promise<void> {
    const p = this.s?.players[userId];
    if (!p) return;
    this.s!.players[userId] = { ...p, active: false };
    await this.save();
    this.broadcast();
  }

  /** Pairs everyone waiting and connected, creating their games. */
  private async pair(): Promise<void> {
    const s = this.s!;
    const connected = this.connectedUsers();
    const pairs = pairArena(Object.values(s.players), (p) => connected.has(p.userId));
    if (!pairs.length) return;
    const admin = this.admin();
    for (const { white, black } of pairs) {
      const [wc, bc] = await Promise.all([admin.player(white.userId, s.info.tc.category), admin.player(black.userId, s.info.tc.category)]);
      if (!wc || !bc) continue;
      const id = randomId();
      await this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(id)).init({
        id,
        source: 'tournament',
        tournamentId: s.info.id,
        rated: s.info.rated,
        tc: s.info.tc,
        white: playerInfo(wc),
        black: playerInfo(bc),
      });
      s.games[id] = { white: white.userId, black: black.userId };
      s.players[white.userId] = { ...s.players[white.userId]!, gameId: id, lastOpponent: black.userId, colorBalance: white.colorBalance + 1 };
      s.players[black.userId] = { ...s.players[black.userId]!, gameId: id, lastOpponent: white.userId, colorBalance: black.colorBalance - 1 };
      this.toUser(white.userId, { t: 'tournament-paired', gameId: id });
      this.toUser(black.userId, { t: 'tournament-paired', gameId: id });
    }
  }

  private schedulePairing(): void {
    if (this.s?.status !== 'running') return;
    void this.ctx.storage.getAlarm().then((at) => {
      const soon = Date.now() + PAIR_DELAY_MS;
      if (at === null || at > soon) return this.ctx.storage.setAlarm(soon);
    });
  }

  private async finalize(): Promise<void> {
    const s = this.s!;
    const order = standings(Object.values(s.players));
    s.winnerId = order[0] && order[0].games > 0 ? order[0].userId : null;
    s.status = 'finished';
    const admin = this.admin();
    await admin.rest('PATCH', `tournaments?id=eq.${s.info.id}`, {
      status: 'finished',
      winner_id: s.winnerId,
      finished_at: new Date().toISOString(),
      player_count: order.length,
    });
    await Promise.all(order.map((p, i) => admin.rest('PATCH', `tournament_players?tournament_id=eq.${s.info.id}&user_id=eq.${p.userId}`, { rank: i + 1 })));
    if (s.winnerId) await admin.rpc('award_achievements', { p_user: s.winnerId }).catch((e: unknown) => console.error('award', e));
    await Promise.all(
      order.map((p, i) => admin.rpc('notify', { p_user: p.userId, p_kind: 'tournament_finished', p_actor: null, p_data: { tournament_id: s.info.id, name: s.info.name, rank: i + 1, players: order.length } }).catch(() => {})),
    );
  }

  private async syncPlayers(ids: string[]): Promise<void> {
    const s = this.s!;
    const admin = this.admin();
    await Promise.all(
      ids.map((id) => {
        const p = s.players[id];
        return p ? admin.rest('PATCH', `tournament_players?tournament_id=eq.${s.info.id}&user_id=eq.${id}`, { score: p.score, games: p.games, wins: p.wins, draws: p.draws, losses: p.losses }).catch((e: unknown) => console.error('sync', e)) : null;
      }),
    );
  }

  private async notifyAll(kind: string, data: Record<string, unknown>): Promise<void> {
    const s = this.s!;
    const admin = this.admin();
    await Promise.all(Object.keys(s.players).map((u) => admin.rpc('notify', { p_user: u, p_kind: kind, p_actor: null, p_data: { tournament_id: s.info.id, name: s.info.name, ...data } }).catch(() => {})));
  }

  private async save(): Promise<void> {
    const s = this.s!;
    await this.ctx.storage.put('state', s);
    const endsAt = endOf(s.info);
    if (s.status === 'scheduled') await this.ctx.storage.setAlarm(s.info.startsAt);
    else if (s.status === 'running') {
      const current = await this.ctx.storage.getAlarm();
      if (current === null || current > endsAt) await this.ctx.storage.setAlarm(endsAt);
    } else await this.ctx.storage.deleteAlarm();
  }

  private view(userId: string | null): TournamentView {
    const s = this.s!;
    const order = standings(Object.values(s.players));
    const me = userId ? s.players[userId] : undefined;
    return {
      id: s.info.id,
      name: s.info.name,
      tc: s.info.tc.id,
      category: s.info.tc.category,
      rated: s.info.rated,
      status: s.status,
      startsAt: s.info.startsAt,
      endsAt: endOf(s.info),
      createdBy: s.info.createdBy,
      standings: order.slice(0, STANDINGS_SHOWN).map((p) => ({
        userId: p.userId,
        username: p.username,
        rating: p.rating,
        score: p.score,
        games: p.games,
        wins: p.wins,
        draws: p.draws,
        losses: p.losses,
        streak: p.streak,
        active: p.active,
        playing: p.gameId !== null,
      })),
      players: order.length,
      ongoingGames: Object.keys(s.games).length,
      you: userId ? { joined: Boolean(me), active: Boolean(me?.active), gameId: me?.gameId ?? null } : null,
    };
  }

  private sendView(ws: WebSocket): void {
    const att = ws.deserializeAttachment() as Attachment;
    safeSend(ws, { t: 'tournament', tournament: this.view(att.userId), serverTime: Date.now() });
  }

  private broadcast(): void {
    for (const ws of this.ctx.getWebSockets()) this.sendView(ws);
  }

  private toUser(userId: string, msg: ServerMessage): void {
    for (const ws of this.ctx.getWebSockets()) if ((ws.deserializeAttachment() as Attachment).userId === userId) safeSend(ws, msg);
  }

  private connectedUsers(): Set<string> {
    const set = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const id = (ws.deserializeAttachment() as Attachment).userId;
      if (id && ws.readyState === WebSocket.OPEN) set.add(id);
    }
    return set;
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

function fail(ws: WebSocket, code: string, message: string): void {
  safeSend(ws, { t: 'error', code, message });
}

function endOf(info: TournamentInit): number {
  return info.startsAt + (info.durationMs ?? info.durationMinutes * 60_000);
}
