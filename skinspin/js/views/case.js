// A single case: details, exact odds, contents, and the opening roulette.
// The reward is decided (and paid for, and added to the inventory) by the store before the strip
// is even built; the animation only travels to it.

import { getCase, CASE_CATEGORY_BY_ID } from '../cases.js';
import { ITEMS_BY_ID } from '../items.js';
import { RARITY_BY_ID } from '../rarities.js';
import { WEARS, WEAR_CHANCES } from '../wear.js';
import { caseOdds, rollCase } from '../rewards.js';
import { buildStrip, planSpin, offsetAt, centerOffset, indexAtOffset } from '../roulette.js';
import { ROULETTE } from '../config.js';
import { findItem } from '../economy.js';
import { itemArt, caseArt } from '../art.js';
import { coins, itemCard, rarityPill, itemTitle, wearName, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, esc, fmt, fmtPct, prefersReducedMotion } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

let s = null; // state of the mounted page

const IDLE_LENGTH = 21;

function rlCard(drop) {
  const it = ITEMS_BY_ID[drop.itemId];
  const t = itemTitle(drop.itemId);
  return `<div class="rl-card r-${it.rarity}" style="--rc:${RARITY_BY_ID[it.rarity].color}"><img src="${itemArt(drop.itemId)}" alt=""><span class="rl-w">${esc(t.weapon)}</span><span class="rl-f">${esc(t.finish)}</span></div>`;
}

const track = () => $('#track', s.ctx.root);

function geometry() {
  const t = track();
  const first = t.firstElementChild;
  const style = getComputedStyle(t);
  return {
    cardWidth: first.getBoundingClientRect().width,
    gap: parseFloat(style.columnGap || style.gap) || 0,
    viewportWidth: $('#roulette', s.ctx.root).clientWidth,
  };
}

const placeAt = offset => { track().style.transform = `translate3d(${-offset}px,0,0)`; };

function drawStrip(strip, centerIndex) {
  track().innerHTML = strip.map(rlCard).join('');
  s.centerIndex = centerIndex;
  placeAt(centerOffset(centerIndex, geometry()));
}

function drawIdle() {
  const strip = Array.from({ length: IDLE_LENGTH }, () => rollCase(s.c, Math.random));
  drawStrip(strip, Math.floor(IDLE_LENGTH / 2));
  status('');
}

function status(text) {
  const el = $('#rlStatus', s.ctx.root);
  if (el) el.textContent = text;
}

function updateButtons() {
  if (!s) return;
  const { root, store } = s.ctx;
  const coinsNow = store.player.coins;
  const short = s.c.price - coinsNow;
  const spinning = s.phase === 'spinning';
  const openBtn = $('#openBtn', root);
  openBtn.disabled = spinning || short > 0;
  openBtn.innerHTML = spinning ? 'Opening…' : `Open for ${coins(s.c.price)}`;
  $('#affordMsg', root).innerHTML = short > 0 && !spinning
    ? `You need ${coins(short)} more. <a href="#/inventory">Sell items from your inventory</a> to top up.`
    : '';
  $('#skipBtn', root).hidden = !spinning || s.mode !== 'spin';
  const again = $('#againBtn', root);
  if (again) {
    again.disabled = spinning || short > 0;
    again.title = short > 0 ? `You need ${fmt(short)} more coins` : '';
  }
}

function open() {
  if (!s || s.phase === 'spinning') return;
  const { opener, store } = s.ctx;
  const r = opener.start(s.c.id);
  if (!r.ok) {
    if (r.error !== 'busy') { toast(r.message, { kind: 'error' }); sound.error(); }
    updateButtons();
    return;
  }
  s.result = r;
  s.sold = false;
  s.phase = 'spinning';
  s.mode = store.player.settings.instantOpen ? 'instant' : prefersReducedMotion() ? 'reduced' : 'spin';
  $('#reveal', s.ctx.root).hidden = true;
  $('#stage', s.ctx.root).classList.remove('revealed');
  sound.open();

  drawStrip(buildStrip(s.c, r.item), 0);
  updateButtons();

  if (s.mode === 'spin') {
    placeAt(0);
    status('Rolling…');
    const plan = planSpin(ROULETTE.winnerIndex, geometry());
    s.lastIndex = -1;
    let start = null;
    const frame = now => {
      if (!s || s.phase !== 'spinning') return;
      start ??= now;
      const elapsed = now - start;
      const offset = offsetAt(elapsed, plan);
      placeAt(offset);
      const idx = indexAtOffset(offset, plan.geometry);
      if (idx !== s.lastIndex) { s.lastIndex = idx; if (elapsed < plan.duration) sound.tick(); }
      if (elapsed >= plan.total) finish();
      else s.raf = requestAnimationFrame(frame);
    };
    plan.geometry = geometry();
    s.raf = requestAnimationFrame(frame);
  } else {
    // Instant or reduced motion: no scrolling, the winner is simply shown under the marker.
    placeAt(centerOffset(ROULETTE.winnerIndex, geometry()));
    s.timer = setTimeout(finish, s.mode === 'reduced' ? 450 : 0);
  }
}

function finish() {
  if (!s || s.phase !== 'spinning') return;
  cancelAnimationFrame(s.raf);
  clearTimeout(s.timer);
  s.centerIndex = ROULETTE.winnerIndex;
  placeAt(centerOffset(ROULETTE.winnerIndex, geometry()));
  track().children[ROULETTE.winnerIndex].classList.add('rl-win');
  s.phase = 'revealed';
  s.ctx.opener.finish();
  const it = ITEMS_BY_ID[s.result.item.itemId];
  sound.reveal(RARITY_BY_ID[it.rarity].rank);
  status(`You unboxed ${it.name}.`);
  showReveal();
  if (s.result.levelUp) toast(`Level up! You reached level ${s.result.levelUp}.`, { kind: 'success' });
  updateButtons();
}

function showReveal() {
  const { item, value, xpGained } = s.result;
  const it = ITEMS_BY_ID[item.itemId];
  const r = RARITY_BY_ID[it.rarity];
  const t = itemTitle(item.itemId);
  const el = $('#reveal', s.ctx.root);
  el.className = `reveal r-${it.rarity} ${r.rank >= 4 ? 'reveal-big' : ''}`;
  el.style.setProperty('--rc', r.color);
  el.innerHTML = `
<div class="rv-rays" aria-hidden="true"></div>
<div class="rv-body">
  <img class="rv-art" src="${itemArt(item.itemId)}" alt="">
  <div class="rv-info">
    ${rarityPill(it.rarity)}
    <h3><span>${esc(t.weapon)}</span> ${esc(t.finish)}</h3>
    <p class="muted">${item.wear ? `${esc(wearName(item.wear))} · float ${item.float.toFixed(4)}` : 'No wear'}</p>
    <p class="rv-value">${coins(value)}</p>
    <p class="muted small">+${fmt(xpGained)} XP</p>
    <div class="rv-actions" id="rvActions"></div>
  </div>
</div>`;
  el.hidden = false;
  $('#stage', s.ctx.root).classList.add('revealed');
  drawRevealActions();
  $('#keepBtn', s.ctx.root)?.focus({ preventScroll: true });
}

function drawRevealActions() {
  const box = $('#rvActions', s.ctx.root);
  if (!box) return;
  const { item, value } = s.result;
  const stillOwned = !!findItem(s.ctx.store.player, item.uid);
  const again = `<button class="btn btn-primary" id="againBtn">Open again · ${coins(s.c.price)}</button>`;
  if (s.sold) box.innerHTML = `<span class="rv-done">${ICONS.check} Sold for ${coins(value)}</span><button class="btn btn-ghost" id="closeRevealBtn">Close</button>${again}`;
  else if (!stillOwned) box.innerHTML = `<span class="rv-done">This item is no longer in your inventory.</span><button class="btn btn-ghost" id="closeRevealBtn">Close</button>${again}`;
  else box.innerHTML = `<button class="btn btn-ghost" id="keepBtn">Keep</button><button class="btn btn-sell" id="sellBtn">Sell for ${coins(value)}</button>${again}`;
  updateButtons();
}

function hideReveal(message) {
  $('#reveal', s.ctx.root).hidden = true;
  $('#stage', s.ctx.root).classList.remove('revealed');
  if (message) status(message);
}

function sellRevealed() {
  const r = s.ctx.store.sell([s.result.item.uid]);
  if (!r.ok) { toast(r.message, { kind: 'error' }); drawRevealActions(); return; }
  s.sold = true;
  sound.sell();
  toast(`Sold for ${fmt(r.total)} coins.`, { kind: 'success' });
  drawRevealActions();
}

function oddsSection(c) {
  const tiers = caseOdds(c).slice().reverse();
  const rows = tiers.map(t => {
    const r = RARITY_BY_ID[t.rarity];
    return `<div class="odds-row" style="--rc:${r.color}"><span class="odds-name">${esc(r.name)}</span><span class="odds-bar"><span style="width:${Math.max(1, t.chance * 100)}%"></span></span><b>${fmtPct(t.chance)}</b><span class="muted small">${t.items.length} item${t.items.length === 1 ? '' : 's'}</span></div>`;
  }).join('');
  const cards = tiers.flatMap(t => t.items.slice().sort((a, b) => ITEMS_BY_ID[b.itemId].value - ITEMS_BY_ID[a.itemId].value)
    .map(x => itemCard(x.itemId, null, { chance: x.chance, value: ITEMS_BY_ID[x.itemId].value }))).join('');
  const wears = WEARS.map(w => `${w.name} ${fmtPct(WEAR_CHANCES[w.id])} (×${w.mult})`).join(' · ');
  return `
<div class="odds-table">${rows}</div>
<div class="item-grid">${cards}</div>
<p class="muted small odds-note">Each rarity's chance is split evenly between its items. Values shown are for Field-Tested copies; wear changes them: ${esc(wears)}. Vanilla knives have no wear.</p>`;
}

function onResize() {
  if (!s) return;
  if (s.phase === 'spinning' && s.mode === 'spin') finish(); // geometry changed mid-spin: land now
  else placeAt(centerOffset(s.centerIndex, geometry()));
}

export default {
  title: ctx => getCase(ctx.params[0])?.name || 'Case not found',
  render(ctx) {
    const { root, store } = ctx;
    const c = getCase(ctx.params[0]);
    if (!c) {
      root.innerHTML = emptyState({ icon: 'cases', title: 'Case not found', text: 'That case does not exist.', action: '<a class="btn btn-primary" href="#/cases">Browse cases</a>' });
      return;
    }
    s = { c, ctx, phase: 'idle', mode: null, raf: 0, timer: 0, result: null, sold: false, centerIndex: 0, lastIndex: -1 };
    const top = [...c.pool].sort((a, b) => ITEMS_BY_ID[b].value - ITEMS_BY_ID[a].value)[0];
    root.innerHTML = `
<a class="back-link" href="#/cases">${ICONS.back} All cases</a>
<section class="case-hero" style="--case-a:${c.theme.from};--case-b:${c.theme.to}">
  <img class="ch-art" src="${caseArt(c.id)}" alt="">
  <div class="ch-info">
    <span class="cc-cat">${esc(CASE_CATEGORY_BY_ID[c.category].name)}</span>${c.featured ? ' <span class="cc-cat cc-cat-feat">Featured</span>' : ''}
    <h2>${esc(c.name)}</h2>
    <p>${esc(c.tagline)}</p>
    <p class="ch-meta muted small">${c.pool.length} possible items · Top reward: ${esc(ITEMS_BY_ID[top].name)}</p>
    <div class="ch-actions">
      <button class="btn btn-primary btn-lg" id="openBtn"></button>
      <label class="toggle"><input type="checkbox" id="instantToggle" ${store.player.settings.instantOpen ? 'checked' : ''}><span>Skip animation</span></label>
    </div>
    <p class="ch-afford small" id="affordMsg"></p>
  </div>
</section>
<section class="roulette-stage" id="stage">
  <div class="roulette" id="roulette">
    <div class="rl-track" id="track"></div>
    <div class="rl-marker" aria-hidden="true"></div>
  </div>
  <div class="rl-bar"><span id="rlStatus" class="muted small" aria-live="polite"></span><button class="btn btn-ghost btn-sm" id="skipBtn" hidden>${ICONS.skip} Skip animation</button></div>
  <div class="reveal" id="reveal" hidden aria-live="polite"></div>
</section>
<section class="section">
  <div class="section-head"><h2>Contents &amp; odds</h2><span class="muted small">These are the exact numbers each opening draws from.</span></div>
  ${oddsSection(c)}
</section>`;

    drawIdle();
    updateButtons();
    root.addEventListener('click', e => {
      const id = e.target.closest('button')?.id;
      if (id === 'openBtn' || id === 'againBtn') open();
      else if (id === 'skipBtn') finish();
      else if (id === 'keepBtn') hideReveal(`${ITEMS_BY_ID[s.result.item.itemId].name} is in your inventory.`);
      else if (id === 'sellBtn') sellRevealed();
      else if (id === 'closeRevealBtn') hideReveal('');
    });
    $('#instantToggle', root).addEventListener('change', e => store.updateSettings({ instantOpen: e.target.checked }));
    window.addEventListener('resize', onResize);
  },
  onStore() {
    if (!s) return;
    $('#instantToggle', s.ctx.root).checked = s.ctx.store.player.settings.instantOpen;
    if (s.phase === 'revealed' && !$('#reveal', s.ctx.root).hidden) drawRevealActions();
    else updateButtons();
  },
  destroy() {
    window.removeEventListener('resize', onResize);
    if (!s) return;
    cancelAnimationFrame(s.raf);
    clearTimeout(s.timer);
    if (s.phase === 'spinning') {
      s.ctx.opener.finish();
      toast(`${ITEMS_BY_ID[s.result.item.itemId].name} was added to your inventory.`, { kind: 'info' });
    }
    s = null;
  },
};
