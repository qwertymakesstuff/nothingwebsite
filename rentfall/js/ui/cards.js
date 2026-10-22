// Cards and tooltip contents for symbols, relics, supplies and services.

import { h, svg, money } from './dom.js';
import { iconSvg } from '../icons.js';
import { SYMBOL_BY_ID } from '../symbols.js';
import { RELIC_BY_ID, ITEM_BY_ID, SERVICE_BY_ID } from '../relics.js';
import { RARITIES } from '../config.js';
import { explainCell } from '../effects.js';

export const icon = (name, cls) => svg(iconSvg(name, cls));
export const rarityBadge = r => h('span.rar', { class: r }, RARITIES[r]?.label || r);

export function symbolTip(id, inst = null) {
  const d = SYMBOL_BY_ID[id];
  if (!d) return null;
  return h('div',
    h('h4', d.name, rarityBadge(d.rarity)),
    h('p', h('b', `Base ${d.base + (inst?.bonus || 0)}`), inst?.bonus ? ` (polished +${inst.bonus})` : '', inst?.laminated ? ' · laminated' : ''),
    h('p', d.desc),
    h('p.notes', `Trigger: ${d.trigger}`),
    d.tags.length ? h('p', d.tags.map(t => h('span.tag', t)).reduce((a, b) => [a, ' ', b])) : null,
  );
}

export function cellTip(cell, explanations = true) {
  if (!cell?.id) return h('div', h('h4', 'Lights off'), h('p', 'An empty window. Nothing earned here this spin.'));
  const d = SYMBOL_BY_ID[cell.id];
  return h('div',
    h('h4', d.name, rarityBadge(d.rarity), h('b', { style: { marginLeft: 'auto' } }, `= ${cell.value}`)),
    h('p', d.desc),
    explanations ? h('div.calc', explainCell(cell)) : null,
    cell.notes?.length ? h('p.notes', cell.notes.join(' · ')) : null,
  );
}

export function relicTip(id) {
  const r = RELIC_BY_ID[id];
  return r ? h('div', h('h4', r.name, h('span.rar.relic', 'Relic')), h('p', r.desc)) : null;
}
export function itemTip(id, usable) {
  const r = ITEM_BY_ID[id];
  return r ? h('div', h('h4', r.name, h('span.rar.item', 'Supply')), h('p', r.desc), h('p.notes', usable ? 'Click to use.' : 'Not usable right now.')) : null;
}

function card({ art, artClass, name, badge, desc, foot, onClick, disabled, sold, key, title }) {
  return h('button.card', { type: 'button', onclick: onClick, disabled: disabled || sold, class: sold ? 'sold' : '', title },
    key ? h('span.key', key) : null,
    h('div.art', { class: artClass }, icon(art)),
    h('div', h('div.name', name), h('div.meta', badge)),
    h('div.desc', desc),
    foot ? h('div.foot', foot) : h('div'),
  );
}

const priceTag = (price, money_) => h('span.price', { class: money_ < price ? 'cant' : '' }, price === 0 ? 'FREE' : money(price));

export function symbolCard(id, { price = null, have = null, ownedCount = 0, ...rest } = {}) {
  const d = SYMBOL_BY_ID[id];
  return card({
    art: id, artClass: `r-${d.rarity}`, name: d.name, badge: [rarityBadge(d.rarity)],
    desc: d.desc,
    foot: [h('span.base', `Base ${d.base}`), ownedCount ? h('span.owned', `own ${ownedCount}`) : null, price != null ? priceTag(price, have) : null],
    ...rest,
  });
}

export function relicCard(id, { price = null, have = null, ...rest } = {}) {
  const r = RELIC_BY_ID[id];
  return card({ art: r.icon, artClass: 'relic', name: r.name, badge: h('span.rar.relic', 'Relic'), desc: r.desc, foot: [h('span'), price != null ? priceTag(price, have) : null], ...rest });
}

export function itemCard(id, { price = null, have = null, ...rest } = {}) {
  const r = ITEM_BY_ID[id];
  return card({ art: r.icon, artClass: 'item', name: r.name, badge: h('span.rar.item', 'Supply'), desc: r.desc, foot: [h('span'), price != null ? priceTag(price, have) : null], ...rest });
}

export function serviceCard(id, { price = null, have = null, ...rest } = {}) {
  const s = SERVICE_BY_ID[id] || { name: 'Remove a symbol', icon: 'remove', desc: 'Permanently remove one symbol from your collection. Thinner collections roll your best symbols more often.' };
  return card({ art: s.icon, artClass: 'item', name: s.name, badge: h('span.rar', 'Service'), desc: s.desc, foot: [h('span'), price != null ? priceTag(price, have) : h('span.price', 'varies')], ...rest });
}
