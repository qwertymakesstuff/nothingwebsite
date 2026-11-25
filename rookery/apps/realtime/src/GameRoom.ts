// One Durable Object per live game. Phase 0 proves the plumbing only: WebSocket upgrade,
// the Hibernation API (no duration billing while idle) and free protocol-level keep-alives.
// Moves, clocks (via alarms) and persistence to the object's SQLite storage come in Phase 4.

import { DurableObject } from 'cloudflare:workers';
import { parseClientMessage, PROTOCOL_VERSION, type ServerMessage } from '@rookery/protocol';
import type { Env } from './index';

export class GameRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answered by Cloudflare without waking this object, so heartbeats cost nothing.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('"heartbeat"', '"heartbeat"'));
  }

  override async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server); // hibernatable accept, never server.accept()
    send(server, { t: 'hello', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const msg = parseClientMessage(raw);
    if (!msg) {
      send(ws, { t: 'error', code: 'bad_message', message: 'Unrecognised message' });
      return;
    }
    switch (msg.t) {
      case 'ping':
        send(ws, { t: 'pong', id: msg.id, serverTime: Date.now() });
        break;
    }
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1005/1006 are reserved and can't be sent back; reply with a normal close instead.
    ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closing');
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}
