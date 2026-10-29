// Asks the computer for a move: in a Web Worker when the browser allows module workers, otherwise
// on the main thread after a short pause. Every request can be cancelled (undo, restart, leaving).

import { Chess } from './engine.js';
import { chooseMove } from './ai.js';

export class AiClient {
  constructor() {
    this.seq = 0;
    this.pending = new Map();
    try {
      this.worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = e => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.move);
      };
      this.worker.onerror = () => { this.worker = null; for (const [, p] of this.pending) p.fallback(); };
    } catch { this.worker = null; }
  }

  // Resolves to a move, or null if cancelled. minDelay keeps instant replies from feeling abrupt.
  request(fen, level, { minDelay = 450 } = {}) {
    const id = ++this.seq;
    const started = Date.now();
    const local = () => new Promise(res => setTimeout(() => res(chooseMove(new Chess(fen), level)), 30));
    const result = new Promise((resolve, reject) => {
      const entry = { resolve, reject, fallback: () => { this.pending.delete(id); local().then(resolve, reject); } };
      this.pending.set(id, entry);
      if (this.worker) this.worker.postMessage({ id, fen, level });
      else entry.fallback();
    });
    this.current = id;
    return result.then(async move => {
      const wait = minDelay - (Date.now() - started);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      return this.current === id ? move : null;
    });
  }

  cancel() { this.current = 0; }
  destroy() { this.cancel(); this.worker?.terminate(); this.worker = null; }
}
