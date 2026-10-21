// The case catalogue. A case's pool is every item from its collections whose rarity it can drop,
// plus its listed extras (knives and gloves). `weights` are percentages per rarity and total 100.

import { ITEMS, ITEMS_BY_ID } from './items.js';
import { RARITIES } from './rarities.js';

export const CASE_CATEGORIES = [
  { id: 'starter', name: 'Starter' },
  { id: 'standard', name: 'Standard' },
  { id: 'premium', name: 'Premium' },
  { id: 'knife', name: 'Knives & Gloves' },
  { id: 'collection', name: 'Collections' },
];
export const CASE_CATEGORY_BY_ID = Object.freeze(Object.fromEntries(CASE_CATEGORIES.map(c => [c.id, c])));

const blades = ITEMS.filter(i => i.type === 'knife').map(i => i.id);
const gloves = ITEMS.filter(i => i.type === 'gloves').map(i => i.id);

const STARTER = { consumer: 52, industrial: 30, milspec: 12, restricted: 4.6, classified: 1.1, covert: 0.3 };
const STANDARD = { consumer: 20, industrial: 30, milspec: 27, restricted: 15, classified: 5.5, covert: 2.2, extraordinary: 0.3 };
const PREMIUM = { industrial: 10, milspec: 45, restricted: 28, classified: 11, covert: 4.5, extraordinary: 1.5 };
const COLLECTION = { consumer: 40, industrial: 30, milspec: 18, restricted: 8, classified: 3, covert: 0.8, extraordinary: 0.2 };

const DEFS = [
  {
    id: 'rookie', name: 'Rookie Crate', category: 'starter', price: 23, featured: true,
    tagline: 'Cheap thrills from the scrapyard and the streets. The best place to start.',
    theme: { from: '#5b6476', to: '#2a303c', glyph: 'star' },
    collections: ['scrap', 'street'], extras: [], weights: STARTER,
  },
  {
    id: 'scrapyard', name: 'Scrapyard Case', category: 'starter', price: 30, featured: false,
    tagline: 'Salvaged steel and swamp-green finishes, pulled from the junk pile.',
    theme: { from: '#7a5a34', to: '#2f2418', glyph: 'gear' },
    collections: ['scrap', 'venom'], extras: [],
    weights: { consumer: 50, industrial: 30, milspec: 13, restricted: 5, classified: 1.5, covert: 0.5 },
  },
  {
    id: 'streetkit', name: 'Street Kit', category: 'starter', price: 35, featured: false,
    tagline: 'Spray paint, pixel art and late-night colour for the budget collector.',
    theme: { from: '#c2406a', to: '#3a1730', glyph: 'spray' },
    collections: ['street', 'arcade'], extras: [],
    weights: { consumer: 48, industrial: 30, milspec: 14, restricted: 5.5, classified: 2, covert: 0.5 },
  },
  {
    id: 'neon', name: 'Neon Nights Case', category: 'standard', price: 115, featured: true,
    tagline: 'Glowing synthwave finishes with a rare chance at Neon Lights gloves.',
    theme: { from: '#b93cff', to: '#1d1145', glyph: 'bolt' },
    collections: ['neon', 'arcade'], extras: ['racer-neon-lights', 'switch-gunmetal'], weights: STANDARD,
  },
  {
    id: 'frostbite', name: 'Frostbite Case', category: 'standard', price: 125, featured: false,
    tagline: 'Ice-cold camo and deep-sea blues. Hides a Glacier Edge Claw Knife.',
    theme: { from: '#4cc3ff', to: '#0f2a45', glyph: 'snow' },
    collections: ['frost', 'ocean'], extras: ['claw-glacier-edge', 'switch-ocean-spray'], weights: STANDARD,
  },
  {
    id: 'inferno', name: 'Inferno Case', category: 'standard', price: 115, featured: true,
    tagline: 'Molten metal and open flame, with two Ranger Bowies in the fire.',
    theme: { from: '#ff6a1f', to: '#3f1206', glyph: 'flame' },
    collections: ['inferno', 'street'], extras: ['ranger-emberforge', 'ranger-rustbelt'], weights: STANDARD,
  },
  {
    id: 'venom', name: 'Venom Case', category: 'standard', price: 100, featured: false,
    tagline: 'Toxic greens and serpent scales. Bite down for Viper Strike gloves.',
    theme: { from: '#6fd13a', to: '#13300d', glyph: 'drop' },
    collections: ['venom', 'scrap'], extras: ['tactical-viper-strike', 'spike-woodland'], weights: STANDARD,
  },
  {
    id: 'gilded', name: 'Gilded Vault', category: 'premium', price: 345, featured: true,
    tagline: 'Gold leaf, crown jewels and every pair of gloves in the reserve.',
    theme: { from: '#f2c14e', to: '#4a320b', glyph: 'crown' },
    collections: ['gilded'], extras: gloves, weights: PREMIUM,
  },
  {
    id: 'apex', name: 'Apex Predator Case', category: 'premium', price: 390, featured: false,
    tagline: 'Top of the food chain: Wyvern, Bloodline and the Claw Knife family.',
    theme: { from: '#e8433b', to: '#3a0c0c', glyph: 'claw' },
    collections: ['apex'], extras: ['claw-vanilla', 'claw-blood-moon', 'spike-tiger-fang', 'spike-woodland'], weights: PREMIUM,
  },
  {
    id: 'eclipse', name: 'Eclipse Case', category: 'premium', price: 400, featured: false,
    tagline: 'Starfields, solar flares and every Moth Knife ever folded.',
    theme: { from: '#6a5cff', to: '#100c2e', glyph: 'moon' },
    collections: ['eclipse'], extras: ['moth-vanilla', 'moth-prism', 'moth-night-ops'], weights: PREMIUM,
  },
  {
    id: 'edge', name: 'Edge Case', category: 'knife', price: 640, featured: true,
    tagline: 'One in twelve is a knife. Every blade in the reserve is in here.',
    theme: { from: '#c9d3e0', to: '#1f2633', glyph: 'blade' },
    collections: ['inferno', 'frost'], extras: blades,
    weights: { milspec: 50, restricted: 28, classified: 10, covert: 4, extraordinary: 8 },
  },
  {
    id: 'cutthroat', name: 'Cutthroat Case', category: 'knife', price: 1500, featured: false,
    tagline: 'High stakes only: no Mil-Spec, and the rarest Claw and Moth finishes.',
    theme: { from: '#ff3d6e', to: '#2a0614', glyph: 'blade' },
    collections: ['apex', 'venom'], extras: ['claw-blood-moon', 'claw-glacier-edge', 'moth-prism', 'moth-night-ops', 'claw-vanilla', 'moth-vanilla'],
    weights: { restricted: 45, classified: 30, covert: 13, extraordinary: 12 },
  },
  {
    id: 'glovebox', name: 'Glove Box', category: 'knife', price: 630, featured: false,
    tagline: 'A one-in-ten shot at every glove in the game.',
    theme: { from: '#3ad6b0', to: '#0b2e28', glyph: 'glove' },
    collections: ['gilded', 'neon'], extras: gloves,
    weights: { milspec: 52, restricted: 26, classified: 9, covert: 3, extraordinary: 10 },
  },
  {
    id: 'oceanic', name: 'Oceanic Collection', category: 'collection', price: 60, featured: false,
    tagline: 'The full Oceanic Collection, from Driftwood to Leviathan.',
    theme: { from: '#1fa3c4', to: '#08283a', glyph: 'wave' },
    collections: ['ocean'], extras: ['switch-ocean-spray'], weights: COLLECTION,
  },
  {
    id: 'arcade', name: 'Arcade Collection', category: 'collection', price: 60, featured: true,
    tagline: 'Insert coin. The complete Arcade Collection plus Checkered racers.',
    theme: { from: '#ffcf33', to: '#33240a', glyph: 'gamepad' },
    collections: ['arcade'], extras: ['racer-checkered'], weights: COLLECTION,
  },
];

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

export const CHEAPEST_CASE_PRICE = Math.min(...CASES.map(c => c.price));

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
  if (!Number.isInteger(c.price) || c.price <= 0) errors.push('price must be a positive whole number');
  return errors;
}
