// The slot machine: an apartment block whose twenty windows are the grid. Renders a settled spin,
// and plays a spin back step by step: symbols fall into the windows column by column, then
// setup effects (eaten, destroyed, transformed, disabled), then each window's earnings in reading
// order, then payouts and the total.

import { h, bindTip, wait, money } from './dom.js';
import { icon, cellTip } from './cards.js';
import { GRID_SIZE } from '../config.js';
import { SYMBOL_BY_ID, DRAFTABLE } from '../symbols.js';
import { SPEEDS } from '../settings.js';

export function createMachine() {
  const cells = [];
  let data = new Array(GRID_SIZE).fill(null);
  let explanations = true;
  const grid = h('div.grid', { role: 'grid', 'aria-label': 'Slot machine windows' });
  const layer = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });

  for (let i = 0; i < GRID_SIZE; i++) {
    const c = h('button.cell.dark', { type: 'button', 'aria-label': `Window ${i + 1}: empty` });
    c.addEventListener('mouseenter', () => highlight(i, true));
    c.addEventListener('mouseleave', () => highlight(i, false));
    c.addEventListener('focus', () => highlight(i, true));
    c.addEventListener('blur', () => highlight(i, false));
    bindTip(c, () => cellTip(data[i], explanations));
    cells.push(c);
    grid.append(c);
  }

  const sign = h('div.sign.flicker', 'RENTFALL');
  const el = h('div.building',
    h('div.roof', h('div.antenna'), sign, h('div.tank'), h('div.cornice')),
    h('div.facade', grid, layer),
  );

  // Hovering a window outlines the windows that affected it (teal) and those it affected (amber).
  function highlight(i, on) {
    for (const c of cells) c.classList.remove('src-hl', 'tgt-hl');
    if (!on || !data[i]?.id || !last) return;
    const srcs = new Set((data[i].parts || []).map(p => p.src).filter(s => s != null && s !== i));
    for (const e of last.log || []) if (e.target === i && e.src != null && e.src !== i) srcs.add(e.src);
    const tgts = new Set((last.log || []).filter(e => e.src === i && e.target != null && e.target !== i).map(e => e.target));
    for (const s of srcs) cells[s]?.classList.add('src-hl');
    for (const t of tgts) cells[t]?.classList.add('tgt-hl');
  }

  function paint(i, cell, { showValue = true, id = cell?.id } = {}) {
    const c = cells[i];
    data[i] = cell;
    c.className = 'cell';
    c.replaceChildren();
    if (!id) { c.classList.add('dark'); c.setAttribute('aria-label', `Window ${i + 1}: empty`); return; }
    const d = SYMBOL_BY_ID[id];
    c.classList.add('lit', `r-${d.rarity}`);
    if (id === 'landlord') c.classList.add('landlord');
    if (cell.destroyed) c.classList.add('destroyed');
    if (cell.disabled) c.classList.add('disabled');
    c.append(h('div.sym', icon(id)));
    if (showValue) c.append(valueBadge(cell.value));
    c.setAttribute('aria-label', `Window ${i + 1}: ${d.name}, earned ${cell.value}`);
  }
  const valueBadge = v => h('span.val', { class: v < 0 ? 'neg' : v === 0 ? 'zero' : v >= 20 ? 'big' : '' }, v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');

  let last = null;
  function show(result, opts = {}) {
    explanations = opts.explanations ?? explanations;
    last = result;
    if (!result) { for (let i = 0; i < GRID_SIZE; i++) paint(i, null); return; }
    result.cells.forEach((cell, i) => paint(i, cell));
  }

  function floater(i, text, cls = '') {
    const c = cells[i];
    if (!c) return;
    const f = h('div.floater', { class: cls }, text);
    f.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`;
    f.style.top = `${c.offsetTop + 8}px`;
    layer.append(f);
    setTimeout(() => f.remove(), 950);
  }

  // Initial symbol in each window before any transformation this spin.
  function initialIds(result) {
    const first = new Map();
    for (const t of result.transforms || []) if (!first.has(t.uid)) first.set(t.uid, t.from);
    return result.cells.map(c => (c.uid && first.has(c.uid) ? first.get(c.uid) : c.id));
  }

  async function animate(result, { speed = 'normal', audio, explanations: ex, onTotal, pool = [] } = {}) {
    explanations = ex ?? explanations;
    last = result;
    const k = SPEEDS[speed] || 1;
    const start = initialIds(result);
    const flavour = pool.length ? pool : DRAFTABLE.map(s => s.id);
    audio?.play('lever');

    // 1. Symbols fall into the windows, column by column.
    const spins = [];
    let ticking = true;
    (async () => { while (ticking) { audio?.play('tick'); await wait(70); } })();
    for (let i = 0; i < GRID_SIZE; i++) {
      const c = cells[i];
      data[i] = null;
      c.className = 'cell spinning';
      const n = 6 + (i % 5) * 2;
      const strip = [start[i], ...Array.from({ length: n }, () => flavour[Math.floor(Math.random() * flavour.length)])];
      const reel = h('div.reel', strip.map(id => h('div', id ? icon(id) : null)));
      c.replaceChildren(reel);
      const H = c.clientHeight;
      const dur = (420 + (i % 5) * 120 + Math.floor(i / 5) * 25) * k;
      const anim = reel.animate([{ transform: `translateY(${-n * H}px)` }, { transform: 'translateY(0)' }], { duration: dur, easing: 'cubic-bezier(.2,.75,.25,1.05)', fill: 'forwards' });
      spins.push(anim.finished.then(() => {
        const cell = result.cells[i];
        paint(i, { ...cell, destroyed: false, disabled: false, value: 0 }, { showValue: false, id: start[i] });
        if ((i % 5) === 4 || i === GRID_SIZE - 1) audio?.play('stop');
      }));
    }
    await Promise.all(spins);
    ticking = false;
    await wait(140 * k);

    // 2. Setup effects: eating, destroying, transforming, disabling.
    const setup = (result.log || []).filter(e => e.phase === 'setup' && e.target != null && ['destroy', 'transform', 'disable', 'shield'].includes(e.kind)).slice(0, 24);
    for (const e of setup) {
      const cell = result.cells[e.target];
      if (e.src != null) cells[e.src]?.classList.add('src-hl');
      cells[e.target]?.classList.add('tgt-hl');
      if (e.kind === 'transform') paint(e.target, { ...cell, value: 0 }, { showValue: false, id: cell.id });
      else if (cell.destroyed && !cells[e.target].classList.contains('destroyed')) { cells[e.target].classList.add('destroyed'); audio?.play('destroy'); }
      else if (cell.disabled) cells[e.target].classList.add('disabled');
      floater(e.target, short(e.text), 'small');
      await wait(260 * k);
      for (const c of cells) c.classList.remove('src-hl', 'tgt-hl');
    }

    // 3. Earnings, window by window.
    let running = 0, step = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      const cell = result.cells[i];
      if (!cell.id) continue;
      paint(i, cell);
      if (cell.value !== 0) {
        running += cell.value;
        cells[i].classList.add('pulse');
        floater(i, cell.value > 0 ? `+${cell.value}` : `−${-cell.value}`, cell.value < 0 ? 'neg' : '');
        audio?.play(cell.value > 0 ? 'coin' : 'loss', step++);
        onTotal?.(running);
        await wait(Math.max(45, 110 - step * 4) * k);
      }
    }

    // 4. Payouts from effects and relics.
    for (const p of result.payouts || []) {
      running += p.amount;
      floater(p.src ?? 12, `+${money(p.amount)}`);
      audio?.play('coin', step++);
      onTotal?.(running);
      await wait(150 * k);
    }
    if (result.spinMult !== 1 && result.total > 0) { onTotal?.(result.total, result.multReasons.join(' · ')); await wait(220 * k); }
    onTotal?.(result.total);
    audio?.play(result.total >= 60 ? 'big' : result.total > 0 ? 'total' : 'loss');
    await wait(260 * k);
  }

  return { el, show, animate, sign };
}

function short(text) {
  const s = String(text || '');
  return s.length > 22 ? `${s.slice(0, 21)}…` : s;
}
