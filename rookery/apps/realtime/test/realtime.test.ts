import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { HealthResponse, ServerMessage } from '@rookery/protocol';

const worker = exports.default;

describe('realtime worker', () => {
  it('serves /api/health', async () => {
    const res = await worker.fetch('https://chess.missing.website/api/health');
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(await res.json()).service).toBe('rookery-realtime');
  });

  it('404s unknown routes and validates websocket requests', async () => {
    expect((await worker.fetch('https://x/api/nope')).status).toBe(404);
    expect((await worker.fetch('https://x/ws/nope', { headers: { Upgrade: 'websocket' } })).status).toBe(404);
    expect((await worker.fetch('https://x/ws/game/bad.id!', { headers: { Upgrade: 'websocket' } })).status).toBe(400);
    expect((await worker.fetch('https://x/ws/game/abcdefgh1234')).status).toBe(426);
    const crossSite = await worker.fetch('https://x/ws/lobby', { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } });
    expect(crossSite.status).toBe(403);
  });

  it('lobby and game sockets say hello, answer pings and demand sign-in before anything else', async () => {
    for (const path of ['/ws/lobby', '/ws/game/abcdefgh1234']) {
      const res = await worker.fetch(`https://x${path}`, { headers: { Upgrade: 'websocket', Origin: 'https://x' } });
      expect(res.status).toBe(101);
      const ws = res.webSocket!;
      const messages: ServerMessage[] = [];
      const got = (n: number) =>
        new Promise<void>((resolve) => {
          const check = () => (messages.length >= n ? resolve() : setTimeout(check, 5));
          check();
        });
      ws.addEventListener('message', (e) => messages.push(ServerMessage.parse(JSON.parse(e.data as string))));
      ws.accept();
      await got(1);
      expect(messages[0]?.t).toBe('hello');
      ws.send(JSON.stringify({ t: 'ping', id: 7 }));
      await got(2);
      expect(messages[1]).toMatchObject({ t: 'pong', id: 7 });
      ws.send('not json');
      await got(3);
      expect(messages[2]).toMatchObject({ t: 'error', code: 'bad_message' });
      ws.send(JSON.stringify({ t: path.includes('lobby') ? 'seek' : 'move', ...(path.includes('lobby') ? { tc: '5+0', rated: true } : { uci: 'e2e4', ply: 0 }) }));
      await got(4);
      expect(messages[3]).toMatchObject({ t: 'error', code: 'auth_required' });
      ws.close(1000);
    }
  });
});
