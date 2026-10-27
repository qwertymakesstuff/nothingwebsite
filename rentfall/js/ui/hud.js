// Everything around the machine: the top bar (money, rent countdown), the rent calendar, relics,
// supplies and the receipt that explains the last spin.

import { h, bindTip, money } from './dom.js';
import { icon, relicTip, itemTip, rarityBadge } from './cards.js';
import { DEADLINES, NOTICES, rentDue } from '../rent.js';
import { SYMBOL_BY_ID } from '../symbols.js';
import { RELIC_BY_ID, ITEM_BY_ID } from '../relics.js';
import { MAX_ITEMS } from '../config.js';
import { canUseItem } from '../state.js';

export function topbar(run, { onMenu, onCollection, onHelp, onHistory, onSettings }) {
  const due = rentDue(run);
  const ended = ['won', 'lost'].includes(run.phase);
  const d = DEADLINES[run.deadline];
  const pct = Math.min(100, Math.round((run.money / Math.max(1, due)) * 100));
  const spinsText = run.phase === 'shop' ? `${run.spinsLeft} spins next` : run.spinsLeft === 0 ? 'due now' : `${run.spinsLeft} spin${run.spinsLeft === 1 ? '' : 's'} left`;
  return h('header.topbar',
    h('button.brand', { type: 'button', onclick: onMenu, title: 'Main menu' }, 'Rentfall'),
    h('div.money#money', icon('coin'), h('div', h('div.label', 'Savings'), h('div.val#money-val', money(run.money)))),
    ended ? h('div.rent-card') : h('div.rent-card',
      icon('house'),
      h('div.meta',
        h('div.line1', h('span', `Rent ${run.deadline + 1}/${DEADLINES.length}: ${d.title}`), h('span.due', money(due))),
        h('div.progress', { class: pct >= 100 ? 'ok' : '' }, h('i', { style: { width: `${pct}%` } })),
        h('div.line2', h('span', pct >= 100 ? 'Covered — keep earning for the shop' : `${money(Math.max(0, due - run.money))} to go`), h('span', spinsText)),
      ),
    ),
    h('div.tools',
      h('button.icon-btn', { type: 'button', onclick: onCollection, title: 'Your symbols (C)' }, 'Collection', h('span.count', run.collection.length)),
      h('button.icon-btn', { type: 'button', onclick: onHistory, title: 'Run history' }, 'History'),
      h('button.icon-btn', { type: 'button', onclick: onHelp, title: 'How to play (H)' }, 'Help'),
      h('button.icon-btn', { type: 'button', onclick: onSettings, title: 'Settings' }, 'Settings'),
    ),
  );
}

export function calendar(run) {
  const items = DEADLINES.map((d, i) => {
    const entry = run.ledger.find(e => e.deadline === i);
    const cls = entry ? (entry.paid ? 'paid' : 'failed') : i === run.deadline ? 'current' : '';
    const notice = NOTICES[d.notice];
    return h('li', { class: `${cls}${d.final ? ' final' : ''}` },
      h('span.n', i + 1),
      h('span', d.title, notice ? h('span.notice', { class: notice.good ? '' : 'bad', title: notice.desc }, `${notice.good ? '★' : '!'} ${notice.name}`) : null),
      h('span', entry?.paid ? '✓' : `${money(i === run.deadline && !entry ? rentDue(run) : d.rent)} · ${d.spins}↻`),
    );
  });
  const cur = NOTICES[DEADLINES[run.deadline]?.notice];
  return h('section.panel',
    h('h2', 'Rent calendar', h('small', `${run.ledger.filter(e => e.paid).length} paid`)),
    cur ? h('p', { style: { margin: '0 0 8px', fontSize: '.85em', color: 'var(--amber)' } }, `This deadline — ${cur.name}: ${cur.desc}`) : null,
    h('ol.calendar', items),
  );
}

export function relicsPanel(run) {
  return h('section.panel',
    h('h2', 'Relics', h('small', `${run.relics.length}`)),
    run.relics.length
      ? h('div.chips', run.relics.map(id => bindTip(h('div.chip', { tabindex: 0, 'aria-label': RELIC_BY_ID[id].name }, icon(RELIC_BY_ID[id].icon)), () => relicTip(id))))
      : h('div.chips', h('span.none', 'None yet. Relics are sold in the shop after each rent.')),
  );
}

export function suppliesPanel(run, onUse) {
  const chips = [];
  for (let k = 0; k < MAX_ITEMS; k++) {
    const id = run.items[k];
    if (!id) { chips.push(h('div.chip.empty-slot', { title: 'Empty supply slot' })); continue; }
    const usable = !canUseItem(run, k);
    chips.push(bindTip(h('button.chip', { type: 'button', class: usable ? 'usable' : '', 'aria-label': `Use ${ITEM_BY_ID[id].name}`, onclick: () => onUse(k) }, icon(ITEM_BY_ID[id].icon)), () => itemTip(id, usable)));
  }
  return h('section.panel',
    h('h2', 'Supplies', h('small', 'click to use')),
    h('div.chips', chips),
    h('div.rerolls', `Free rerolls: ${run.rerolls}`, run.doubleNext ? ' · next spin ×2' : '', run.rentDiscount ? ' · rent −15%' : ''),
  );
}

export function receipt(run, explanations) {
  const last = run.last;
  const body = [];
  body.push(h('h2', 'RECEIPT'));
  body.push(h('div.sub', last ? `Spin ${run.stats.spins} · deadline ${run.deadline + 1}` : 'No spins yet'));
  body.push(h('hr'));
  if (!last) {
    body.push(h('div.empty', 'Pull the lever to fill the windows. Every symbol earns its base value plus whatever its neighbours add.'));
    return h('section.receipt', { 'aria-label': 'Last spin receipt' }, body);
  }
  const rows = last.cells.filter(c => c.id).sort((a, b) => a.i - b.i);
  for (const c of rows) {
    const d = SYMBOL_BY_ID[c.id];
    const bits = [];
    if (explanations) {
      for (const p of c.parts) {
        if (p.type === 'add') bits.push(`${p.amount > 0 ? '+' : '−'}${Math.abs(p.amount)} ${p.why}`);
        else if (p.type === 'mult') bits.push(`×${p.amount} ${p.why}`);
        else if (p.type === 'off') bits.push(p.why);
      }
      if (c.destroyed) bits.push('destroyed');
    }
    body.push(h('div.row', { title: d.desc },
      icon(c.id),
      h('span', d.name, bits.length ? h('span.why', bits.join(' · ')) : null),
      h('span.amt', { class: c.value < 0 ? 'neg' : '' }, c.value > 0 ? `+${c.value}` : c.value < 0 ? `−${-c.value}` : '0'),
    ));
  }
  if (last.payouts.length) {
    body.push(h('hr'));
    for (const p of last.payouts) body.push(h('div.row', h('span'), h('span', p.srcName, h('span.why', p.why)), h('span.amt', `+${p.amount}`)));
  }
  const events = [];
  for (const id of last.added || []) events.push(['coin', `New symbol: ${SYMBOL_BY_ID[id]?.name}`]);
  for (const t of last.transforms || []) events.push(['seed', `${SYMBOL_BY_ID[t.from]?.name} became ${SYMBOL_BY_ID[t.to]?.name}`]);
  if (last.extraSpins) events.push(['alarm_clock', `+${last.extraSpins} spin before rent`]);
  if (last.rentUp) events.push(['loan_shark', `Rent raised by ${money(last.rentUp)}`]);
  if (last.leftOver) events.push(['junk', `${last.leftOver} symbols didn't fit and sat this one out`]);
  if (events.length) {
    body.push(h('hr'));
    for (const [ic, text] of events) body.push(h('div.row.event', icon(ic), h('span', text)));
  }
  body.push(h('hr'));
  if (last.spinMult !== 1) body.push(h('div.row', h('span'), h('span', last.multReasons.join(' · ')), h('span.amt', `×${last.spinMult}`)));
  body.push(h('div.total', h('span', 'TOTAL'), h('span', money(last.total))));
  return h('section.receipt', { 'aria-label': 'Last spin receipt' }, body);
}

export { rarityBadge };
