// What can the player do right now? One place decides, so the prompt on screen and the action behind the key always agree.
import { G, canAct } from './state.js';
import { POIS } from './locations.js';
import { player, nearestCar, enterCar, leaveCar } from './player.js';
import { isTouch } from './input.js';
import { nearestDoor, enterShop, leaveShop, buyHere, nearBuySpot, nearExitSpot } from './shops.js';

export const interaction = { kind: null, car: null, text: '' };
export function updateInteraction() {
  const it = interaction; it.kind = null; it.car = null; it.text = '';
  if (!canAct()) return;
  const key = isTouch() ? 'tap CAR' : 'E';
  if (G.interior) {
    const K = G.interior.room.K;
    if (nearBuySpot()) { it.kind = 'buy'; it.text = key + ': buy ' + K.item + ' $' + K.price; } else if (nearExitSpot()) { it.kind = 'leave'; it.text = key + ' to leave'; }
    return;
  }
  if (player.car) { if (Math.abs(player.car.speed) < 14) { it.kind = 'exit'; it.text = key + ' to get out'; } return; }
  const door = nearestDoor(player.x, player.z, 2.8);
  if (door) { if (G.stars > 0) { it.kind = 'hint'; it.text = 'closed: the police are outside'; } else { it.kind = 'shop'; it.door = door; it.text = key + ' to enter ' + door.name; } return; }
  const c = nearestCar(); if (c) { it.kind = 'enter'; it.car = c; it.text = key + ' to get in'; return; }
  if (!G.mission && G.missionCd <= 0 && POIS.some(p => p.type === 'job' && Math.hypot(p.x - player.x, p.z - player.z) < 14)) { it.kind = 'hint'; it.text = 'walk into the yellow beam for a job'; }
}
export function interact() {
  updateInteraction();
  if (interaction.kind === 'enter') return enterCar(interaction.car);
  if (interaction.kind === 'exit') return leaveCar(false);
  if (interaction.kind === 'shop') { enterShop(interaction.door); return true; }
  if (interaction.kind === 'leave') { leaveShop(); return true; }
  if (interaction.kind === 'buy') return buyHere();
  return false;
}
