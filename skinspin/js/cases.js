// The case catalogue: the seven cases from the Mill Street asset archive. A case's pool is every
// item from its collections whose rarity it can drop, plus its listed extras. `weights` are
// percentages per rarity and total 100. Each case keeps its archive item list as extras and also
// carries themed collections from the original catalogue, so every item stays obtainable.

import { ITEMS, ITEMS_BY_ID } from './items.js';
import { RARITIES } from './rarities.js';

export const CASE_CATEGORIES = [
  { id: 'free', name: 'Free' },
  { id: 'starter', name: 'Starter' },
  { id: 'standard', name: 'Standard' },
  { id: 'premium', name: 'Premium' },
];
export const CASE_CATEGORY_BY_ID = Object.freeze(Object.fromEntries(CASE_CATEGORIES.map(c => [c.id, c])));

// Free cases can be opened once per this many milliseconds.
export const FREE_CASE_COOLDOWN = 20 * 60 * 1000;

const blades = ITEMS.filter(i => i.collection === 'blades').map(i => i.id);
const gloves = ITEMS.filter(i => i.collection === 'handwear').map(i => i.id);

// Archive item ids (as used in the archive's own case lists) -> SkinSpin item ids.
const ARCHIVE_ID = {
  ...Object.fromEntries(ITEMS.filter(i => i.image).map(i => [i.image, i.id])),
  charm_bolt: 'charm-loose-bolt',
  collectible_mug: 'collectible-golden-mug',
};
const archive = (...ids) => ids.map(id => {
  if (!ARCHIVE_ID[id]) throw new Error(`unknown archive item ${id}`);
  return ARCHIVE_ID[id];
});

const STANDARD = { consumer: 25, industrial: 30, milspec: 26, restricted: 12, classified: 4.5, covert: 2.2, extraordinary: 0.3 };

const DEFS = [
  {
    id: 'daily', name: 'Daily Free Case', category: 'free', price: 0, free: true, featured: true,
    tagline: 'Free every 20 minutes. Small prizes, zero cost.',
    theme: { from: '#3fd0c4', to: '#0d2e2c' },
    collections: [],
    extras: archive('p9_wrap', 'p9_static', 'smg_cardboard', 'sticker_tape', 'sticker_fragile', 'charm_bolt', 'p9_harbor', 'charm_duck', 'sticker_seagull', 'p9_ember'),
    weights: { industrial: 75, milspec: 21, restricted: 4 },
  },
  {
    id: 'starter', name: 'Starter Crate', category: 'starter', price: 32, featured: true,
    tagline: 'Everyone starts somewhere. Scrapyard and Venom finishes plus the Mill Street basics.',
    theme: { from: '#c8954f', to: '#3a2814' },
    collections: ['scrap', 'venom'],
    extras: archive('p9_wrap', 'p9_static', 'smg_cardboard', 'sticker_tape', 'sticker_fragile', 'rifle_sand', 'charm_bolt', 'p9_harbor', 'smg_forklift', 'charm_duck', 'sticker_seagull', 'p9_ember', 'collectible_mug', 'knife_box'),
    weights: { consumer: 45, industrial: 30, milspec: 16, restricted: 6.5, classified: 2, covert: 0.5 },
  },
  {
    id: 'street', name: 'Street Case', category: 'standard', price: 95, featured: false,
    tagline: 'Straight from Mill Street: spray paint, arcade pixels and open flame.',
    theme: { from: '#e0457b', to: '#2a1030' },
    collections: ['street', 'arcade', 'inferno'],
    extras: [...archive('p9_static', 'smg_cardboard', 'rifle_sand', 'p9_harbor', 'smg_forklift', 'rifle_pallet', 'sticker_seagull', 'p9_ember', 'smg_circuit', 'gloves_worker', 'knife_box', 'charm_crown', 'rifle_gold'), 'ranger-emberforge', 'ranger-rustbelt'],
    weights: STANDARD,
  },
  {
    id: 'neon', name: 'Neon Nights', category: 'standard', price: 105, featured: true,
    tagline: 'Glows in the dark (not really). Synthwave finishes and the Ember Fade Karambit.',
    theme: { from: '#ff3fd8', to: '#1d0a35' },
    collections: ['neon', 'arcade'],
    extras: [...archive('p9_wrap', 'sticker_fragile', 'smg_forklift', 'charm_duck', 'sniper_mist', 'rifle_neon', 'smg_circuit', 'sniper_glacier', 'rifle_aurora', 'gloves_neon', 'knife_ember'), 'racer-neon-lights', 'switch-gunmetal'],
    weights: STANDARD,
  },
  {
    id: 'harbor', name: 'Harbor Case', category: 'standard', price: 105, featured: false,
    tagline: 'Smells faintly of seagull. Sea and ice finishes, and the Harbor Dragon.',
    theme: { from: '#2aa6b8', to: '#0b2a33' },
    collections: ['ocean', 'frost'],
    extras: [...archive('charm_bolt', 'p9_harbor', 'rifle_pallet', 'sniper_mist', 'sticker_seagull', 'sniper_glacier', 'collectible_mug', 'gloves_worker', 'sniper_viper', 'knife_box', 'knife_tide', 'collectible_forklift', 'rifle_dragon'), 'claw-glacier-edge', 'switch-ocean-spray'],
    weights: STANDARD,
  },
  {
    id: 'golden', name: 'Golden Case', category: 'premium', price: 295, featured: true,
    tagline: 'Shiny. Very shiny. Gold leaf, royal gloves and every glove in the reserve.',
    theme: { from: '#f2c14e', to: '#4a320b' },
    collections: ['gilded'],
    extras: [...archive('rifle_sand', 'rifle_pallet', 'charm_duck', 'collectible_mug', 'p9_ember', 'rifle_aurora', 'charm_crown', 'gloves_neon', 'rifle_gold', 'gloves_royal', 'collectible_forklift', 'knife_mythic'), ...gloves],
    weights: { industrial: 15, milspec: 40, restricted: 27, classified: 11, covert: 5, extraordinary: 2 },
  },
  {
    id: 'void', name: 'Void Case', category: 'premium', price: 575, featured: true,
    tagline: 'High risk. Higher risk. Every knife in the game and the rarest Mill Street drops.',
    theme: { from: '#8a3dff', to: '#14062e' },
    collections: ['eclipse', 'apex'],
    extras: [...archive('sniper_mist', 'smg_circuit', 'rifle_neon', 'sniper_viper', 'rifle_aurora', 'gloves_neon', 'knife_ember', 'knife_tide', 'gloves_royal', 'knife_void', 'rifle_dragon', 'knife_mythic', 'magnum_jimmy'), ...blades],
    weights: { industrial: 10, milspec: 35, restricted: 28, classified: 16, covert: 7, extraordinary: 4 },
  },
];

// Case ids from before the archive cases (save version 2 and earlier) -> the case that replaced them.
export const LEGACY_CASE_IDS = Object.freeze({
  rookie: 'starter', scrapyard: 'starter', venom: 'starter',
  streetkit: 'street', inferno: 'street',
  neon: 'neon', arcade: 'neon',
  frostbite: 'harbor', oceanic: 'harbor',
  gilded: 'golden', glovebox: 'golden',
  apex: 'void', eclipse: 'void', edge: 'void', cutthroat: 'void',
});

function buildCase(def) {
  const rarityPools = {};
  for (const r of RARITIES) {
    if (!(def.weights[r.id] > 0)) continue;
    rarityPools[r.id] = ITEMS
      .filter(i => i.rarity === r.id && (def.collections.includes(i.collection) || def.extras.includes(i.id)))
      .map(i => i.id);
  }
  const pool = Object.values(rarityPools).flat();
  return Object.freeze({ ...def, weights: Object.freeze({ ...def.weights }), rarityPools: Object.freeze(rarityPools), pool: Object.freeze(pool) });
}

export const CASES = Object.freeze(DEFS.map(buildCase));
export const CASES_BY_ID = Object.freeze(Object.fromEntries(CASES.map(c => [c.id, c])));

export function getCase(id) {
  return CASES_BY_ID[id] || null;
}

// The cheapest case that costs money (free cases don't count: they run on a timer).
export const CHEAPEST_CASE_PRICE = Math.min(...CASES.filter(c => !c.free).map(c => c.price));

// Problems with a case definition; an empty list means it is sound.
export function validateCase(c) {
  const errors = [];
  const total = Object.values(c.weights).reduce((s, w) => s + w, 0);
  if (Math.abs(total - 100) > 1e-9) errors.push(`weights total ${total}, not 100`);
  for (const [rarity, w] of Object.entries(c.weights)) {
    if (!RARITIES.some(r => r.id === rarity)) errors.push(`unknown rarity ${rarity}`);
    if (!(w >= 0)) errors.push(`bad weight for ${rarity}`);
    if (w > 0 && !(c.rarityPools[rarity] || []).length) errors.push(`no ${rarity} items to drop`);
  }
  for (const id of c.extras) if (!ITEMS_BY_ID[id]) errors.push(`unknown extra ${id}`);
  if (c.free ? c.price !== 0 : !Number.isInteger(c.price) || c.price <= 0) errors.push(c.free ? 'free cases cost 0' : 'price must be a positive whole number');
  return errors;
}
