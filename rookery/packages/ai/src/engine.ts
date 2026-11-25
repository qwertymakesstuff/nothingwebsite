// UCI engine driver. The transport is injected: a Web Worker in the browser, a child process in
// Node (tests, calibration). Requests are queued so callers never interleave UCI commands.

import { CandidateCollector, parseBestMove, type Candidate } from './uci';

export const ENGINE_INFO = {
  name: 'Stockfish 19 Lite (WebAssembly, single-threaded)',
  version: '19.0.1',
  licence: 'GPL-3.0',
  source: 'https://github.com/nmrugg/stockfish.js/tree/v19.0.1',
  upstream: 'https://github.com/official-stockfish/Stockfish',
  /** Stockfish's own strength limiter only goes this low; weaker play is modelled in select.ts. */
  minUciElo: 1320,
  maxUciElo: 3190,
  file: 'stockfish-19-lite-single.js',
} as const;

export interface Transport {
  send(cmd: string): void;
  onLine(cb: (line: string) => void): void;
  terminate(): void;
}

export interface SearchOptions {
  fen: string;
  /** Moves (UCI) played from `fen`, so the engine sees repetitions. */
  moves?: string[];
  multiPv?: number;
  depth?: number;
  movetimeMs?: number;
  nodes?: number;
  /** Stockfish's calibrated strength limiter (1320–3190). Omit for full strength. */
  uciElo?: number;
}

export interface SearchResult {
  bestmove: string | null;
  candidates: Candidate[];
  /** Wall-clock time the search took. */
  ms: number;
}

export class UciEngine {
  private listeners: ((line: string) => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private options = new Map<string, string>();
  private ready: Promise<void>;
  private dead = false;

  constructor(private transport: Transport) {
    transport.onLine((line) => {
      for (const l of [...this.listeners]) l(line);
    });
    this.ready = this.handshake();
  }

  private waitFor(pred: (line: string) => boolean, timeoutMs = 30_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== fn);
        reject(new Error('Engine did not respond in time'));
      }, timeoutMs);
      const fn = (line: string) => {
        if (pred(line)) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((l) => l !== fn);
          resolve(line);
        }
      };
      this.listeners.push(fn);
    });
  }

  private async handshake(): Promise<void> {
    const ok = this.waitFor((l) => l === 'uciok');
    this.transport.send('uci');
    await ok;
    await this.isReady();
  }

  private async isReady(): Promise<void> {
    const ok = this.waitFor((l) => l === 'readyok');
    this.transport.send('isready');
    await ok;
  }

  private setOption(name: string, value: string | number | boolean): void {
    const v = String(value);
    if (this.options.get(name) === v) return;
    this.options.set(name, v);
    this.transport.send(`setoption name ${name} value ${v}`);
  }

  /** Runs a search. Calls are serialised; a new game should call `newGame()` first. */
  search(opts: SearchOptions): Promise<SearchResult> {
    const run = async (): Promise<SearchResult> => {
      if (this.dead) throw new Error('Engine has been terminated');
      await this.ready;
      this.setOption('MultiPV', opts.multiPv ?? 1);
      if (opts.uciElo !== undefined) {
        this.setOption('UCI_LimitStrength', true);
        this.setOption('UCI_Elo', Math.round(Math.min(ENGINE_INFO.maxUciElo, Math.max(ENGINE_INFO.minUciElo, opts.uciElo))));
      } else {
        this.setOption('UCI_LimitStrength', false);
      }
      await this.isReady();

      const collector = new CandidateCollector();
      const collect = (line: string) => collector.push(line);
      this.listeners.push(collect);
      const done = this.waitFor((l) => l.startsWith('bestmove'), (opts.movetimeMs ?? 0) + 60_000);
      const started = Date.now();
      const moves = opts.moves?.length ? ` moves ${opts.moves.join(' ')}` : '';
      this.transport.send(`position fen ${opts.fen}${moves}`);
      const limits = [
        opts.depth !== undefined ? `depth ${opts.depth}` : '',
        opts.movetimeMs !== undefined ? `movetime ${Math.round(opts.movetimeMs)}` : '',
        opts.nodes !== undefined ? `nodes ${Math.round(opts.nodes)}` : '',
      ].filter(Boolean);
      this.transport.send(`go ${limits.join(' ') || 'depth 10'}`);
      try {
        const line = await done;
        return { bestmove: parseBestMove(line), candidates: collector.result(), ms: Date.now() - started };
      } finally {
        this.listeners = this.listeners.filter((l) => l !== collect);
      }
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Clears hash and history between games. */
  newGame(): Promise<void> {
    const run = async () => {
      await this.ready;
      this.transport.send('ucinewgame');
      await this.isReady();
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Asks a running search to finish now (it still resolves, with the best move so far). */
  stop(): void {
    this.transport.send('stop');
  }

  terminate(): void {
    this.dead = true;
    this.transport.terminate();
  }
}
