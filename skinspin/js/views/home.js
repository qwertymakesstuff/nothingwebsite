// Home: hero, featured cases, the player's recent drops, the rarity ladder.

import { CASES } from '../cases.js';
import { RARITIES } from '../rarities.js';
import { inventoryValue } from '../economy.js';
import { caseCard, itemCard, sourceName, emptyState, coins } from '../ui/components.js';
import { LOGO } from '../ui/icons.js';
import { esc, fmt, timeAgo } from '../ui/dom.js';

export default {
  title: 'Home',
  render({ root, store }) {
    const p = store.player;
    const featured = CASES.filter(c => c.featured);
    const drops = p.recentDrops.slice(0, 12);
    root.innerHTML = `
<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">Welcome back, ${esc(p.name)}</p>
    <h2 class="hero-title">Spin. Reveal. <span>Collect.</span></h2>
    <p class="hero-sub">Open cases of original, fictional weapon skins, build your inventory and chase Extraordinary knives and gloves. Your $ balance is play money: it can't be bought, deposited or cashed out.</p>
    <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/cases">Browse cases</a><a class="btn btn-ghost btn-lg" href="#/inventory">My inventory</a></div>
  </div>
  <div class="hero-side">
    <div class="hero-logo">${LOGO}</div>
    <dl class="hero-stats">
      <div><dt>Balance</dt><dd>${coins(p.coins)}</dd></div>
      <div><dt>Inventory value</dt><dd>${coins(inventoryValue(p))}</dd></div>
      <div><dt>Cases opened</dt><dd>${fmt(p.stats.casesOpened)}</dd></div>
    </dl>
  </div>
</section>

<section class="section">
  <div class="section-head"><h2>Featured cases</h2><a class="link" href="#/cases">All ${CASES.length} cases →</a></div>
  <div class="case-grid">${featured.map(c => caseCard(c, { coinsAvailable: p.coins })).join('')}</div>
</section>

<section class="section">
  <div class="section-head"><h2>Recently obtained</h2>${drops.length ? '<a class="link" href="#/inventory">Inventory →</a>' : ''}</div>
  ${drops.length
    ? `<div class="item-grid item-grid-compact">${drops.map(d => itemCard(d.itemId, d.wear, { note: `${esc(sourceName(d.caseId))} · ${timeAgo(d.at)}` })).join('')}</div>`
    : emptyState({ icon: 'cases', title: 'Nothing unboxed yet', text: 'Your drops will show up here. The Daily Free Case costs nothing to open.', action: '<a class="btn btn-primary" href="#/case/daily">Open the free case</a>' })}
</section>

<section class="section">
  <div class="section-head"><h2>Rarity tiers</h2></div>
  <div class="rarity-ladder">${RARITIES.map(r => `<div class="rung" style="--rc:${r.color}"><span>${esc(r.name)}</span><b>${fmt(p.stats.rarityCounts[r.id] || 0)}</b></div>`).join('')}</div>
  <p class="muted small">How many of each tier you have unboxed. Every case lists its exact odds before you open it.</p>
</section>`;
  },
};
