// Breadth-first search for the shortest solution of a Block Roll level. Used for the hint button and the tests.
export function parseLevel(rows) {
  const tiles = new Map(); let start = null, goal = null;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    tiles.set(`${x},${y}`, ch);
    if (ch === 'S') start = [x, y];
    if (ch === 'G') goal = [x, y];
  }));
  return { tiles, start, goal, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

export const cellsOf = (x, y, o) => (o === 'U' ? [[x, y]] : o === 'H' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]);

export function roll(x, y, o, dir) {
  if (o === 'U') return { L: [x - 2, y, 'H'], R: [x + 1, y, 'H'], U: [x, y - 2, 'V'], D: [x, y + 1, 'V'] }[dir];
  if (o === 'H') return { L: [x - 1, y, 'U'], R: [x + 2, y, 'U'], U: [x, y - 1, 'H'], D: [x, y + 1, 'H'] }[dir];
  return { L: [x - 1, y, 'V'], R: [x + 1, y, 'V'], U: [x, y - 1, 'U'], D: [x, y + 2, 'U'] }[dir];
}

const isFloor = (lvl, c, bridge) => { const t = lvl.tiles.get(`${c[0]},${c[1]}`); return t !== undefined && (t !== 'b' || bridge); };

/** Result of rolling: { ok, x, y, o, bridge, won } or { ok: false } when the block would fall. */
export function step(lvl, st, dir) {
  const [nx, ny, no] = roll(st.x, st.y, st.o, dir);
  const cells = cellsOf(nx, ny, no);
  if (!cells.every((c) => isFloor(lvl, c, st.bridge))) return { ok: false, x: nx, y: ny, o: no };
  if (no === 'U' && lvl.tiles.get(`${nx},${ny}`) === 'f') return { ok: false, x: nx, y: ny, o: no, broke: true };
  let bridge = st.bridge;
  if (cells.some((c) => lvl.tiles.get(`${c[0]},${c[1]}`) === 'x')) bridge = !bridge;
  if (!cells.every((c) => isFloor(lvl, c, bridge))) return { ok: false, x: nx, y: ny, o: no };
  return { ok: true, x: nx, y: ny, o: no, bridge, won: no === 'U' && nx === lvl.goal[0] && ny === lvl.goal[1] };
}

export function solve(lvl, from = null) {
  const start = from || { x: lvl.start[0], y: lvl.start[1], o: 'U', bridge: false };
  const key = (s) => `${s.x},${s.y},${s.o},${s.bridge ? 1 : 0}`;
  const seen = new Map([[key(start), null]]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const dir of ['L', 'R', 'U', 'D']) {
      const r = step(lvl, cur, dir);
      if (!r.ok) continue;
      const k = key(r);
      if (seen.has(k)) continue;
      seen.set(k, { prev: cur, dir });
      if (r.won) {
        const path = []; let c = r;
        while (seen.get(key(c))) { const e = seen.get(key(c)); path.push(e.dir); c = e.prev; }
        return path.reverse().join('');
      }
      queue.push(r);
    }
  }
  return null;
}
