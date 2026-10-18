// What can the player do right now? One place decides, so the prompt on screen and the action behind the key always agree.
import { G, canAct } from './state.js';
import { POIS } from './locations.js';
import { player, nearestCar, enterCar, leaveCar } from './player.js';
import { isTouch } from './input.js';

export const interaction = { kind: null, car: null, text: '' };
export function updateInteraction() {
  const it = interaction; it.kind = null; it.car = null; it.text = '';
  if (!canAct()) return;
  const key = isTouch() ? 'tap CAR' : 'E';
  if (player.car) { if (Math.abs(player.car.speed) < 14) { it.kind = 'exit'; it.text = key + ' to get out'; } return; }
  const c = nearestCar(); if (c) { it.kind = 'enter'; it.car = c; it.text = key + ' to get in'; return; }
  if (!G.mission && G.missionCd <= 0 && POIS.some(p => p.type === 'job' && Math.hypot(p.x - player.x, p.z - player.z) < 14)) { it.kind = 'hint'; it.text = 'walk into the yellow beam for a job'; }
}
export function interact() {
  updateInteraction();
  if (interaction.kind === 'enter') return enterCar(interaction.car);
  if (interaction.kind === 'exit') return leaveCar(false);
  return false;
}
