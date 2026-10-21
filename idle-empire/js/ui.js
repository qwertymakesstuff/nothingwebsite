// Rendering and input. Reads the game state, never stores game data of its own;
// DOM text is only touched when the formatted value actually changes.
import { BUILDINGS } from './buildings.js';
import { formatNumber } from './numberFormatter.js';
import * as economy from './economy.js';
import { ECONOMY } from './config.js';

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
  const els = { currency: $('currency'), perSecond: $('perSecond'), perClick: $('perClick'), mint: $('mint'), shop: $('shop'), floaters: $('floaters'), buyModes: $('buyModes') };
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
      const each = formatNumber(economy.unitRate(row.def));
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

  function renderTitle() {
    document.title = `${formatNumber(state.currency.floor())} crowns · Idle Empire`;
  }

  return { renderTreasury, renderShop, renderTitle };
}
