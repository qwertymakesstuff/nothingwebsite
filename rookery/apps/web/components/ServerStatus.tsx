'use client';

// Phase 0 deployment check: is the realtime Worker answering over HTTP and WebSocket, and is
// Supabase reachable? Shown on the home page until real features replace it.

import { HealthResponse, ServerMessage } from '@rookery/protocol';
import { useEffect, useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

type Status = { state: 'checking' } | { state: 'ok'; detail: string } | { state: 'down'; detail: string };

export function ServerStatus() {
  const [api, setApi] = useState<Status>({ state: 'checking' });
  const [ws, setWs] = useState<Status>({ state: 'checking' });
  const [db, setDb] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then(async (r) => HealthResponse.parse(await r.json()))
      .then((h) => setApi({ state: 'ok', detail: `protocol v${h.protocol}` }))
      .catch(() => setApi({ state: 'down', detail: 'not reachable (expected in `next dev`)' }));

    fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
      .then((r) => (r.ok ? setDb({ state: 'ok', detail: 'auth online' }) : setDb({ state: 'down', detail: `HTTP ${r.status}` })))
      .catch(() => setDb({ state: 'down', detail: 'not reachable' }));

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${proto}://${location.host}/ws/room/status-check`);
    const sentAt = performance.now();
    const timer = setTimeout(() => setWs({ state: 'down', detail: 'timed out' }), 6000);
    socket.onmessage = (e) => {
      const msg = ServerMessage.safeParse(JSON.parse(String(e.data)));
      if (!msg.success) return;
      if (msg.data.t === 'hello') socket.send(JSON.stringify({ t: 'ping', id: 1 }));
      if (msg.data.t === 'pong') {
        clearTimeout(timer);
        setWs({ state: 'ok', detail: `${Math.round(performance.now() - sentAt)} ms round trip` });
        socket.close(1000);
      }
    };
    socket.onerror = () => {
      clearTimeout(timer);
      setWs({ state: 'down', detail: 'not reachable (expected in `next dev`)' });
    };
    return () => {
      clearTimeout(timer);
      socket.close();
    };
  }, []);

  return (
    <ul className="space-y-2.5 text-sm">
      <Row label="Realtime API" status={api} />
      <Row label="Live game socket" status={ws} />
      <Row label="Accounts (Supabase)" status={db} />
    </ul>
  );
}

function Row({ label, status }: { label: string; status: Status }) {
  const dot = status.state === 'ok' ? 'bg-win' : status.state === 'down' ? 'bg-loss' : 'bg-fg-subtle animate-pulse';
  return (
    <li className="flex items-center gap-3">
      <span className={`size-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-semibold">{label}</span>
      <span className="ml-auto text-right text-fg-subtle">{status.state === 'checking' ? 'checking…' : status.detail}</span>
    </li>
  );
}
