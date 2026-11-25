// Node transport for the vendored Stockfish build (tests and calibration only, never bundled).

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UciEngine, type Transport } from '../src/engine';

export const ENGINE_PATH = fileURLToPath(new URL('../engine/stockfish-19-lite-single.js', import.meta.url));

export function nodeTransport(path = ENGINE_PATH): Transport {
  const child = spawn(process.execPath, [path], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '';
  const cbs: ((l: string) => void)[] = [];
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d: string) => {
    buf += d;
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) for (const cb of cbs) cb(line);
    }
  });
  return {
    send: (cmd) => child.stdin.write(cmd + '\n'),
    onLine: (cb) => cbs.push(cb),
    terminate: () => {
      child.stdin.end('quit\n');
      setTimeout(() => child.kill(), 200).unref();
    },
  };
}

export function createNodeEngine(): UciEngine {
  return new UciEngine(nodeTransport());
}
