// The item database: every collectible skin in SkinSpin, as data.
// Values are whole coins for a Field-Tested copy; wear scales them (see wear.js).

import { RARITY_BY_ID } from './rarities.js';
import { wearMultiplier } from './wear.js';

export const WEAPON_TYPES = [
  { id: 'rifle', name: 'Rifles' },
  { id: 'pistol', name: 'Pistols' },
  { id: 'smg', name: 'SMGs' },
  { id: 'sniper', name: 'Sniper Rifles' },
  { id: 'shotgun', name: 'Shotguns' },
  { id: 'mg', name: 'Machine Guns' },
  { id: 'knife', name: 'Knives' },
  { id: 'gloves', name: 'Gloves' },
];
export const WEAPON_TYPE_BY_ID = Object.freeze(Object.fromEntries(WEAPON_TYPES.map(t => [t.id, t])));

export const WEAPONS = {
  kodiak: { name: 'Kodiak AR', type: 'rifle' },
  lancer: { name: 'Lancer M5', type: 'rifle' },
  viper: { name: 'Viper BX', type: 'rifle' },
  harrier: { name: 'Harrier F2', type: 'rifle' },
  warden: { name: 'Warden 9', type: 'pistol' },
  sentinel: { name: 'Sentinel SD', type: 'pistol' },
  deckard: { name: 'Deckard .50', type: 'pistol' },
  pike: { name: 'Pike P7', type: 'pistol' },
  wasp: { name: 'Wasp SMG', type: 'smg' },
  rattler: { name: 'Rattler 10', type: 'smg' },
  drover: { name: 'Drover PDW', type: 'smg' },
  longbow: { name: 'Longbow LR', type: 'sniper' },
  kite: { name: 'Kite Scout', type: 'sniper' },
  mauler: { name: 'Mauler 12', type: 'shotgun' },
  breacher: { name: 'Breacher Auto', type: 'shotgun' },
  anvil: { name: 'Anvil LMG', type: 'mg' },
  juggernaut: { name: 'Juggernaut', type: 'mg' },
  claw: { name: 'Claw Knife', type: 'knife' },
  moth: { name: 'Moth Knife', type: 'knife' },
  spike: { name: 'Spike Bayonet', type: 'knife' },
  switch: { name: 'Switch Knife', type: 'knife' },
  ranger: { name: 'Ranger Bowie', type: 'knife' },
  racer: { name: 'Racer Gloves', type: 'gloves' },
  wraps: { name: 'Hand Wraps', type: 'gloves' },
  driver: { name: 'Driver Gloves', type: 'gloves' },
  tactical: { name: 'Tactical Gloves', type: 'gloves' },
};

export const COLLECTIONS = [
  { id: 'scrap', name: 'Scrapyard Collection' },
  { id: 'street', name: 'Street Collection' },
  { id: 'neon', name: 'Neon Collection' },
  { id: 'frost', name: 'Frost Collection' },
  { id: 'inferno', name: 'Inferno Collection' },
  { id: 'venom', name: 'Venom Collection' },
  { id: 'ocean', name: 'Oceanic Collection' },
  { id: 'arcade', name: 'Arcade Collection' },
  { id: 'gilded', name: 'Gilded Collection' },
  { id: 'apex', name: 'Apex Collection' },
  { id: 'eclipse', name: 'Eclipse Collection' },
  { id: 'blades', name: 'Blade Reserve' },
  { id: 'handwear', name: 'Handwear Reserve' },
];
export const COLLECTION_BY_ID = Object.freeze(Object.fromEntries(COLLECTIONS.map(c => [c.id, c])));

// [weapon, finish, rarity, value, hue, pattern, saturation?]
// Patterns: solid gradient stripes camo hex waves digital splatter flame marble circuit
const C = 'consumer', I = 'industrial', M = 'milspec', R = 'restricted', K = 'classified', V = 'covert', X = 'extraordinary';
const ROWS = {
  scrap: [
    ['warden', 'Rust Patch', C, 3, 22, 'camo', 45],
    ['mauler', 'Sandblasted', C, 2, 38, 'solid', 30],
    ['drover', 'Scrap Metal', C, 3, 30, 'splatter', 20],
    ['anvil', 'Oil Slick', I, 9, 280, 'marble'],
    ['pike', 'Wire Tangle', I, 8, 200, 'stripes', 25],
    ['harrier', 'Junkyard Dog', M, 28, 40, 'camo', 50],
    ['kite', 'Corroded', R, 95, 150, 'splatter', 45],
    ['kodiak', 'Salvage King', K, 340, 45, 'digital'],
    ['longbow', 'Iron Lung', V, 1250, 0, 'hex', 70],
  ],
  street: [
    ['sentinel', 'Concrete', C, 3, 220, 'digital', 8],
    ['rattler', 'Tagged', C, 4, 300, 'splatter'],
    ['breacher', 'Alleyway', I, 10, 260, 'stripes', 35],
    ['wasp', 'Graffiti Burst', I, 12, 320, 'splatter'],
    ['lancer', 'Overpass', M, 32, 210, 'stripes', 40],
    ['deckard', 'Block Party', R, 110, 15, 'waves'],
    ['viper', 'Night Shift', K, 380, 240, 'gradient'],
    ['kodiak', 'Street Royalty', V, 1480, 50, 'flame'],
  ],
  neon: [
    ['pike', 'Pink Static', C, 4, 320, 'digital'],
    ['rattler', 'Glowstick', C, 4, 110, 'solid'],
    ['drover', 'Laser Grid', I, 11, 190, 'hex'],
    ['juggernaut', 'Afterglow', I, 9, 300, 'gradient'],
    ['wasp', 'Synthwave', M, 35, 290, 'waves'],
    ['sentinel', 'Ultraviolet', M, 30, 270, 'marble'],
    ['warden', 'Neon Rider', R, 125, 310, 'stripes'],
    ['kite', 'Cyber Dream', K, 420, 180, 'circuit'],
    ['lancer', 'Hyperdrive', V, 1650, 280, 'gradient'],
  ],
  frost: [
    ['mauler', 'Snowdrift', C, 3, 200, 'camo', 25],
    ['pike', 'Ice Crack', C, 4, 195, 'marble', 45],
    ['rattler', 'Permafrost', I, 10, 205, 'digital', 50],
    ['harrier', 'Polar Camo', I, 9, 210, 'camo', 30],
    ['deckard', 'Glacier', M, 38, 190, 'hex'],
    ['longbow', 'Whiteout', R, 140, 185, 'marble', 35],
    ['kodiak', 'Frozen Core', K, 460, 195, 'hex'],
    ['viper', 'Blizzard', V, 1700, 200, 'waves'],
  ],
  inferno: [
    ['breacher', 'Ash', C, 3, 15, 'splatter', 15],
    ['warden', 'Kindling', C, 4, 25, 'stripes', 55],
    ['anvil', 'Molten', I, 11, 15, 'marble'],
    ['wasp', 'Heatwave', I, 12, 30, 'waves'],
    ['sentinel', 'Firestarter', M, 36, 10, 'flame'],
    ['lancer', 'Magma Flow', R, 150, 12, 'marble'],
    ['deckard', 'Hellfire', K, 520, 5, 'flame'],
    ['longbow', 'Phoenix Rise', V, 2100, 20, 'flame'],
  ],
  venom: [
    ['drover', 'Swamp', C, 3, 90, 'camo', 35],
    ['kite', 'Moss', C, 3, 100, 'camo', 40],
    ['pike', 'Acid Rain', I, 10, 80, 'splatter'],
    ['juggernaut', 'Biohazard', I, 11, 70, 'hex'],
    ['rattler', 'Fangs', M, 34, 110, 'stripes'],
    ['viper', 'Toxic Bloom', R, 135, 95, 'splatter'],
    ['harrier', 'Serpent Scale', K, 440, 120, 'hex'],
    ['kodiak', 'Venomous', V, 1550, 85, 'waves'],
  ],
  ocean: [
    ['mauler', 'Driftwood', C, 2, 30, 'stripes', 30],
    ['sentinel', 'Seafoam', C, 4, 165, 'waves', 45],
    ['wasp', 'Tidepool', I, 9, 180, 'marble'],
    ['breacher', 'Coral Reef', I, 11, 350, 'splatter'],
    ['drover', 'Deep Current', M, 30, 210, 'waves'],
    ['pike', 'Pearl Diver', M, 32, 40, 'marble', 25],
    ['juggernaut', 'Kraken', R, 120, 230, 'waves'],
    ['lancer', 'Abyssal', K, 410, 225, 'gradient'],
    ['longbow', 'Leviathan', V, 1900, 190, 'hex'],
  ],
  arcade: [
    ['warden', 'Pixel Pop', C, 4, 55, 'digital'],
    ['anvil', '8-Bit', C, 3, 120, 'digital'],
    ['kite', 'Coin Slot', I, 10, 50, 'circuit'],
    ['rattler', 'Joystick', I, 11, 0, 'stripes'],
    ['harrier', 'High Score', M, 34, 60, 'digital'],
    ['deckard', 'Power Up', R, 130, 280, 'circuit'],
    ['viper', 'Boss Fight', K, 450, 330, 'digital'],
    ['kodiak', 'Game Over', V, 1600, 300, 'circuit'],
  ],
  gilded: [
    ['pike', 'Brass Fittings', I, 14, 42, 'solid', 55],
    ['sentinel', 'Gold Leaf', M, 45, 48, 'marble'],
    ['wasp', 'Gilded Cage', M, 48, 45, 'hex'],
    ['breacher', 'Royal Guard', R, 170, 355, 'stripes'],
    ['juggernaut', 'Treasury', R, 160, 48, 'digital'],
    ['kite', 'Crown Jewel', K, 560, 330, 'hex'],
    ['deckard', 'Midas Touch', K, 620, 48, 'marble'],
    ['lancer', 'Golden Hour', V, 2400, 40, 'gradient'],
    ['longbow', 'Sovereign', V, 2900, 45, 'flame'],
  ],
  apex: [
    ['rattler', 'Claw Marks', I, 13, 30, 'stripes', 40],
    ['anvil', 'Tiger Stripe', M, 46, 30, 'stripes'],
    ['warden', 'Shark Tooth', M, 44, 200, 'waves', 35],
    ['mauler', 'Raptor', R, 165, 100, 'hex'],
    ['drover', 'Predator', R, 175, 120, 'camo'],
    ['harrier', 'Alpha Wolf', K, 580, 220, 'splatter', 30],
    ['viper', 'Apex Hunter', K, 600, 10, 'hex'],
    ['kodiak', 'Bloodline', V, 2600, 355, 'flame'],
    ['longbow', 'Wyvern', V, 3200, 140, 'flame'],
  ],
  eclipse: [
    ['breacher', 'Dusk', I, 14, 260, 'gradient'],
    ['juggernaut', 'Starfield', M, 48, 240, 'splatter'],
    ['sentinel', 'Lunar Phase', M, 46, 220, 'marble', 20],
    ['kite', 'Corona', R, 180, 40, 'flame'],
    ['wasp', 'Event Horizon', R, 170, 270, 'gradient'],
    ['deckard', 'Blackout', K, 590, 250, 'solid', 12],
    ['lancer', 'Totality', K, 640, 260, 'waves'],
    ['longbow', 'Solar Flare', V, 3100, 30, 'flame'],
    ['viper', 'Dark Matter', V, 2700, 270, 'marble'],
  ],
  blades: [
    ['claw', 'Vanilla', X, 4200, 210, 'solid', 6],
    ['claw', 'Blood Moon', X, 9000, 355, 'marble'],
    ['claw', 'Glacier Edge', X, 7600, 195, 'hex'],
    ['moth', 'Vanilla', X, 3800, 210, 'solid', 6],
    ['moth', 'Prism', X, 11000, 280, 'gradient'],
    ['moth', 'Night Ops', X, 5200, 230, 'camo', 15],
    ['spike', 'Woodland', X, 3000, 100, 'camo', 30],
    ['spike', 'Tiger Fang', X, 4800, 30, 'stripes'],
    ['switch', 'Gunmetal', X, 2400, 215, 'solid', 10],
    ['switch', 'Ocean Spray', X, 3400, 190, 'waves'],
    ['ranger', 'Rustbelt', X, 2200, 22, 'splatter', 45],
    ['ranger', 'Emberforge', X, 3900, 18, 'flame'],
  ],
  handwear: [
    ['racer', 'Checkered', X, 3600, 0, 'digital', 0],
    ['racer', 'Neon Lights', X, 6800, 300, 'circuit'],
    ['wraps', 'Desert Tan', X, 2600, 35, 'solid', 30],
    ['wraps', 'Cobalt', X, 3100, 225, 'stripes'],
    ['driver', 'Mahogany', X, 2900, 15, 'marble', 45],
    ['driver', 'Royal Velvet', X, 5400, 275, 'gradient'],
    ['tactical', 'Urban Grey', X, 2500, 210, 'camo', 8],
    ['tactical', 'Viper Strike', X, 4700, 95, 'hex'],
  ],
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buildItems() {
  const items = [];
  for (const [collection, rows] of Object.entries(ROWS)) {
    for (const [weapon, finish, rarity, value, hue, pattern, sat = 65] of rows) {
      const w = WEAPONS[weapon];
      const special = w.type === 'knife' || w.type === 'gloves';
      const vanilla = finish === 'Vanilla';
      items.push(Object.freeze({
        id: `${weapon}-${slug(finish)}`,
        name: `${special ? '★ ' : ''}${w.name}${vanilla ? '' : ` | ${finish}`}`,
        weapon,
        weaponName: w.name,
        type: w.type,
        finish,
        rarity,
        value,
        collection,
        hasWear: !vanilla,
        art: Object.freeze({ hue, pattern, sat }),
      }));
    }
  }
  return items;
}

export const ITEMS = Object.freeze(buildItems());
export const ITEMS_BY_ID = Object.freeze(Object.fromEntries(ITEMS.map(i => [i.id, i])));

export function getItem(id) {
  return ITEMS_BY_ID[id] || null;
}

// The one place an item's coin value is computed.
export function itemValue(itemId, wear) {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 0;
  return Math.max(1, Math.round(item.value * (item.hasWear ? wearMultiplier(wear) : 1)));
}

export function rarityColor(itemId) {
  const item = ITEMS_BY_ID[itemId];
  return item ? RARITY_BY_ID[item.rarity].color : '#888';
}
