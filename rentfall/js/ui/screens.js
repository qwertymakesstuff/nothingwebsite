// Full-page screens: the title, victory and eviction.

import { h, money } from './dom.js';
import { icon } from './cards.js';
import { DEADLINES } from '../rent.js';
import { GRID_SIZE } from '../config.js';
import { SYMBOL_BY_ID } from '../symbols.js';

// A little lit-up apartment block for the title screen, made from real symbol icons.
function miniBuilding() {
  const ids = ['coin', 'cat', null, 'flower', 'coffee', null, 'worker', 'golden_ticket', 'bee', null, 'mouse', null, 'piggy_bank', 'neon_sign', 'cheese', 'pigeon', null, 'safe', 'key', null];
  return h('div.mini-building',
    h('div.building', { style: { '--cell': '64px' } },
      h('div.roof', h('div.antenna'), h('div.sign.flicker', 'RENTFALL'), h('div.tank'), h('div.cornice')),
      h('div.facade', h('div.grid', { style: { gridTemplateColumns: 'repeat(5, 64px)', gridAutoRows: '64px', gap: '10px 12px' } },
        ids.slice(0, GRID_SIZE).map(id => h('div.cell', { class: id ? `lit r-${SYMBOL_BY_ID[id].rarity}` : 'dark' }, id ? h('div.sym', { style: { inset: '7px' } }, icon(id)) : null)))),
    ),
  );
}

export function titleScreen({ hasSave, saveInfo, profile, on }) {
  const best = profile.best;
  return h('main.title-screen',
    h('div.title-card',
      h('div',
        h('h1.logo', 'Rentfall'),
        h('p.tagline', 'The building\'s windows are a slot machine, the rent is due, and the Landlord is watching. Collect odd little symbols, chain their synergies and survive twelve rent deadlines.'),
        h('div.title-menu',
          hasSave ? h('button.btn.primary', { type: 'button', onclick: on.continue, autofocus: true }, icon('house'), h('span', 'Continue', h('br'), h('small', { style: { fontWeight: 500 } }, saveInfo))) : null,
          h('button.btn', { type: 'button', class: hasSave ? '' : 'primary', onclick: on.newRun }, icon('package'), 'New run'),
          h('button.btn', { type: 'button', onclick: on.help }, icon('manual'), 'How to play'),
          h('button.btn', { type: 'button', onclick: on.almanac }, icon('clover'), 'Symbol almanac'),
          h('button.btn', { type: 'button', onclick: on.history }, icon('interest'), 'Run history'),
          h('button.btn', { type: 'button', onclick: on.settings }, icon('fuse'), 'Settings'),
        ),
        h('div.records',
          h('div', h('b', profile.wins), 'leases won'),
          h('div', h('b', profile.losses), 'evictions'),
          h('div', h('b', best ? (best.won ? 'Won!' : `${best.reached + 1}/${DEADLINES.length}`) : '—'), 'best run'),
        ),
        h('p.disclaimer', 'A single-player game with fictional currency. No real money, no purchases, no cash-out.'),
      ),
      miniBuilding(),
    ),
  );
}

function ledgerMini(run) {
  return h('div.ledger-mini', DEADLINES.map((d, i) => {
    const e = run.ledger.find(x => x.deadline === i);
    return h('i', { class: e ? (e.paid ? 'paid' : 'failed') : '', title: `${i + 1}. ${d.title}` }, i + 1);
  }));
}

function statsRow(run) {
  return h('div.stats-row',
    h('div.stat', h('b', money(run.totalEarned)), h('span', 'Total earned')),
    h('div.stat', h('b', run.stats.spins), h('span', 'Spins')),
    h('div.stat', h('b', money(run.stats.bestSpin)), h('span', 'Best spin')),
    h('div.stat', h('b', run.collection.length), h('span', 'Symbols at the end')),
    h('div.stat', h('b', run.relics.length), h('span', 'Relics')),
    h('div.stat', h('b', run.stats.destroyed), h('span', 'Symbols destroyed')),
  );
}

export function endScreen(run, on) {
  const won = run.phase === 'won';
  const r = run.result || {};
  return h('main.end-screen',
    h('div.end-card', { class: won ? 'win' : 'lose' },
      icon(won ? 'lease' : 'landlord', 'hero'),
      h('h1', won ? 'The lease is yours' : 'Evicted'),
      h('p.lead', won
        ? `You paid all ${DEADLINES.length} rents. The Landlord tips his hat, grudgingly, and hands over the keys.`
        : `Rent ${r.deadline + 1} (${DEADLINES[r.deadline]?.title}) was ${money(r.rent || 0)} and you were ${money(r.short || 0)} short. Your boxes are on the pavement in the rain.`),
      ledgerMini(run),
      h('p', { style: { color: 'var(--muted)', margin: 0 } }, `Seed ${run.seed}`),
      statsRow(run),
      h('div.actions',
        h('button.btn.primary', { type: 'button', autofocus: true, onclick: on.newRun }, 'New run'),
        h('button.btn', { type: 'button', onclick: on.retry }, 'Retry this seed'),
        h('button.btn', { type: 'button', onclick: on.collection }, 'Final collection'),
        h('button.btn.ghost', { type: 'button', onclick: on.menu }, 'Main menu'),
      ),
    ),
  );
}

export function confetti(n = 80) {
  const colors = ['#f6c548', '#ff6f7d', '#4fb3a9', '#9b6fe0', '#f3ead8'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    c.style.animationDelay = `${Math.random() * 1.2}s`;
    document.body.append(c);
    setTimeout(() => c.remove(), 4800);
  }
}
