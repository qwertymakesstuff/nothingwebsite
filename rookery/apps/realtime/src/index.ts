// Rookery realtime Worker. Static pages never reach this code (see wrangler.jsonc run_worker_first);
// only /api/*, /ws/* and /u/* do. Live games will each run in their own GameRoom Durable Object.

import { PROTOCOL_VERSION, type HealthResponse } from '@rookery/protocol';
import { handleApi } from './api';
import { GameRoom } from './GameRoom';

export { GameRoom };

export interface Env {
  ASSETS: Fetcher;
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  SUPABASE_URL: string;
  /** Worker secret (Cloudflare dashboard / .dev.vars). Never sent to browsers. */
  SUPABASE_SECRET_KEY?: string;
}

const ROOM_ID = /^[A-Za-z0-9_-]{1,32}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      const body: HealthResponse = {
        ok: true,
        service: 'rookery-realtime',
        protocol: PROTOCOL_VERSION,
        time: Date.now(),
      };
      return json(body, { 'cache-control': 'no-store' });
    }

    // /ws/room/<id>: WebSocket into a GameRoom. Phase 0 rooms only answer pings.
    const ws = url.pathname.match(/^\/ws\/room\/([^/]+)$/);
    if (ws) {
      const roomId = ws[1]!;
      if (!ROOM_ID.test(roomId)) return json({ error: 'bad_room_id' }, {}, 400);
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'expected_websocket' }, {}, 426);
      }
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
      return stub.fetch(request);
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        const res = await handleApi(request, env);
        if (res) return res;
      } catch (e) {
        console.error('api error', e);
        return json({ error: 'server_error', message: 'Something went wrong on our side.' }, {}, 500);
      }
    }

    // Profiles: /u/<username>[...] is one prerendered page (/u/_), filled in by the browser.
    const profile = url.pathname.match(/^\/u\/([^/]+?)(\.txt|\.html)?(\/.*)?$/);
    if (profile && profile[1] !== '_') {
      const rewritten = new URL(`/u/_${profile[2] ?? ''}${profile[3] ?? ''}${url.search}`, url);
      return env.ASSETS.fetch(new Request(rewritten, request));
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
      return json({ error: 'not_found' }, {}, 404);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}
