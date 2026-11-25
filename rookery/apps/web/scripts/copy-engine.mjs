// Copies the vendored Stockfish build (packages/ai/engine) into public/engine so it is served at
// /engine/*. Runs before `next dev` and `next build`; the copy is git-ignored.
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = new URL('../../../packages/ai/engine/', import.meta.url);
const dest = new URL('../public/engine/', import.meta.url);
mkdirSync(fileURLToPath(dest), { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm', 'COPYING.txt', 'README.md']) {
  copyFileSync(fileURLToPath(new URL(f, src)), fileURLToPath(new URL(f, dest)));
}
console.log('engine: copied Stockfish to public/engine');
