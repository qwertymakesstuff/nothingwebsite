// Shortest-solution search for Slide Out (used by the tests). State = each car's position along its own axis.
export const N = 6;

export function solvePuzzle(cars) {
  const start = cars.map((c) => (c[3] === 'h' ? c[0] : c[1]));
  const seen = new Map([[start.join(), 0]]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const s = queue[qi], d = seen.get(s.join());
    if (s[0] === N - cars[0][2]) return d;
    const occ = new Map();
    cars.forEach(([x, y, l, o], i) => { for (let k = 0; k < l; k++) occ.set(o === 'h' ? `${s[i] + k},${y}` : `${x},${s[i] + k}`, i); });
    cars.forEach(([x, y, l, o], i) => {
      for (const dir of [-1, 1]) {
        let p = s[i];
        for (;;) {
          p += dir;
          if (p < 0 || p + l > N) break;
          const cell = dir < 0 ? p : p + l - 1;
          const key = o === 'h' ? `${cell},${y}` : `${x},${cell}`;
          if (occ.has(key) && occ.get(key) !== i) break;
          const ns = [...s]; ns[i] = p;
          if (!seen.has(ns.join())) { seen.set(ns.join(), d + 1); queue.push(ns); }
        }
      }
    });
  }
  return null;
}
