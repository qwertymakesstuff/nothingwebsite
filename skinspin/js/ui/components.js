// Reusable markup: coins, rarity pills, item cards, case cards.

import { ITEMS_BY_ID, itemValue, WEAPON_TYPE_BY_ID, COLLECTION_BY_ID } from '../items.js';
import { RARITY_BY_ID } from '../rarities.js';
import { WEAR_BY_ID } from '../wear.js';
import { CASE_CATEGORY_BY_ID, CASES_BY_ID } from '../cases.js';
import { itemArt, caseArt } from '../art.js';
import { ICONS } from './icons.js';
import { esc, fmt, fmtPct } from './dom.js';

export const coins = (n, cls = '') => `<span class="coins ${cls}">${ICONS.coin}<b>${fmt(n)}</b></span>`;

export function rarityPill(rarityId) {
  const r = RARITY_BY_ID[rarityId];
  return `<span class="rarity-pill" style="--rc:${r.color}">${esc(r.name)}</span>`;
}

export const wearName = w => (w && WEAR_BY_ID[w] ? WEAR_BY_ID[w].name : 'No wear');

export function itemTitle(itemId) {
  const it = ITEMS_BY_ID[itemId];
  return { weapon: `${it.type === 'knife' || it.type === 'gloves' ? '★ ' : ''}${it.weaponName}`, finish: it.hasWear ? it.finish : 'Vanilla' };
}

// Options: value, chance, note, classes, attrs (raw), inner (raw), hideValue
export function itemCard(itemId, wear = null, opts = {}) {
  const it = ITEMS_BY_ID[itemId];
  if (!it) return '';
  const r = RARITY_BY_ID[it.rarity];
  const t = itemTitle(itemId);
  const value = opts.value ?? itemValue(itemId, wear);
  return `<div class="item-card r-${it.rarity} ${opts.classes || ''}" style="--rc:${r.color}" ${opts.attrs || ''}>
  <div class="ic-art"><img src="${itemArt(itemId)}" alt="" decoding="async"></div>
  <div class="ic-text"><span class="ic-weapon">${esc(t.weapon)}</span><span class="ic-finish">${esc(t.finish)}</span></div>
  <div class="ic-foot">
    ${wear ? `<span class="ic-wear" title="${esc(wearName(wear))}">${esc(wear)}</span>` : ''}
    ${opts.chance != null ? `<span class="ic-chance" title="Drop chance">${fmtPct(opts.chance)}</span>` : ''}
    ${opts.hideValue ? '' : coins(value, 'ic-value')}
  </div>
  ${opts.note ? `<div class="ic-note">${opts.note}</div>` : ''}
  ${opts.inner || ''}
</div>`;
}

export function itemDescription(itemId) {
  const it = ITEMS_BY_ID[itemId];
  return `${RARITY_BY_ID[it.rarity].name} ${WEAPON_TYPE_BY_ID[it.type].name.replace(/s$/, '').replace(/Knive$/, 'Knife')} · ${COLLECTION_BY_ID[it.collection].name}`;
}

export function caseCard(c, { coinsAvailable = Infinity } = {}) {
  const examples = [...c.pool].sort((a, b) => ITEMS_BY_ID[b].value - ITEMS_BY_ID[a].value).slice(0, 3);
  const affordable = coinsAvailable >= c.price;
  return `<a class="case-card" href="#/case/${c.id}" style="--case-a:${c.theme.from};--case-b:${c.theme.to}">
  <span class="cc-top"><span class="cc-cat">${esc(CASE_CATEGORY_BY_ID[c.category].name)}</span>${c.featured ? `<span class="cc-featured" title="Featured">${ICONS.star}</span>` : ''}</span>
  <img class="cc-art" src="${caseArt(c.id)}" alt="">
  <span class="cc-name">${esc(c.name)}</span>
  <span class="cc-examples" title="Top rewards">${examples.map(id => `<img src="${itemArt(id)}" alt="${esc(ITEMS_BY_ID[id].name)}" style="--rc:${RARITY_BY_ID[ITEMS_BY_ID[id].rarity].color}">`).join('')}</span>
  <span class="cc-price ${affordable ? '' : 'cc-short'}">${coins(c.price)}</span>
</a>`;
}

export const caseName = id => (CASES_BY_ID[id] ? CASES_BY_ID[id].name : 'Unknown case');

export function emptyState({ icon = 'inventory', title, text = '', action = '' }) {
  return `<div class="empty-state">${ICONS[icon] || ''}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}
