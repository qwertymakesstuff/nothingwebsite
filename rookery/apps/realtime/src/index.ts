// Rookery realtime Worker. Static pages never reach this code (see wrangler.jsonc run_worker_first);
// only /api/*, /ws/* and /u/* do.
//   /ws/lobby        the Lobby Durable Object: matchmaking, challenges, notifications
//   /ws/game/<id>    the GameRoom Durable Object that owns that game

import { PROTOCOL_VERSION, type HealthResponse } from '@rookery/protocol';
import { handleApi } from './api';
import { GameRoom } from './GameRoom';
import { Lobby } from './Lobby';

export { GameRoom, Lobby };

export interface Env {
  ASSETS: Fetcher;
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  LOBBY: DurableObjectNamespace<Lobby>;
  SUPABASE_URL: string;
  /** Worker secret (Cloudflare dashboard / .dev.vars). Never sent to browsers. */
  SUPABASE_SECRET_KEY?: string;
  /** Test/local overrides (milliseconds), e.g. in .dev.vars: shorter first-move and away windows. */
  FIRST_MOVE_MS?: string;
  DISCONNECT_GRACE_MS?: string;
}

const GAME_ID = /^[A-Za-z0-9]{8,24}$/;

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

    if (url.pathname.startsWith('/ws/')) {
      const game = url.pathname.match(/^\/ws\/game\/([^/]+)$/);
      if (url.pathname !== '/ws/lobby' && !game) return json({ error: 'not_found' }, {}, 404);
      if (game && !GAME_ID.test(game[1]!)) return json({ error: 'bad_game_id' }, {}, 400);
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'expected_websocket' }, {}, 426);
      // Browsers always send Origin on WebSocket upgrades: refuse pages on other sites.
      const origin = request.headers.get('Origin');
      if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden_origin' }, {}, 403);
      if (game) return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(game[1]!)).fetch(request);
      return env.LOBBY.get(env.LOBBY.idFromName('main')).fetch(request);
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
