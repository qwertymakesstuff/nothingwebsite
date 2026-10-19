// Death, arrest and respawn. Timers run on game time so pausing or losing focus can never skip or double-fire them.
import { G, loseMoney, getMoney, bump } from './state.js';
import { player, leaveCar } from './player.js';
import { cars, removeCar } from './vehicles.js';
import { spawnPoint } from './locations.js';
import { clearPolice } from './police.js';
import { resetPhysProps } from './physprops.js';
import { cancelMission } from './missions.js';
import { banner, say, clearBanners } from './ui.js';
import { sfx } from './audio.js';
import { persist } from './save.js';

const RESPAWN_DELAY = 3.2;
export function wasted() {
  if (G.mode !== 'playing') return;
  G.mode = 'wasted'; G.respawnT = RESPAWN_DELAY; G.pendingRespawn = 'hospital';
  const lost = loseMoney(100); G.pendingMsg = 'they patched you up' + (lost ? ' (-$' + lost + ')' : '');
  bump('deaths'); persist(); banner('WASTED', '#d33', RESPAWN_DELAY); sfx.boom();
}
export function busted() {
  if (G.mode !== 'playing') return;
  G.mode = 'busted'; G.respawnT = RESPAWN_DELAY; G.pendingRespawn = 'station';
  const lost = loseMoney(Math.min(getMoney(), Math.max(50, Math.floor(getMoney() * .1)) + 25 * G.stars)); G.pendingMsg = 'released from the station. fined $' + lost + (G.mission ? ' (job failed)' : '');
  if (player.car) player.car.speed = 0;
  bump('busts'); persist(); banner('ARRESTED', '#69f', RESPAWN_DELAY); say('you surrendered: arrested', 2.4);
}
export function respawn(where) {
  if (player.car) leaveCar(true);
  player.vis = null;
  const at = spawnPoint(where);
  clearPolice(); cancelMission(); clearBanners(); resetPhysProps();
  cars.filter(c => !c.wreck && c.driver !== 'player' && Math.hypot(c.x - at[0], c.z - at[1]) < 8).forEach(removeCar); // keep the spawn spot clear
  player.x = at[0]; player.z = at[1]; player.vx = player.vz = 0; player.hp = 100; player.hurt = 0; player.shootCd = 0; player.mesh.visible = true; player.ch.update(0, 0, {});
  G.heat = 0; G.stars = 0; G.wantedText = ''; G.camYaw = where === 'station' ? Math.PI : 0; G.mode = 'playing';
}
/** Called every frame while the world runs; finishes a death/arrest once its timer is up. */
export function updateLifecycle(dt, afterRespawn) {
  if (G.mode !== 'wasted' && G.mode !== 'busted') return;
  G.respawnT -= dt; if (G.respawnT > 0) return;
  respawn(G.pendingRespawn); if (G.pendingMsg) say(G.pendingMsg, 3); G.pendingMsg = null;
  if (afterRespawn) afterRespawn();
}
