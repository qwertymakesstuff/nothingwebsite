// Upgrade: stake one owned item for a chance at a more valuable target.
// The result (and the needle's stopping point, `roll`) is decided by the store before the meter
// animates; success is exactly roll < chance, which is the green arc the needle lands in.

import { ITEMS, ITEMS_BY_ID, itemValue } from '../items.js';
import { RARITIES, RARITY_BY_ID } from '../rarities.js';
import { WEARS } from '../wear.js';
import { UPGRADE } from '../config.js';
import { quoteUpgrade, upgradeChance, targetRange } from '../upgrade.js';
import { findItem, instanceValue } from '../economy.js';
import { easeOut } from '../roulette.js';
import { itemArt } from '../art.js';
import { coins, itemCard, rarityPill, itemTitle, wearName, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, esc, fmt, money, fmtPct, timeAgo, prefersReducedMotion } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const SPIN_MS = 3800;
const ui = { input: null, target: null, targetWear: 'FT', qIn: '', qTarget: '', rarity: 'all', limit: 48 };
let s = null; // { ctx, busy, raf, angle }

const pct = x => `${(x * 100).toFixed(2)}%`;

function inputCandidates(player) {
  const needle = ui.qIn.trim().toLowerCase();
  return player.inventory
    .filter(i => !i.locked && (!needle || ITEMS_BY_ID[i.itemId].name.toLowerCase().includes(needle)))
    .sort((a, b) => instanceValue(b) - instanceValue(a));
}

function targetCandidates(inputValue) {
  const { min, max } = targetRange(inputValue);
  const needle = ui.qTarget.trim().toLowerCase();
  return ITEMS
    .map(it => ({ it, wear: it.hasWear ? ui.targetWear : null }))
    .map(x => ({ ...x, value: itemValue(x.it.id, x.wear) }))
    .filter(x => x.value >= min && x.value <= max)
    .filter(x => ui.rarity === 'all' || x.it.rarity === ui.rarity)
    .filter(x => !needle || x.it.name.toLowerCase().includes(needle))
    .sort((a, b) => a.value - b.value);
}

function meterSvg() {
  return `<svg class="meter" viewBox="0 0 200 200" aria-hidden="true">
  <circle cx="100" cy="100" r="84" class="meter-track"/>
  <circle cx="100" cy="100" r="84" class="meter-arc" id="meterArc" pathLength="1000" transform="rotate(-90 100 100)"/>
  <g id="needle" class="meter-needle"><path d="M100 8 L106 30 L94 30 Z"/></g>
</svg>`;
}

function setNeedle(deg) {
  s.angle = deg;
  $('#needle', s.ctx.root)?.setAttribute('transform', `rotate(${deg} 100 100)`);
}

function quote() {
  const p = s.ctx.store.player;
  if (!ui.input || !findItem(p, ui.input)) { ui.input = null; return null; }
  if (!ui.target) return null;
  return quoteUpgrade(p, ui.input, ui.target);
}

function drawStage() {
  const { root, store } = s.ctx;
  const p = store.player;
  const inst = ui.input && findItem(p, ui.input);
  const q = quote();
  const slot = (label, html) => `<div class="up-slot"><p class="eyebrow">${label}</p>${html}</div>`;
  $('#upInput', root).innerHTML = slot('Your item', inst
    ? itemCard(inst.itemId, inst.wear, { value: instanceValue(inst), classes: 'up-card' })
    : '<div class="up-empty">Pick an item from your inventory below</div>');
  $('#upTarget', root).innerHTML = slot('Target', ui.target
    ? itemCard(ui.target.itemId, ui.target.wear, { classes: 'up-card' }) +
      (ITEMS_BY_ID[ui.target.itemId].hasWear ? `<div class="wear-chips" role="group" aria-label="Target wear">${WEARS.map(w => `<button class="chip chip-sm" data-twear="${w.id}" aria-pressed="${ui.target.wear === w.id}" title="${w.name}">${w.id}</button>`).join('')}</div>` : '')
    : '<div class="up-empty">Pick a target item below</div>');

  const chance = q?.ok ? q.chance : 0;
  $('#meterArc', root).style.strokeDasharray = `${(chance * 1000).toFixed(1)} 1000`;
  $('#meterChance', root).textContent = q?.ok ? pct(chance) : '—';
  $('#meterMult', root).textContent = q?.ok ? `×${q.multiplier.toFixed(2)}` : '';
  $('#upInfo', root).innerHTML = q?.ok
    ? `${coins(q.inputValue)} → ${coins(q.targetValue)}`
    : (q && !q.ok ? `<span class="warn">${esc(q.message)}</span>` : `Chance = your value ÷ target value × ${1 - UPGRADE.houseEdge} (max ${UPGRADE.maxChance * 100}%).`);
  const btn = $('#upBtn', root);
  btn.disabled = s.busy || !q?.ok;
  btn.textContent = s.busy ? 'Upgrading…' : 'Upgrade';
  $('#upFavWarn', root).hidden = !(inst?.favorite && q?.ok);
}

function drawPickers() {
  const { root, store } = s.ctx;
  const p = store.player;
  const inputs = inputCandidates(p);
  const inPane = $('#pickInput', root);
  inPane.innerHTML = !p.inventory.length
    ? emptyState({ icon: 'inventory', title: 'No items to upgrade', text: 'Open a case first.', action: '<a class="btn btn-primary" href="#/cases">Browse cases</a>' })
    : !inputs.length ? '<p class="muted">No unlocked items match.</p>'
      : `<div class="item-grid item-grid-compact">${inputs.slice(0, 60).map(i => itemCard(i.itemId, i.wear, {
        value: instanceValue(i), classes: `pick ${ui.input === i.uid ? 'is-selected' : ''}`,
        inner: `<button class="ic-hit" data-pick-in="${i.uid}" aria-label="Stake ${esc(ITEMS_BY_ID[i.itemId].name)}"></button>${i.favorite ? `<span class="ic-badge-fav">${ICONS.heart}</span>` : ''}`,
      })).join('')}</div>`;
  const lockedCount = p.inventory.filter(i => i.locked).length;
  $('#lockedNote', root).textContent = lockedCount ? `${lockedCount} locked item${lockedCount === 1 ? ' is' : 's are'} hidden: locked items can't be staked.` : '';

  const inst = ui.input && findItem(p, ui.input);
  const tPane = $('#pickTarget', root);
  if (!inst) { tPane.innerHTML = '<p class="muted">Choose your item first; targets are listed by the chance they give.</p>'; return; }
  const v = instanceValue(inst);
  const list = targetCandidates(v);
  tPane.innerHTML = list.length
    ? `<div class="item-grid item-grid-compact">${list.slice(0, ui.limit).map(x => itemCard(x.it.id, x.wear, {
      value: x.value, chance: upgradeChance(v, x.value),
      classes: `pick ${ui.target?.itemId === x.it.id && ui.target?.wear === x.wear ? 'is-selected' : ''}`,
      inner: `<button class="ic-hit" data-pick-target="${x.it.id}" aria-label="Target ${esc(x.it.name)}, ${pct(upgradeChance(v, x.value))} chance"></button>`,
    })).join('')}</div>${list.length > ui.limit ? `<div class="more"><button class="btn btn-ghost" data-more>Show more (${list.length - ui.limit} left)</button></div>` : ''}`
    : '<p class="muted">No targets match these filters.</p>';
}

function drawHistory() {
  const h = s.ctx.store.player.upgrades;
  $('#upHistory', s.ctx.root).innerHTML = h.length
    ? `<ol class="history">${h.map(r => `<li class="${r.success ? 'win' : 'loss'}">
      <span class="h-badge">${r.success ? 'WON' : 'LOST'}</span>
      <span class="h-items"><img src="${itemArt(r.input.itemId)}" alt=""> ${esc(ITEMS_BY_ID[r.input.itemId].name)} <b>→</b> <img src="${itemArt(r.target.itemId)}" alt=""> ${esc(ITEMS_BY_ID[r.target.itemId].name)}${r.target.wear ? ` (${r.target.wear})` : ''}</span>
      <span class="h-meta">${pct(r.chance)} · rolled ${(r.roll * 100).toFixed(2)} · ${money(r.input.value)} → ${money(r.target.value)}<br><time>${timeAgo(r.at)}</time></span></li>`).join('')}</ol>`
    : '<p class="muted">Your upgrade results will appear here.</p>';
}

function drawAll() { drawStage(); drawPickers(); drawHistory(); }

function quickTarget(mult) {
  const inst = ui.input && findItem(s.ctx.store.player, ui.input);
  if (!inst) return;
  const v = instanceValue(inst);
  const list = targetCandidates(v);
  if (!list.length) return toast('No targets match these filters.', { kind: 'error' });
  const goal = v * mult;
  const best = list.reduce((a, b) => (Math.abs(b.value - goal) < Math.abs(a.value - goal) ? b : a));
  ui.target = { itemId: best.it.id, wear: best.wear };
  drawAll();
}

function attempt() {
  if (s.busy) return;
  const { store } = s.ctx;
  const q = quote();
  if (!q?.ok) { if (q) toast(q.message, { kind: 'error' }); return; }
  s.busy = true; // set before the transaction so a double click can never submit twice
  const r = store.upgrade(ui.input, ui.target);
  if (!r.ok) { s.busy = false; toast(r.message, { kind: 'error' }); drawAll(); return; }
  s.pending = r;
  ui.input = null;
  drawStage();
  const stage = $('#upStage', s.ctx.root);
  stage.classList.remove('up-win', 'up-loss');
  // keep the arc showing the chance that was played
  $('#meterArc', s.ctx.root).style.strokeDasharray = `${(r.chance * 1000).toFixed(1)} 1000`;
  $('#meterChance', s.ctx.root).textContent = pct(r.chance);
  const endAngle = r.roll * 360;
  const instant = store.player.settings.instantOpen || prefersReducedMotion();
  if (instant) { setNeedle(endAngle); finish(); return; }
  sound.open();
  const from = s.angle % 360;
  const to = 360 * 4 + endAngle;
  let start = null;
  const frame = now => {
    if (!s || !s.pending) return;
    start ??= now;
    const t = Math.min(1, (now - start) / SPIN_MS);
    setNeedle(from + (to - from) * easeOut(t));
    if (t < 1) s.raf = requestAnimationFrame(frame);
    else finish();
  };
  s.raf = requestAnimationFrame(frame);
  $('#upSkip', s.ctx.root).hidden = false;
}

function finish() {
  if (!s?.pending) return;
  cancelAnimationFrame(s.raf);
  const r = s.pending;
  s.pending = null;
  setNeedle(r.roll * 360);
  s.busy = false;
  const stage = $('#upStage', s.ctx.root);
  stage.classList.add(r.success ? 'up-win' : 'up-loss');
  $('#upSkip', s.ctx.root).hidden = true;
  const name = ITEMS_BY_ID[r.record.target.itemId].name;
  $('#upResult', s.ctx.root).innerHTML = r.success
    ? `<b class="good">Upgrade successful!</b> ${esc(name)} (${money(r.record.target.value)}) is in your inventory.`
    : `<b class="bad">Upgrade failed.</b> The needle stopped at ${(r.roll * 100).toFixed(2)}, outside the ${pct(r.chance)} window. Your ${esc(ITEMS_BY_ID[r.record.input.itemId].name)} was lost.`;
  if (r.success) sound.reveal(5); else sound.error();
  drawAll();
}

export default {
  title: 'Upgrade',
  render(ctx) {
    const { root, store } = ctx;
    s = { ctx, busy: false, raf: 0, angle: 0, pending: null };
    root.innerHTML = `
<section class="up-stage" id="upStage">
  <div id="upInput"></div>
  <div class="up-center">
    <div class="meter-wrap">${meterSvg()}<div class="meter-text"><b id="meterChance">—</b><span id="meterMult"></span></div></div>
    <p class="up-info small" id="upInfo"></p>
    <div class="up-actions">
      <button class="btn btn-primary btn-lg" id="upBtn" disabled>Upgrade</button>
      <button class="btn btn-ghost btn-sm" id="upSkip" hidden>${ICONS.skip} Skip</button>
    </div>
    <label class="toggle small"><input type="checkbox" id="upInstant" ${store.player.settings.instantOpen ? 'checked' : ''}><span>Skip animation</span></label>
    <p class="warn small" id="upFavWarn" hidden>This item is one of your favourites. It is lost if the upgrade fails.</p>
    <p class="up-result" id="upResult" aria-live="polite"></p>
  </div>
  <div id="upTarget"></div>
</section>

<div class="up-pickers">
  <section class="section">
    <div class="section-head"><h2>1. Your item</h2></div>
    <div class="toolbar"><label class="search"><span class="sr-only">Search your items</span><input type="search" id="qIn" placeholder="Search your items…" value="${esc(ui.qIn)}"></label></div>
    <p class="muted small" id="lockedNote"></p>
    <div id="pickInput"></div>
  </section>
  <section class="section">
    <div class="section-head"><h2>2. Target</h2>
      <div class="chips">${[1.5, 2, 5, 10].map(m => `<button class="chip chip-sm" data-quick="${m}">×${m}</button>`).join('')}</div></div>
    <div class="toolbar">
      <label class="search"><span class="sr-only">Search targets</span><input type="search" id="qTarget" placeholder="Search targets…" value="${esc(ui.qTarget)}"></label>
      <label class="select"><span>Rarity</span><select id="tRarity"><option value="all">All</option>${RARITIES.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}</select></label>
      <label class="select"><span>Wear</span><select id="tWear">${WEARS.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select></label>
    </div>
    <div id="pickTarget"></div>
  </section>
</div>

<section class="section">
  <div class="section-head"><h2>Results</h2><span class="muted small">Your last ${UPGRADE.historyLimit} upgrades</span></div>
  <div id="upHistory"></div>
</section>`;
    $('#tRarity', root).value = ui.rarity;
    $('#tWear', root).value = ui.targetWear;
    setNeedle(0);

    $('#qIn', root).addEventListener('input', e => { ui.qIn = e.target.value; drawPickers(); });
    $('#qTarget', root).addEventListener('input', e => { ui.qTarget = e.target.value; ui.limit = 48; drawPickers(); });
    $('#tRarity', root).addEventListener('change', e => { ui.rarity = e.target.value; drawPickers(); });
    $('#tWear', root).addEventListener('change', e => { ui.targetWear = e.target.value; drawPickers(); });
    $('#upInstant', root).addEventListener('change', e => store.updateSettings({ instantOpen: e.target.checked }));
    root.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.pickIn) {
        if (s.busy) return;
        ui.input = t.dataset.pickIn;
        // keep the target only if it is still a legal target for this item
        if (ui.target && !quote()?.ok) ui.target = null;
        $('#upStage', root).classList.remove('up-win', 'up-loss');
        $('#upResult', root).textContent = '';
        drawAll();
      } else if (t.dataset.pickTarget) {
        if (s.busy) return;
        const it = ITEMS_BY_ID[t.dataset.pickTarget];
        ui.target = { itemId: it.id, wear: it.hasWear ? ui.targetWear : null };
        drawAll();
      } else if (t.dataset.twear) {
        if (s.busy || !ui.target) return;
        ui.target = { ...ui.target, wear: t.dataset.twear };
        drawAll();
      } else if (t.dataset.quick) {
        if (!s.busy) quickTarget(+t.dataset.quick);
      } else if ('more' in t.dataset) {
        ui.limit += 48; drawPickers();
      } else if (t.id === 'upBtn') attempt();
      else if (t.id === 'upSkip') finish();
    });
    drawAll();
  },
  onStore() {
    if (!s) return;
    $('#upInstant', s.ctx.root).checked = s.ctx.store.player.settings.instantOpen;
    if (!s.pending) drawAll();
  },
  destroy() {
    if (!s) return;
    if (s.pending) {
      const r = s.pending;
      toast(r.success ? `Upgrade won: ${ITEMS_BY_ID[r.record.target.itemId].name} is in your inventory.` : 'Your upgrade failed; the staked item was lost.', { kind: r.success ? 'success' : 'info' });
    }
    cancelAnimationFrame(s.raf);
    s = null;
  },
};
