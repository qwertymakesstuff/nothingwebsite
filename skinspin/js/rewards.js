// Reward generation. caseOdds() is what the UI shows; rollCase() draws from exactly the same
// weights and pools, so displayed odds and real odds cannot drift apart.

import { RARITIES } from './rarities.js';
import { ITEMS_BY_ID, itemValue } from './items.js';
import { WEARS, WEAR_CHANCES, rollWear } from './wear.js';
import { pickWeighted, pickIndex, secureRandom } from './rng.js';

function rarityEntries(c) {
  return RARITIES.filter(r => c.weights[r.id] > 0).map(r => ({ weight: c.weights[r.id], value: r.id }));
}

// [{ rarity, chance, items: [{ itemId, chance }] }], chances as fractions of 1, rarest last.
export function caseOdds(c) {
  const total = rarityEntries(c).reduce((s, e) => s + e.weight, 0);
  return rarityEntries(c).map(({ weight, value: rarity }) => {
    const ids = c.rarityPools[rarity];
    const chance = weight / total;
    return { rarity, chance, items: ids.map(itemId => ({ itemId, chance: chance / ids.length })) };
  });
}

// The winning drop for one opening: { itemId, wear, float } (wear and float are null for vanilla items).
export function rollCase(c, rng = secureRandom) {
  const rarity = pickWeighted(rarityEntries(c), rng);
  const ids = c.rarityPools[rarity];
  const itemId = ids[pickIndex(ids.length, rng)];
  const item = ITEMS_BY_ID[itemId];
  if (!item.hasWear) return { itemId, wear: null, float: null };
  return { itemId, ...rollWear(rng) };
}

export function expectedItemValue(itemId) {
  const item = ITEMS_BY_ID[itemId];
  if (!item.hasWear) return itemValue(itemId, null);
  return WEARS.reduce((s, w) => s + WEAR_CHANCES[w.id] * itemValue(itemId, w.id), 0);
}

export function expectedValue(c) {
  let ev = 0;
  for (const tier of caseOdds(c)) for (const it of tier.items) ev += it.chance * expectedItemValue(it.itemId);
  return ev;
}
