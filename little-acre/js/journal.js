// The collection journal: everything you have grown, found, caught, mined, cooked and made.

import { CROPS } from './data/crops.js';
import { FORAGE } from './data/forage.js';
import { FISH } from './data/fish.js';
import { ITEMS } from './data/items.js';

const MINERALS = ['stone', 'coal', 'copper_ore', 'iron_ore', 'copper_bar', 'iron_bar', 'quartz', 'amethyst', 'topaz'];

export function journal(state) {
  const s = state.stats;
  const n = (bucket, id) => bucket[id] || 0;
  const sections = [
    { id: 'crops', title: 'Crops', entries: CROPS.map(c => ({ id: c.id, count: n(s.harvested, c.id) })) },
    { id: 'forage', title: 'Forage', entries: FORAGE.map(f => ({ id: f.id, count: n(s.foraged, f.id) })) },
    { id: 'fish', title: 'Fish', entries: FISH.map(f => ({ id: f.id, count: n(s.caught, f.id), best: s.fishBest[f.id] || 0 })) },
    { id: 'minerals', title: 'Minerals', entries: MINERALS.map(id => ({ id, count: state.seen[id] ? 1 : 0 })) },
    { id: 'cooking', title: 'Cooking', entries: ITEMS.filter(i => i.tags?.includes('cooked')).map(i => ({ id: i.id, count: n(s.cooked, i.id) })) },
    { id: 'artisan', title: 'Artisan Goods', entries: ITEMS.filter(i => i.cat === 'artisan').map(i => ({ id: i.id, count: n(s.crafted, i.id) })) },
  ];
  for (const sec of sections) {
    for (const e of sec.entries) e.found = e.count > 0;
    sec.found = sec.entries.filter(e => e.found).length;
  }
  const total = sections.reduce((t, x) => t + x.entries.length, 0);
  const found = sections.reduce((t, x) => t + x.found, 0);
  return { sections, total, found, percent: Math.floor((found / total) * 100) };
}
