'use client';

// Site-wide connection to the lobby for signed-in players: the matchmaking queue, challenges, and
// notifications (an incoming challenge reaches you on any page). Matchmaking happens on the
// server; when it pairs you, this takes you to the game.

import type { ChallengeInfo, ClientMessage } from '@rookery/protocol';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { RealtimeSocket, type SocketStatus } from './socket';

export interface Seeking {
  tc: string;
  rated: boolean;
  since: number;
  /** Acceptable rating difference right now (-1: anyone). */
  range: number;
  players: number;
}

export interface Notice {
  id: string;
  kind: 'challenge' | 'declined' | 'error';
  challenge?: ChallengeInfo;
  text: string;
}

interface LobbyCtx {
  status: SocketStatus | 'signedOut';
  seeking: Seeking | null;
  online: number;
  pools: Record<string, number>;
  incoming: ChallengeInfo[];
  notices: Notice[];
  lastError: string | null;
  seek: (tc: string, rated: boolean) => void;
  unseek: () => void;
  /** Creates a challenge (to a username, or an open link when `to` is null); resolves to its game id. */
  challenge: (opts: { to: string | null; tc: string; rated: boolean; color: 'white' | 'black' | 'random' }) => Promise<string>;
  decline: (id: string) => void;
  dismiss: (noticeId: string) => void;
  serverNow: () => number;
}

const Ctx = createContext<LobbyCtx | null>(null);

export function LobbyProvider({ children }: { children: ReactNode }) {
  const { status: auth, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<SocketStatus | 'signedOut'>('signedOut');
  const [seeking, setSeeking] = useState<Seeking | null>(null);
  const [online, setOnline] = useState(0);
  const [pools, setPools] = useState<Record<string, number>>({});
  const [incoming, setIncoming] = useState<ChallengeInfo[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const sock = useRef<RealtimeSocket | null>(null);
  const waiters = useRef<{ resolve: (id: string) => void; reject: (e: Error) => void }[]>([]);
  const known = useRef(new Set<string>());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (auth !== 'signedIn' || !userId) {
      setStatus('signedOut');
      return;
    }
    const s = new RealtimeSocket('/ws/lobby', {
      onStatus: setStatus,
      onMessage: (msg) => {
        switch (msg.t) {
          case 'seeking':
            setSeeking({ tc: msg.tc, rated: msg.rated, since: msg.since, range: msg.range, players: msg.players });
            break;
          case 'unseeked':
            setSeeking(null);
            break;
          case 'matched':
            setSeeking(null);
            router.push(`/game?id=${msg.gameId}`);
            break;
          case 'lobby':
            setOnline(msg.online);
            setPools(msg.seeking);
            break;
          case 'challenges': {
            setIncoming(msg.incoming);
            const fresh = msg.incoming.filter((c) => !known.current.has(c.id));
            for (const c of msg.incoming) known.current.add(c.id);
            const open = new Set(msg.incoming.map((c) => c.id));
            setNotices((n) => [
              ...n.filter((x) => x.kind !== 'challenge' || open.has(x.challenge!.id)),
              ...fresh.map((c) => ({ id: `c-${c.id}`, kind: 'challenge' as const, challenge: c, text: `${c.from.displayName || c.from.username} challenges you` })),
            ]);
            break;
          }
          case 'challenge-created':
            waiters.current.shift()?.resolve(msg.gameId);
            break;
          case 'challenge-declined':
            // The waiting-room page shows this itself; elsewhere, tell the player.
            if (!pathRef.current?.startsWith('/game')) setNotices((n) => [...n, { id: `d-${msg.gameId}`, kind: 'declined', text: 'Your challenge was declined.' }]);
            break;
          case 'error':
            setLastError(msg.message);
            waiters.current.shift()?.reject(new Error(msg.message));
            break;
        }
      },
    });
    sock.current = s;
    return () => {
      s.close();
      sock.current = null;
      setSeeking(null);
    };
  }, [auth, userId, router]);

  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(() => setLastError(null), 5000);
    return () => clearTimeout(t);
  }, [lastError]);

  const send = useCallback((m: ClientMessage) => sock.current?.send(m), []);

  const value = useMemo<LobbyCtx>(
    () => ({
      status,
      seeking,
      online,
      pools,
      incoming,
      notices,
      lastError,
      seek: (tc, rated) => send({ t: 'seek', tc, rated }),
      unseek: () => send({ t: 'unseek' }),
      challenge: (opts) =>
        new Promise<string>((resolve, reject) => {
          if (!sock.current) return reject(new Error('Sign in to challenge other players.'));
          waiters.current.push({ resolve, reject });
          send({ t: 'challenge', ...opts });
        }),
      decline: (id) => {
        send({ t: 'challenge-decline', id });
        setNotices((n) => n.filter((x) => x.challenge?.id !== id));
      },
      dismiss: (id) => setNotices((n) => n.filter((x) => x.id !== id)),
      serverNow: () => sock.current?.now() ?? Date.now(),
    }),
    [status, seeking, online, pools, incoming, notices, lastError, send],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLobby(): LobbyCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLobby must be used inside <LobbyProvider>');
  return c;
}
