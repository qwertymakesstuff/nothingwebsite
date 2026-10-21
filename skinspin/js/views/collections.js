// Collections: overview of all collections, and a page per collection with collected and missing
// items, completion and its one-time reward.

import { COLLECTIONS, COLLECTION_BY_ID, ITEMS_BY_ID } from '../items.js';
import { RARITY_BY_ID } from '../rarities.js';
import { CASES_BY_ID } from '../cases.js';
import { COLLECTION_ITEMS, collectionProgress, collectionReward, collectionSources } from '../collections.js';
import { itemArt } from '../art.js';
import { coins, itemCard, emptyState } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { esc, fmt, money, dateTime } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { sound } from '../ui/sound.js';

const status = pr => (pr.claimed ? '<span class="col-status done">Reward collected</span>'
  : pr.complete ? '<span class="col-status ready">Reward ready</span>'
    : `<span class="col-status">${pr.found}/${pr.total}</span>`);

function overview(root, player) {
  const all = COLLECTIONS.map(c => ({ c, pr: collectionProgress(player, c.id) }));
  const done = all.filter(x => x.pr.complete).length;
  root.innerHTML = `
<p class="lede">Every item you obtain from any source counts towards its collection, even if you sell it later. Complete a collection to claim its reward once.</p>
<div class="inv-summary"><span><b>${done}</b> / ${COLLECTIONS.length} collections complete</span><span><b>${fmt(player.collectionLog.length)}</b> / ${fmt(Object.values(COLLECTION_ITEMS).flat().length)} items collected</span></div>
<div class="col-grid">${all.map(({ c, pr }) => {
    const top = COLLECTION_ITEMS[c.id][0];
    const r = collectionReward(c.id);
    return `<a class="col-card ${pr.complete ? 'is-complete' : ''}" href="#/collections/${c.id}" style="--rc:${RARITY_BY_ID[ITEMS_BY_ID[top].rarity].color}">
  <img src="${itemArt(top)}" alt="">
  <span class="col-name">${esc(c.name)}</span>
  <span class="col-bar"><span style="width:${(pr.pct * 100).toFixed(1)}%"></span></span>
  <span class="col-foot">${status(pr)}<span>${coins(r.coins)}</span></span>
</a>`;
  }).join('')}</div>`;
}

function detail(root, store, colId) {
  const player = store.player;
  const c = COLLECTION_BY_ID[colId];
  const pr = collectionProgress(player, colId);
  const r = collectionReward(colId);
  const sources = collectionSources(colId);
  const cards = COLLECTION_ITEMS[colId].map(id => {
    const have = player.collectionLog.includes(id);
    const owned = pr.owned[id] || 0;
    return itemCard(id, null, {
      value: ITEMS_BY_ID[id].value,
      classes: have ? 'col-item' : 'col-item is-missing',
      note: have ? (owned ? `${ICONS.check} In inventory ×${owned}` : `${ICONS.check} Collected`) : 'Missing',
    });
  }).join('');
  root.innerHTML = `
<a class="back-link" href="#/collections">${ICONS.back} All collections</a>
<section class="col-head">
  <div>
    <h2>${esc(c.name)}</h2>
    <p class="muted">${pr.found} of ${pr.total} items collected · ${Math.floor(pr.pct * 100)}%</p>
    <span class="col-bar col-bar-lg"><span style="width:${(pr.pct * 100).toFixed(1)}%"></span></span>
    <p class="small">Drops from: ${sources.map(id => `<a class="link" href="#/case/${id}">${esc(CASES_BY_ID[id].name)}</a>`).join(', ')}</p>
  </div>
  <div class="col-reward">
    <p class="eyebrow">Completion reward</p>
    <p class="col-reward-amt">${coins(r.coins)} <span class="muted">+ ${fmt(r.xp)} XP</span></p>
    ${pr.claimed
      ? `<p class="good small">${ICONS.check} Collected on ${esc(dateTime(pr.claimedAt))}</p>`
      : `<button class="btn btn-primary" id="claimBtn" ${pr.complete ? '' : 'disabled'}>${pr.complete ? 'Claim reward' : `${pr.total - pr.found} item${pr.total - pr.found === 1 ? '' : 's'} to go`}</button>`}
  </div>
</section>
<div class="item-grid">${cards}</div>`;
  root.querySelector('#claimBtn')?.addEventListener('click', e => {
    e.currentTarget.disabled = true; // one click, one claim; the transaction refuses repeats anyway
    const res = store.claimCollection(colId);
    if (!res.ok) { toast(res.message, { kind: 'error' }); return; }
    sound.reveal(6);
    toast(`${c.name} complete! ${money(res.coins)} and ${fmt(res.xp)} XP added.`, { kind: 'success' });
  });
}

export default {
  title: ctx => (ctx.params[0] && COLLECTION_BY_ID[ctx.params[0]] ? COLLECTION_BY_ID[ctx.params[0]].name : 'Collections'),
  render(ctx) {
    const id = ctx.params[0];
    if (!id) return overview(ctx.root, ctx.store.player);
    if (!COLLECTION_BY_ID[id]) {
      ctx.root.innerHTML = emptyState({ icon: 'collections', title: 'Collection not found', action: '<a class="btn btn-primary" href="#/collections">All collections</a>' });
      return;
    }
    detail(ctx.root, ctx.store, id);
  },
};
