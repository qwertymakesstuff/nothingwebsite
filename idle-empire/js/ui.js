// Rendering and input. Reads the game state, never stores game data of its own;
// DOM text is only touched when the formatted value actually changes.
import { BUILDINGS } from './buildings.js';
import { formatNumber } from './numberFormatter.js';
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
      <span class="b-name"></span>
      <span class="b-desc"></span>
      <span class="b-rate"></span>
    </span>
    <span class="b-side">
      <span class="b-owned" title="owned">0</span>
      <span class="b-cost"><span class="b-qty"></span><span class="coin" aria-hidden="true"></span><span class="b-cost-value"></span></span>
    </span>
    <span class="b-progress" aria-hidden="true"><span></span></span>`;
  el.querySelector('.b-name').textContent = def.name;
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
    const pct = p0.sign() > 0 ? ` (+${formatNumber(dp.div(p0).mul(100))}%)` : '';
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

export function createUI(state) {
  const els = {
    currency: $('currency'), perSecond: $('perSecond'), perClick: $('perClick'), mint: $('mint'), shop: $('shop'),
    floaters: $('floaters'), buyModes: $('buyModes'), upgrades: $('upgrades'), upgradeCount: $('upgradeCount'),
    owned: $('ownedUpgrades'), ownedCount: $('ownedUpgradeCount'), ownedList: $('ownedUpgradeList'),
  };
  const rows = BUILDINGS.map(buildingRow);
  rows.forEach(r => els.shop.appendChild(r.el));
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
    if (!btn) return;
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
      const rate = owned > 0
        ? `+${each}/s each · ${formatNumber(economy.buildingProduction(state, id))}/s total`
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

  function renderTitle() {
    document.title = `${formatNumber(state.currency.floor())} crowns · Idle Empire`;
  }

  return { renderTreasury, renderShop, renderUpgrades, renderTitle };
}
