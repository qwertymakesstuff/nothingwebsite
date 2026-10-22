// Festivals: the festival of the day, whether you can still attend it, and what each activity
// does. Shops are closed (economy.js) and villagers gather (npc.js) automatically.

import { FESTIVAL_AT } from './data/events.js';
import { NPCS } from './data/npcs.js';
import { ITEMS_BY_ID } from './data/items.js';
import { festKey, addPoints, giftTaste } from './npc.js';
import { payReward } from './quests.js';
import { centerOf } from './world.js';
import { rngFor, pick } from './rng.js';

export const todaysFestival = state => FESTIVAL_AT(state.date.season, state.date.day);

// The festival you are in right now (on its map, during its hours, not yet finished).
export function festivalNow(state, mapId = state.player.map) {
  const f = todaysFestival(state);
  if (!f || state.festivals[festKey(state, f)] || f.map !== mapId) return null;
  const m = state.date.minutes;
  return m >= f.from && m < f.to ? f : null;
}

export const secretFriend = state => pick(rngFor(state.seed, 'frostlight', state.date.year), NPCS.filter(n => n.id !== 'odessa')).id;

// Seedling Fair: each villager hands you a packet of seeds once.
export function seedSwap(state, fest, npc) {
  const k = `${festKey(state, fest)}:swap`;
  const got = (state.festivals[k] ||= []);
  if (!fest.swap?.[npc] || got.includes(npc)) return null;
  got.push(npc);
  payReward(state, { items: [[fest.swap[npc], 3]] });
  return [fest.swap[npc], 3];
}

// Harvest Show: judge an item. Returns { place (1-4), score, prize, ranking }.
export function judgeEntry(state, fest, itemId) {
  const it = ITEMS_BY_ID[itemId];
  const score = it.price + (it.cat === 'artisan' ? 40 : 0) + (it.cat === 'food' ? 20 : 0);
  const ranking = [...fest.rivals.map(r => ({ who: r.npc, item: r.item, score: r.score })), { who: 'you', item: itemId, score }].sort((a, b) => b.score - a.score);
  const place = ranking.findIndex(r => r.who === 'you') + 1;
  const prize = fest.prizes[place - 1] || null;
  if (prize) payReward(state, { money: prize.money, items: prize.item ? [[prize.item, 1]] : [] });
  addPoints(state, 'odessa', 30);
  return { place, score, prize, ranking };
}

// Frostlight Feast: gifting your secret friend counts double and earns a gift back.
export function feastGift(state, npc, itemId) {
  if (npc !== secretFriend(state)) return null;
  const taste = giftTaste(npc, itemId);
  const bonus = taste === 'hated' || taste === 'disliked' ? 0 : 120;
  addPoints(state, npc, bonus);
  const back = pick(rngFor(state.seed, 'feast-back', state.date.year), [['pumpkinpie', 1], ['amethyst', 1], ['iron_bar', 2], ['seed_cauliflower', 10], ['planter', 1]]);
  payReward(state, { items: [back] });
  return { bonus, back };
}

export function lanternsBlessing(state) {
  for (const n of NPCS) addPoints(state, n.id, 30);
  payReward(state, { items: [['lantern', 1]] });
}

// Finish the festival: the clock jumps to its end and you are walked home.
export function endFestival(state, fest) {
  state.festivals[festKey(state, fest)] = true;
  state.date.minutes = Math.max(state.date.minutes, fest.endsAt);
  const [x, y] = centerOf(8, 7);
  Object.assign(state.player, { map: 'farm', x, y, dir: 'down' });
}
