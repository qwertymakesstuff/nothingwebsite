// Inventory: search, filters, sorting, inspection, favourites, locks, single and bulk selling.

import { ITEMS_BY_ID, WEAPON_TYPES, COLLECTION_BY_ID } from '../items.js';
import { RARITIES, RARITY_BY_ID } from '../rarities.js';
import { instanceValue, inventoryValue, quoteSale, findItem } from '../economy.js';
import { itemArt } from '../art.js';
import { coins, itemCard, rarityPill, itemTitle, wearName, sourceName, emptyState, itemDescription } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, esc, fmt, money, dateTime } from '../ui/dom.js';
import { openModal, closeModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const PAGE = 60;
const ui = { q: '', rarity: 'all', type: 'all', show: 'all', sort: 'newest', limit: PAGE, selecting: false, selected: new Set(), includeFavorites: null };

const SORTS = {
  newest: (a, b) => b.acquiredAt - a.acquiredAt || b.uid.localeCompare(a.uid, undefined, { numeric: true }),
  oldest: (a, b) => a.acquiredAt - b.acquiredAt || a.uid.localeCompare(b.uid, undefined, { numeric: true }),
  'value-desc': (a, b) => instanceValue(b) - instanceValue(a),
  'value-asc': (a, b) => instanceValue(a) - instanceValue(b),
  'rarity-desc': (a, b) => RARITY_BY_ID[ITEMS_BY_ID[b.itemId].rarity].rank - RARITY_BY_ID[ITEMS_BY_ID[a.itemId].rarity].rank || instanceValue(b) - instanceValue(a),
  'rarity-asc': (a, b) => RARITY_BY_ID[ITEMS_BY_ID[a.itemId].rarity].rank - RARITY_BY_ID[ITEMS_BY_ID[b.itemId].rarity].rank || instanceValue(a) - instanceValue(b),
  'name-asc': (a, b) => ITEMS_BY_ID[a.itemId].name.localeCompare(ITEMS_BY_ID[b.itemId].name),
  'name-desc': (a, b) => ITEMS_BY_ID[b.itemId].name.localeCompare(ITEMS_BY_ID[a.itemId].name),
};

export function filterInventory(inventory, { q = '', rarity = 'all', type = 'all', show = 'all', sort = 'newest' } = {}) {
  const needle = q.trim().toLowerCase();
  return inventory.filter(inst => {
    const it = ITEMS_BY_ID[inst.itemId];
    if (rarity !== 'all' && it.rarity !== rarity) return false;
    if (type !== 'all' && it.type !== type) return false;
    if (show === 'favorites' && !inst.favorite) return false;
    if (show === 'locked' && !inst.locked) return false;
    if (show === 'unlocked' && inst.locked) return false;
    return !needle || it.name.toLowerCase().includes(needle) || (inst.wear && wearName(inst.wear).toLowerCase().includes(needle));
  }).sort(SORTS[sort] || SORTS.newest);
}

let ctxRef = null;
const includeFavs = () => ui.includeFavorites ?? !ctxRef.store.player.settings.protectFavorites;

function selectable(inst) {
  if (inst.locked) return { ok: false, why: 'Locked items cannot be sold. Unlock it first.' };
  if (inst.favorite && !includeFavs()) return { ok: false, why: 'Favourites are protected from bulk selling. Tick "Include favourites" to select them.' };
  return { ok: true };
}

// Drop selections that are gone, locked, or now-protected favourites.
function pruneSelection() {
  const p = ctxRef.store.player;
  for (const uid of [...ui.selected]) {
    const inst = findItem(p, uid);
    if (!inst || !selectable(inst).ok) ui.selected.delete(uid);
  }
}

function cardFor(inst) {
  const sel = ui.selected.has(inst.uid);
  const blocked = ui.selecting && !selectable(inst).ok;
  const flags = `
<button class="ic-flag ic-fav ${inst.favorite ? 'on' : ''}" data-act="fav" data-uid="${inst.uid}" aria-pressed="${inst.favorite}" title="${inst.favorite ? 'Remove from favourites' : 'Add to favourites'}">${inst.favorite ? ICONS.heart : ICONS.heartOutline}</button>
<button class="ic-flag ic-lock ${inst.locked ? 'on' : ''}" data-act="lock" data-uid="${inst.uid}" aria-pressed="${inst.locked}" title="${inst.locked ? 'Unlock' : 'Lock (prevents selling)'}">${inst.locked ? ICONS.lock : ICONS.unlock}</button>
<button class="ic-hit" data-act="${ui.selecting ? 'toggle' : 'inspect'}" data-uid="${inst.uid}" aria-label="${esc(ITEMS_BY_ID[inst.itemId].name)}${ui.selecting ? (sel ? ', selected' : ', not selected') : ', inspect'}"></button>
${ui.selecting ? `<span class="ic-check ${sel ? 'on' : ''}">${ICONS.check}</span>` : ''}`;
  return itemCard(inst.itemId, inst.wear, {
    value: instanceValue(inst),
    classes: `inv-card ${sel ? 'is-selected' : ''} ${inst.locked ? 'is-locked' : ''} ${inst.favorite ? 'is-fav' : ''} ${blocked ? 'is-blocked' : ''}`,
    inner: flags,
  });
}

function draw() {
  const { root, store } = ctxRef;
  const p = store.player;
  pruneSelection();
  const all = p.inventory;
  $('#invSummary', root).innerHTML = `<span><b>${fmt(all.length)}</b> item${all.length === 1 ? '' : 's'}</span><span>Total value ${coins(inventoryValue(p))}</span><span>${fmt(all.filter(i => i.locked).length)} locked · ${fmt(all.filter(i => i.favorite).length)} favourites</span>`;

  const list = filterInventory(all, ui);
  const grid = $('#invGrid', root);
  if (!all.length) {
    grid.innerHTML = emptyState({ icon: 'inventory', title: 'Your inventory is empty', text: 'Items you unbox land here. Open a case to get started.', action: '<a class="btn btn-primary" href="#/cases">Browse cases</a>' });
  } else if (!list.length) {
    grid.innerHTML = emptyState({ icon: 'search', title: 'No items match', text: 'Nothing in your inventory matches these filters.', action: '<button class="btn btn-ghost" data-act="clear-filters">Clear filters</button>' });
  } else {
    const shown = list.slice(0, ui.limit);
    grid.innerHTML = `<div class="item-grid">${shown.map(cardFor).join('')}</div>
${list.length > shown.length ? `<div class="more"><button class="btn btn-ghost" data-act="more">Show more (${fmt(list.length - shown.length)} left)</button></div>` : ''}`;
  }
  $('#invCount', root).textContent = all.length ? `Showing ${fmt(Math.min(list.length, ui.limit))} of ${fmt(list.length)} matching` : '';

  const bar = $('#bulkBar', root);
  bar.hidden = !ui.selecting;
  $('#selectBtn', root).textContent = ui.selecting ? 'Done selecting' : 'Select to sell';
  $('#selectBtn', root).setAttribute('aria-pressed', String(ui.selecting));
  if (ui.selecting) {
    const q = ui.selected.size ? quoteSale(p, [...ui.selected], { allowFavorites: includeFavs() }) : null;
    $('#bulkInfo', root).innerHTML = `<b>${fmt(ui.selected.size)}</b> selected${q?.ok ? ` · ${coins(q.total)}` : ''}`;
    $('#bulkSell', root).disabled = !q?.ok;
    $('#includeFavs', root).checked = includeFavs();
  }
}

function inspect(uid) {
  const p = ctxRef.store.player;
  const inst = findItem(p, uid);
  if (!inst) return;
  const it = ITEMS_BY_ID[inst.itemId];
  const t = itemTitle(inst.itemId);
  let confirming = false;
  const body = () => {
    const cur = findItem(ctxRef.store.player, uid);
    if (!cur) return '<p>This item is no longer in your inventory.</p>';
    const value = instanceValue(cur);
    return `
<div class="inspect" style="--rc:${RARITY_BY_ID[it.rarity].color}">
  <div class="inspect-art"><img src="${itemArt(cur.itemId)}" alt=""></div>
  <div class="inspect-info">
    ${rarityPill(it.rarity)}
    <h3><span>${esc(t.weapon)}</span> ${esc(t.finish)}</h3>
    <p class="muted small">${esc(itemDescription(cur.itemId))}</p>
    <p class="inspect-value">${coins(value)}</p>
    <dl class="kv">
      <div><dt>Wear</dt><dd>${cur.wear ? `${esc(wearName(cur.wear))} (${cur.wear})` : 'No wear'}</dd></div>
      ${cur.wear ? `<div><dt>Float</dt><dd>${cur.float.toFixed(4)}<span class="float-bar"><span style="left:${(cur.float * 100).toFixed(2)}%"></span></span></dd></div>` : ''}
      <div><dt>Collection</dt><dd>${esc(COLLECTION_BY_ID[it.collection].name)}</dd></div>
      <div><dt>Obtained from</dt><dd>${esc(sourceName(cur.source))}</dd></div>
      <div><dt>Obtained</dt><dd>${esc(dateTime(cur.acquiredAt))}</dd></div>
    </dl>
    <div class="inspect-actions">
      <button class="btn btn-ghost" data-iact="fav">${cur.favorite ? ICONS.heart : ICONS.heartOutline} ${cur.favorite ? 'Unfavourite' : 'Favourite'}</button>
      <button class="btn btn-ghost" data-iact="lock">${cur.locked ? ICONS.unlock : ICONS.lock} ${cur.locked ? 'Unlock' : 'Lock'}</button>
      <button class="btn ${confirming ? 'btn-danger' : 'btn-sell'}" data-iact="sell" ${cur.locked ? 'disabled title="Unlock this item to sell it"' : ''}>${confirming ? `Confirm: sell for ${coins(value)}` : `Sell for ${coins(value)}`}</button>
    </div>
    ${cur.locked ? '<p class="muted small">Locked items cannot be sold or used up by any feature.</p>' : ''}
    ${confirming && cur.favorite ? '<p class="warn small">This item is one of your favourites.</p>' : ''}
  </div>
</div>`;
  };
  const m = openModal({ title: it.name, body: body(), wide: true });
  const redraw = () => { m.el.querySelector('.modal-body').innerHTML = body(); };
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-iact]');
    if (!b || b.disabled) return;
    const cur = findItem(ctxRef.store.player, uid);
    if (!cur) return redraw();
    if (b.dataset.iact === 'fav') { confirming = false; ctxRef.store.setFlag(uid, 'favorite', !cur.favorite); redraw(); }
    if (b.dataset.iact === 'lock') { confirming = false; ctxRef.store.setFlag(uid, 'locked', !cur.locked); redraw(); }
    if (b.dataset.iact === 'sell') {
      if (!confirming) { confirming = true; return redraw(); }
      const r = ctxRef.store.sell([uid]);
      if (!r.ok) { toast(r.message, { kind: 'error' }); confirming = false; return redraw(); }
      sound.sell();
      toast(`Sold ${it.name} for ${money(r.total)}.`, { kind: 'success' });
      closeModal();
    }
  });
}

function confirmBulk() {
  const { store } = ctxRef;
  const uids = [...ui.selected];
  const allowFavorites = includeFavs();
  const q = quoteSale(store.player, uids, { allowFavorites });
  if (!q.ok) { toast(q.message, { kind: 'error' }); return; }
  const rows = q.items.slice().sort((a, b) => b.value - a.value).map(({ inst, value }) => {
    const it = ITEMS_BY_ID[inst.itemId];
    return `<li style="--rc:${RARITY_BY_ID[it.rarity].color}"><img src="${itemArt(inst.itemId)}" alt=""><span>${esc(it.name)}${inst.wear ? ` <em>${inst.wear}</em>` : ''}${inst.favorite ? ` <em class="fav-tag">${ICONS.heart} favourite</em>` : ''}</span>${coins(value)}</li>`;
  }).join('');
  openModal({
    title: `Sell ${q.count} item${q.count === 1 ? '' : 's'}?`,
    body: `<p>These items will be removed from your inventory:</p><ul class="sell-list">${rows}</ul>
<p class="sell-total">You receive ${coins(q.total)}</p>
<p class="muted small">Locked items are never included. Favourites are ${allowFavorites ? '<b>included</b> in this sale' : 'protected and left out'}.</p>`,
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      {
        label: `Sell for ${money(q.total)}`, kind: 'danger', onClick: () => {
          const r = store.sell(uids, { allowFavorites });
          if (!r.ok) { toast(r.message, { kind: 'error' }); return; }
          sound.sell();
          ui.selected.clear();
          toast(`Sold ${r.count} item${r.count === 1 ? '' : 's'} for ${money(r.total)}.`, { kind: 'success' });
        },
      },
    ],
  });
}

export default {
  title: 'Inventory',
  render(ctx) {
    ctxRef = ctx;
    const { root, store } = ctx;
    const opt = (v, l) => `<option value="${v}">${esc(l)}</option>`;
    root.innerHTML = `
<div class="inv-head">
  <div class="inv-summary" id="invSummary"></div>
  <button class="btn btn-ghost" id="selectBtn" aria-pressed="false"></button>
</div>
<div class="toolbar">
  <label class="search"><span class="sr-only">Search inventory</span><input type="search" id="invSearch" placeholder="Search your items…" autocomplete="off" value="${esc(ui.q)}"></label>
  <label class="select"><span>Rarity</span><select id="fRarity">${opt('all', 'All rarities')}${RARITIES.map(r => opt(r.id, r.name)).join('')}</select></label>
  <label class="select"><span>Type</span><select id="fType">${opt('all', 'All types')}${WEAPON_TYPES.map(t => opt(t.id, t.name)).join('')}</select></label>
  <label class="select"><span>Show</span><select id="fShow">${opt('all', 'All items')}${opt('favorites', 'Favourites')}${opt('locked', 'Locked')}${opt('unlocked', 'Unlocked')}</select></label>
  <label class="select"><span>Sort</span><select id="fSort">${opt('newest', 'Newest first')}${opt('oldest', 'Oldest first')}${opt('value-desc', 'Value: high to low')}${opt('value-asc', 'Value: low to high')}${opt('rarity-desc', 'Rarity: rarest first')}${opt('rarity-asc', 'Rarity: commonest first')}${opt('name-asc', 'Name: A to Z')}${opt('name-desc', 'Name: Z to A')}</select></label>
</div>
<div class="bulk-bar" id="bulkBar" hidden>
  <span id="bulkInfo"></span>
  <button class="btn btn-ghost btn-sm" data-act="select-all">Select all shown</button>
  <button class="btn btn-ghost btn-sm" data-act="select-none">Clear</button>
  <label class="toggle small"><input type="checkbox" id="includeFavs"><span>Include favourites</span></label>
  <button class="btn btn-danger btn-sm" id="bulkSell">Sell selected</button>
</div>
<p class="muted small" id="invCount"></p>
<div id="invGrid"></div>`;
    $('#fRarity', root).value = ui.rarity;
    $('#fType', root).value = ui.type;
    $('#fShow', root).value = ui.show;
    $('#fSort', root).value = ui.sort;

    const bind = (sel, key) => $(sel, root).addEventListener(sel === '#invSearch' ? 'input' : 'change', e => { ui[key] = e.target.value; ui.limit = PAGE; draw(); });
    bind('#invSearch', 'q'); bind('#fRarity', 'rarity'); bind('#fType', 'type'); bind('#fShow', 'show'); bind('#fSort', 'sort');
    $('#includeFavs', root).addEventListener('change', e => { ui.includeFavorites = e.target.checked; draw(); });
    $('#selectBtn', root).addEventListener('click', () => { ui.selecting = !ui.selecting; ui.selected.clear(); draw(); });
    $('#bulkSell', root).addEventListener('click', confirmBulk);

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const uid = b.dataset.uid;
      const inst = uid && findItem(store.player, uid);
      switch (b.dataset.act) {
        case 'inspect': if (inst) inspect(uid); break;
        case 'toggle': {
          if (!inst) break;
          if (ui.selected.has(uid)) ui.selected.delete(uid);
          else {
            const ok = selectable(inst);
            if (!ok.ok) { toast(ok.why, { kind: 'error' }); break; }
            ui.selected.add(uid);
          }
          draw();
          break;
        }
        case 'fav': if (inst) store.setFlag(uid, 'favorite', !inst.favorite); break;
        case 'lock': if (inst) store.setFlag(uid, 'locked', !inst.locked); break;
        case 'more': ui.limit += PAGE; draw(); break;
        case 'clear-filters':
          Object.assign(ui, { q: '', rarity: 'all', type: 'all', show: 'all', limit: PAGE });
          $('#invSearch', root).value = ''; $('#fRarity', root).value = 'all'; $('#fType', root).value = 'all'; $('#fShow', root).value = 'all';
          draw();
          break;
        case 'select-all':
          for (const i of filterInventory(store.player.inventory, ui).slice(0, ui.limit)) if (selectable(i).ok) ui.selected.add(i.uid);
          draw();
          break;
        case 'select-none': ui.selected.clear(); draw(); break;
      }
    });
    draw();
  },
  onStore() { if (ctxRef) draw(); },
  destroy() { ui.selecting = false; ui.selected.clear(); ui.includeFavorites = null; ctxRef = null; },
};
