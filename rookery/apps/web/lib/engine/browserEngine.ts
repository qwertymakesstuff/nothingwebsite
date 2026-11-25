'use client';

// Stockfish in a Web Worker. One engine is shared by the whole site and created on first use,
// so pages that never need it never download it (~1.9 MB). The worker runs searches off the
// main thread; the UI never blocks on the engine.

import { ENGINE_INFO, UciEngine, type Transport } from '@rookery/ai';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

let engine: UciEngine | null = null;
let status: EngineStatus = 'idle';
let statusError: string | null = null;
const listeners = new Set<() => void>();

function setStatus(s: EngineStatus, err: string | null = null) {
  status = s;
  statusError = err;
  listeners.forEach((l) => l());
}

function workerTransport(): Transport {
  const worker = new Worker(`/engine/${ENGINE_INFO.file}`);
  const cbs: ((line: string) => void)[] = [];
  worker.onmessage = (e: MessageEvent) => {
    const data = typeof e.data === 'string' ? e.data : String(e.data ?? '');
    for (const line of data.split('\n')) if (line.trim()) for (const cb of cbs) cb(line.trim());
  };
  worker.onerror = (e) => setStatus('error', e.message || 'The engine failed to load.');
  return {
    send: (cmd) => worker.postMessage(cmd),
    onLine: (cb) => cbs.push(cb),
    terminate: () => worker.terminate(),
  };
}

/** The shared engine, created (and its handshake started) on first call. */
export function getEngine(): UciEngine {
  if (!engine) {
    setStatus('loading');
    engine = new UciEngine(workerTransport());
    // A tiny search confirms the engine works before anyone relies on it.
    engine
      .search({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', depth: 1 })
      .then(() => status !== 'error' && setStatus('ready'))
      .catch((e: Error) => setStatus('error', e.message));
  }
  return engine;
}

/** Throws away the engine (e.g. after an error) so the next getEngine() starts a fresh worker. */
export function resetEngine(): void {
  engine?.terminate();
  engine = null;
  setStatus('idle');
}

export function engineStatus(): { status: EngineStatus; error: string | null } {
  return { status, error: statusError };
}

export function subscribeEngineStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
