// Rendering and input. Reads the game state, never stores game data of its own;
// DOM text is only touched when the formatted value actually changes.
import { BUILDINGS, BUILDINGS_BY_ID, KIND_LABELS } from './buildings.js';
import { RANKS, RANK_BONUS, nextMilestone } from './milestones.js';
import { conditionProgress } from './conditions.js';
import { nextLockedBuilding, lockedCount } from './progression.js';
import { createNotifier } from './notifications.js';
import { createSkyline } from './skyline.js';
import { createAchievementsView } from './achievementsView.js';
import { ACHIEVEMENTS_BY_ID, ACHIEVEMENT_BONUS } from './achievements.js';
import { formatNumber, formatGoal } from './numberFormatter.js';
import * as economy from './economy.js';
import { ECONOMY } from './config.js';
import * as upgradeSystem from './upgradeSystem.js';
import { UPGRADES_BY_ID } from './upgrades.js';

const $ = id => document.getElementById(id);
const MAX_FLOATERS = 40;

function mintSvg() {
  // gear rim + struck coin + crown emblem, all original vector art
  const teeth = Array.from({ length: 24 }, (_, i) =>
    `<rect x="94" y="2" width="12" height="20" rx="3" transform="rotate(${i * 15} 100 100)"/>`).join('');
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="mintFace" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e8b54a"/><stop offset="1" stop-color="#8a5d17"/>
      </radialGradient>
      <linearGradient id="mintRim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6e6560"/><stop offset="1" stop-color="#2c2729"/>
      </linearGradient>
    </defs>
    <g fill="url(#mintRim)">${teeth}<circle cx="100" cy="100" r="84"/></g>
    <circle cx="100" cy="100" r="72" fill="url(#mintFace)" stroke="#5a3c0c" stroke-width="3"/>
    <circle cx="100" cy="100" r="62" fill="none" stroke="#9a6b1c" stroke-width="2" stroke-dasharray="3 5"/>
    <path d="M62 124l6-46 18 18 14-28 14 28 18-18 6 46z" fill="#7a5210" stroke="#4a3008" stroke-width="3" stroke-linejoin="round"/>
    <rect x="62" y="126" width="76" height="10" rx="3" fill="#7a5210" stroke="#4a3008" stroke-width="3"/>
    <circle cx="68" cy="76" r="5" fill="#fff0b8"/><circle cx="100" cy="66" r="5" fill="#fff0b8"/><circle cx="132" cy="76" r="5" fill="#fff0b8"/>
    <path d="M50 70a58 58 0 0 1 60-30" fill="none" stroke="#fff6d8" stroke-width="5" stroke-linecap="round" opacity=".45"/>
  </svg>`;
}

function buildingRow(def) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'building';
  el.dataset.id = def.id;
  el.innerHTML = `
    <span class="b-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${def.icon}</svg></span>
    <span class="b-main">
      <span class="b-name"><span class="b-title"></span><span class="b-kind"></span></span>
      <span class="b-desc"></span>
      <span class="b-rate"></span>
    </span>
    <span class="b-side">
      <span class="b-owned" title="owned">0</span>
      <span class="b-cost"><span class="b-qty"></span><span class="coin" aria-hidden="true"></span><span class="b-cost-value"></span></span>
    </span>
    <span class="b-progress" aria-hidden="true"><span></span></span>`;
  el.querySelector('.b-title').textContent = def.name;
  el.querySelector('.b-kind').textContent = KIND_LABELS[def.kind];
  el.querySelector('.b-desc').textContent = def.description;
  return {
    def, el,
    owned: el.querySelector('.b-owned'),
    cost: el.querySelector('.b-cost-value'),
    qty: el.querySelector('.b-qty'),
    bar: el.querySelector('.b-progress span'),
    rate: el.querySelector('.b-rate'),
    last: {},
  };
}

// the "coming next" card for the first locked building: what it is and what unlocks it
function lockedCard() {
  const el = document.createElement('div');
  el.className = 'building locked-building';
  el.innerHTML = `
    <span class="b-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"></svg></span>
    <span class="b-main">
      <span class="b-name"><span class="b-title"></span><span class="b-kind">coming next</span></span>
      <span class="b-desc"></span>
      <span class="b-req"></span>
    </span>
    <span class="b-side"><span class="b-lock" aria-hidden="true">🔒︎</span></span>
    <span class="b-progress" aria-hidden="true"><span></span></span>`;
  return {
    el, last: {},
    icon: el.querySelector('svg'), title: el.querySelector('.b-title'), desc: el.querySelector('.b-desc'),
    req: el.querySelector('.b-req'), bar: el.querySelector('.b-progress span'),
  };
}

function conditionText(c) {
  switch (c.type) {
    case 'owned': return `own ${c.count} ${c.count === 1 ? BUILDINGS_BY_ID[c.building].name : BUILDINGS_BY_ID[c.building].plural}`;
    case 'earned': return `earn ${formatGoal(c.amount)} crowns in total`;
    case 'pps': return `make ${formatGoal(c.amount)} per second`;
    case 'clicks': return `click ${formatNumber(c.count)} times`;
    default: return '';
  }
}

// only write to the DOM when the text differs from what was written last time
function upgradeCard(def) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `upgrade upgrade-${def.group}`;
  el.dataset.id = def.id;
  el.innerHTML = `
    <span class="u-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${def.icon}</svg>${def.tier ? `<span class="u-tier">${def.tier}</span>` : ''}</span>
    <span class="u-main">
      <span class="u-name"><span class="u-title"></span><span class="u-level"></span></span>
      <span class="u-desc"></span>
      <span class="u-effect"></span>
    </span>
    <span class="u-cost"><span class="coin" aria-hidden="true"></span><span class="u-cost-value"></span></span>
    <span class="b-progress" aria-hidden="true"><span></span></span>`;
  el.querySelector('.u-title').textContent = def.name;
  el.querySelector('.u-desc').textContent = def.description;
  return {
    def, el, last: {},
    level: el.querySelector('.u-level'),
    effect: el.querySelector('.u-effect'),
    cost: el.querySelector('.u-cost-value'),
    bar: el.querySelector('.b-progress span'),
  };
}

// "+12.5/s (+25%) · +2 per click": what buying the next level changes
function effectText(preview) {
  const parts = [];
  const [p0, p1] = preview.pps, [c0, c1] = preview.click;
  const dp = p1.sub(p0), dc = c1.sub(c0);
  if (dp.sign() > 0) {
    const pctValue = p0.sign() > 0 ? dp.div(p0).mul(100) : null;
    const pct = !pctValue ? '' : pctValue.lt(0.1) ? ' (<0.1%)' : ` (+${formatNumber(pctValue)}%)`;
    parts.push(`+${formatNumber(dp)}/s${pct}`);
  }
  if (dc.sign() > 0) parts.push(`+${formatNumber(dc)} per click`);
  return parts.length ? parts.join(' · ') : 'no effect yet';
}

function setText(row, key, node, text) {
  if (row.last[key] === text) return;
  row.last[key] = text;
  node.textContent = text;
}

function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // reflow so the animation can play again
  el.classList.add(cls);
}

const MODE_LABELS = { 1: 'x1', 10: 'x10', 100: 'x100', max: 'Max' };
const RANK_ICON = '<path d="M3 18l2-11 4.5 4L12 4l2.5 7L19 7l2 11z"/><path d="M3 19h18v2H3z"/>';
const UPGRADE_ICON = '<path d="M12 3l7 8h-4v9H9v-9H5z"/>';

export function createUI(state) {
  const els = {
    currency: $('currency'), perSecond: $('perSecond'), perClick: $('perClick'), mint: $('mint'), shop: $('shop'),
    floaters: $('floaters'), buyModes: $('buyModes'), upgrades: $('upgrades'), upgradeCount: $('upgradeCount'),
    owned: $('ownedUpgrades'), ownedCount: $('ownedUpgradeCount'), ownedList: $('ownedUpgradeList'),
  };
  const rows = BUILDINGS.map(buildingRow);
  rows.forEach(r => els.shop.appendChild(r.el));
  const locked = lockedCard();
  els.shop.appendChild(locked.el);
  const moreNote = document.createElement('p');
  moreNote.className = 'more-note';
  els.shop.appendChild(moreNote);
  const notify = createNotifier($('toasts'));
  const renderSkyline = createSkyline($('skyline'));
  const achievementsView = createAchievementsView(state);
  const rankEls = { name: $('rankName'), bonus: $('rankBonus'), bar: $('rankBar'), next: $('rankNext') };
  els.mint.innerHTML = mintSvg();
  const shown = {};

  function floater(text, x, y, extraClass) {
    if (els.floaters.childElementCount >= MAX_FLOATERS) els.floaters.firstElementChild.remove();
    const f = document.createElement('span');
    f.className = extraClass ? `floater ${extraClass}` : 'floater';
    f.textContent = text;
    f.style.left = `${x + (Math.random() * 24 - 12)}px`;
    f.style.top = `${y}px`;
    f.addEventListener('animationend', () => f.remove());
    els.floaters.appendChild(f);
  }

  els.mint.addEventListener('click', e => {
    const value = economy.click(state);
    let { clientX: x, clientY: y } = e;
    if (!x && !y) { // keyboard press: float from the middle of the Mint
      const r = els.mint.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 3;
    }
    floater(`+${formatNumber(value)}`, x, y);
    els.mint.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' });
    renderTreasury();
  });

  // buy-mode selector: x1 / x10 / x100 / Max
  const modeButtons = ECONOMY.buyModes.map(mode => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'buy-mode';
    b.dataset.mode = String(mode);
    b.textContent = MODE_LABELS[mode] || `x${mode}`;
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { economy.setBuyMode(state, mode); renderModes(); renderShop(); });
    els.buyModes.appendChild(b);
    return { mode, b };
  });
  function renderModes() {
    for (const { mode, b } of modeButtons) {
      const on = state.buyMode === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    }
  }
  renderModes();

  els.shop.addEventListener('click', e => {
    const btn = e.target.closest('.building');
    if (!btn || btn.classList.contains('locked-building')) return;
    const bought = economy.buyBuilding(state, btn.dataset.id);
    restartClass(btn, bought ? 'bought' : 'denied');
    if (bought) {
      const r = btn.querySelector('.b-owned').getBoundingClientRect();
      floater(`+${formatNumber(bought.count)}`, r.left + r.width / 2, r.top, 'floater-buy');
      restartClass(btn.querySelector('.b-owned'), 'bump');
    }
    renderTreasury();
    renderShop();
  });
  els.shop.addEventListener('animationend', e => e.target.classList.remove('bought', 'denied', 'bump'));

  function show(key, node, text) {
    if (shown[key] === text) return;
    shown[key] = text;
    node.textContent = text;
  }

  function renderTreasury() {
    show('currency', els.currency, formatNumber(state.currency.floor()));
    show('perSecond', els.perSecond, formatNumber(economy.productionPerSecond(state)));
    show('perClick', els.perClick, formatNumber(economy.clickValue(state)));
  }

  function renderShop() {
    for (const row of rows) {
      const id = row.def.id;
      const open = !!state.buildingsUnlocked[id];
      if (row.last.open !== open) { row.last.open = open; row.el.hidden = !open; }
      if (!open) continue;
      const owned = state.buildings[id] || 0;
      const { count, cost, affordable } = economy.quote(state, id);
      setText(row, 'owned', row.owned, formatNumber(owned));
      setText(row, 'cost', row.cost, formatNumber(cost));
      setText(row, 'qty', row.qty, count > 1 || state.buyMode !== 1 ? `×${formatNumber(count)}` : '');
      // how close the treasury is to this price, 0..1
      const ratio = affordable ? 1 : Math.max(0, Math.min(1, state.currency.div(cost).toNumber()));
      const width = `${Math.floor(ratio * 100)}%`;
      if (row.last.width !== width) { row.last.width = width; row.bar.style.width = width; }
      const each = formatNumber(economy.unitRate(state, row.def));
      const ms = nextMilestone(owned);
      const msText = ms ? (ms.mult > 1 ? ` · x${ms.mult} at ${ms.count}` : '') : '';
      const rate = owned > 0
        ? `+${each}/s each · ${formatNumber(economy.buildingProduction(state, id))}/s total${msText}`
        : `+${each}/s each`;
      setText(row, 'rate', row.rate, rate);
      if (row.last.affordable !== affordable) {
        row.last.affordable = affordable;
        row.el.classList.toggle('affordable', affordable);
        row.el.classList.toggle('unaffordable', !affordable);
        row.el.setAttribute('aria-disabled', String(!affordable));
      }
      const label = `Buy ${formatNumber(count)} ${row.def.name} for ${formatNumber(cost)} crowns, ${formatNumber(owned)} owned`;
      if (row.last.label !== label) { row.last.label = label; row.el.setAttribute('aria-label', label); }
    }
    renderLocked();
  }

  function renderLocked() {
    const next = nextLockedBuilding(state);
    if (locked.last.id !== (next && next.id)) {
      locked.last.id = next && next.id;
      locked.el.hidden = !next;
      if (next) {
        locked.icon.innerHTML = next.icon;
        locked.title.textContent = next.name;
        locked.desc.textContent = next.description;
      }
    }
    const more = Math.max(0, lockedCount(state) - 1);
    setText(locked, 'more', moreNote, more ? `${more} more building${more === 1 ? '' : 's'} to discover` : '');
    if (!next) return;
    setText(locked, 'req', locked.req, `Unlocks when you ${next.unlock.map(conditionText).join(' and ')}`);
    const progress = Math.min(...next.unlock.map(c => conditionProgress(state, c)));
    const width = `${Math.floor(progress * 100)}%`;
    if (locked.last.width !== width) { locked.last.width = width; locked.bar.style.width = width; }
  }

  function renderRank() {
    const i = state.rank, next = RANKS[i + 1];
    show('rankName', rankEls.name, RANKS[i].name);
    show('rankBonus', rankEls.bonus, i > 0 ? `+${Math.round(i * RANK_BONUS * 100)}% production` : '');
    if (next) {
      show('rankNext', rankEls.next, `Next: ${next.name} at ${formatGoal(next.earned)} crowns earned (+${Math.round(RANK_BONUS * 100)}%)`);
      // progress on a log scale, so each rank's bar fills at a steady pace
      const lo = Math.log10(Math.max(1, RANKS[i].earned)), hi = Math.log10(next.earned);
      const p = Math.max(0, Math.min(1, (state.totalEarned.log10() - lo) / (hi - lo)));
      const width = `${Math.floor(p * 100)}%`;
      if (shown.rankBar !== width) { shown.rankBar = width; rankEls.bar.style.width = width; }
    } else {
      show('rankNext', rankEls.next, 'The highest rank there is.');
      if (shown.rankBar !== '100%') { shown.rankBar = '100%'; rankEls.bar.style.width = '100%'; }
    }
    renderSkyline(state);
  }

  // turn progression events into notifications
  function announce(events) {
    if (events.some(e => e.type === 'achievement')) achievementsView.render();
    for (const ev of events) {
      if (ev.type === 'building') {
        const b = BUILDINGS_BY_ID[ev.id];
        notify({ kind: 'unlock', icon: b.icon, title: `New building: ${b.name}`, body: b.description });
      } else if (ev.type === 'milestone') {
        const b = BUILDINGS_BY_ID[ev.id];
        if (ev.count === 1) notify({ kind: 'first', icon: b.icon, title: `Your first ${b.name}`, body: `${formatNumber(b.baseRate)} crowns per second, before bonuses.` });
        else notify({ kind: 'milestone', icon: b.icon, title: `${ev.count} ${b.plural}`, body: `Milestone: ${b.plural} produce x${formatNumber(ev.mult)}.` });
      } else if (ev.type === 'rank') {
        notify({ kind: 'rank', icon: RANK_ICON, title: `Rank up: ${RANKS[ev.index].name}`, body: `All production +${Math.round(ev.index * RANK_BONUS * 100)}% in total.` });
      } else if (ev.type === 'achievement') {
        const a = ACHIEVEMENTS_BY_ID[ev.id];
        notify({ kind: 'achievement', icon: a.icon, title: `Achievement: ${a.name}`, body: `${a.description} +${Math.round(ACHIEVEMENT_BONUS * 100)}% production.` });
        achievementsView.celebrate();
      } else if (ev.type === 'upgrades') {
        const n = ev.ids.length;
        notify({ kind: 'upgrade', icon: UPGRADE_ICON, title: n === 1 ? 'New upgrade available' : `${n} new upgrades available`, body: n === 1 ? UPGRADES_BY_ID[ev.ids[0]].name : ev.ids.slice(0, 3).map(id => UPGRADES_BY_ID[id].name).join(', ') + (n > 3 ? '…' : '') });
      }
    }
  }

  // upgrade shop: cards are kept per id and only re-ordered when the available list changes
  const cards = new Map();
  let upgradeKey = null, ownedKey = null, firstUpgradeRender = true;
  const empty = document.createElement('p');
  empty.className = 'empty-note';
  empty.textContent = 'No upgrades yet. They unlock as you click, earn and build.';

  els.upgrades.addEventListener('click', e => {
    const btn = e.target.closest('.upgrade');
    if (!btn) return;
    const paid = upgradeSystem.buyUpgrade(state, btn.dataset.id);
    if (paid) {
      const r = btn.getBoundingClientRect();
      floater(`-${formatNumber(paid)}`, r.left + r.width - 40, r.top + 10, 'floater-spend');
      // a repeatable card stays in the list: flash it
      if (UPGRADES_BY_ID[btn.dataset.id].repeatable) restartClass(btn, 'bought');
      renderUpgrades();
      renderShop();
    } else {
      restartClass(btn, 'denied');
    }
    renderTreasury();
  });
  els.upgrades.addEventListener('animationend', e => e.target.classList.remove('denied', 'fresh', 'bought'));

  function renderUpgrades() {
    const list = upgradeSystem.availableUpgrades(state);
    const key = list.map(({ def }) => `${def.id}:${upgradeSystem.levelOf(state, def.id)}`).join(',');
    if (key !== upgradeKey) {
      upgradeKey = key;
      const ids = new Set(list.map(({ def }) => def.id));
      for (const [id, card] of cards) if (!ids.has(id)) { card.el.remove(); cards.delete(id); }
      for (const { def } of list) {
        let card = cards.get(def.id);
        if (!card) {
          card = upgradeCard(def);
          cards.set(def.id, card);
          if (!firstUpgradeRender) card.el.classList.add('fresh');
        }
        els.upgrades.appendChild(card.el); // appending an existing node moves it into sorted order
      }
      if (!list.length) els.upgrades.appendChild(empty); else empty.remove();
      els.upgradeCount.textContent = list.length ? `${list.length} available` : '';
      firstUpgradeRender = false;
    }
    for (const { def, cost } of list) {
      const card = cards.get(def.id);
      const affordable = state.currency.gte(cost);
      setText(card, 'cost', card.cost, formatNumber(cost));
      if (def.repeatable) setText(card, 'level', card.level, `Lv ${upgradeSystem.levelOf(state, def.id)}/${def.repeatable.maxLevel}`);
      setText(card, 'effect', card.effect, effectText(upgradeSystem.previewUpgrade(state, def.id)));
      const ratio = affordable ? 1 : Math.max(0, Math.min(1, state.currency.div(cost).toNumber()));
      const width = `${Math.floor(ratio * 100)}%`;
      if (card.last.width !== width) { card.last.width = width; card.bar.style.width = width; }
      if (card.last.affordable !== affordable) {
        card.last.affordable = affordable;
        card.el.classList.toggle('affordable', affordable);
        card.el.classList.toggle('unaffordable', !affordable);
        card.el.setAttribute('aria-disabled', String(!affordable));
      }
      const label = `Buy upgrade ${def.name} for ${formatNumber(cost)} crowns: ${card.last.effect}`;
      if (card.last.label !== label) { card.last.label = label; card.el.setAttribute('aria-label', label); }
    }

    const owned = upgradeSystem.ownedUpgrades(state);
    const oKey = owned.map(u => `${u.id}:${upgradeSystem.levelOf(state, u.id)}`).join(',');
    if (oKey !== ownedKey) {
      ownedKey = oKey;
      els.owned.hidden = owned.length === 0;
      els.ownedCount.textContent = String(owned.length);
      els.ownedList.replaceChildren(...owned.map(u => {
        const chip = document.createElement('span');
        chip.className = 'owned-chip';
        const level = upgradeSystem.levelOf(state, u.id);
        chip.textContent = u.repeatable ? `${u.name} ${level}/${u.repeatable.maxLevel}` : u.name;
        chip.title = u.description;
        return chip;
      }));
    }
  }

  function renderAchievements() { achievementsView.render(); }

  function renderTitle() {
    document.title = `${formatNumber(state.currency.floor())} crowns · Idle Empire`;
  }

  return { renderTreasury, renderShop, renderUpgrades, renderRank, renderAchievements, renderTitle, announce };
}
