import { RARITIES, PLATE_DESIGNS, SPECIAL_REGISTRATIONS, RARITY_BY_ID, SPECIAL_BY_REGISTRATION } from './config.js';

function random() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 4294967296;
}

function pick(items) { return items[Math.floor(random() * items.length)]; }

function randomRegistration(design) {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const digits = '0123456789';
  const rand = (source, count) => Array.from({length:count},()=>source[Math.floor(random()*source.length)]).join('');
  switch (design.id) {
    case 'ma-beacon': return `${rand(digits,1)}${rand(letters,3)}${rand(digits,2)}`;
    case 'ma-bay': return `${rand(letters,2)}${rand(digits,4)}`;
    case 'ma-centennial': return `${rand(letters,1)}${rand(digits,3)}${rand(letters,2)}`;
    case 'california': return `${rand(digits,1)}${rand(letters,3)}${rand(digits,3)}`;
    case 'florida': return `${rand(letters,3)}${rand(digits,3)}`;
    case 'texas': return `${rand(letters,3)}${rand(digits,4)}`;
    case 'new-york': return `${rand(letters,3)}${rand(digits,4)}`;
    case 'new-hampshire': return rand(digits,7);
    case 'washington': return `${rand(letters,3)}${rand(digits,4)}`;
    case 'arizona': return `${rand(letters,3)}${rand(digits,4)}`;
    case 'colorado': return `${rand(letters,2)}${rand(digits,3)}${rand(letters,1)}`;
    case 'hawaii': return `${rand(letters,3)}${rand(digits,3)}`;
    case 'euro': return `${rand(letters,2)}${rand(digits,3)}${rand(letters,2)}`;
    case 'tokyo': return `${rand(letters,3)}${rand(digits,3)}`;
    default: return `${rand(letters,2)}${rand(digits,2)}${rand(letters,2)}`;
  }
}

export function classifyPattern(registration) {
  if (/^(\d)\1+$/.test(registration)) return 'legendary';
  if (/^([A-Z])\1{3,}$/.test(registration)) return 'epic';
  if (registration.length >= 5 && registration === [...registration].reverse().join('')) return 'rare';
  const digits = registration.replace(/\D/g,'');
  if (digits.length >= 4) {
    const asc = '01234567890123456789';
    const desc = '98765432109876543210';
    if (asc.includes(digits) || desc.includes(digits)) return 'rare';
  }
  if (/^([A-Z])\1{2,}\d/.test(registration) || /^\d([A-Z])\1{2,}$/.test(registration)) return 'uncommon';
  return null;
}

function rarityRoll(luckLevel) {
  const boost = Math.min(1.8, 1 + Math.max(0,luckLevel) * 0.075);
  // Independent target-odds checks. The rarest successful tier wins; common is the
  // fallback, so a 1-in-N label remains an honest per-spin target rather than a weight.
  for (const tier of [...RARITIES].reverse().slice(0,-1)) {
    if (random() < Math.min(0.25, boost / tier.odds)) return tier;
  }
  return RARITY_BY_ID.common;
}

export function rollPlate({ luckLevel = 0, recentIds = [] } = {}) {
  let special = null;
  for (const item of SPECIAL_REGISTRATIONS) {
    if (random() < 1 / item.odds) { special = item; break; }
  }
  const design = pick(PLATE_DESIGNS);
  const registration = special?.registration || randomRegistration(design);
  const assignedSpecial = special || SPECIAL_BY_REGISTRATION[registration] || null;
  let rarity = assignedSpecial ? RARITY_BY_ID[assignedSpecial.rarity] : rarityRoll(luckLevel);
  const patternRarity = classifyPattern(registration);
  const floor = patternRarity && RARITY_BY_ID[patternRarity];
  if (!assignedSpecial && floor && floor.rank > rarity.rank) rarity = floor;
  const duplicate = recentIds.includes(`${design.id}:${registration}`);
  return {
    id: `${design.id}:${registration}`,
    registration,
    designId: design.id,
    region: design.region,
    rarity: rarity.id,
    value: rarity.value,
    special: assignedSpecial?.label || null,
    duplicateInBatch: duplicate,
    discoveredAt: Date.now(),
    odds: assignedSpecial ? `1 in ${assignedSpecial.odds.toLocaleString()}` : `1 in ${rarity.odds.toLocaleString()} target`
  };
}
