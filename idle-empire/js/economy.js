// Economy rules: what things cost, what they produce, and the actions that change money.
// Pure functions over the game state (no DOM), so they can be unit-tested in Node.
import BigNum, { ONE } from './bigNum.js';
import { BUILDINGS, BUILDINGS_BY_ID } from './buildings.js';

export const CLICK_BASE = 1;

// price of the next `count` copies when `owned` are already owned:
// baseCost * growth^owned * (growth^count - 1) / (growth - 1), rounded up to whole crowns.
// Closed form, so it costs the same to price 1 or a million.
export function buildingCost(def, owned, count = 1) {
  const g = BigNum.from(def.growth);
  const first = BigNum.from(def.baseCost).mul(g.pow(owned));
  if (count === 1) return first.ceil();
  return first.mul(g.pow(count).sub(ONE)).div(g.sub(ONE)).ceil();
}

export function nextCost(state, id) {
  const def = BUILDINGS_BY_ID[id];
  return buildingCost(def, state.buildings[id] || 0);
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
  let total = BigNum.from(0);
  for (const def of BUILDINGS) total = total.add(buildingProduction(state, def.id));
  return total;
}

export function clickValue() {
  return BigNum.from(CLICK_BASE);
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

// buys one building; returns the price paid, or null when it can't be afforded
export function buyBuilding(state, id) {
  if (!BUILDINGS_BY_ID[id]) return null;
  const cost = nextCost(state, id);
  if (!canAfford(state, cost)) return null;
  state.currency = BigNum.max(0, state.currency.sub(cost));
  state.buildings[id] = (state.buildings[id] || 0) + 1;
  return cost;
}

// passive income for `seconds` of elapsed time
export function tick(state, seconds) {
  if (!(seconds > 0) || !Number.isFinite(seconds)) return;
  earn(state, productionPerSecond(state).mul(seconds));
}
