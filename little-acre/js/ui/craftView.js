// Crafting (bag menu tab) and cooking (at the kitchen) lists.

import { h, clear, icon } from './dom.js';
import { iconURL } from '../render/sprites.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { allRecipes, craftProblem, craft } from '../crafting.js';
import { test, describe } from '../conditions.js';
import { count } from '../inventory.js';

const tokenName = t => (t.startsWith('tag:') ? `any ${t.slice(4)}` : t.startsWith('cat:') ? `any ${t.slice(4)}` : ITEMS_BY_ID[t].name);
const tokenIcon = t => (t.includes(':') ? null : icon(iconURL(t)));

export function craftingContent(ui, station, rerender) {
  const g = ui.game, s = g.state;
  const list = h('div.list');
  for (const r of allRecipes(station)) {
    const known = test(s, r.unlock);
    const out = ITEMS_BY_ID[r.out];
    if (!known) {
      list.append(h('div.item.locked', h('img.icon', { src: iconURL(r.out), style: { filter: 'brightness(0)', opacity: '.35' } }), h('div.grow', h('b', '???'), h('div.desc', `Learn it: ${r.unlock.type === 'quest' ? 'finish a quest' : describe(r.unlock)}`))));
      continue;
    }
    const why = craftProblem(s, r);
    list.append(h('div.item',
      icon(iconURL(r.out)),
      h('div.grow',
        h('b', `${out.name}${r.n > 1 ? ` ×${r.n}` : ''}`),
        h('div.desc', out.desc + (out.energy ? ` (+${out.energy} energy)` : '')),
        h('div.need', Object.entries(r.in).map(([t, n], i) => h('span', i ? ' · ' : '', tokenIcon(t) ? h('img.icon', { src: iconURL(t), style: { width: '16px', height: '16px', verticalAlign: 'middle' } }) : null, h(count(s, t) >= n ? 'span.ok' : 'span.no', ` ${tokenName(t)} ${Math.min(count(s, t), n)}/${n}`))))),
      h('button.btn.green', { disabled: !!why, title: why || '', on: { click: () => {
        if (craft(s, r)) { ui.audio?.sfx('craft'); ui.toast(`${station === 'kitchen' ? 'Cooked' : 'Crafted'} ${out.name}${r.n > 1 ? ` ×${r.n}` : ''}`, 'good'); g.quest('craft', { item: r.out, n: r.n }); rerender(); }
      } } }, station === 'kitchen' ? 'Cook' : 'Craft')));
  }
  return h('div', station === 'kitchen' ? h('p.hint', 'Cooked meals restore lots of energy and sell well.') : h('p.hint', 'Recipes unlock through quests and friendship. Placeable items go on your farm: select one in the hotbar and press Space on an empty tile.'), list);
}

export function openCrafting(ui, station) {
  const wrap = h('div', { style: { width: 'min(640px, 92vw)' } });
  const render = () => clear(wrap).append(h('h2', station === 'kitchen' ? 'Kitchen' : 'Crafting'), craftingContent(ui, station, render));
  render();
  ui.modal(wrap);
}
