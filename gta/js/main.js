// Entry point: builds the world, runs the frame loop, wires menus to the game state.
import { renderer, render } from './render.js';
import { buildCity, cullBlocks } from './city.js';
import { buildHighway } from './models/highwayModel.js';
import { buildProps, updateTrafficLights, cullProps, placedLog } from './models/props.js';
import { updateEnvironment, updateHeadlights, env, setHour } from './environment.js';
import { updateWater } from './terrain.js';
import { quality, setQuality } from './settings.js';
import { enterShop, leaveShop } from './shops.js';
import { doors } from './models/buildings.js';
import { lightPhase } from './signals.js';
import { G, inWorld, canAct } from './state.js';
import { data, persist } from './save.js';
import { initAudio, resumeAudio } from './audio.js';
import { story, runtime, startCampaign, loadStory, updateStory, tickStory, journal, cycleRadio } from './story/runtime.js';
import { initMenu, refreshPause } from './story/menu.js';
import * as conv from './story/conversation.js';
import * as npcs from './story/npcs.js';
import * as crew from './story/crew.js';
import * as voice from './story/voice.js';
import { POIS, spawnHospital, getPoi } from './locations.js';
import { registerPoiMarkers, updateMarkers, setWaypoint } from './markers.js';
import { buildZones } from './zones.js';
import { openMap, closeMap, isMapOpen } from './map.js';
import { staticCars, spinners } from './models/kit.js';
import { cars, makeCar, updateCars, removeCar } from './vehicles.js';
import { spawnTraffic, spawnParked, spawnHighwayCar, trafficCount, highwayCount } from './traffic.js';
import { peds, makePed, makeBeachPed, updatePeds, updateItems, dropItem, makePairs } from './people.js';
import { player, initPlayer, updatePlayer, syncPlayerMesh, hurtPlayer } from './player.js';
import { updatePolice, spawnCop, officers, dispatcher, intel, copCars } from './police.js';
import { reportCrime, ledger, visibleToPlayer, los } from './reporting.js';
import * as phys from './physprops.js';
import { buildDistant } from './distant.js';
import { updateMission, startMission } from './missions.js';
import { updateLifecycle, busted, wasted } from './lifecycle.js';
import { updateFx } from './effects.js';
import { updateInteraction, interact } from './interaction.js';
import { shoot, punch } from './weapons.js';
import { updateAI, debugInfo as pedDebug, cfg as pedCfg, reset as resetPedAI } from './pedAI.js';
import { sfx } from './audio.js';
import { readInput, bindActions, clearInput, lockPointer, hasLock, isTouch } from './input.js';
import { updateCamera, snapCamera } from './camera.js';
import { updateHud, showHud, showStart, showPause, say } from './ui.js';
import { addHeat } from './state.js';

const $ = id => document.getElementById(id);
initPlayer();

/* build the city, then populate it */
buildCity(); buildHighway(); buildProps(); buildDistant(); registerPoiMarkers(); buildZones(); updateEnvironment(0, 0, 0, false);
for (let i = 0; i < 56; i++) makePed();
for (let i = 0; i < 14; i++) makeBeachPed();
makePairs(7);
for (let i = 0; i < 46; i++) spawnParked();
for (let i = 0; i < 30; i++) spawnTraffic();
for (let i = 0; i < 6; i++) spawnHighwayCar();
POIS.filter(p => p.category === 'health').forEach(p => dropItem('health', p.x, p.z, 0));
for (const s of staticCars) { if (s.chance != null && Math.random() > s.chance) continue; const c = makeCar(s.x, s.z, s.yaw, s.kind === 'display' ? 'display' : 'parked', s.color, s.type); if (s.y) { c.y = s.y; c.mesh.position.y = s.y; } if (s.kind === 'display') c.forSale = true; }
{ const c = makeCar(spawnHospital[0] + 6, spawnHospital[1] + 1.5, Math.PI / 2, 'owned', 0xc8a23a); c.driver = null; }

/* pause / resume. The pause menu is the single way out of play; losing focus or the mouse lock always lands there. */
let scenePaused = false;   // the pause menu opened during a conversation: the conversation stays as it is underneath
function pause(on) {
  if (on) {
    if (G.mode === 'scene') { if (scenePaused) return; scenePaused = true; clearInput(); showPause(true); refreshPause(); if (document.exitPointerLock && hasLock()) document.exitPointerLock(); return; }
    if (G.mode !== 'playing') return;
    G.mode = 'paused'; clearInput(); showPause(true); refreshPause(); if (document.exitPointerLock && hasLock()) document.exitPointerLock();
  } else {
    if (scenePaused) { scenePaused = false; showPause(false); lastT = performance.now(); resumeAudio(); return; }
    if (G.mode !== 'paused') return;
    showPause(false); G.mode = 'playing'; lastT = performance.now(); lockPointer(); resumeAudio();
  }
}
function toggleMap() {
  if (isMapOpen()) { closeMap(); return; }
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; clearInput(); if (document.exitPointerLock && hasLock()) document.exitPointerLock();
  openMap(() => { if (G.mode === 'paused') { G.mode = 'playing'; lastT = performance.now(); lockPointer(); } });
}
/** mode: 'new' | 'continue' (the story) or 'free' (just the city) */
function begin(mode) {
  mode = typeof mode === 'string' ? mode : 'free';
  initAudio(); lockPointer(); showStart(false); showHud(true); G.mode = 'playing'; lastT = performance.now(); snapCamera();
  startCampaign(mode);
  if (mode === 'free') say(isTouch() ? 'find a car and drive. yellow beams are jobs' : 'E: get in a car. yellow beams are jobs. click to shoot', 6);
}
bindActions({
  interact, shoot, punch,
  horn() { if (canAct() && player.car) { sfx.horn(); player.car.honk = 1; } },
  pause() { if (isMapOpen()) closeMap(); else pause(G.mode === 'playing' || (G.mode === 'scene' && !scenePaused)); },
  map: toggleMap,
  radio() { if (G.mode === 'playing') { if (player.car) cycleRadio(); else say('get in a car to use the radio', 1.8); } },
  blur() { if ((G.mode === 'playing' && !isTouch()) || G.mode === 'scene') pause(true); },
  lockLost() { if (G.mode === 'playing') pause(true); }
});
loadStory(); initMenu(begin);
$('mapBtn').addEventListener('click', toggleMap);
const qb = $('qual'); qb.textContent = 'graphics: ' + quality; qb.addEventListener('click', () => { setQuality(quality === 'high' ? 'low' : 'high'); location.reload(); });
$('resume').addEventListener('click', () => pause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && (G.mode === 'playing' || G.mode === 'scene')) pause(true); });
window.addEventListener('pagehide', persist);

/* the frame loop */
let lastT = performance.now(), cullT = 0, wasFrozen = false;
function afterRespawn() { snapCamera(); clearInput(); if (!isTouch() && !hasLock()) pause(true); } // after dying the mouse lock is gone: land on the pause menu
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(window.__maxDt || .05, (now - lastT) / 1000); lastT = now; // __maxDt is only for the automated tests, which run on a software renderer
  if (inWorld()) {
    G.time += dt;
    const inp = readInput();
    if (G.interior) { // inside a shop the street is frozen: only the player, effects and the timers that matter run
      updatePlayer(dt, inp); updateFx(dt); updateLifecycle(dt, afterRespawn); updateInteraction(); G.interior.room.clerk.update(dt, 0, {});
    } else {
      updatePlayer(dt, inp); updateCars(dt); phys.updatePhysProps(dt, player.x, player.z); updatePeds(dt); updateAI(dt); updatePolice(dt); updateItems(dt, it => { if (it.kind === 'cash') sfx.cash(); else say('health', 1.2); });
      updateFx(dt); updateMission(dt); updateStory(dt); updateLifecycle(dt, afterRespawn);
      if (trafficCount() < 30 && Math.random() < dt * 2) spawnTraffic(); if (highwayCount() < 6 && Math.random() < dt) spawnHighwayCar();
      updateInteraction();
      if (G.mode === 'playing' && inp.fire) shoot();
    }
  }
  const frozen = G.mode === 'paused' || G.mode === 'menu' || scenePaused;   // dialogue timing and audio stop with the game
  if (frozen !== wasFrozen) { wasFrozen = frozen; conv.setPaused(frozen); }
  if (!frozen) tickStory(dt);
  updateWater(performance.now() / 1000); updateMarkers(dt, player.x, player.z); spinners.forEach(s => { s.mesh.rotation[s.axis || 'z'] += s.speed * dt; });
  cullT -= dt; if (cullT <= 0) { cullT = .4; cullBlocks(player.x, player.z, quality === 'low' ? 200 : 250); cullProps(player.x, player.z, quality === 'low' ? 170 : 220); }
  updateTrafficLights(G.time); updateHeadlights(G.interior ? null : player.car);
  updateEnvironment(dt, player.x, player.z, inWorld());
  syncPlayerMesh(dt); updateCamera(dt); updateHud(dt);
  if (!window.__noRender) render();   // __noRender is only set by the automated tests
}
if (renderer) requestAnimationFrame(frame);

// handles for the automated tests
window.__gta = { pedai: { cfg: pedCfg, info: pedDebug, reset: resetPedAI }, story, runtime, journal, conv, npcs, crew, voice, updateStory, tickStory, removeCar, startMission, setWaypoint, getPoi, toggleMap, spawnHighwayCar, doors, lightPhase, env, setHour, enterShop, leaveShop, quality, G, data, player, cars, peds, officers, POIS, addHeat, hurtPlayer, spawnCop, startMission, interact, shoot, pause, begin, spawnHospital, busted, wasted, dispatcher, intel, copCars, reportCrime, ledger, visibleToPlayer, los, phys, renderer, placedLog };
