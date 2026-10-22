// Conditions used by recipes, quests and shop stock: { type: 'start' | 'quest' | 'met' |
// 'hearts' | 'shipped' | 'unlock', ... }.

import { FRIENDSHIP } from './config.js';

export const hearts = (state, npc) => Math.min(FRIENDSHIP.maxHearts, Math.floor((state.npcs[npc]?.points || 0) / FRIENDSHIP.perHeart));

export function test(state, c) {
  if (!c) return true;
  switch (c.type) {
    case 'start': return true;
    case 'quest': return state.quests.done.includes(c.id);
    case 'met': return !!state.npcs[c.npc]?.met;
    case 'hearts': return hearts(state, c.npc) >= c.hearts;
    case 'shipped': return state.stats.shippedTotal >= c.n;
    case 'unlock': return !!state.unlocks[c.key];
    default: return false;
  }
}

export function describe(c) {
  switch (c.type) {
    case 'quest': return 'Finish a quest';
    case 'met': return `Meet ${c.npc}`;
    case 'hearts': return `${c.hearts} hearts with ${c.npc[0].toUpperCase() + c.npc.slice(1)}`;
    case 'shipped': return `Ship ${c.n} items`;
    default: return '';
  }
}
