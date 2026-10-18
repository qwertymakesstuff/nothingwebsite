// Interaction zones: places where standing close and pressing the action key does something (shop doors, repair garage,
// dealership, safehouse). Each zone knows its prompt and its action, so interaction.js stays generic.
import { POIS, getPoi } from './pois.js';
import { doors } from './models/kit.js';
import { G, spend, getMoney } from './state.js';
import { data, persist } from './save.js';
import { player } from './player.js';
import { cars } from './vehicles.js';
import { say, flash } from './ui.js';
import { sfx } from './audio.js';
import { enterShop } from './shops.js';

export const zones = [];
const PRICES = { sports: 900, suv: 600, sedan: 350, hatch: 250, van: 400, pickup: 450, truck: 700 };
export const priceOf = type => PRICES[type] || 300;

export function buildZones() {
  zones.length = 0;
  for (const d of doors) zones.push({ id: 'door:' + d.name + ':' + zones.length, kind: 'shop', x: d.x, z: d.z, r: 2.6, door: d, onFoot: true });
  for (const p of POIS) if (p.zone) zones.push({ id: p.zone + ':' + p.id, kind: p.zone, poi: p, x: p.x, z: p.z, r: p.zone === 'dealership' ? 16 : p.zone === 'repair' ? 7 : 3.5, onFoot: p.zone !== 'repair' });
}
const nearestDisplayCar = () => { let best = null, bd = 9; for (const c of cars) { if (c.kind !== 'display' || c.wreck) continue; const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; best = c; } } return best; };

/** What this zone offers right now: { text, kind } or null. */
export function describe(z, key) {
  if (z.kind === 'shop') return player.car ? null : G.stars > 0 ? { kind: 'hint', text: 'closed: the police are outside' } : { kind: 'zone', text: key + ' to enter ' + z.door.name };
  if (z.kind === 'repair') { if (!player.car) return { kind: 'hint', text: 'drive in to get your car repaired' }; const c = player.car; return c.hp >= 100 ? { kind: 'hint', text: 'your car is fine' } : { kind: 'zone', text: key + ': repair car $' + repairCost(c) }; }
  if (z.kind === 'dealership') { if (player.car) return null; const c = nearestDisplayCar(); return c ? { kind: 'zone', text: key + ': buy the ' + c.type + ' $' + priceOf(c.type) } : { kind: 'hint', text: 'sold out' }; }
  if (z.kind === 'safehouse') return player.car ? null : { kind: 'zone', text: key + ': rest and save' };
  return null;
}
export const repairCost = c => Math.max(10, Math.round((100 - c.hp) * .8));
export function act(z) {
  if (z.kind === 'shop') { enterShop(z.door); return true; }
  if (z.kind === 'repair') { const c = player.car; if (!c || c.hp >= 100) return false; const cost = repairCost(c); if (!spend(cost)) { say('not enough money ($' + cost + ')', 2); return false; } c.hp = 100; c.wreck = false; sfx.cash(); say('repaired (-$' + cost + ')', 2.5); return true; }
  if (z.kind === 'dealership') { const c = nearestDisplayCar(); if (!c) return false; const price = priceOf(c.type); if (!spend(price)) { say('not enough money ($' + price + ')', 2); return false; } c.kind = 'owned'; sfx.cash(); say('it is yours: take it for a spin (-$' + price + ')', 3); return true; }
  if (z.kind === 'safehouse') { player.hp = 100; persist(); flash(.6, '#000'); say('rested and saved', 2.5); return true; }
  return false;
}
export function nearestZone(x, z) { let best = null, bd = Infinity; for (const q of zones) { const d = Math.hypot(q.x - x, q.z - z); if (d < q.r && d < bd) { bd = d; best = q; } } return best; }
