// Puzzle logic (no DOM): generation + checking for the five lock types.
export const PUZZLE_TYPES = ['keypad', 'fuses', 'chime', 'valves', 'cipher'];
export const PUZZLE_NAMES = { keypad: 'Keypad Lock', fuses: 'Fuse Box', chime: 'Chime Lock', valves: 'Pressure Valves', cipher: 'Cipher Lock' };

const WORDS = ['LIFT', 'FLOOR', 'ROOF', 'ATTIC', 'LOBBY', 'CABLE', 'BRASS', 'CHIME', 'STAIRS', 'TENANT', 'KEYS', 'DOORS', 'NIGHT', 'SHAFT', 'GARDEN', 'LANTERN', 'TICKET', 'PIANO', 'UMBRELLA', 'LISK', 'VARGA', 'HOTEL', 'ARCADE', 'BELL'];

export function makePuzzle(type, rng, tier = 1) {
  switch (type) {
    case 'keypad': return { type, code: String(rng.int(1000, 9999)), tries: 0 };
    case 'fuses': {
      const n = tier >= 3 ? 4 : 3;
      const grid = Array(n * n).fill(true);
      const k = Math.min(n * n - 1, rng.int(3, n === 3 ? 5 : 6));
      const cells = rng.shuffle([...Array(n * n).keys()]).slice(0, k);
      for (const c of cells) pressFuse(grid, n, c);
      if (grid.every(Boolean)) { pressFuse(grid, n, cells[0]); return { type, n, grid, sol: [cells[0]], min: 1, moves: 0 }; }
      return { type, n, grid, sol: cells.slice(), min: k, moves: 0 };
    }
    case 'chime': {
      const len = Math.min(7, 3 + tier);
      return { type, seq: Array.from({ length: len }, () => rng.int(0, 3)), pos: 0 };
    }
    case 'valves': {
      const count = tier >= 3 ? 4 : 3;
      const weights = rng.shuffle([2, 3, 4, 5, 7]).slice(0, count).sort((a, b) => a - b);
      const sol = weights.map(() => rng.int(0, 5));
      if (sol.every(s => s === 0)) sol[0] = 3;
      const target = weights.reduce((s, w, i) => s + w * sol[i], 0);
      return { type, weights, target, set: weights.map(() => 0) };
    }
    case 'cipher': {
      const answer = rng.pick(WORDS);
      const shift = rng.int(1, tier >= 3 ? 7 : 4);
      const others = rng.shuffle(WORDS.filter(w => w !== answer && w.length === answer.length)).slice(0, 3);
      while (others.length < 3) { const w = rng.pick(WORDS); if (w !== answer && !others.includes(w)) others.push(w); }
      return { type, answer, shift, text: caesar(answer, shift), options: rng.shuffle([answer, ...others]) };
    }
  }
  throw new Error('unknown puzzle ' + type);
}

export function pressFuse(grid, n, i) {
  const x = i % n, y = Math.floor(i / n);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < n && ny < n) grid[ny * n + nx] = !grid[ny * n + nx];
  }
}
// Player presses a fuse: update grid, and track the remaining solution set (presses are XOR).
export function fusePress(p, i) {
  pressFuse(p.grid, p.n, i); p.moves++;
  const at = p.sol.indexOf(i);
  if (at >= 0) p.sol.splice(at, 1); else p.sol.push(i);
  return p.grid.every(Boolean);
}
export const fuseHint = p => p.sol[0];

export function chimeInput(p, note) {
  if (p.seq[p.pos] !== note) { p.pos = 0; return 'wrong'; }
  p.pos++;
  return p.pos >= p.seq.length ? 'done' : 'ok';
}
export const valveTotal = p => p.weights.reduce((s, w, i) => s + w * p.set[i], 0);
export const valvesSolved = p => valveTotal(p) === p.target;

export function caesar(word, shift) {
  return word.split('').map(ch => /[A-Z]/.test(ch) ? String.fromCharCode((ch.charCodeAt(0) - 65 + shift + 26) % 26 + 65) : ch).join('');
}
