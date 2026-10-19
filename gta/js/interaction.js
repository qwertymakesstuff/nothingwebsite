// What can the player do right now? One place decides, so the prompt on screen and the action behind the key always agree.
import { G, canAct } from './state.js';
import { POIS } from './pois.js';
import { player, nearestCar, enterCar, leaveCar } from './player.js';
import { isTouch } from './input.js';
import { leaveShop, buyHere, nearBuySpot, nearExitSpot } from './shops.js';
import { nearestZone, describe, act } from './zones.js';
import { zoneAt } from './highway.js';
import { hooks } from './story/hooks.js';

export const interaction = { kind: null, car: null, zone: null, text: '', talk: null };
export function updateInteraction() {
  const it = interaction; it.kind = null; it.car = null; it.zone = null; it.text = ''; it.talk = null;
  if (!canAct()) return;
  const key = isTouch() ? 'tap CAR' : 'E';
  if (G.interior) {
    const K = G.interior.room.K;
    if (nearBuySpot()) { it.kind = 'buy'; it.text = key + ': buy ' + K.item + ' $' + K.price; } else if (nearExitSpot()) { it.kind = 'leave'; it.text = key + ' to leave'; }
    return;
  }
  const zn = nearestZone(player.x, player.z), d = zn && describe(zn, key);
  if (player.car) {
    if (d && zn.kind === 'repair' && d.kind === 'zone') { it.kind = d.kind; it.zone = zn; it.text = d.text; return; }
    if (player.car.layer === 1 && zoneAt(player.car.x, player.car.z)) return;           // no stopping on the highway
    if (Math.abs(player.car.speed) < 14) { it.kind = 'exit'; it.text = key + ' to get out'; }
    return;
  }
  const tk = hooks.talker(key); if (tk) { it.kind = 'talk'; it.talk = tk; it.text = tk.text; return; }
  if (d && d.kind === 'zone') { it.kind = d.kind; it.zone = zn; it.text = d.text; return; }
  const c = nearestCar(); if (c) { it.kind = 'enter'; it.car = c; it.text = key + ' to get in'; return; }
  if (d) { it.kind = d.kind; it.zone = zn; it.text = d.text; return; }   // a hint (closed, sold out...) only shows when there is nothing to do
  if (!G.mission && G.missionCd <= 0 && POIS.some(p => p.category === 'mission' && Math.hypot(p.x - player.x, p.z - player.z) < 14)) { it.kind = 'hint'; it.text = 'walk into the yellow beam for a job'; }
}
export function interact() {
  if (G.mode === 'scene') return hooks.advance();
  updateInteraction();
  if (interaction.kind === 'talk') { interaction.talk.run(); return true; }
  if (interaction.kind === 'enter') return enterCar(interaction.car);
  if (interaction.kind === 'exit') return leaveCar(false);
  if (interaction.kind === 'zone') return act(interaction.zone);
  if (interaction.kind === 'leave') { leaveShop(); return true; }
  if (interaction.kind === 'buy') return buyHere();
  return false;
}
