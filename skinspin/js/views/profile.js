// Profile: name, level, statistics, best drop, activity history.

import { RARITIES } from '../rarities.js';
import { ITEMS_BY_ID, COLLECTION_BY_ID } from '../items.js';
import { listingsValue } from '../market.js';
import { STARTING_COINS, REFILL_AMOUNT } from '../config.js';
import { levelInfo } from '../playerState.js';
import { inventoryValue } from '../economy.js';
import { coins, itemCard, caseName, emptyState } from '../ui/components.js';
import { $, esc, fmt, money, timeAgo, dateTime } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

const ui = { filter: 'all', editing: false };

function activityText(e) {
  const item = e.itemId ? esc(ITEMS_BY_ID[e.itemId].name) + (e.wear ? ` (${e.wear})` : '') : '';
  if (e.type === 'open') return `Opened <b>${esc(caseName(e.caseId))}</b> and unboxed <b>${item}</b>`;
  if (e.type === 'sell') return e.count === 1 && item ? `Sold <b>${item}</b>` : `Sold <b>${fmt(e.count)} items</b>`;
  if (e.type === 'refill') return 'Claimed free cash';
  if (e.type === 'upgrade') return `${e.success ? 'Upgraded' : 'Failed to upgrade'} <b>${esc(ITEMS_BY_ID[e.inputItemId]?.name || 'an item')}</b> ${e.success ? 'into' : 'towards'} <b>${item}</b> (${(e.chance * 100).toFixed(2)}%)`;
  if (e.type === 'contract') return `Traded up ${fmt(e.count)} items into <b>${item}</b>`;
  if (e.type === 'collection') return `Completed the <b>${esc(COLLECTION_BY_ID[e.collectionId]?.name || 'collection')}</b>`;
  if (e.type === 'battle') return `${e.won ? 'Won' : 'Lost'} a ${fmt(e.players)}-player case battle (${fmt(e.rounds)} round${e.rounds === 1 ? '' : 's'}${e.won ? `, ${money(e.pot)} in items` : ''})`;
  if (e.type === 'market-buy') return `Bought <b>${item}</b> on the marketplace`;
  if (e.type === 'market-sale') return `Your <b>${item}</b> sold on the marketplace for ${money(e.price)}`;
  if (e.type === 'market-list') return `Listed <b>${item}</b> for ${money(e.price)}`;
  if (e.type === 'market-cancel') return `Cancelled your listing of <b>${item}</b>`;
  return esc(e.type);
}

const view = {
  title: 'Profile',
  render(ctx) {
    const { root, store } = ctx;
    const p = store.player;
    const s = p.stats;
    const lv = levelInfo(p.xp);
    const inv = inventoryValue(p);
    const listed = listingsValue(p);
    const net = p.coins + inv + listed - STARTING_COINS - s.refillsClaimed * REFILL_AMOUNT;
    const favCase = Object.entries(s.casesById).sort((a, b) => b[1] - a[1])[0];
    const maxR = Math.max(1, ...RARITIES.map(r => s.rarityCounts[r.id] || 0));
    const acts = p.activity.filter(e => ui.filter === 'all' || e.type === ui.filter || (ui.filter === 'market' && e.type.startsWith('market'))).slice(0, 60);
    root.innerHTML = `
<section class="profile-head">
  <div class="avatar" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</div>
  <div class="profile-id">
    ${ui.editing
      ? `<form id="nameForm" class="name-form"><label class="sr-only" for="nameInput">Player name</label><input id="nameInput" maxlength="20" value="${esc(p.name)}" required><button class="btn btn-primary btn-sm">Save</button><button type="button" class="btn btn-ghost btn-sm" id="cancelName">Cancel</button></form>`
      : `<h2>${esc(p.name)} <button class="btn btn-ghost btn-sm" id="editName">Rename</button></h2>`}
    <p class="muted small">Playing since ${esc(dateTime(p.createdAt))}</p>
    <div class="level-row"><span class="lvl-badge lvl-lg">${lv.level}</span><div class="lvl-wide"><span>Level ${lv.level}${lv.needed ? ` · ${fmt(lv.into)} / ${fmt(lv.needed)} XP` : ' · max'}</span><span class="xp-bar"><span style="width:${(lv.progress * 100).toFixed(1)}%"></span></span></div></div>
  </div>
</section>

<section class="stat-grid">
  <div class="stat"><dt>Balance</dt><dd>${coins(p.coins)}</dd></div>
  <div class="stat"><dt>Inventory value</dt><dd>${coins(inv)}${listed ? ` <span class="muted small">+ ${money(listed)} listed</span>` : ''}</dd></div>
  <div class="stat"><dt>Net result</dt><dd class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</dd></div>
  <div class="stat"><dt>Cases opened</dt><dd>${fmt(s.casesOpened)}</dd></div>
  <div class="stat"><dt>Spent on cases</dt><dd>${money(s.coinsSpent)}</dd></div>
  <div class="stat"><dt>Items sold</dt><dd>${fmt(s.itemsSold)}</dd></div>
  <div class="stat"><dt>Earned from sales</dt><dd>${money(s.coinsFromSales)}</dd></div>
  <div class="stat"><dt>Upgrades won</dt><dd>${fmt(s.upgradesWon)} <span class="muted">/ ${fmt(s.upgradesAttempted)}</span></dd></div>
  <div class="stat"><dt>Contracts signed</dt><dd>${fmt(s.contractsCompleted)}</dd></div>
  <div class="stat"><dt>Battles won</dt><dd>${fmt(s.battlesWon)} <span class="muted">/ ${fmt(s.battlesPlayed)}</span></dd></div>
  <div class="stat"><dt>Market bought / sold</dt><dd>${fmt(s.marketBought)} <span class="muted">/ ${fmt(s.marketSold)}</span></dd></div>
  <div class="stat"><dt>Collections completed</dt><dd>${fmt(s.collectionsCompleted)}</dd></div>
  <div class="stat"><dt>Most opened case</dt><dd>${favCase ? `${esc(caseName(favCase[0]))} <span class="muted">×${fmt(favCase[1])}</span>` : '—'}</dd></div>
</section>

<div class="profile-cols">
  <section class="section">
    <div class="section-head"><h2>Drops by rarity</h2></div>
    <div class="rarity-bars">${RARITIES.map(r => `<div class="rbar" style="--rc:${r.color}"><span>${esc(r.name)}</span><span class="rbar-track"><span style="width:${((s.rarityCounts[r.id] || 0) / maxR * 100).toFixed(1)}%"></span></span><b>${fmt(s.rarityCounts[r.id] || 0)}</b></div>`).join('')}</div>
    <div class="section-head"><h2>Best drop</h2></div>
    ${s.bestDrop ? `<div class="best-drop">${itemCard(s.bestDrop.itemId, s.bestDrop.wear, { value: s.bestDrop.value, note: `${esc(caseName(s.bestDrop.caseId))} · ${timeAgo(s.bestDrop.at)}` })}</div>` : '<p class="muted">Open a case to set your best drop.</p>'}
  </section>
  <section class="section">
    <div class="section-head"><h2>Activity</h2>
      <label class="select"><span class="sr-only">Filter activity</span><select id="actFilter"><option value="all">Everything</option><option value="open">Openings</option><option value="sell">Sales</option><option value="upgrade">Upgrades</option><option value="contract">Contracts</option><option value="battle">Battles</option><option value="market">Marketplace</option><option value="collection">Collections</option><option value="refill">Free cash</option></select></label>
    </div>
    ${acts.length ? `<ol class="activity">${acts.map(e => `<li><span>${activityText(e)}</span><span class="act-meta"><span class="${e.delta >= 0 ? 'good' : 'bad'}">${e.delta >= 0 ? '+' : '−'}${money(Math.abs(e.delta))}</span><time datetime="${new Date(e.at).toISOString()}" title="${esc(dateTime(e.at))}">${timeAgo(e.at)}</time></span></li>`).join('')}</ol>`
      : emptyState({ icon: 'profile', title: 'No activity yet', text: ui.filter === 'all' ? 'Opening and selling show up here.' : 'Nothing of this kind yet.' })}
    <p class="muted small">The latest 200 events are kept.</p>
  </section>
</div>`;
    $('#actFilter', root).value = ui.filter;
    $('#actFilter', root).addEventListener('change', e => { ui.filter = e.target.value; rerender(ctx); });
    root.addEventListener('click', e => {
      if (e.target.closest('#editName')) { ui.editing = true; rerender(ctx); $('#nameInput', ctx.root)?.focus(); }
      if (e.target.closest('#cancelName')) { ui.editing = false; rerender(ctx); }
    });
    $('#nameForm', root)?.addEventListener('submit', e => {
      e.preventDefault();
      const r = store.rename($('#nameInput', root).value);
      if (!r.ok) { toast(r.message, { kind: 'error' }); return; }
      ui.editing = false;
      rerender(ctx);
      toast('Name saved.', { kind: 'success' });
    });
  },
  destroy() { ui.editing = false; },
};

export default view;

// Re-render in place on a fresh root (so old listeners are dropped).
function rerender(ctx) {
  const root = document.createElement('div');
  root.className = ctx.root.className;
  ctx.root.replaceWith(root);
  ctx.root = root;
  view.render(ctx);
}
