'use client';

// One authenticated WebSocket to the realtime server (/ws/lobby or /ws/game/<id>), with
// automatic reconnection. The server is authoritative: this only carries messages, signs in with
// the current Supabase access token on every (re)connection, and estimates the offset between this
// device's clock and the server's so countdowns can be drawn from server timestamps.

import { ServerMessage, type ClientMessage } from '@rookery/protocol';
import { supabase } from '@/lib/supabase/client';

export type SocketStatus = 'connecting' | 'online' | 'reconnecting' | 'closed';

/** Close codes after which retrying can't help. */
const FATAL = new Map<number, string>([
  [4001, 'auth_failed'],
  [4003, 'not_a_player'],
  [4004, 'not_found'],
]);

export class RealtimeSocket {
  status: SocketStatus = 'connecting';
  /** serverTime ≈ Date.now() + offset */
  offset = 0;
  private ws: WebSocket | null = null;
  private attempts = 0;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private pings = new Map<number, number>();
  private pingId = 0;
  private queue: ClientMessage[] = [];

  constructor(
    private path: string,
    private handlers: {
      onMessage: (msg: ServerMessage) => void;
      onStatus?: (status: SocketStatus) => void;
      onFatal?: (code: string) => void;
    },
    /** Measure the server clock offset (game rooms). The lobby doesn't need it. */
    private syncClock = false,
  ) {
    this.connect();
  }

  /** Sends once signed in; queued while (re)connecting. */
  send(msg: ClientMessage): void {
    if (this.status === 'online' && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }

  /** Server time now, as best this device can tell. */
  now(): number {
    return Date.now() + this.offset;
  }

  close(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.ws?.close(1000, 'bye');
    this.setStatus('closed');
  }

  private connect(): void {
    if (this.stopped) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}${this.path}`);
    this.ws = ws;
    ws.onmessage = (e) => this.receive(e.data);
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      if (this.heartbeat) clearInterval(this.heartbeat);
      const fatal = FATAL.get(e.code);
      if (fatal) {
        this.stopped = true;
        this.setStatus('closed');
        this.handlers.onFatal?.(fatal);
        return;
      }
      this.retry();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private retry(): void {
    if (this.stopped) return;
    this.setStatus('reconnecting');
    const delay = Math.min(8000, 400 * 2 ** this.attempts) * (0.75 + Math.random() * 0.5);
    this.attempts++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private async receive(raw: unknown): Promise<void> {
    if (raw === '"heartbeat"') return;
    let msg: ServerMessage;
    try {
      msg = ServerMessage.parse(JSON.parse(String(raw)));
    } catch {
      return;
    }
    if (msg.t === 'hello') {
      this.offset = msg.serverTime - Date.now();
      const { data } = await supabase().auth.getSession(); // refreshes an expired token first
      const token = data.session?.access_token;
      if (!token) {
        this.stopped = true;
        this.ws?.close(1000, 'signed out');
        this.handlers.onFatal?.('auth_required');
        return;
      }
      this.ws?.send(JSON.stringify({ t: 'auth', token } satisfies ClientMessage));
      return;
    }
    if (msg.t === 'authed') {
      this.attempts = 0;
      this.setStatus('online');
      this.startHeartbeat();
      const queued = this.queue.splice(0);
      for (const m of queued) this.send(m);
    }
    if (msg.t === 'pong') {
      const sent = this.pings.get(msg.id);
      this.pings.delete(msg.id);
      // Assume the reply was stamped half-way through the round trip.
      if (sent !== undefined) this.offset = msg.serverTime - (sent + Date.now()) / 2;
      return;
    }
    this.handlers.onMessage(msg);
  }

  /**
   * Keep-alive: the literal "heartbeat" is answered by Cloudflare without waking the server
   * (free). Game sockets also send a real ping each minute to keep the clock offset accurate.
   */
  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    let n = 0;
    const ping = () => {
      const id = ++this.pingId;
      this.pings.set(id, Date.now());
      this.ws?.send(JSON.stringify({ t: 'ping', id } satisfies ClientMessage));
    };
    if (this.syncClock) ping();
    this.heartbeat = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      n++;
      if (this.syncClock && n % 3 === 0) ping();
      else this.ws.send('"heartbeat"');
    }, 20_000);
  }

  private setStatus(s: SocketStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.handlers.onStatus?.(s);
  }
}
