// Trade-up contracts: pick CONTRACT.size items of one rarity, review every possible output with its
// odds, then sign. The odds shown come from the same quoteContract() the store signs with.

import { ITEMS_BY_ID } from '../items.js';
import { RARITIES, RARITY_BY_ID } from '../rarities.js';
import { CONTRACT } from '../config.js';
import { contractEligible, contractOutcomes, quoteContract, nextRarity } from '../contracts.js';
import { findItem, instanceValue } from '../economy.js';
import { itemArt } from '../art.js';
import { coins, itemCard, rarityPill, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, esc, money, fmtPct, timeAgo } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const ui = { selected: [], rarity: null, q: '' };
let s = null;

function pool(player) {
  return player.inventory.filter(i => !i.locked && contractEligible(i.itemId));
}

function selectedInstances(player) {
  ui.selected = ui.selected.filter(uid => { const i = findItem(player, uid); return i && !i.locked; });
  return ui.selected.map(uid => findItem(player, uid));
}

function draw() {
  const { root, store } = s.ctx;
  const p = store.player;
  const sel = selectedInstances(p);
  const rarity = sel.length ? ITEMS_BY_ID[sel[0].itemId].rarity : ui.rarity;
  const eligible = pool(p);
  const rarities = RARITIES.filter(r => eligible.some(i => ITEMS_BY_ID[i.itemId].rarity === r.id));
  if (!sel.length && (!ui.rarity || !rarities.some(r => r.id === ui.rarity))) ui.rarity = rarities[0]?.id || null;
  const activeRarity = sel.length ? rarity : ui.rarity;

  // slots
  const slots = Array.from({ length: CONTRACT.size }, (_, i) => sel[i]
    ? itemCard(sel[i].itemId, sel[i].wear, { value: instanceValue(sel[i]), classes: 'slot-card', inner: `<button class="ic-hit" data-remove="${sel[i].uid}" aria-label="Remove ${esc(ITEMS_BY_ID[sel[i].itemId].name)}"></button><span class="slot-x">${ICONS.close}</span>` })
    : `<div class="slot-empty">${i + 1}</div>`).join('');
  $('#slots', root).innerHTML = slots;

  const inputValue = sel.reduce((sum, i) => sum + instanceValue(i), 0);
  const outcomes = sel.length ? contractOutcomes(sel) : [];
  const expected = outcomes.reduce((sum, o) => sum + o.chance * o.value, 0);
  const full = sel.length === CONTRACT.size;
  $('#summary', root).innerHTML = `
<div class="sum-row"><span>Items</span><b>${sel.length} / ${CONTRACT.size}</b></div>
<div class="sum-row"><span>Tiers</span><b>${activeRarity ? `${rarityPill(activeRarity)} → ${nextRarity(activeRarity) ? rarityPill(nextRarity(activeRarity)) : '—'}` : '—'}</b></div>
<div class="sum-row"><span>Input value</span><b>${coins(inputValue)}</b></div>
<div class="sum-row"><span>Average outcome</span><b>${sel.length ? coins(expected) : '—'}</b></div>
${sel.length && !full ? `<p class="muted small">The odds below are for the items chosen so far; each new item changes them.</p>` : ''}`;
  $('#signBtn', root).disabled = !full;
  $('#fillBtn', root).disabled = !activeRarity || full;
  $('#clearBtn', root).disabled = !sel.length;

  $('#outcomes', root).innerHTML = outcomes.length
    ? `<div class="item-grid item-grid-compact">${outcomes.map(o => itemCard(o.itemId, o.wear, { value: o.value, chance: o.chance })).join('')}</div>
       <p class="muted small">Each input gives an equal ${fmtPct(1 / CONTRACT.size)} share, split evenly over the next-rarity items of its own collection. Covert inputs turn into Extraordinary items: their collection's own, or knives and gloves from the cases that carry it. The output's float is the average of the inputs' floats (${outcomes[0].float != null ? outcomes[0].float.toFixed(4) : '—'}).</p>`
    : '<p class="muted">Add items to see what the contract can produce.</p>';

  // picker
  $('#rarityChips', root).innerHTML = rarities.map(r => `<button class="chip chip-sm" data-rar="${r.id}" aria-pressed="${activeRarity === r.id}" ${sel.length && r.id !== rarity ? 'disabled' : ''} style="--rc:${r.color}">${esc(r.name)} <span class="muted">${eligible.filter(i => ITEMS_BY_ID[i.itemId].rarity === r.id).length}</span></button>`).join('');
  const needle = ui.q.trim().toLowerCase();
  const list = eligible
    .filter(i => ITEMS_BY_ID[i.itemId].rarity === activeRarity && !ui.selected.includes(i.uid))
    .filter(i => !needle || ITEMS_BY_ID[i.itemId].name.toLowerCase().includes(needle))
    .sort((a, b) => instanceValue(a) - instanceValue(b));
  const lockedN = p.inventory.filter(i => i.locked).length;
  $('#picker', root).innerHTML = !eligible.length
    ? emptyState({ icon: 'contracts', title: 'No items for a contract', text: `You need ${CONTRACT.size} unlocked items of the same rarity (Consumer to Covert).`, action: '<a class="btn btn-primary" href="#/cases">Open cases</a>' })
    : `${lockedN ? `<p class="muted small">${lockedN} locked item${lockedN === 1 ? '' : 's'} hidden: locked items are never used in contracts.</p>` : ''}
       ${list.length ? `<div class="item-grid item-grid-compact">${list.map(i => itemCard(i.itemId, i.wear, { value: instanceValue(i), classes: 'pick', inner: `<button class="ic-hit" data-add="${i.uid}" ${full ? 'disabled' : ''} aria-label="Add ${esc(ITEMS_BY_ID[i.itemId].name)}"></button>${i.favorite ? `<span class="ic-badge-fav" title="Favourite">${ICONS.heart}</span>` : ''}` })).join('')}</div>` : '<p class="muted">No more items of this rarity.</p>'}`;

  const h = p.contracts;
  $('#history', root).innerHTML = h.length
    ? `<ol class="history">${h.map(c => `<li class="win"><span class="h-badge" style="--rc:${RARITY_BY_ID[ITEMS_BY_ID[c.output.itemId].rarity].color}">${esc(RARITY_BY_ID[ITEMS_BY_ID[c.output.itemId].rarity].name)}</span>
      <span class="h-items">${c.inputs.length} × ${esc(RARITY_BY_ID[ITEMS_BY_ID[c.inputs[0].itemId].rarity].name)} (${money(c.inputValue)}) <b>→</b> <img src="${itemArt(c.output.itemId)}" alt=""> ${esc(ITEMS_BY_ID[c.output.itemId].name)}${c.output.wear ? ` (${c.output.wear})` : ''}</span>
      <span class="h-meta">${money(c.output.value)}<br><time>${timeAgo(c.at)}</time></span></li>`).join('')}</ol>`
    : '<p class="muted">Signed contracts will appear here.</p>';
}

function autofill() {
  const p = s.ctx.store.player;
  const sel = selectedInstances(p);
  const rarity = sel.length ? ITEMS_BY_ID[sel[0].itemId].rarity : ui.rarity;
  const extra = pool(p)
    .filter(i => ITEMS_BY_ID[i.itemId].rarity === rarity && !i.favorite && !ui.selected.includes(i.uid))
    .sort((a, b) => instanceValue(a) - instanceValue(b))
    .slice(0, CONTRACT.size - sel.length);
  if (!extra.length) return toast('No more unlocked, non-favourite items of this rarity.', { kind: 'error' });
  ui.selected.push(...extra.map(i => i.uid));
  draw();
}

function confirmSign() {
  const { store } = s.ctx;
  const q = quoteContract(store.player, ui.selected);
  if (!q.ok) return toast(q.message, { kind: 'error' });
  const favs = q.items.filter(i => i.favorite).length;
  openModal({
    title: 'Sign this contract?',
    wide: true,
    body: `<p>These ${q.items.length} items will be used up:</p>
<ul class="sell-list">${q.items.map(i => `<li style="--rc:${RARITY_BY_ID[ITEMS_BY_ID[i.itemId].rarity].color}"><img src="${itemArt(i.itemId)}" alt=""><span>${esc(ITEMS_BY_ID[i.itemId].name)} <em>${i.wear}</em>${i.favorite ? ` <em class="fav-tag">${ICONS.heart} favourite</em>` : ''}</span>${coins(instanceValue(i))}</li>`).join('')}</ul>
<p class="sell-total">You receive one of:</p>
<ul class="sell-list">${q.outcomes.map(o => `<li style="--rc:${RARITY_BY_ID[ITEMS_BY_ID[o.itemId].rarity].color}"><img src="${itemArt(o.itemId)}" alt=""><span>${esc(ITEMS_BY_ID[o.itemId].name)}${o.wear ? ` <em>${o.wear}</em>` : ''}</span><b>${fmtPct(o.chance)}</b>&nbsp;${coins(o.value)}</li>`).join('')}</ul>
${favs ? `<p class="warn small">${favs} of these items ${favs === 1 ? 'is a favourite' : 'are favourites'}.</p>` : ''}`,
    actions: [{ label: 'Cancel' }, {
      label: 'Sign contract', kind: 'primary', onClick: () => {
        const r = store.contract(ui.selected);
        if (!r.ok) { toast(r.message, { kind: 'error' }); return; }
        ui.selected = [];
        sound.reveal(RARITY_BY_ID[ITEMS_BY_ID[r.item.itemId].rarity].rank);
        showResult(r);
      },
    }],
  });
}

function showResult(r) {
  const it = ITEMS_BY_ID[r.item.itemId];
  openModal({
    title: 'Contract complete',
    className: 'result-modal',
    body: `<div class="result-reveal" style="--rc:${RARITY_BY_ID[it.rarity].color}"><img src="${itemArt(it.id)}" alt="">${rarityPill(it.rarity)}<h3>${esc(it.name)}</h3><p class="muted">${r.item.wear ? `${r.item.wear} · float ${r.item.float.toFixed(4)}` : 'No wear'} · ${fmtPct(r.chance)} chance</p><p class="rv-value">${coins(r.value)}</p></div>`,
    actions: [{ label: 'View inventory', onClick: () => { location.hash = '#/inventory'; } }, { label: 'Another contract', kind: 'primary' }],
  });
}

export default {
  title: 'Contracts',
  render(ctx) {
    const { root } = ctx;
    s = { ctx };
    root.innerHTML = `
<p class="lede">Trade in <b>${CONTRACT.size} items of the same rarity</b> for one item of the next rarity up. Locked items are never used.</p>
<section class="contract">
  <div class="slots" id="slots"></div>
  <aside class="contract-side">
    <div id="summary"></div>
    <div class="contract-actions">
      <button class="btn btn-ghost btn-sm" id="fillBtn">Auto-fill cheapest</button>
      <button class="btn btn-ghost btn-sm" id="clearBtn">Clear</button>
      <button class="btn btn-primary" id="signBtn">Review &amp; sign</button>
    </div>
    <p class="muted small">Auto-fill skips favourites.</p>
  </aside>
</section>
<section class="section"><div class="section-head"><h2>Possible outcomes</h2></div><div id="outcomes"></div></section>
<section class="section">
  <div class="section-head"><h2>Your eligible items</h2><div class="chips" id="rarityChips"></div></div>
  <div class="toolbar"><label class="search"><span class="sr-only">Search</span><input type="search" id="cq" placeholder="Search…" value="${esc(ui.q)}"></label></div>
  <div id="picker"></div>
</section>
<section class="section"><div class="section-head"><h2>History</h2></div><div id="history"></div></section>`;
    $('#cq', root).addEventListener('input', e => { ui.q = e.target.value; draw(); });
    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.add && ui.selected.length < CONTRACT.size) { ui.selected.push(b.dataset.add); draw(); }
      else if (b.dataset.remove) { ui.selected = ui.selected.filter(u => u !== b.dataset.remove); draw(); }
      else if (b.dataset.rar) { ui.rarity = b.dataset.rar; draw(); }
      else if (b.id === 'fillBtn') autofill();
      else if (b.id === 'clearBtn') { ui.selected = []; draw(); }
      else if (b.id === 'signBtn') confirmSign();
    });
    draw();
  },
  onStore() { if (s) draw(); },
  destroy() { s = null; },
};
