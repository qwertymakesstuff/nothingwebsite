// Effect resolution: turns a placed grid into earnings. Pure: it takes the grid, cloned symbol
// instances, the run's relics and an RNG, and returns what happened. It never touches the save,
// the DOM or the player's money — state.js applies the result.
//
// Order (also shown in the in-game help):
//   setup → earn (symbols, then relics, then the deadline's notice) → boost → value is settled →
//   after → spin-level relic payouts → spin multiplier.
// Within a phase symbols act by `priority[phase]` (lower first), then reading order.
// A symbol's hook runs at most once per phase per spin (the `fired` set), destroyed symbols skip
// every later phase, and disabled symbols skip every later phase and earn 0.
//
// A cell's value is (base + flat bonuses) × multipliers, rounded down. Multipliers only apply to a
// positive value, so a penalty can never be "doubled" into a bigger loss.

import { GRID_COLS, GRID_ROWS, GRID_SIZE } from './config.js';
import { SYMBOL_BY_ID, PHASES } from './symbols.js';
import { RELIC_BY_ID } from './relics.js';
import { noticeFor } from './rent.js';
import { randomSymbolOfRarity } from './generate.js';

export function resolveSpin({ grid, instances, relics = [], deadline = 0, rng, leftOver = 0, spinMult = 1, multReasons = [] }) {
  const relicDefs = relics.map(id => RELIC_BY_ID[id]).filter(Boolean);
  const relicSet = new Set(relics);
  const notice = noticeFor(deadline);
  const log = [];
  const payouts = [];
  const out = { destroyed: [], transforms: [], added: [], extraSpins: 0, rentUp: 0, rerolls: 0 };
  let phase = 'setup';

  const cells = grid.map((uid, i) => {
    const cell = { i, row: Math.floor(i / GRID_COLS), col: i % GRID_COLS, uid: null, id: null, def: null, inst: null, add: 0, mult: 1, parts: [], notes: [], destroyed: false, disabled: false, value: 0, settled: false };
    if (uid === 'landlord') {
      cell.id = 'landlord'; cell.def = SYMBOL_BY_ID.landlord; cell.uid = 'landlord'; cell.inst = { uid: 'landlord', id: 'landlord', bonus: 0, data: {} };
    } else if (uid != null && instances.has(uid)) {
      const inst = instances.get(uid);
      cell.uid = uid; cell.inst = inst; cell.id = inst.id; cell.def = SYMBOL_BY_ID[inst.id];
      if (!cell.def) { cell.uid = null; cell.inst = null; cell.id = null; }
    }
    if (cell.def) cell.base = cell.def.base + (cell.inst.bonus || 0);
    return cell;
  });
  const filled = c => c && c.def && !c.destroyed;
  const at = (r, c) => (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS ? cells[r * GRID_COLS + c] : null);
  const name = c => (c ? c.def.name : null);
  const entry = (kind, src, target, text, amount) => log.push({ kind, phase, src: src ? src.i : null, srcName: src ? name(src) : null, target: target ? target.i : null, targetName: target ? name(target) : null, text, amount });

  const valueOf = c => {
    if (!filled(c) || c.disabled) return 0;
    if (c.settled) return c.value;
    const pre = c.base + c.add;
    return pre > 0 ? Math.floor(pre * c.mult) : pre;
  };

  const ctx = {
    phase: () => phase,
    deadline,
    cells,
    rng,
    random: () => rng.next(),
    chance: p => rng.next() < p,
    pick: arr => arr[Math.floor(rng.next() * arr.length)],
    relic: id => relicSet.has(id),
    is: (c, tag) => !!c?.def?.tags.includes(tag),
    all: () => cells.filter(filled),
    adj(c) {
      const res = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const n = at(c.row + dr, c.col + dc);
        if (filled(n)) res.push(n);
      }
      return res;
    },
    row: c => cells.filter(x => filled(x) && x !== c && x.row === c.row),
    below: c => { const n = at(c.row + 1, c.col); return filled(n) ? n : null; },
    above: c => { const n = at(c.row - 1, c.col); return filled(n) ? n : null; },
    empties: () => cells.filter(c => !c.def).length,
    leftOver: () => leftOver,
    valueOf,
    randomSymbol: (rarity, exclude = []) => randomSymbolOfRarity(rng, rarity, exclude),

    bonus(target, n, src, why) {
      if (!filled(target) || target.disabled || !n || target.settled) return;
      target.add += n;
      target.parts.push({ type: 'add', amount: n, src: src ? src.i : null, srcName: src ? name(src) : 'Relic', why });
      entry('bonus', src, target, why, n);
    },
    mult(target, f, src, why) {
      if (!filled(target) || target.disabled || target.settled) return;
      if (src && ctx.is(src, 'charm') && relicSet.has('horseshoe')) f += RELIC_BY_ID.horseshoe.charmBonus;
      target.mult *= f;
      target.parts.push({ type: 'mult', amount: f, src: src ? src.i : null, srcName: src ? name(src) : 'Relic', why });
      entry('mult', src, target, why, `×${f}`);
    },
    disable(target, src, why) {
      if (!filled(target) || target.disabled) return;
      target.disabled = true;
      target.parts.push({ type: 'off', src: src ? src.i : null, srcName: src ? name(src) : null, why });
      entry('disable', src, target, why);
    },
    destroy(target, src, why) {
      if (!filled(target)) return false;
      if (target.inst.laminated && src !== target) { target.notes.push('laminated: shrugged it off'); entry('shield', src, target, `${name(target)} is laminated`); return false; }
      target.destroyed = true;
      if (!target.settled) target.value = 0;
      target.notes.push(why);
      if (target.uid !== 'landlord') out.destroyed.push(target.uid);
      entry('destroy', src, target, why);
      target.def.onDestroy?.(ctx, target);
      for (const r of relicDefs) r.destroyed?.(ctx, target);
      return true;
    },
    transform(target, id, src, why) {
      const def = SYMBOL_BY_ID[id];
      if (!filled(target) || !def || target.uid === 'landlord') return;
      const from = target.def.name, fromId = target.id;
      target.id = id; target.def = def; target.inst.id = id; target.inst.data = {};
      if (!target.settled) target.base = def.base + (target.inst.bonus || 0);
      target.notes.push(why);
      out.transforms.push({ uid: target.uid, from: fromId, to: id });
      entry('transform', src, target, `${from}: ${why}`);
    },
    add(id, src, why) {
      if (!SYMBOL_BY_ID[id] || SYMBOL_BY_ID[id].board) return;
      out.added.push(id);
      if (src) src.notes.push(why);
      entry('add', src, null, why);
    },
    payout(n, src, why) {
      if (!n) return;
      payouts.push({ amount: n, src: src ? src.i : null, srcName: src ? name(src) : 'Relic', why });
      if (src) src.notes.push(why);
      entry('payout', src, null, why, n);
    },
    note(src, why) { if (src) src.notes.push(why); },
    extraSpin(src, why) { out.extraSpins += 1; ctx.note(src, why); entry('extra', src, null, why); },
    rentUp(n, src, why) { out.rentUp += n; ctx.note(src, why); entry('rent', src, null, why, -n); },
    gainReroll(n, src, why) { out.rerolls += n; ctx.note(src, why); entry('reroll', src, null, why); },
  };

  const fired = new Set();
  const runPhase = p => {
    phase = p;
    const order = cells.filter(c => c.def).sort((a, b) => ((a.def.priority?.[p] ?? 0) - (b.def.priority?.[p] ?? 0)) || a.i - b.i);
    for (const c of order) {
      if (c.destroyed || c.disabled) continue;
      const key = `${p}:${c.uid}:${c.i}`;
      if (fired.has(key)) continue;
      fired.add(key);
      c.def[p]?.(ctx, c);
    }
    if (p === 'earn') {
      for (const c of cells) if (filled(c) && !c.disabled) {
        for (const r of relicDefs) r.earn?.(ctx, c);
        notice?.earn?.(ctx, c);
      }
    }
  };

  for (const p of PHASES) {
    if (p === 'after') {
      for (const c of cells) if (c.def) { c.value = c.destroyed ? 0 : valueOf(c); c.settled = true; }
    }
    runPhase(p);
  }
  phase = 'spin';
  for (const r of relicDefs) r.spin?.(ctx);

  const symbolTotal = cells.reduce((s, c) => s + (c.settled ? c.value : 0), 0);
  const payoutTotal = payouts.reduce((s, p) => s + p.amount, 0);
  const subtotal = symbolTotal + payoutTotal;
  const total = subtotal > 0 && spinMult !== 1 ? Math.floor(subtotal * spinMult) : subtotal;

  return {
    cells: cells.map(c => ({
      i: c.i, row: c.row, col: c.col, uid: c.uid, id: c.id, base: c.def ? c.base : 0, value: c.def ? c.value : 0,
      parts: c.parts, notes: c.notes, destroyed: c.destroyed, disabled: c.disabled,
    })),
    log, payouts, symbolTotal, payoutTotal, subtotal, spinMult, multReasons, total,
    ...out,
  };
}

// Plain-language breakdown of one cell for tooltips and the receipt: "1 base, +6 caught a Mouse, ×2 Coffee".
export function explainCell(cell) {
  if (!cell || !cell.id) return 'Empty slot.';
  const def = SYMBOL_BY_ID[cell.id];
  const bits = [`${cell.base} base`];
  for (const p of cell.parts) {
    if (p.type === 'add') bits.push(`${p.amount > 0 ? '+' : '−'}${Math.abs(p.amount)} ${p.why}${p.srcName && p.srcName !== def.name ? ` (${p.srcName})` : ''}`);
    else if (p.type === 'mult') bits.push(`×${p.amount} ${p.why}${p.srcName ? ` (${p.srcName})` : ''}`);
    else if (p.type === 'off') bits.push(`disabled: ${p.why}`);
  }
  if (cell.destroyed) bits.push('destroyed');
  return `${def.name}: ${bits.join(', ')} = ${cell.value}`;
}

export const GRID = { cols: GRID_COLS, rows: GRID_ROWS, size: GRID_SIZE };
