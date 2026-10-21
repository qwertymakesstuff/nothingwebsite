// Economy rules: what things cost, what they produce, and the actions that change money.
// Pure functions over the game state (no DOM), so they can be unit-tested in Node.
//
// Pricing: copy number k (counting from 0) costs ceil(baseCost * growth^k) whole crowns,
// and a bulk purchase costs exactly the sum of its copies, so buying 10 one at a time
// and buying x10 always cost the same. Only copies priced below 2^53 can have a fraction
// to round; past that the remaining copies are summed with the geometric-series formula.
// So pricing any quantity takes at most a few hundred steps, however many are bought.
import BigNum, { ZERO, ONE } from './bigNum.js';
import { BUILDINGS, BUILDINGS_BY_ID } from './buildings.js';
import { ECONOMY } from './config.js';

const EXACT_LIMIT = 2 ** 53;  // above this every double is already a whole number
const MAX_EXACT_STEPS = 2000; // safety net for growth values very close to 1

export function growthOf(def) {
  const g = Number(def.growth ?? ECONOMY.defaultGrowth);
  return g > 1 ? g : ECONOMY.defaultGrowth;
}

// price of the next `count` copies when `owned` are already owned
export function buildingCost(def, owned, count = 1) {
  count = Math.floor(count);
  if (!(count > 0)) return ZERO;
  const g = growthOf(def);
  let total = 0;
  let k = owned, left = count, steps = 0;
  while (left > 0 && steps < MAX_EXACT_STEPS) {
    const price = def.baseCost * g ** k;
    if (!(price < EXACT_LIMIT)) break;
    total += Math.ceil(price);
    k++; left--; steps++;
  }
  let cost = BigNum.from(total);
  if (left > 0) {
    // baseCost * g^k * (g^left - 1) / (g - 1)
    const G = BigNum.from(g);
    const first = BigNum.from(def.baseCost).mul(G.pow(k));
    cost = cost.add(first.mul(G.pow(left).sub(ONE)).div(G.sub(ONE)).ceil());
  }
  return cost;
}

// how many copies `money` buys right now (0 when not even one), via the inverse of the
// geometric series, then nudged by a step or two to agree exactly with buildingCost
export function maxAffordable(def, owned, money) {
  const m = BigNum.from(money);
  if (buildingCost(def, owned, 1).gt(m)) return 0;
  const g = growthOf(def);
  const first = BigNum.from(def.baseCost).mul(BigNum.from(g).pow(owned));
  const estimate = m.mul(g - 1).div(first).add(ONE).log10() / Math.log10(g);
  let n = Math.max(1, Math.min(ECONOMY.maxPurchase, Math.floor(estimate)));
  for (let i = 0; i < 64 && n > 1 && buildingCost(def, owned, n).gt(m); i++) n--;
  for (let i = 0; i < 64 && n < ECONOMY.maxPurchase && buildingCost(def, owned, n + 1).lte(m); i++) n++;
  return n;
}

export function validBuyMode(mode) {
  return ECONOMY.buyModes.includes(mode) ? mode : ECONOMY.defaultBuyMode;
}

// what the shop offers for a building in a buy mode: { count, cost, affordable }.
// In Max mode with nothing affordable it quotes a single copy so the player sees the target.
export function quote(state, id, mode = state.buyMode) {
  const def = BUILDINGS_BY_ID[id];
  if (!def) return null;
  const owned = state.buildings[id] || 0;
  mode = validBuyMode(mode);
  let count = mode;
  if (mode === 'max') count = Math.max(1, maxAffordable(def, owned, state.currency));
  const cost = buildingCost(def, owned, count);
  return { count, cost, affordable: state.currency.gte(cost) };
}

export function nextCost(state, id) {
  return buildingCost(BUILDINGS_BY_ID[id], state.buildings[id] || 0, 1);
}

// output of one copy of a building (multipliers arrive with upgrades in a later phase)
export function unitRate(def) {
  return BigNum.from(def.baseRate);
}

export function buildingProduction(state, id) {
  const def = BUILDINGS_BY_ID[id];
  return unitRate(def).mul(state.buildings[id] || 0);
}

export function productionPerSecond(state) {
  let total = ZERO;
  for (const def of BUILDINGS) total = total.add(buildingProduction(state, def.id));
  return total;
}

export function clickValue() {
  return BigNum.from(ECONOMY.clickBase);
}

export function earn(state, amount) {
  const a = BigNum.from(amount);
  if (a.sign() <= 0) return;
  state.currency = state.currency.add(a);
  state.totalEarned = state.totalEarned.add(a);
}

export function click(state) {
  const value = clickValue(state);
  earn(state, value);
  state.totalClicks += 1;
  return value;
}

export function canAfford(state, cost) {
  return state.currency.gte(cost);
}

export function setBuyMode(state, mode) {
  state.buyMode = validBuyMode(mode);
}

// buys in the given mode (default: the selected one). All or nothing: x10 buys exactly
// ten or none. Returns { count, cost } for what was bought, or null when nothing was.
export function buyBuilding(state, id, mode = state.buyMode) {
  const q = quote(state, id, mode);
  if (!q || !q.affordable) return null;
  state.currency = BigNum.max(ZERO, state.currency.sub(q.cost));
  state.buildings[id] = (state.buildings[id] || 0) + q.count;
  return { count: q.count, cost: q.cost };
}

// passive income for `seconds` of elapsed time
export function tick(state, seconds) {
  if (!(seconds > 0) || !Number.isFinite(seconds)) return;
  earn(state, productionPerSecond(state).mul(seconds));
}
