// Builds public/data/openings.json from the lichess chess-openings dataset (CC0 public domain:
// https://github.com/lichess-org/chess-openings). Keyed by position (FEN without move counters),
// so transpositions are recognised too. Usage: node scripts/build-openings.mjs <dir with a.tsv … e.tsv>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const dir = process.argv[2];
const out = {};
let lines = 0;
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const rows = readFileSync(join(dir, `${f}.tsv`), 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const [eco, name, pgn] = row.split('\t');
    const chess = new Chess();
    const sans = pgn.replace(/\d+\.\s*/g, '').trim().split(/\s+/);
    for (const san of sans) chess.move(san);
    const key = chess.fen().split(' ').slice(0, 4).join(' ');
    // Keep the most specific (longest) line's name when several reach the same position.
    if (!out[key] || out[key][2] < sans.length) out[key] = [eco, name, sans.length];
    lines++;
  }
}
const compact = Object.fromEntries(Object.entries(out).map(([k, [eco, name]]) => [k, [eco, name]]));
writeFileSync(new URL('../public/data/openings.json', import.meta.url), JSON.stringify(compact));
console.log(`${lines} lines → ${Object.keys(compact).length} positions`);
