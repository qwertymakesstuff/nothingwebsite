// Dialogs: a generic modal plus the delivery choice, rent day, collection and almanac, history,
// settings, help, symbol picker, new-run and confirmation dialogs.

import { h, $, money, bindTip, hideTip } from './dom.js';
import { icon, symbolCard, symbolTip, rarityBadge } from './cards.js';
import { SYMBOLS, SYMBOL_BY_ID, CATEGORY_LABELS } from '../symbols.js';
import { RELICS, ITEMS } from '../relics.js';
import { DEADLINES, NOTICES, rentDue } from '../rent.js';
import { groupCollection, countOf } from '../collection.js';
import { deliveryRerollCost, skipBonus } from '../state.js';
import { CURRENCY, RARITY_ORDER } from '../config.js';
import { SPEEDS } from '../settings.js';

let stack = [];

export function openModal({ title, lead, body, actions = [], cls = '', dismissible = true, onClose }) {
  hideTip();
  const close = () => {
    wrap.remove();
    stack = stack.filter(m => m !== entry);
    onClose?.();
  };
  const modal = h('div.modal', { class: cls, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    dismissible ? h('button.btn.ghost.small.close', { type: 'button', onclick: close, 'aria-label': 'Close' }, '✕') : null,
    title ? h('h1', title) : null,
    lead ? h('p.lead', lead) : null,
    body,
    actions.length ? h('div.actions', actions) : null,
  );
  const wrap = h('div.modal-wrap', { onclick: e => { if (dismissible && e.target === wrap) close(); } }, modal);
  const entry = { close, dismissible, modal };
  stack.push(entry);
  $('#modals').append(wrap);
  setTimeout(() => (modal.querySelector('[autofocus]') || modal.querySelector('.card, .btn.primary, button'))?.focus(), 30);
  return entry;
}
export const topModal = () => stack[stack.length - 1] || null;
export function closeAll() { for (const m of [...stack]) m.close(); }

export function confirmDialog({ title, text, yes = 'Yes', no = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    const m = openModal({
      title, lead: text,
      actions: [
        h('button.btn.ghost', { type: 'button', onclick: () => { answered = true; m.close(); resolve(false); } }, no),
        h('button.btn', { type: 'button', class: danger ? 'danger' : 'primary', autofocus: true, onclick: () => { answered = true; m.close(); resolve(true); } }, yes),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

// ── Delivery ────────────────────────────────────────────────────────────────
export function deliveryModal(run, { onPick, onSkip, onReroll }) {
  const cost = deliveryRerollCost(run);
  const bonus = skipBonus(run);
  const cards = run.delivery.options.map((id, k) => symbolCard(id, { key: k + 1, ownedCount: countOf(run, id), onClick: () => onPick(k) }));
  return openModal({
    title: 'The mail is here',
    lead: `Pick one symbol to add to your collection, or skip to keep it lean. ${run.spinsLeft > 0 ? `${run.spinsLeft} spin${run.spinsLeft === 1 ? '' : 's'} until rent.` : 'Rent is due after this.'}`,
    cls: 'delivery wide', dismissible: false,
    body: h('div.cards', cards),
    actions: [
      h('button.btn.ghost', { type: 'button', onclick: onReroll, disabled: run.money < cost, title: 'Reroll the offers (R)' }, icon('reroll'), cost === 0 ? `Reroll (free, ${run.rerolls} left)` : `Reroll ${money(cost)}`),
      h('span.spacer'),
      h('button.btn', { type: 'button', onclick: onSkip, title: 'Skip (S)' }, bonus ? `Skip (+${money(bonus)})` : 'Skip'),
    ],
  });
}

// ── Rent day ────────────────────────────────────────────────────────────────
export function rentModal(run, { onPay }) {
  const due = rentDue(run);
  const short = run.money < due;
  const d = DEADLINES[run.deadline];
  const sheet = h('div.rent-sheet',
    h('div.line', h('span', 'Deadline'), h('span', `${run.deadline + 1} of ${DEADLINES.length} — ${d.title}`)),
    h('div.line', h('span', 'Spins used'), h('span', run.spinInDeadline)),
    h('div.line', h('span', 'Earned this deadline'), h('span', money(run.earnedThisDeadline))),
    run.rentExtra ? h('div.line', h('span', 'Loan Shark interest'), h('span', `+${money(run.rentExtra)}`)) : null,
    run.rentDiscount ? h('div.line', h('span', 'Envelope for the Landlord'), h('span', '−15%')) : null,
    h('div.line', h('span', 'Savings'), h('span', money(run.money))),
    h('div.line.big', h('span', 'Rent due'), h('span', money(due))),
    h('div.line.big', h('span', short ? 'Short by' : 'Left after paying'), h('span', money(Math.abs(run.money - due)))),
    h('div', { style: { textAlign: 'center' } }, h('span.stamp', { class: short ? 'late' : 'paid' }, short ? 'OVERDUE' : 'READY')),
  );
  return openModal({
    title: d.final ? 'The Final Notice' : 'Rent day',
    lead: short ? 'You don\'t have enough. The Landlord is not a patient man.' : d.final ? 'Pay this and the lease is yours, rain or shine.' : 'Pay up and the corner shop opens.',
    cls: 'paper', dismissible: false, body: sheet,
    actions: [h('button.btn', { type: 'button', class: short ? 'danger' : 'primary', autofocus: true, onclick: onPay }, short ? 'Face the Landlord' : `Pay ${money(due)}`)],
  });
}

// ── Collection and almanac ──────────────────────────────────────────────────
export function collectionModal(run) {
  let tab = 'mine';
  const body = h('div');
  const draw = () => {
    body.replaceChildren(
      h('div.tabs',
        h('button', { type: 'button', class: tab === 'mine' ? 'on' : '', onclick: () => { tab = 'mine'; draw(); } }, `Your collection (${run ? run.collection.length : 0})`),
        h('button', { type: 'button', class: tab === 'all' ? 'on' : '', onclick: () => { tab = 'all'; draw(); } }, `Almanac (${SYMBOLS.length})`),
        h('button', { type: 'button', class: tab === 'relics' ? 'on' : '', onclick: () => { tab = 'relics'; draw(); } }, 'Relics & supplies'),
      ),
      tab === 'mine' ? mine() : tab === 'all' ? almanac() : relicList(),
    );
  };
  const mine = () => {
    if (!run) return h('p.lead', 'Start a run to build a collection.');
    const groups = groupCollection(run).sort((a, b) => RARITY_ORDER.indexOf(b.def.rarity) - RARITY_ORDER.indexOf(a.def.rarity) || a.def.name.localeCompare(b.def.name));
    return h('div',
      h('p.lead', `${run.collection.length} symbols. Up to 20 fit on the grid each spin; the rest wait their turn.`),
      h('div.coll-list', groups.map(g => {
        const polished = g.items.filter(i => i.bonus).length, lam = g.items.filter(i => i.laminated).length;
        const counters = g.items.map(i => i.data.stored ? `¤${i.data.stored} inside` : i.data.count ? `count ${i.data.count}` : null).filter(Boolean);
        return h('div.coll-item',
          h('div.art', icon(g.id), h('span.n', `×${g.items.length}`)),
          h('div', h('h3', g.def.name, rarityBadge(g.def.rarity), h('span.tag', `base ${g.def.base}`)), h('p', g.def.desc),
            h('div.trig', `Trigger: ${g.def.trigger}`),
            polished || lam || counters.length ? h('div.upg', [polished ? `${polished} polished` : null, lam ? `${lam} laminated` : null, ...counters.slice(0, 3)].filter(Boolean).join(' · ')) : null),
        );
      })),
    );
  };
  const almanac = () => h('div', Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
    const list = SYMBOLS.filter(s => s.category === cat);
    if (!list.length) return null;
    return h('div', h('h3', { style: { color: 'var(--amber)', font: '400 15px var(--display)', margin: '16px 0 8px' } }, label),
      h('div.coll-list', list.map(s => h('div.coll-item',
        h('div.art', icon(s.id)),
        h('div', h('h3', s.name, rarityBadge(s.rarity), h('span.tag', `base ${s.base}`)), h('p', s.desc), h('div.trig', `Trigger: ${s.trigger} · ${s.tags.join(', ') || 'no tags'}`)),
      ))));
  }));
  const relicList = () => h('div',
    h('h3', { style: { color: 'var(--amber)', font: '400 15px var(--display)', margin: '0 0 8px' } }, 'Relics — permanent rule changes for the run'),
    h('div.coll-list', RELICS.map(r => h('div.coll-item', { class: run?.relics.includes(r.id) ? '' : 'unseen' }, h('div.art', icon(r.icon)), h('div', h('h3', r.name, run?.relics.includes(r.id) ? h('span.tag', 'owned') : null), h('p', r.desc))))),
    h('h3', { style: { color: 'var(--amber)', font: '400 15px var(--display)', margin: '16px 0 8px' } }, 'Supplies — single use, carry up to three'),
    h('div.coll-list', ITEMS.map(r => h('div.coll-item', h('div.art', icon(r.icon)), h('div', h('h3', r.name), h('p', r.desc))))),
  );
  draw();
  return openModal({ title: 'Collection', cls: 'wide', body });
}

// Choose one owned symbol (for removal and services).
export function pickSymbolModal(run, { title, lead, price, filter = () => true, onPick }) {
  const insts = [...run.collection].sort((a, b) => SYMBOL_BY_ID[a.id].name.localeCompare(SYMBOL_BY_ID[b.id].name));
  const m = openModal({
    title, lead, cls: 'wide',
    body: h('div.picker', insts.map(inst => {
      const ok = filter(inst);
      const p = typeof price === 'function' ? price(inst) : price;
      return bindTip(h('button.pick', { type: 'button', disabled: !ok || run.money < p, onclick: () => { m.close(); onPick(inst); } },
        h('span.badges', inst.bonus ? `+${inst.bonus}` : '', inst.laminated ? '▣' : ''),
        icon(inst.id), SYMBOL_BY_ID[inst.id].name, h('span', money(p)),
      ), () => symbolTip(inst.id, inst));
    })),
  });
  return m;
}

// ── History ─────────────────────────────────────────────────────────────────
export function historyModal(profile, onReset) {
  const best = profile.best;
  return openModal({
    title: 'Run history', cls: 'wide',
    body: h('div',
      h('div.stats-row',
        h('div.stat', h('b', profile.wins), h('span', 'Leases won')),
        h('div.stat', h('b', profile.losses), h('span', 'Evictions')),
        h('div.stat', h('b', best ? (best.won ? 'Won' : `${best.reached + 1}/${DEADLINES.length}`) : '—'), h('span', 'Best run (deadline reached)')),
        h('div.stat', h('b', best ? money(best.totalEarned) : '—'), h('span', best ? `Earned in best run (${best.seed})` : 'Earned in best run')),
      ),
      profile.history.length ? h('table.hist',
        h('thead', h('tr', ['Result', 'Seed', 'Reached', 'Earned', 'Spins', 'Best spin', 'Symbols', 'Date'].map(t => h('th', t)))),
        h('tbody', profile.history.map(r => h('tr',
          h('td', r.won ? h('span.won-tag', 'Won') : h('span.lost-tag', 'Evicted')),
          h('td', r.seed),
          h('td', r.won ? 'All 12' : `${r.reached + 1} / ${DEADLINES.length}`),
          h('td', money(r.totalEarned)), h('td', r.spins), h('td', money(r.bestSpin)), h('td', r.collection),
          h('td', r.endedAt ? new Date(r.endedAt).toLocaleDateString() : '—'),
        ))),
      ) : h('p.lead', 'No finished runs yet. Your wins, evictions and best runs will be listed here.'),
    ),
    actions: [h('button.btn.danger.small', { type: 'button', onclick: onReset }, 'Reset all progress…')],
  });
}

// ── Settings ────────────────────────────────────────────────────────────────
export function settingsModal(settings, onChange) {
  const sw = (key, label, desc) => h('label.setting', h('div', h('b', label), h('p', desc)),
    h('input.switch', { type: 'checkbox', checked: settings[key], onchange: e => onChange({ [key]: e.target.checked }) }));
  return openModal({
    title: 'Settings',
    body: h('div',
      sw('animations', 'Animations', 'Falling symbols, step-by-step scoring, floating numbers. Turn off for instant results.'),
      h('label.setting', h('div', h('b', 'Animation speed'), h('p', 'How quickly spins play out.')),
        h('select', { onchange: e => onChange({ speed: e.target.value }) }, Object.keys(SPEEDS).map(s => h('option', { value: s, selected: settings.speed === s }, s[0].toUpperCase() + s.slice(1))))),
      sw('sound', 'Sound effects', 'Subtle synthesised clicks, coins and stamps.'),
      h('label.setting', h('div', h('b', 'Volume')),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings.volume, oninput: e => onChange({ volume: Number(e.target.value) }) })),
      sw('explanations', 'Explanations', 'Show why each symbol earned what it did on the receipt and in tooltips.'),
      sw('rain', 'Rain', 'The rain outside the window.'),
      sw('confirmSkip', 'Confirm skips', 'Ask before skipping a delivery.'),
    ),
  });
}

// ── Help ────────────────────────────────────────────────────────────────────
export function helpModal() {
  return openModal({
    title: 'How to play', cls: 'wide help',
    body: h('div.help',
      h('p', 'You live in a crumbling apartment block whose windows are a slot machine. Every spin, up to twenty symbols from your collection land in random windows and earn money. Pay each rent on time; pay the twelfth — the Final Notice — and the lease is yours.'),
      h('h3', 'A turn'),
      h('ol',
        h('li', 'Pull the lever (Space). Symbols are drawn at random from your collection and placed in random windows; empty windows stay dark.'),
        h('li', 'Every symbol earns its base value, plus whatever effects add or multiply. Adjacent means the eight windows around a symbol, diagonals included.'),
        h('li', 'The mail arrives: pick one of the offered symbols (1–5) or skip (S). Skipping keeps your collection lean, so your best symbols show up more often.'),
        h('li', 'When the spins run out, rent is due. Pay it and the corner shop opens: new symbols, relics, supplies, removals and upgrades.'),
      ),
      h('h3', 'Resolution order'),
      h('p', 'Effects always resolve in the same order, so you can plan around them:'),
      h('div.order',
        h('div', h('b', '1 · Setup'), 'Destroying, eating, transforming, disabling. Dogs, Black Cats, Keys and Batteries act first.'),
        h('div', h('b', '2 · Earn'), 'Flat bonuses and penalties (+n / −n), then relic bonuses, then this deadline\'s notice.'),
        h('div', h('b', '3 · Boost'), 'Multipliers (×n), after every flat bonus. Golden Tickets act last. Multipliers never deepen a loss.'),
        h('div', h('b', '4 · After'), 'Counters, storage, growth and new symbols. The value is already settled, so a Candle burning out still earns.'),
      ),
      h('p', 'Within a phase symbols act left to right, top to bottom. Every effect fires at most once per spin. Destroyed symbols are removed from your collection; disabled ones ("zz") just do nothing this spin. Hover a window after a spin to see its sums: teal outlines show who affected it, amber who it affected.'),
      h('h3', 'Money'),
      h('ul',
        h('li', `Currency is ${CURRENCY} — fictional, for this game only. There is nothing to buy with real money and nothing to cash out.`),
        h('li', 'Savings carry over after rent. The shop prices rise a little each deadline; Coupons and the Garage Sale notice lower them.'),
        h('li', 'Some deadlines come with a landlord\'s notice that bends the rules — check the rent calendar to prepare.'),
      ),
      h('h3', 'Keys'),
      h('p', h('kbd', 'Space'), ' spin / pay / continue · ', h('kbd', '1'), '–', h('kbd', '5'), ' pick a delivery · ', h('kbd', 'S'), ' skip · ', h('kbd', 'R'), ' reroll · ', h('kbd', 'C'), ' collection · ', h('kbd', 'H'), ' help · ', h('kbd', 'Esc'), ' close'),
    ),
  });
}

// ── New run ─────────────────────────────────────────────────────────────────
export function newRunModal(defaultSeed, onStart, hasSave) {
  const input = h('input', { value: defaultSeed, maxlength: 24, 'aria-label': 'Seed', spellcheck: 'false' });
  const go = () => { const s = input.value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24) || defaultSeed; m.close(); onStart(s); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  const m = openModal({
    title: 'New run',
    lead: hasSave ? 'This abandons your unfinished run (it will count as an eviction).' : 'Every run starts with six humble symbols and no savings.',
    body: h('div', h('label.field', h('b', 'Seed'), input, h('span', { style: { color: 'var(--muted)', fontSize: '.85em' } }, 'The same seed and the same choices always play out the same way. Share it with a friend.'))),
    actions: [h('button.btn.ghost', { type: 'button', onclick: () => m.close() }, 'Cancel'), h('button.btn.primary', { type: 'button', autofocus: true, onclick: go }, 'Move in')],
  });
  return m;
}

export function noticeLine(deadline) {
  const n = NOTICES[DEADLINES[deadline]?.notice];
  return n ? `${n.name}: ${n.desc}` : null;
}
