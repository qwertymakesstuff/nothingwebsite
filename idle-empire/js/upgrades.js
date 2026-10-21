// Upgrades: the catalogue (pure data) and how their effects combine.
//
// An upgrade:
//   id, name, description, icon (inner SVG for a 24 x 24 icon), tier (optional badge text)
//   cost         price of the first (or only) level
//   repeatable   optional { growth, maxLevel }: buyable again, price x growth per level owned
//   unlock       conditions that must ALL hold for it to appear in the shop:
//                  { type: 'owned', building, count }  own at least `count` of a building
//                  { type: 'earned', amount }          crowns earned in total
//                  { type: 'pps', amount }             production per second
//                  { type: 'clicks', count }           clicks on the Mint
//                Once unlocked an upgrade stays unlocked.
//   effects      applied once per level owned:
//                  { type: 'buildingMult', building, factor }  one building's output x factor
//                  { type: 'globalMult', factor }              all building output x factor
//                  { type: 'ownedBonus', building, per, percent }
//                        conditional: `building` gets +percent% output for every `per` owned
//                  { type: 'clickAdd', amount }                +amount crowns per click (base)
//                  { type: 'clickMult', factor }               click value x factor
//                  { type: 'clickPps', fraction }              clicks also earn fraction x per-second
//
// Stacking (the one rule every effect follows):
//   building unit rate = baseRate x (all its buildingMults) x (its ownership milestones) x (1 + its ownedBonus% / 100)
//                        x (all globalMults) x (1 + 5% per empire rank)        (milestones and ranks: milestones.js)
//   click value        = (clickBase + all clickAdds) x (all clickMults) + per-second x (all clickPps fractions)
// Multipliers multiply each other; additive bonuses (clickAdd, ownedBonus %, clickPps) add up first.
import { BUILDINGS, BUILDINGS_BY_ID } from './buildings.js';

const ICONS = {
  click: '<path d="M9 2h2v7H9zM4.2 4.6l1.4-1.4 4 4-1.4 1.4zM2 11h7v2H2z"/><path d="M11 10l9 4-4 1.5 3.5 3.5-2 2-3.5-3.5L12.5 21z"/>',
  global: '<path d="M3 20h18v2H3z"/><path d="M4 18V12h3v6zM10 18V8h3v10zM16 18V4h3v14z"/>',
  link: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 0 1 4.2 4.2l-2.1 2.1-1.4-1.4 2.1-2.1a1 1 0 0 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0z"/><path d="M13.4 10.6a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 0 1-4.2-4.2l2.1-2.1 1.4 1.4-2.1 2.1a1 1 0 0 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0z"/>',
  repeat: '<path d="M12 4V1L7 5l5 4V6a6 6 0 0 1 6 6h2a8 8 0 0 0-8-8zM6 12H4a8 8 0 0 0 8 8v3l5-4-5-4v3a6 6 0 0 1-6-6z"/>',
  gold: '<circle cx="12" cy="12" r="9"/><path d="M8 15l1-6 2 2 1-3 1 3 2-2 1 6z" fill="#3a2608"/>',
};

// five x2 tiers per building: unlocked at 1 / 10 / 25 / 50 / 100 owned,
// priced at 10x / 50x / 500x / 5,000x / 50,000x its base cost
const TIER_NAMES = {
  stall: ['Painted Signs', 'Bulk Suppliers', 'Market Rights', 'Covered Arcades', 'Market Charter'],
  workshop: ['Steel Chisels', 'Apprentice Guild', 'Water Wheel', 'Precision Lathes', 'Master Craftsmen'],
  foundry: ['Hotter Coals', 'Bellows Engines', 'Blast Furnace', 'Bessemer Converters', 'Molten Rivers'],
  factory: ['Conveyor Belts', 'Night Shift', 'Steam Turbines', 'Assembly Lines', 'Lights-Out Factory'],
  tradehouse: ['Faster Clippers', 'Port Charters', 'Trade Monopoly', 'Silk Roads', 'Global Ledger'],
  bank: ['Compound Ledgers', 'Vault Doors', 'Royal Charter', 'Central Reserve', 'Infinite Credit'],
  mine: ['Brighter Lamps', 'Dynamite', 'Deep Shafts', 'Steam Drills', 'Mother Lode'],
  railway: ['Iron Rails', 'Express Lines', 'Tunnel Boring', 'Transcontinental', 'Thunder Locomotives'],
  shipyard: ['Dry Docks', 'Ironclad Hulls', 'Steam Liners', 'Cargo Giants', 'Armada Contracts'],
  exchange: ['Ticker Tape', 'Bull Market', 'Futures Pit', 'Hostile Takeovers', 'Market Maker'],
  airship: ['Lighter Gas', 'Gilded Gondolas', 'Jet Stream Routes', 'Cloud Harbors', 'Sky Armada'],
  refinery: ['Purer Aether', 'Condensers', 'Vacuum Stills', 'Aether Turbines', "Philosopher's Coil"],
  colony: ['Anchored Isles', 'Cloud Farms', 'Sky Bridges', 'Floating Capitals', 'Heavenly Census'],
  imperial: ['Royal Dies', 'Continental Presses', 'Golden Standard', 'Imperial Treasury', 'Eternal Mint'],
};
const TIERS = [
  { owned: 1, price: 10, badge: 'I' },
  { owned: 10, price: 50, badge: 'II' },
  { owned: 25, price: 500, badge: 'III' },
  { owned: 50, price: 5000, badge: 'IV' },
  { owned: 100, price: 50000, badge: 'V' },
];

const buildingTiers = BUILDINGS.flatMap(b => TIERS.map((t, i) => ({
  id: `${b.id}-${i + 1}`,
  name: TIER_NAMES[b.id][i],
  description: `${b.plural} produce twice as much.`,
  icon: b.icon, tier: t.badge, group: 'building',
  cost: b.baseCost * t.price,
  unlock: [{ type: 'owned', building: b.id, count: t.owned }],
  effects: [{ type: 'buildingMult', building: b.id, factor: 2 }],
})));

// each building gets +1% output for every one of the building below it;
// unlocked with 25 of the lower building and 10 of the upper, priced at 500x the upper building
const SYNERGY_NAMES = {
  workshop: ['Supply Contracts', 'Workshops buy from your stalls'],
  foundry: ['Ore Shipments', 'Foundries feed your workshops'],
  factory: ['Freight Rail', 'Factories run on foundry steel'],
  tradehouse: ['Merchant Credit', 'Trading Houses sell factory goods'],
  bank: ['Investment Desk', 'Banks finance your trading houses'],
  mine: ['Mining Loans', 'Banks bankroll new shafts'],
  railway: ['Ore Trains', 'Railways haul gold from the mines'],
  shipyard: ['Dockside Rails', 'Shipyards are fed by rail'],
  exchange: ['Shipping Shares', 'Exchanges trade shares in your fleets'],
  airship: ['Venture Capital', 'Investors fund new airships'],
  refinery: ['Aether Harvest', 'Airships gather aether for the refineries'],
  colony: ['Lift Engines', 'Refined aether keeps the colonies aloft'],
  imperial: ['Colonial Tribute', 'Every colony pays tribute to the Imperial Mint'],
};
const SYNERGIES = BUILDINGS.slice(1).map((b, i) => {
  const per = BUILDINGS[i];
  const [name, flavour] = SYNERGY_NAMES[b.id];
  return {
    id: `synergy-${b.id}`,
    name, icon: ICONS.link, group: 'synergy',
    description: `${flavour}: +1% ${b.name} output for every ${per.name} owned.`,
    cost: b.baseCost * 500,
    unlock: [{ type: 'owned', building: per.id, count: 25 }, { type: 'owned', building: b.id, count: 10 }],
    effects: [{ type: 'ownedBonus', building: b.id, per: per.id, percent: 1 }],
  };
});

export const UPGRADES = [
  // clicking
  { id: 'click-1', name: 'Iron Grip', group: 'click', icon: ICONS.click, description: 'Strike twice as hard: clicks are worth x2.',
    cost: 100, unlock: [{ type: 'clicks', count: 50 }], effects: [{ type: 'clickMult', factor: 2 }] },
  { id: 'click-2', name: 'Weighted Hammer', group: 'click', icon: ICONS.click, description: 'Clicks are worth x2.',
    cost: 1000, unlock: [{ type: 'earned', amount: 1000 }], effects: [{ type: 'clickMult', factor: 2 }] },
  { id: 'click-3', name: 'Steam Press', group: 'click', icon: ICONS.click, description: 'Clicks are worth x2.',
    cost: 5e4, unlock: [{ type: 'earned', amount: 5e4 }], effects: [{ type: 'clickMult', factor: 2 }] },
  { id: 'click-pps-1', name: 'Gilded Strike', group: 'click', icon: ICONS.gold, description: 'Each click also earns 1% of your per-second income.',
    cost: 1e5, unlock: [{ type: 'pps', amount: 50 }], effects: [{ type: 'clickPps', fraction: 0.01 }] },
  { id: 'click-pps-2', name: 'Golden Touch', group: 'click', icon: ICONS.gold, description: 'Each click earns another 2% of your per-second income.',
    cost: 5e7, unlock: [{ type: 'pps', amount: 5000 }], effects: [{ type: 'clickPps', fraction: 0.02 }] },
  { id: 'click-4', name: 'Hydraulic Press', group: 'click', icon: ICONS.click, description: 'Clicks are worth x3.',
    cost: 5e8, unlock: [{ type: 'earned', amount: 1e8 }], effects: [{ type: 'clickMult', factor: 3 }] },
  { id: 'click-pps-3', name: 'Midas Engine', group: 'click', icon: ICONS.gold, description: 'Each click earns another 3% of your per-second income.',
    cost: 5e12, unlock: [{ type: 'pps', amount: 1e8 }], effects: [{ type: 'clickPps', fraction: 0.03 }] },

  // the whole empire
  { id: 'global-1', name: 'Ledger Books', group: 'global', icon: ICONS.global, description: 'Proper bookkeeping: all buildings produce +10%.',
    cost: 2.5e4, unlock: [{ type: 'earned', amount: 5000 }], effects: [{ type: 'globalMult', factor: 1.1 }] },
  { id: 'global-2', name: 'Tax Office', group: 'global', icon: ICONS.global, description: 'All buildings produce +15%.',
    cost: 5e6, unlock: [{ type: 'earned', amount: 1e6 }], effects: [{ type: 'globalMult', factor: 1.15 }] },
  { id: 'global-3', name: 'Imperial Seal', group: 'global', icon: ICONS.global, description: 'All buildings produce +25%.',
    cost: 5e9, unlock: [{ type: 'earned', amount: 1e9 }], effects: [{ type: 'globalMult', factor: 1.25 }] },
  { id: 'global-4', name: 'Royal Treasury', group: 'global', icon: ICONS.global, description: 'All buildings produce +25%.',
    cost: 5e12, unlock: [{ type: 'earned', amount: 1e12 }], effects: [{ type: 'globalMult', factor: 1.25 }] },
  { id: 'global-5', name: 'Imperial Decree', group: 'global', icon: ICONS.global, description: 'All buildings produce +30%.',
    cost: 5e15, unlock: [{ type: 'earned', amount: 1e15 }], effects: [{ type: 'globalMult', factor: 1.3 }] },
  { id: 'global-6', name: 'World Bank', group: 'global', icon: ICONS.global, description: 'All buildings produce +50%.',
    cost: 5e18, unlock: [{ type: 'earned', amount: 1e18 }], effects: [{ type: 'globalMult', factor: 1.5 }] },

  // repeatable
  { id: 'rep-click', name: 'Sharper Dies', group: 'repeat', icon: ICONS.repeat,
    description: '+1 crown per click (before click multipliers). Repeatable up to 20 times; price x2.5 each time.',
    cost: 200, repeatable: { growth: 2.5, maxLevel: 20 },
    unlock: [{ type: 'clicks', count: 100 }], effects: [{ type: 'clickAdd', amount: 1 }] },
  { id: 'rep-global', name: 'Overtime Shifts', group: 'repeat', icon: ICONS.repeat,
    description: 'All buildings produce x1.05, compounding. Repeatable up to 25 times; price x3 each time.',
    cost: 1e4, repeatable: { growth: 3, maxLevel: 25 },
    unlock: [{ type: 'pps', amount: 25 }], effects: [{ type: 'globalMult', factor: 1.05 }] },

  ...buildingTiers,
  ...SYNERGIES,
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

export function maxLevel(def) {
  return def.repeatable ? def.repeatable.maxLevel : 1;
}

// every effect of every owned upgrade, combined; `levels` is state.upgrades ({ id: level })
export function collectModifiers(levels) {
  const mods = { building: {}, global: 1, clickAdd: 0, clickMult: 1, clickPps: 0 };
  for (const b of BUILDINGS) mods.building[b.id] = { mult: 1, bonus: [] };
  for (const def of UPGRADES) {
    const level = Math.min(levels[def.id] || 0, maxLevel(def));
    if (level <= 0) continue;
    for (const e of def.effects) {
      switch (e.type) {
        case 'buildingMult': mods.building[e.building].mult *= e.factor ** level; break;
        case 'globalMult': mods.global *= e.factor ** level; break;
        case 'ownedBonus': mods.building[e.building].bonus.push({ per: e.per, percent: e.percent * level }); break;
        case 'clickAdd': mods.clickAdd += e.amount * level; break;
        case 'clickMult': mods.clickMult *= e.factor ** level; break;
        case 'clickPps': mods.clickPps += e.fraction * level; break;
      }
    }
  }
  return mods;
}
