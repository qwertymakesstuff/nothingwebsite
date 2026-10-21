// The simulated marketplace: listings (featured, recently added, all), the item browser with price
// history, and the player's own listings. NPC sellers and buyers are simulated by market.js.

import { ITEMS, ITEMS_BY_ID, WEAPON_TYPES, COLLECTION_BY_ID } from '../items.js';
import { RARITIES, RARITY_BY_ID } from '../rarities.js';
import { WEARS } from '../wear.js';
import { MARKET } from '../config.js';
import { marketPrice, priceHistory, priceBounds, saleChancePerMinute, sellerFee } from '../market.js';
import { findItem, instanceValue } from '../economy.js';
import { itemArt } from '../art.js';
import { coins, itemCard, rarityPill, itemTitle, wearName, itemDescription, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { $, $$, esc, fmt, money, timeAgo, debounce } from '../ui/dom.js';
import { openModal, closeModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const TABS = [['listings', 'Listings'], ['browse', 'Browse items'], ['mine', 'My listings']];
const ui = { q: '', rarity: 'all', type: 'all', sort: 'newest', bq: '', brarity: 'all', btype: 'all', bsort: 'price-asc', blimit: 48 };
let s = null;
let modalItem = null; // { itemId, wear } shown in the details modal, redrawn on market changes

const DISCLAIMER = 'Prices are SkinSpin\'s own simulation, bounded to within ±15% of each item\'s value. They are not real CS2 market prices.';

const allListings = player => [
  ...player.market.npc.map(l => ({ ...l, mine: false })),
  ...player.market.mine.map(l => ({ id: l.id, itemId: l.item.itemId, wear: l.item.wear, float: l.item.float, price: l.price, seller: player.name, listedAt: l.listedAt, featured: false, mine: true })),
];

function listingCard(l, now) {
  const mp = marketPrice(l.itemId, l.wear, now);
  const diff = (l.price - mp) / mp;
  const tag = Math.abs(diff) < 0.005 ? 'at market' : `${diff > 0 ? '+' : '−'}${Math.abs(diff * 100).toFixed(1)}% vs market`;
  return itemCard(l.itemId, l.wear, {
    value: l.price,
    classes: `listing ${l.mine ? 'is-mine' : ''}`,
    note: `${l.mine ? '<span class="tag tag-you">Your listing</span>' : `<span class="tag">NPC</span> ${esc(l.seller)}`} · ${timeAgo(l.listedAt, now)}`,
    inner: `<span class="ls-diff ${diff <= 0 ? 'good' : 'bad'}">${tag}</span>
<div class="ls-actions"><button class="btn btn-ghost btn-sm" data-details="${l.itemId}" data-wear="${l.wear || ''}">Details</button>
${l.mine ? `<button class="btn btn-danger btn-sm" data-cancel="${l.id}">Cancel</button>` : `<button class="btn btn-primary btn-sm" data-buy="${l.id}">Buy</button>`}</div>`,
  });
}

function filtered(list) {
  const needle = ui.q.trim().toLowerCase();
  const sorts = {
    newest: (a, b) => b.listedAt - a.listedAt,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    deal: (a, b) => a.price / marketPrice(a.itemId, a.wear) - b.price / marketPrice(b.itemId, b.wear),
  };
  return list.filter(l => {
    const it = ITEMS_BY_ID[l.itemId];
    return (ui.rarity === 'all' || it.rarity === ui.rarity) && (ui.type === 'all' || it.type === ui.type) && (!needle || it.name.toLowerCase().includes(needle));
  }).sort(sorts[ui.sort] || sorts.newest);
}

function drawListings() {
  const { root, store } = s.ctx;
  const now = Date.now();
  const all = allListings(store.player);
  const featured = all.filter(l => l.featured).sort((a, b) => b.price - a.price).slice(0, 4);
  const recent = [...all].sort((a, b) => b.listedAt - a.listedAt).slice(0, 4);
  const list = filtered(all);
  $('#mkFeatured', root).innerHTML = featured.length ? `<div class="item-grid">${featured.map(l => listingCard(l, now)).join('')}</div>` : '<p class="muted">No featured listings right now.</p>';
  $('#mkRecent', root).innerHTML = `<div class="item-grid">${recent.map(l => listingCard(l, now)).join('')}</div>`;
  $('#mkAll', root).innerHTML = list.length ? `<div class="item-grid">${list.map(l => listingCard(l, now)).join('')}</div>`
    : emptyState({ icon: 'search', title: 'No listings match', text: 'Try other filters. New NPC listings appear every few minutes.' });
  $('#mkCount', root).textContent = `${list.length} of ${all.length} listings`;
}

function drawBrowse() {
  const { root, store } = s.ctx;
  const now = Date.now();
  const all = allListings(store.player);
  const needle = ui.bq.trim().toLowerCase();
  const rows = ITEMS
    .filter(it => (ui.brarity === 'all' || it.rarity === ui.brarity) && (ui.btype === 'all' || it.type === ui.btype) && (!needle || it.name.toLowerCase().includes(needle)))
    .map(it => ({ it, price: marketPrice(it.id, it.hasWear ? 'FT' : null, now), n: all.filter(l => l.itemId === it.id).length }))
    .sort(ui.bsort === 'price-desc' ? (a, b) => b.price - a.price : ui.bsort === 'listings' ? (a, b) => b.n - a.n || a.price - b.price : ui.bsort === 'name' ? (a, b) => a.it.name.localeCompare(b.it.name) : (a, b) => a.price - b.price);
  $('#bwCount', root).textContent = `${rows.length} items · market price shown for Field-Tested`;
  $('#bwGrid', root).innerHTML = rows.length
    ? `<div class="item-grid item-grid-compact">${rows.slice(0, ui.blimit).map(r => itemCard(r.it.id, null, {
      value: r.price, classes: 'pick',
      note: r.n ? `${r.n} listing${r.n === 1 ? '' : 's'}` : 'No listings',
      inner: `<button class="ic-hit" data-details="${r.it.id}" data-wear="${r.it.hasWear ? 'FT' : ''}" aria-label="${esc(r.it.name)} details"></button>`,
    })).join('')}</div>${rows.length > ui.blimit ? `<div class="more"><button class="btn btn-ghost" data-bmore>Show more (${rows.length - ui.blimit} left)</button></div>` : ''}`
    : emptyState({ icon: 'search', title: 'No items match' });
}

function drawMine() {
  const { root, store } = s.ctx;
  const p = store.player;
  const now = Date.now();
  const mine = [...p.market.mine].sort((a, b) => b.listedAt - a.listedAt);
  $('#myList', root).innerHTML = mine.length
    ? `<div class="item-grid">${mine.map(l => listingCard({ id: l.id, itemId: l.item.itemId, wear: l.item.wear, price: l.price, listedAt: l.listedAt, mine: true }, now)).join('')}</div>`
    : emptyState({ icon: 'marketplace', title: 'You have no listings', text: 'List an item and NPC buyers may buy it. Prices near or below market sell fastest.' });
  $('#myCount', root).textContent = `${mine.length} / ${MARKET.maxPlayerListings} listings`;
  const sales = p.activity.filter(a => a.type === 'market-sale' || a.type === 'market-buy').slice(0, 15);
  $('#mySales', root).innerHTML = sales.length
    ? `<ol class="history">${sales.map(a => `<li class="${a.type === 'market-sale' ? 'win' : ''}"><span class="h-badge">${a.type === 'market-sale' ? 'SOLD' : 'BOUGHT'}</span><span class="h-items"><img src="${itemArt(a.itemId)}" alt=""> ${esc(ITEMS_BY_ID[a.itemId].name)}${a.wear ? ` (${a.wear})` : ''}</span><span class="h-meta">${a.delta >= 0 ? '+' : '−'}${money(Math.abs(a.delta))}<br><time>${timeAgo(a.at)}</time></span></li>`).join('')}</ol>`
    : '<p class="muted">Nothing bought or sold yet.</p>';
}

function draw() {
  if (!s) return;
  const tab = s.tab;
  if (tab === 'listings') drawListings();
  else if (tab === 'browse') drawBrowse();
  else drawMine();
}

// ---------- price chart (one series: no legend, crosshair + tooltip, table for screen readers) ----------

function chartHtml(points) {
  const W = 560, H = 200, L = 48, R = 12, T = 12, B = 26;
  const prices = points.map(p => p.price);
  let lo = Math.min(...prices), hi = Math.max(...prices);
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const pad = (hi - lo) * 0.12;
  lo = Math.max(0, lo - pad); hi += pad;
  const x = i => L + (i / (points.length - 1)) * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.price).toFixed(1)}`).join(' ');
  const date = at => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `<div class="chart" data-points='${JSON.stringify(points.map(p => [p.at, p.price]))}' data-geo='${JSON.stringify({ W, H, L, R, T, B, lo, hi })}'>
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Simulated price over the last ${points.length} days, from ${money(points[0].price)} to ${money(points.at(-1).price)}">
  ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" class="axis" text-anchor="end">${money(v)}</text>`).join('')}
  <text x="${L}" y="${H - 6}" class="axis">${date(points[0].at)}</text><text x="${W - R}" y="${H - 6}" class="axis" text-anchor="end">Today</text>
  <path d="${path}" class="line"/>
  <circle r="4" class="dot" cx="${x(points.length - 1).toFixed(1)}" cy="${y(points.at(-1).price).toFixed(1)}"/>
  <g class="hover" hidden><line class="cross" y1="${T}" y2="${H - B}"/><circle r="4.5" class="dot"/></g>
  <rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>
</svg>
<div class="chart-tip" hidden></div>
<table class="sr-only"><caption>Daily simulated price</caption><thead><tr><th>Date</th><th>Price</th></tr></thead><tbody>${points.map(p => `<tr><td>${date(p.at)}</td><td>${money(p.price)}</td></tr>`).join('')}</tbody></table>
</div>`;
}

function bindChart(el) {
  const box = el.querySelector('.chart');
  if (!box) return;
  const pts = JSON.parse(box.dataset.points);
  const g = JSON.parse(box.dataset.geo);
  const svg = box.querySelector('svg');
  const hover = svg.querySelector('.hover');
  const tip = box.querySelector('.chart-tip');
  const move = e => {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * g.W;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(((sx - g.L) / (g.W - g.L - g.R)) * (pts.length - 1))));
    const px = g.L + (i / (pts.length - 1)) * (g.W - g.L - g.R);
    const py = g.T + (1 - (pts[i][1] - g.lo) / (g.hi - g.lo)) * (g.H - g.T - g.B);
    hover.hidden = false;
    hover.querySelector('.cross').setAttribute('x1', px); hover.querySelector('.cross').setAttribute('x2', px);
    hover.querySelector('circle').setAttribute('cx', px); hover.querySelector('circle').setAttribute('cy', py);
    tip.hidden = false;
    tip.innerHTML = `<b>${money(pts[i][1])}</b><span>${i === pts.length - 1 ? 'Today' : new Date(pts[i][0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`;
    const left = (px / g.W) * r.width;
    tip.style.left = `${Math.min(r.width - 90, Math.max(0, left - 45))}px`;
    tip.style.top = `${(py / g.H) * r.height - 52}px`;
  };
  const hit = svg.querySelector('.hit');
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerleave', () => { hover.hidden = true; tip.hidden = true; });
}

// ---------- modals ----------

function detailsBody(itemId, wear) {
  const p = s.ctx.store.player;
  const now = Date.now();
  const it = ITEMS_BY_ID[itemId];
  const t = itemTitle(itemId);
  const hist = priceHistory(itemId, wear, now);
  const first = hist[0].price, last = hist.at(-1).price;
  const change = (last - first) / first;
  const listings = allListings(p).filter(l => l.itemId === itemId).sort((a, b) => a.price - b.price);
  const owned = p.inventory.filter(i => i.itemId === itemId);
  return `
<div class="inspect" style="--rc:${RARITY_BY_ID[it.rarity].color}">
  <div class="inspect-art"><img src="${itemArt(itemId)}" alt=""></div>
  <div class="inspect-info">
    ${rarityPill(it.rarity)}
    <h3><span>${esc(t.weapon)}</span> ${esc(t.finish)}</h3>
    <p class="muted small">${esc(itemDescription(itemId))}</p>
    ${it.hasWear ? `<div class="wear-chips" role="group" aria-label="Wear">${WEARS.map(w => `<button class="chip chip-sm" data-dwear="${w.id}" aria-pressed="${wear === w.id}" title="${w.name}">${w.id}</button>`).join('')}</div>` : ''}
    <dl class="kv">
      <div><dt>Market price${wear ? ` (${esc(wearName(wear))})` : ''}</dt><dd><b>${money(last)}</b></dd></div>
      <div><dt>${MARKET.historyDays}-day change</dt><dd class="${change >= 0 ? 'good' : 'bad'}">${change >= 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(1)}%</dd></div>
      <div><dt>${MARKET.historyDays}-day range</dt><dd>${money(Math.min(...hist.map(h => h.price)))} – ${money(Math.max(...hist.map(h => h.price)))}</dd></div>
      <div><dt>You own</dt><dd>${owned.length ? `${owned.length} (${owned.map(o => o.wear || '—').join(', ')})` : 'None'}</dd></div>
    </dl>
  </div>
</div>
<h4 class="chart-title">Simulated price, last ${MARKET.historyDays} days</h4>
${chartHtml(hist)}
<p class="muted small">${esc(DISCLAIMER)}</p>
<h4 class="chart-title">Listings for this item</h4>
${listings.length ? `<ul class="sell-list">${listings.map(l => `<li style="--rc:${RARITY_BY_ID[it.rarity].color}"><span>${l.wear ? `<em>${l.wear}</em> ` : ''}${l.mine ? '<span class="tag tag-you">Yours</span>' : `<span class="tag">NPC</span> ${esc(l.seller)}`} <em>${timeAgo(l.listedAt, now)}</em></span>${coins(l.price)} ${l.mine ? `<button class="btn btn-danger btn-sm" data-cancel="${l.id}">Cancel</button>` : `<button class="btn btn-primary btn-sm" data-buy="${l.id}">Buy</button>`}</li>`).join('')}</ul>` : '<p class="muted">Nobody is selling this right now.</p>'}`;
}

function openDetails(itemId, wear) {
  const it = ITEMS_BY_ID[itemId];
  modalItem = { itemId, wear: it.hasWear ? (wear || 'FT') : null };
  const m = openModal({ title: it.name, body: detailsBody(modalItem.itemId, modalItem.wear), wide: true, onClose: () => { modalItem = null; } });
  bindChart(m.el);
  m.el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.dwear) { modalItem.wear = b.dataset.dwear; refreshDetails(); }
    else if (b.dataset.buy) confirmBuy(b.dataset.buy);
    else if (b.dataset.cancel) cancel(b.dataset.cancel);
  });
}

function refreshDetails() {
  const dlg = document.querySelector('dialog.modal[open]');
  if (!dlg || !modalItem) return;
  dlg.querySelector('.modal-body').innerHTML = detailsBody(modalItem.itemId, modalItem.wear);
  bindChart(dlg);
}

function confirmBuy(listingId) {
  const { store } = s.ctx;
  const l = store.player.market.npc.find(x => x.id === listingId);
  if (!l) {
    if (store.player.market.mine.some(x => x.id === listingId)) return toast("You can't buy your own listing.", { kind: 'error' });
    return toast('That listing is no longer available.', { kind: 'error' });
  }
  const it = ITEMS_BY_ID[l.itemId];
  const short = l.price - store.player.coins;
  openModal({
    title: 'Buy this item?',
    body: `<div class="result-reveal" style="--rc:${RARITY_BY_ID[it.rarity].color}"><img src="${itemArt(l.itemId)}" alt="">${rarityPill(it.rarity)}<h3>${esc(it.name)}</h3><p class="muted">${l.wear ? `${esc(wearName(l.wear))} · float ${l.float.toFixed(4)}` : 'No wear'} · sold by ${esc(l.seller)} (NPC)</p><p class="rv-value">${coins(l.price)}</p>
<p class="small muted">Market price ${money(marketPrice(l.itemId, l.wear))} · instant-sell value ${money(instanceValue(l))}</p>
${short > 0 ? `<p class="warn">You need ${money(short)} more.</p>` : ''}</div>`,
    actions: [{ label: 'Cancel' }, {
      label: `Buy for ${money(l.price)}`, kind: 'primary', disabled: short > 0, onClick: () => {
        const r = store.buyListing(listingId);
        if (!r.ok) { toast(r.message, { kind: 'error' }); return; }
        sound.sell();
        toast(`Bought ${it.name} for ${money(r.price)}. It's in your inventory.`, { kind: 'success' });
      },
    }],
  });
}

function cancel(listingId) {
  const r = s.ctx.store.cancelListing(listingId);
  if (!r.ok) return toast(r.message, { kind: 'error' });
  toast(`${ITEMS_BY_ID[r.item.itemId].name} is back in your inventory.`, { kind: 'success' });
  refreshDetails();
}

function sellTime(ratio) {
  const p = saleChancePerMinute(ratio);
  if (p <= 0) return 'NPC buyers won\'t pay this much. It will stay listed until you cancel it.';
  const mins = Math.log(0.5) / Math.log(1 - p);
  return `About half of listings at this price sell within ${mins < 60 ? `${Math.max(1, Math.round(mins))} min` : `${(mins / 60).toFixed(1)} h`} while SkinSpin is open or between visits.`;
}

function openListPicker() {
  const { store } = s.ctx;
  const p = store.player;
  const items = p.inventory.filter(i => !i.locked).sort((a, b) => instanceValue(b) - instanceValue(a));
  const locked = p.inventory.length - items.length;
  if (p.market.mine.length >= MARKET.maxPlayerListings) return toast(`You can have at most ${MARKET.maxPlayerListings} listings.`, { kind: 'error' });
  let chosen = null;
  const body = () => {
    if (!chosen) {
      return items.length
        ? `${locked ? `<p class="muted small">${locked} locked item${locked === 1 ? ' is' : 's are'} hidden: locked items can't be listed.</p>` : ''}<div class="item-grid item-grid-compact">${items.map(i => itemCard(i.itemId, i.wear, { value: instanceValue(i), classes: 'pick', inner: `<button class="ic-hit" data-choose="${i.uid}" aria-label="List ${esc(ITEMS_BY_ID[i.itemId].name)}"></button>` })).join('')}</div>`
        : emptyState({ icon: 'inventory', title: 'Nothing to list', text: 'Only unlocked items in your inventory can be listed.' });
    }
    const inst = findItem(store.player, chosen);
    if (!inst) { chosen = null; return body(); }
    const b = priceBounds(inst.itemId, inst.wear);
    return `<div class="list-form">
  ${itemCard(inst.itemId, inst.wear, { value: instanceValue(inst) })}
  <div>
    <p>Market price <b>${money(b.market)}</b> · instant-sell value ${money(instanceValue(inst))}</p>
    <label class="price-input"><span>Your price ($)</span><input type="number" id="priceIn" min="${b.min}" max="${b.max}" step="1" value="${b.market}" inputmode="numeric"></label>
    <p class="muted small">Allowed: ${money(b.min)} – ${money(b.max)}. A ${MARKET.fee * 100}% market fee is taken when it sells.</p>
    <p id="payout"></p><p class="muted small" id="eta"></p>
    <div class="ph-actions" style="justify-content:flex-start"><button class="btn btn-ghost" data-back>Choose another</button><button class="btn btn-primary" data-confirm-list>List item</button></div>
  </div>
</div>`;
  };
  const m = openModal({ title: 'List an item', body: body(), wide: true });
  const update = () => {
    const inst = chosen && findItem(store.player, chosen);
    const input = m.el.querySelector('#priceIn');
    if (!inst || !input) return;
    const b = priceBounds(inst.itemId, inst.wear);
    const v = Number(input.value);
    const ok = Number.isInteger(v) && v >= b.min && v <= b.max;
    m.el.querySelector('#payout').innerHTML = ok ? `You receive ${coins(v - sellerFee(v))} when it sells.` : `<span class="warn">Enter a whole number between ${fmt(b.min)} and ${fmt(b.max)}.</span>`;
    m.el.querySelector('#eta').textContent = ok ? sellTime(v / b.market) : '';
    m.el.querySelector('[data-confirm-list]').disabled = !ok;
  };
  const redraw = () => { m.el.querySelector('.modal-body').innerHTML = body(); update(); };
  m.el.addEventListener('input', e => { if (e.target.id === 'priceIn') update(); });
  m.el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.choose) { chosen = b.dataset.choose; redraw(); }
    else if ('back' in b.dataset) { chosen = null; redraw(); }
    else if ('confirmList' in b.dataset) {
      b.disabled = true;
      const r = store.listItem(chosen, Number(m.el.querySelector('#priceIn').value));
      if (!r.ok) { toast(r.message, { kind: 'error' }); b.disabled = false; return; }
      toast(`Listed ${ITEMS_BY_ID[r.listing.item.itemId].name} for ${money(r.listing.price)}.`, { kind: 'success' });
      closeModal();
    }
  });
}

// ---------- page ----------

function renderTab() {
  const { root } = s.ctx;
  const pane = $('#mkPane', root);
  const opt = (v, l) => `<option value="${v}">${esc(l)}</option>`;
  const rarityOpts = `${opt('all', 'All rarities')}${RARITIES.map(r => opt(r.id, r.name)).join('')}`;
  const typeOpts = `${opt('all', 'All types')}${WEAPON_TYPES.map(t => opt(t.id, t.name)).join('')}`;
  if (s.tab === 'listings') {
    pane.innerHTML = `
<section class="section"><div class="section-head"><h2>Featured</h2><span class="muted small">Covert and Extraordinary listings</span></div><div id="mkFeatured"></div></section>
<section class="section"><div class="section-head"><h2>Recently added</h2></div><div id="mkRecent"></div></section>
<section class="section"><div class="section-head"><h2>All listings</h2><span class="muted small" id="mkCount"></span></div>
<div class="toolbar">
  <label class="search"><span class="sr-only">Search listings</span><input type="search" id="mq" placeholder="Search listings…" value="${esc(ui.q)}"></label>
  <label class="select"><span>Rarity</span><select id="mr">${rarityOpts}</select></label>
  <label class="select"><span>Type</span><select id="mt">${typeOpts}</select></label>
  <label class="select"><span>Sort</span><select id="ms">${opt('newest', 'Newest first')}${opt('price-asc', 'Price: low to high')}${opt('price-desc', 'Price: high to low')}${opt('deal', 'Best deal vs market')}</select></label>
</div><div id="mkAll"></div></section>`;
    $('#mr', root).value = ui.rarity; $('#mt', root).value = ui.type; $('#ms', root).value = ui.sort;
    $('#mq', root).addEventListener('input', debounce(e => { ui.q = e.target.value; drawListings(); }, 120));
    for (const [id, key] of [['#mr', 'rarity'], ['#mt', 'type'], ['#ms', 'sort']]) $(id, root).addEventListener('change', e => { ui[key] = e.target.value; drawListings(); });
  } else if (s.tab === 'browse') {
    pane.innerHTML = `
<section class="section"><div class="toolbar">
  <label class="search"><span class="sr-only">Search items</span><input type="search" id="bq" placeholder="Search all ${ITEMS.length} items…" value="${esc(ui.bq)}"></label>
  <label class="select"><span>Rarity</span><select id="br">${rarityOpts}</select></label>
  <label class="select"><span>Type</span><select id="bt">${typeOpts}</select></label>
  <label class="select"><span>Sort</span><select id="bs">${opt('price-asc', 'Price: low to high')}${opt('price-desc', 'Price: high to low')}${opt('listings', 'Most listed')}${opt('name', 'Name')}</select></label>
</div><p class="muted small" id="bwCount"></p><div id="bwGrid"></div></section>`;
    $('#br', root).value = ui.brarity; $('#bt', root).value = ui.btype; $('#bs', root).value = ui.bsort;
    $('#bq', root).addEventListener('input', debounce(e => { ui.bq = e.target.value; ui.blimit = 48; drawBrowse(); }, 120));
    for (const [id, key] of [['#br', 'brarity'], ['#bt', 'btype'], ['#bs', 'bsort']]) $(id, root).addEventListener('change', e => { ui[key] = e.target.value; ui.blimit = 48; drawBrowse(); });
  } else {
    pane.innerHTML = `
<section class="section"><div class="section-head"><h2>Your listings</h2><span class="muted small" id="myCount"></span><button class="btn btn-primary" id="listBtn">List an item</button></div>
<p class="muted small">A listed item leaves your inventory until it sells or you cancel. NPC buyers check listings over time; nothing sells above ${Math.round(1.3 * 100)}% of market price. You can't buy your own listings.</p>
<div id="myList"></div></section>
<section class="section"><div class="section-head"><h2>Recent market activity</h2></div><div id="mySales"></div></section>`;
    $('#listBtn', root).addEventListener('click', openListPicker);
  }
  draw();
}

export default {
  title: 'Marketplace',
  render(ctx) {
    const { root } = ctx;
    const tab = TABS.some(([id]) => id === ctx.params[0]) ? ctx.params[0] : 'listings';
    s = { ctx, tab };
    root.innerHTML = `
<p class="lede">Buy from NPC sellers or list your own items for NPC buyers, using your $ balance. ${esc(DISCLAIMER)}</p>
<nav class="tabs" aria-label="Marketplace sections">${TABS.map(([id, label]) => `<a class="tab" href="#/marketplace/${id}" aria-current="${id === tab ? 'page' : 'false'}">${label}${id === 'mine' && ctx.store.player.market.mine.length ? ` <span class="count">${ctx.store.player.market.mine.length}</span>` : ''}</a>`).join('')}</nav>
<div id="mkPane"></div>`;
    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.closest('dialog')) return;
      if (b.dataset.details) openDetails(b.dataset.details, b.dataset.wear || null);
      else if (b.dataset.buy) confirmBuy(b.dataset.buy);
      else if (b.dataset.cancel) cancel(b.dataset.cancel);
      else if ('bmore' in b.dataset) { ui.blimit += 48; drawBrowse(); }
    });
    renderTab();
  },
  onStore() {
    if (!s) return;
    draw();
    refreshDetails();
    const tabCount = s.ctx.root.querySelector('.tab[href$="/mine"]');
    if (tabCount) tabCount.innerHTML = `My listings${s.ctx.store.player.market.mine.length ? ` <span class="count">${s.ctx.store.player.market.mine.length}</span>` : ''}`;
  },
  destroy() { s = null; modalItem = null; },
};
