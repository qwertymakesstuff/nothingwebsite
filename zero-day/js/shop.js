// Upgrade shop (permanent hardware/software) + underground marketplace (one-shot consumables).
import { CUR } from './config.js';

// Permanent upgrades. Each has levels; cost rises per level; effect is additive to a base stat.
// Deliberately tuned so maxing everything still leaves Tier 5 hard — upgrades smooth, not trivialise.
export const UPGRADES = [
  {
    id: 'cpu', stat: 'cpu', name: 'Processing Rig', max: 4,
    icon: 'cpu', desc: 'Faster cores. +time on every timed puzzle.',
    costs: [260, 640, 1500, 3400], per: '+18% time per level',
  },
  {
    id: 'crack', stat: 'crack', name: 'Cracking Suite', max: 4,
    icon: 'key', desc: 'Better wordlists & heuristics. Extra password/exploit hints.',
    costs: [300, 720, 1700, 3800], per: '+1 hint tier per level',
  },
  {
    id: 'stealth', stat: 'stealth', name: 'Stealth Toolkit', max: 4,
    icon: 'ghost', desc: 'Quieter footprint. Failures raise detection less.',
    costs: [340, 820, 1900, 4200], per: '-15% detection per level',
  },
  {
    id: 'storage', stat: 'storage', name: 'Data Vault', max: 4,
    icon: 'disk', desc: 'More room to haul files out in one extraction.',
    costs: [220, 560, 1300, 3000], per: '+45 GB per level',
  },
  {
    id: 'recon', stat: 'recon', name: 'Recon Scanner', max: 3,
    icon: 'eye', desc: 'Deeper scans. Reveals more clues before you commit.',
    costs: [280, 700, 1600], per: '+1 clue per level',
  },
  {
    id: 'netanalysis', stat: 'netanalysis', name: 'Net Analyzer', max: 3,
    icon: 'net', desc: 'Pre-maps monitored nodes so fewer are hidden.',
    costs: [300, 760, 1750], per: 'reveal +2 traps per level',
  },
  {
    id: 'prepSlots', stat: 'prepSlots', name: 'Prep Bench', max: 3,
    icon: 'slot', desc: 'Stage more consumables before an operation.',
    costs: [360, 900, 2000], per: '+1 prep slot per level',
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// Consumables bought from the marketplace, staged into prep slots, used during an op.
export const CONSUMABLES = [
  { id: 'coldboot', name: 'Cold Boot Kit', price: 180, icon: 'snow', desc: 'Start the next op with detection halved.' },
  { id: 'tracescrub', name: 'Trace Scrubber', price: 220, icon: 'broom', desc: 'Freezes the trace timer for one stage.' },
  { id: 'hintdump', name: 'Leaked Dump', price: 160, icon: 'file', desc: 'Reveals one extra clue in recon and one password hint.' },
  { id: 'proxy', name: 'Bounce Proxy', price: 240, icon: 'globe', desc: '-30% detection from the next failed action.' },
  { id: 'overclock', name: 'Overclock Chip', price: 200, icon: 'bolt', desc: '+40% time on the next timed puzzle.' },
  { id: 'wipe', name: 'Panic Wipe', price: 300, icon: 'fire', desc: 'If an op fails, lose no reputation (consumed).' },
];

export const CONSUMABLE_BY_ID = Object.fromEntries(CONSUMABLES.map(c => [c.id, c]));

export function upgradeCost(id, currentLevel) {
  const u = UPGRADE_BY_ID[id];
  if (!u || currentLevel >= u.max) return null;
  return u.costs[currentLevel];
}

export const money = n => `${CUR}${Math.round(n).toLocaleString()}`;
