// Upgrades: stake one owned item for a chance at a more valuable target item.
// quoteUpgrade() is what the page shows; upgradeItem() rolls against exactly that chance.

import { UPGRADE } from './config.js';
import { ITEMS_BY_ID, itemValue } from './items.js';
import { WEAR_BY_ID, floatInTier } from './wear.js';
import { secureRandom } from './rng.js';
import { fail, checkConsumable, instanceValue, removeItems, acquireItem, log } from './economy.js';

export function upgradeChance(inputValue, targetValue, cfg = UPGRADE) {
  if (!(inputValue > 0) || !(targetValue > 0)) return 0;
  return Math.min(cfg.maxChance, (inputValue / targetValue) * (1 - cfg.houseEdge));
}

// Target values an input of this value may aim at (inclusive bounds).
export function targetRange(inputValue, cfg = UPGRADE) {
  return { min: Math.ceil(inputValue * cfg.minMultiplier), max: Math.floor(inputValue * cfg.maxMultiplier) };
}

export function quoteUpgrade(player, uid, target, cfg = UPGRADE) {
  const check = checkConsumable(player, [uid]);
  if (!check.ok) return check;
  const inst = check.items[0];
  const item = ITEMS_BY_ID[target?.itemId];
  if (!item) return fail('bad-target', 'Pick a target item.');
  const wear = item.hasWear ? target.wear : null;
  if (item.hasWear && !WEAR_BY_ID[wear]) return fail('bad-target', 'Pick a wear condition for the target.');
  const inputValue = instanceValue(inst);
  const targetValue = itemValue(item.id, wear);
  const { min, max } = targetRange(inputValue, cfg);
  if (targetValue < min) return fail('too-cheap', `The target must be worth at least ${cfg.minMultiplier}× your item ($${min.toLocaleString('en-US')}).`);
  if (targetValue > max) return fail('too-expensive', `The target can be worth at most ${cfg.maxMultiplier}× your item.`);
  return { ok: true, inst, itemId: item.id, wear, inputValue, targetValue, multiplier: targetValue / inputValue, chance: upgradeChance(inputValue, targetValue, cfg) };
}

// Consumes the input either way; awards the target only on success. roll < chance is a win.
export function upgradeItem(player, uid, target, { rng = secureRandom, now = Date.now() } = {}) {
  const q = quoteUpgrade(player, uid, target);
  if (!q.ok) return q;
  const roll = rng();
  const success = roll < q.chance;
  const float = q.wear ? floatInTier(q.wear, rng) : null;

  // --- validated: apply everything ---
  const [input] = removeItems(player, [uid]);
  const won = success ? acquireItem(player, { itemId: q.itemId, wear: q.wear, float }, 'upgrade', now) : null;
  player.stats.upgradesAttempted += 1;
  if (success) player.stats.upgradesWon += 1;
  const record = {
    at: now, chance: q.chance, roll, success,
    input: { itemId: input.itemId, wear: input.wear, float: input.float, value: q.inputValue },
    target: { itemId: q.itemId, wear: q.wear, float, value: q.targetValue },
  };
  player.upgrades.unshift(record);
  if (player.upgrades.length > UPGRADE.historyLimit) player.upgrades.length = UPGRADE.historyLimit;
  log(player, { type: 'upgrade', at: now, delta: 0, success, itemId: q.itemId, wear: q.wear, inputItemId: input.itemId, inputWear: input.wear, chance: q.chance });
  return { ok: true, success, roll, chance: q.chance, item: won, record };
}
