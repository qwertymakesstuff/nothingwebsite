// Upgrade actions: unlocking, pricing, buying and previewing upgrades.
import BigNum, { ZERO } from './bigNum.js';
import { UPGRADES, UPGRADES_BY_ID, maxLevel } from './upgrades.js';
import * as economy from './economy.js';
import { allMet } from './conditions.js';
import { recordSpend } from './stats.js';

export function levelOf(state, id) {
  return state.upgrades[id] || 0;
}

export function isMaxed(state, id) {
  return levelOf(state, id) >= maxLevel(UPGRADES_BY_ID[id]);
}

// price of the next level
export function upgradeCost(state, id) {
  const def = UPGRADES_BY_ID[id];
  const cost = BigNum.from(def.cost);
  if (!def.repeatable) return cost;
  return cost.mul(BigNum.from(def.repeatable.growth).pow(levelOf(state, id))).ceil();
}

// marks upgrades whose conditions now hold as unlocked; returns the ids newly unlocked
export function checkUnlocks(state) {
  const fresh = [];
  for (const def of UPGRADES) {
    if (state.upgradesUnlocked[def.id]) continue;
    if (allMet(state, def.unlock)) {
      state.upgradesUnlocked[def.id] = true;
      fresh.push(def.id);
    }
  }
  return fresh;
}

// unlocked and not yet at their last level, cheapest first
export function availableUpgrades(state) {
  return UPGRADES.filter(u => state.upgradesUnlocked[u.id] && !isMaxed(state, u.id))
    .map(u => ({ def: u, cost: upgradeCost(state, u.id) }))
    .sort((a, b) => a.cost.cmp(b.cost));
}

export function ownedUpgrades(state) {
  return UPGRADES.filter(u => levelOf(state, u.id) > 0);
}

// buys the next level; returns the price paid, or null when locked, maxed or unaffordable
export function buyUpgrade(state, id) {
  const def = UPGRADES_BY_ID[id];
  if (!def || !state.upgradesUnlocked[id] || isMaxed(state, id)) return null;
  const cost = upgradeCost(state, id);
  if (!state.currency.gte(cost)) { state.stats.denied += 1; return null; }
  state.currency = BigNum.max(ZERO, state.currency.sub(cost));
  if (state.currency.lt(1) && cost.gte(1000)) state.flags.spentAll = true;
  state.upgrades = { ...state.upgrades, [id]: levelOf(state, id) + 1 };
  recordSpend(state, cost, 'upgrade');
  return cost;
}

// what the next level would do, without buying it: per-second and per-click, before and after
export function previewUpgrade(state, id) {
  const after = { ...state, upgrades: { ...state.upgrades, [id]: levelOf(state, id) + 1 } };
  return {
    pps: [economy.productionPerSecond(state), economy.productionPerSecond(after)],
    click: [economy.clickValue(state), economy.clickValue(after)],
  };
}
