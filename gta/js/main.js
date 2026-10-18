// Entry point: builds the world, runs the frame loop, wires menus to the game state.
import { renderer, render } from './render.js';
import './city.js';
import { G, inWorld, canAct } from './state.js';
import { data, persist } from './save.js';
import { initAudio, resumeAudio } from './audio.js';
import { POIS, spawnHospital } from './locations.js';
import { cars, makeCar, updateCars } from './vehicles.js';
import { spawnTraffic, spawnParked, trafficCount } from './traffic.js';
import { peds, makePed, updatePeds, updateItems, dropItem } from './people.js';
import { player, initPlayer, updatePlayer, syncPlayerMesh, hurtPlayer } from './player.js';
import { updatePolice, spawnCop, officers } from './police.js';
import { updateMission, startMission } from './missions.js';
import { updateLifecycle, busted, wasted } from './lifecycle.js';
import { updateFx } from './effects.js';
import { updateInteraction, interact } from './interaction.js';
import { shoot } from './weapons.js';
import { sfx } from './audio.js';
import { readInput, bindActions, clearInput, lockPointer, hasLock, isTouch } from './input.js';
import { updateCamera, snapCamera } from './camera.js';
import { updateHud, showHud, showStart, showPause, say } from './ui.js';
import { addHeat } from './state.js';

const $ = id => document.getElementById(id);
initPlayer();

/* populate the city */
for (let i = 0; i < 40; i++) makePed();
for (let i = 0; i < 34; i++) spawnParked();
for (let i = 0; i < 22; i++) spawnTraffic();
POIS.filter(p => p.type === 'health').forEach(p => dropItem('health', p.x, p.z, 0));
{ const c = makeCar(spawnHospital[0] + 6, spawnHospital[1] + 1.5, Math.PI / 2, 'owned', 0xc8a23a); c.driver = null; }

/* pause / resume. The pause menu is the single way out of play; losing focus or the mouse lock always lands there. */
function pause(on) {
  if (on) {
    if (G.mode !== 'playing') return;
    G.mode = 'paused'; clearInput(); showPause(true); if (document.exitPointerLock && hasLock()) document.exitPointerLock();
  } else {
    if (G.mode !== 'paused') return;
    showPause(false); G.mode = 'playing'; lastT = performance.now(); lockPointer(); resumeAudio();
  }
}
function begin() {
  initAudio(); lockPointer(); showStart(false); showHud(true); G.mode = 'playing'; lastT = performance.now(); snapCamera();
  say(isTouch() ? 'find a car and drive. yellow beams are jobs' : 'E: get in a car. yellow beams are jobs. click to shoot', 6);
}
bindActions({
  interact, shoot,
  horn() { if (canAct() && player.car) { sfx.horn(); player.car.honk = 1; } },
  pause() { pause(G.mode === 'playing'); },
  blur() { if (G.mode === 'playing' && !isTouch()) pause(true); },
  lockLost() { if (G.mode === 'playing') pause(true); }
});
$('go').addEventListener('click', begin);
$('resume').addEventListener('click', () => pause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'playing') pause(true); });
window.addEventListener('pagehide', persist);

/* the frame loop */
let lastT = performance.now();
function afterRespawn() { snapCamera(); clearInput(); if (!isTouch() && !hasLock()) pause(true); } // after dying the mouse lock is gone: land on the pause menu
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (inWorld()) {
    G.time += dt;
    updatePlayer(dt, readInput()); updateCars(dt); updatePeds(dt); updatePolice(dt); updateItems(dt, it => { if (it.kind === 'cash') sfx.cash(); else say('health', 1.2); });
    updateFx(dt); updateMission(dt); updateLifecycle(dt, afterRespawn);
    if (trafficCount() < 24 && Math.random() < dt * 2) spawnTraffic();
    POIS.forEach(p => { if (p.type === 'job' && p.mesh) p.mesh.rotation.y += dt; });
    updateInteraction();
    if (G.mode === 'playing' && readInput().fire) shoot();
  }
  syncPlayerMesh(); updateCamera(dt); updateHud(dt);
  render();
}
if (renderer) requestAnimationFrame(frame);

// handles for the automated tests
window.__gta = { G, data, player, cars, peds, officers, POIS, addHeat, hurtPlayer, spawnCop, startMission, interact, shoot, pause, begin, spawnHospital, busted, wasted };
