// Story quests and the bulletin board. Game code reports what happens through `questEvent`
// (clear, plant, harvest, ship, catch, craft, talk, upgrade); deliveries are handed over by
// talking to the villager. Rewards are paid through `payReward`, which queues items that do not
// fit in the bag (state.pending) until there is room.

import { QUESTS, QUESTS_BY_ID, REQUEST_POOLS, REQUEST_RULES } from './data/quests.js';
import { CROPS, SEED_TIERS } from './data/crops.js';
import { FORAGE } from './data/forage.js';
import { FISH } from './data/fish.js';
import { NPCS } from './data/npcs.js';
import { ITEMS_BY_ID, matches } from './data/items.js';
import { test } from './conditions.js';
import { add, count, remove } from './inventory.js';
import { addPoints } from './npc.js';
import { dayIndex } from './calendar.js';
import { rngFor, pick, randInt } from './rng.js';
import { FRIENDSHIP } from './config.js';

export const questDef = id => QUESTS_BY_ID[id];

// Start every quest whose start condition now holds. Returns the newly started definitions.
export function refreshQuests(state) {
  const started = [];
  for (const q of QUESTS) {
    if (state.quests.active[q.id] || state.quests.done.includes(q.id)) continue;
    if (!test(state, q.start)) continue;
    state.quests.active[q.id] = { n: 0, talked: [] };
    started.push(q);
  }
  return started;
}

export function payReward(state, reward = {}) {
  if (reward.money) { state.player.money += reward.money; }
  for (const [id, n] of reward.items || []) {
    const left = add(state, id, n);
    if (left) (state.pending ||= []).push([id, left]);
    state.seen[id] = true;
  }
  for (const [npc, pts] of Object.entries(reward.friendship || {})) addPoints(state, npc, pts);
}

// Try to hand over rewards that did not fit earlier. Returns what was added.
export function flushPending(state) {
  if (!state.pending?.length) return [];
  const got = [], keep = [];
  for (const [id, n] of state.pending) {
    const left = add(state, id, n);
    if (left < n) got.push([id, n - left]);
    if (left) keep.push([id, left]);
  }
  state.pending = keep;
  return got;
}

function complete(state, id) {
  const q = QUESTS_BY_ID[id];
  delete state.quests.active[id];
  state.quests.done.push(id);
  payReward(state, q.reward);
  return q;
}

export function questProgress(state, id) {
  const q = QUESTS_BY_ID[id];
  const a = state.quests.active[id];
  if (!a) return null;
  if (q.goal.type === 'talk') return { have: a.talked.length, need: q.goal.npcs.length };
  if (q.goal.type === 'deliver') return { have: Math.min(count(state, q.goal.what), q.goal.n), need: q.goal.n };
  return { have: a.n, need: q.goal.n };
}

// Report something that happened. Returns the quests it finished.
export function questEvent(state, type, { item = null, n = 1, npc = null } = {}) {
  const done = [];
  for (const [id, a] of Object.entries(state.quests.active)) {
    const q = QUESTS_BY_ID[id];
    if (!q || q.goal.type !== type) continue;
    if (type === 'talk') {
      if (q.goal.npcs.includes(npc) && !a.talked.includes(npc)) a.talked.push(npc);
      if (a.talked.length >= q.goal.npcs.length) done.push(complete(state, id));
      continue;
    }
    if (q.goal.what && !(item && matches(item, q.goal.what))) continue;
    a.n += n;
    if (a.n >= q.goal.n) done.push(complete(state, id));
  }
  return done;
}

// Story deliveries and accepted requests this villager can take right now.
export function deliverables(state, npc) {
  const out = [];
  for (const id of Object.keys(state.quests.active)) {
    const q = QUESTS_BY_ID[id];
    if (q.goal.type === 'deliver' && q.goal.npc === npc && count(state, q.goal.what) >= q.goal.n) out.push({ kind: 'quest', id, what: q.goal.what, n: q.goal.n, title: q.title });
  }
  state.requests.forEach((r, i) => {
    if (r.npc === npc && count(state, r.item) >= r.n) out.push({ kind: 'request', index: i, what: r.item, n: r.n, title: `${ITEMS_BY_ID[r.item].name} for ${npc}` });
  });
  return out;
}

export function deliver(state, d) {
  if (!remove(state, d.what, d.n)) return null;
  if (d.kind === 'quest') return { quest: complete(state, d.id) };
  const r = state.requests.splice(d.index, 1)[0];
  state.player.money += r.reward;
  addPoints(state, r.npc, FRIENDSHIP.requestReward);
  state.stats.requests = (state.stats.requests || 0) + 1;
  return { request: r };
}

// Items a villager might ask for today.
export function requestPool(state) {
  const s = state.date.season;
  const tier = state.stats.shippedTotal >= SEED_TIERS[1] ? 1 : 0;
  // only crops you have grown before, so a request is always doable in time
  const crops = CROPS.filter(c => c.seasons.includes(s) && c.tier <= tier && !c.fair && state.stats.harvested[c.id]).map(c => c.id);
  const forage = FORAGE.filter(f => f.seasons.includes(s)).map(f => f.id);
  const fish = state.npcs.teodor.met ? FISH.filter(f => f.seasons.includes(s) && REQUEST_POOLS.fish.includes(f.id)).map(f => f.id) : [];
  return [...crops, ...crops, ...forage, ...REQUEST_POOLS.common, ...fish];
}

export function postRequest(state) {
  const today = dayIndex(state.date);
  const rng = rngFor(state.seed, 'board', today);
  const npc = pick(rng, NPCS).id;
  const item = pick(rng, requestPool(state));
  const price = ITEMS_BY_ID[item].price;
  const n = price >= 100 ? 1 : price >= 40 ? randInt(rng, 1, 3) : price >= 10 ? randInt(rng, 3, 6) : randInt(rng, 10, 25);
  const reward = Math.max(REQUEST_RULES.minReward, Math.round((price * n * REQUEST_RULES.rewardMultiplier) / 10) * 10);
  state.board = { day: today, request: { npc, item, n, reward, posted: today, due: today + REQUEST_RULES.days } };
  return state.board.request;
}

export function acceptRequest(state) {
  const r = state.board.request;
  if (!r) return false;
  state.requests.push(r);
  state.board.request = null;
  return true;
}

// Drop requests whose deadline has passed. Returns the ones that expired.
export function expireRequests(state) {
  const today = dayIndex(state.date);
  const gone = state.requests.filter(r => r.due < today);
  state.requests = state.requests.filter(r => r.due >= today);
  return gone;
}
