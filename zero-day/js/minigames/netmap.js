// NETWORK MAPPING — route from the entry node to the target node across a grid, stepping only
// on adjacent nodes. Some nodes are monitored (traps). Your Net Analyzer pre-reveals a few;
// others light up as a warning when you're next to them. Step on a live trap and detection
// spikes and your route resets. Reach the goal to breach.
import { frame, h, button, clear } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx } = ctx;
    const { size, entry, goal } = cfg;
    const traps = new Set(cfg.traps);
    const known = new Set(cfg.revealed);     // traps the player can see from the start
    const suspected = new Set();             // traps revealed by proximity
    let path = [entry];
    let hits = 0;

    const { body, footer } = frame(host, {
      title: 'Network Map', tag: 'NETMAP',
      how: 'Click an adjacent node to extend your route from START to TARGET. Red = known monitor. Amber = monitor sensed nearby. Tripping a monitor resets your route and raises detection.',
    });
    const status = h('p', { class: 'mg-status' });
    const grid = h('div', { class: 'net-grid', style: { '--n': String(size) } });
    body.append(status, grid);

    const rc = i => [Math.floor(i / size), i % size];
    function adjacent(a, b) {
      const [r1, c1] = rc(a), [r2, c2] = rc(b);
      return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }
    function neighborsOf(i) {
      const [r, c] = rc(i); const out = [];
      if (r > 0) out.push(i - size); if (r < size - 1) out.push(i + size);
      if (c > 0) out.push(i - 1); if (c < size - 1) out.push(i + 1);
      return out;
    }
    function senseFromTail() {
      const tail = path[path.length - 1];
      for (const n of neighborsOf(tail)) if (traps.has(n)) suspected.add(n);
    }

    function draw() {
      status.textContent = `Route length: ${path.length}  ·  Monitors tripped: ${hits}`;
      clear(grid);
      const tail = path[path.length - 1];
      for (let i = 0; i < size * size; i++) {
        const inPath = path.includes(i);
        const isTrapVisible = traps.has(i) && (known.has(i) || suspected.has(i));
        let cls = 'net-node';
        if (i === entry) cls += ' entry';
        if (i === goal) cls += ' goal';
        if (inPath) cls += ' on';
        if (isTrapVisible) cls += known.has(i) ? ' trap-known' : ' trap-sensed';
        const reachable = !inPath && adjacent(tail, i);
        if (reachable) cls += ' reachable';
        const label = i === entry ? 'IN' : i === goal ? 'TGT' : (isTrapVisible ? '◎' : (inPath ? '●' : ''));
        grid.append(h('button', {
          class: cls, type: 'button', disabled: !reachable && !inPath,
          onclick: () => step(i),
        }, label));
      }
    }

    function step(i) {
      const tail = path[path.length - 1];
      if (path.includes(i)) {
        // allow backtracking by clicking the previous node
        if (i === path[path.length - 2]) { path.pop(); draw(); sfx.tap(); }
        return;
      }
      if (!adjacent(tail, i)) return;
      if (traps.has(i)) {
        hits++;
        known.add(i);
        detect.add(10, 'routed through a monitored node');
        sfx.alarm();
        path = [entry];
        suspected.clear();
        senseFromTail();
        draw();
        if (hits >= 3) resolve({ success: false, note: 'Route burned — too many monitors tripped.' });
        return;
      }
      path.push(i);
      sfx.tap();
      senseFromTail();
      if (i === goal) {
        sfx.success();
        resolve({ success: true, note: `Breached in ${path.length} hops, ${hits} trip(s).` });
        return;
      }
      draw();
    }

    footer.append(button('Reset route', 'ghost', () => { path = [entry]; suspected.clear(); senseFromTail(); draw(); }));
    senseFromTail();
    draw();
  });
}
