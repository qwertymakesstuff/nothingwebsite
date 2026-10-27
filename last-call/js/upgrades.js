// The shop: equipment, training, transport, housing, decorations and career upgrades. Equipment
// and training make evidence easier to read; none of them makes a decision for you.

export const SHOP = [
  { id: 'uv-torch', cat: 'equipment', name: 'UV pocket torch', price: 60, desc: 'Holograms shine at full strength instead of a faint shimmer.' },
  { id: 'loupe', cat: 'equipment', name: 'Jeweller\'s loupe', price: 45, desc: 'Magnify the ID card to read the small print.' },
  { id: 'age-wheel', cat: 'equipment', name: 'Age wheel', price: 80, desc: 'Your rule card shows the latest birth date allowed tonight. You still have to read the card — and check it\'s real.' },
  { id: 'stanchions', cat: 'equipment', name: 'Rope & stanchions', price: 120, desc: 'An orderly line keeps calmer: queue patience +20%.' },
  { id: 'earpiece', cat: 'equipment', name: 'Radio earpiece', price: 150, desc: 'Management warns you 20 seconds before a rule change.' },
  { id: 'forensics', cat: 'training', name: 'Document forensics course', price: 90, desc: 'Unlocks the Compare tool: pick any two fields to see whether they agree.' },
  { id: 'deescalation', cat: 'training', name: 'De-escalation workshop', price: 70, desc: 'Extra options in incidents, and angry refused guests no longer rattle the line.' },
  { id: 'first-aid', cat: 'training', name: 'First-aid certificate', price: 60, desc: 'Handle medical emergencies at the door yourself.' },
  { id: 'licence', cat: 'career', name: 'Door supervisor licence', price: 150, desc: 'Official accreditation: +$20 base wage every shift.' },
  { id: 'business-cards', cat: 'career', name: 'Business cards', price: 25, desc: 'Regulars remember you: +10% tips.' },
  { id: 'bus', cat: 'transport', name: 'Bus pass', price: 0, upkeep: 6, desc: 'Cheap but unreliable. $6 a shift; strikes make you late.', slot: 'transport' },
  { id: 'bike', cat: 'transport', name: 'Second-hand bike', price: 140, upkeep: 0, desc: 'Free to run and never late. Arrive a little sweaty.', slot: 'transport' },
  { id: 'scooter', cat: 'transport', name: 'Electric scooter', price: 380, upkeep: 3, desc: 'Arrive fresh: shifts start with a calmer line (+10% patience). $3 a shift to charge.', slot: 'transport' },
  { id: 'couch', cat: 'housing', name: 'Benny\'s couch', price: 0, upkeep: 18, desc: 'Lumpy, cheap, and Benny snores. $18 a shift.', slot: 'housing' },
  { id: 'studio', cat: 'housing', name: 'Studio flat', price: 200, upkeep: 32, desc: 'Your own place. Well rested: one extra mistake allowed per shift. $200 deposit, $32 a shift.', slot: 'housing' },
  { id: 'poster', cat: 'decor', name: 'Gig poster', price: 15, desc: 'Moth & Static, signed (probably).' },
  { id: 'plant', cat: 'decor', name: 'Monstera', price: 20, desc: 'Something alive that isn\'t Benny.' },
  { id: 'rug', cat: 'decor', name: 'Patterned rug', price: 40, desc: 'Ties the room together.' },
  { id: 'lava-lamp', cat: 'decor', name: 'Lava lamp', price: 35, desc: 'Hypnotic. Restful. Orange.' },
  { id: 'record-player', cat: 'decor', name: 'Record player', price: 90, desc: 'For winding down at 4 a.m.' },
  { id: 'neon-sign', cat: 'decor', name: 'Neon sign', price: 120, desc: 'Says LAST CALL. Obviously.' },
  { id: 'aquarium', cat: 'decor', name: 'Aquarium', price: 150, desc: 'Three fish: Dee, Kwame and Gus.' },
];

export const SHOP_BY_ID = Object.fromEntries(SHOP.map(i => [i.id, i]));
export const CATEGORIES = [
  ['equipment', 'Equipment'], ['training', 'Training'], ['career', 'Career'], ['transport', 'Transport'], ['housing', 'Housing'], ['decor', 'Room'],
];

export const owns = (player, id) => player.owned.includes(id);

// Buying: validate first, change nothing on failure.
export function canBuy(player, id) {
  const item = SHOP_BY_ID[id];
  if (!item) return { ok: false, why: 'Unknown item.' };
  if (item.slot) {
    if (player[item.slot] === id) return { ok: false, why: 'In use.' };
    if (owns(player, id)) return { ok: true, switchOnly: true };
  } else if (owns(player, id)) return { ok: false, why: 'Owned.' };
  if (player.money < item.price) return { ok: false, why: `Need $${item.price - player.money} more.` };
  return { ok: true };
}

export function buy(player, id) {
  const check = canBuy(player, id);
  if (!check.ok) return check;
  const item = SHOP_BY_ID[id];
  if (!check.switchOnly) { player.money -= item.price; player.owned.push(id); }
  if (item.slot) player[item.slot] = id;
  return { ok: true, item };
}

export function upkeep(player) {
  return { housing: SHOP_BY_ID[player.housing]?.upkeep ?? 0, transport: SHOP_BY_ID[player.transport]?.upkeep ?? 0 };
}

// Effects the shift engine reads.
export function shiftModifiers(player) {
  const o = id => owns(player, id);
  return {
    patienceMult: 1 + (o('stanchions') ? 0.2 : 0) + (player.transport === 'scooter' ? 0.1 : 0),
    extraStrikes: player.housing === 'studio' ? 1 : 0,
    tipMult: o('business-cards') ? 1.1 : 1,
    earpiece: o('earpiece'),
    deescalation: o('deescalation'),
    firstAid: o('first-aid'),
  };
}
