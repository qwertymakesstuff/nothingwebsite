// Entry point: builds the world, runs the frame loop, wires menus to the game state.
import { renderer, render } from './render.js';
import { buildCity, cullBlocks } from './city.js';
import { buildHighway } from './models/highwayModel.js';
import { buildProps, updateTrafficLights, cullProps, placedLog } from './models/props.js';
import { updateEnvironment, updateHeadlights, env, setHour, setShadowQuality } from './environment.js';
import { updateWater } from './terrain.js';
import { quality, setQuality } from './settings.js';
import { enterShop, leaveShop } from './shops.js';
import { doors } from './models/buildings.js';
import { lightPhase } from './signals.js';
import { G, inWorld, canAct } from './state.js';
import { data, persist } from './save.js';
import { initAudio, resumeAudio, setLevels } from './audio.js';
import { story, runtime, startCampaign, loadStory, updateStory, tickStory, journal, cycleRadio } from './story/runtime.js';
import { initMenu } from './story/menu.js';
import { initPauseMenu, refreshPause, handleEscape } from './pausemenu.js';
import { nav, updateNav } from './nav.js';
import { prefs, onPref } from './prefs.js';
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
import { peds, makePed, makeBeachPed, updatePeds, updateItems, dropItem, makePairs, useCrowdBodies } from './people.js';
import { loadBody, BODIES } from './story/glbChar.js';
import { player, initPlayer, updatePlayer, syncPlayerMesh, hurtPlayer, adoptRiggedPlayer } from './player.js';
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
import { readInput, bindActions, clearInput, lockPointer, hasLock, isTouch, setInputBlocked } from './input.js';
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

/* the rigged models: Ash for the player and the crowd model for some pedestrians. Both load in the background; the blocky bodies stand in until then (and for good if a file fails). */
loadBody({ url: BODIES.ash, boost: 2 }).then(adoptRiggedPlayer).catch(e => console.warn('[ash model]', e));
useCrowdBodies(true);

/* pause / resume. The pause menu is the single way out of play; losing focus or the mouse lock always lands there. While it (or the
   map) is open the world is frozen (nothing in the frame loop that moves, times or decides runs) and the keyboard belongs to the menu. */
let scenePaused = false;   // the pause menu opened during a conversation: the conversation stays as it is underneath
const releaseMouse = () => { if (document.exitPointerLock && hasLock()) document.exitPointerLock(); };
function pause(on) {
  if (on) {
    if (G.mode === 'scene') { if (scenePaused) return; scenePaused = true; clearInput(true); setInputBlocked(true); showPause(true); refreshPause(true); releaseMouse(); return; }
    if (G.mode !== 'playing') return;
    G.mode = 'paused'; clearInput(true); setInputBlocked(true); showPause(true); refreshPause(true); releaseMouse();
  } else {
    if (scenePaused) { scenePaused = false; setInputBlocked(false); showPause(false); lastT = performance.now(); resumeAudio(); return; }
    if (G.mode !== 'paused') return;
    showPause(false); setInputBlocked(false); G.mode = 'playing'; lastT = performance.now(); lockPointer(); resumeAudio();
  }
}
/** the map: from the game (M, the MAP button) it returns to the game; from the pause menu it returns to the pause menu */
function openMapFrom(pauseMenu) {
  if (isMapOpen()) return;
  if (pauseMenu) { if (G.mode !== 'paused' && !scenePaused) return; $('pause').hidden = true; setInputBlocked(true); openMap(() => { showPause(true); refreshPause(false); setInputBlocked(true); const b = document.querySelector('.pm-item[data-tab="map"]'); if (b) b.focus(); }); return; }
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; clearInput(true); setInputBlocked(true); releaseMouse();
  openMap(() => { setInputBlocked(false); if (G.mode === 'paused') { G.mode = 'playing'; lastT = performance.now(); lockPointer(); } });
}
function toggleMap() {
  if (isMapOpen()) { closeMap(); return; }
  openMapFrom(G.mode === 'paused' || scenePaused);
}
function escape() {
  if (isMapOpen()) { closeMap(); return; }
  if (handleEscape()) return;
  if (G.mode === 'paused' || scenePaused) pause(false); else pause(true);
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
  pause() { if (isMapOpen()) closeMap(); else if (handleEscape()) return; else pause(G.mode === 'playing' || (G.mode === 'scene' && !scenePaused)); },
  escape,
  map: toggleMap,
  radio() { if (G.mode === 'playing') { if (player.car) cycleRadio(); else say('get in a car to use the radio', 1.8); } },
  blur() { if ((G.mode === 'playing' && !isTouch()) || G.mode === 'scene') pause(true); },
  lockLost() { if (G.mode === 'playing') pause(true); }
});
loadStory(); initMenu(begin);
initPauseMenu({ resume: () => pause(false), map: () => openMapFrom(true), mainMenu: () => { persist(); location.reload(); } });
nav.onNotice = t => say(t, 2.2);
const applyPrefs = () => { setLevels(prefs.master, prefs.sfx); setShadowQuality(prefs.shadows); };
applyPrefs(); voice.applyVolume(); onPref(applyPrefs);
$('mapBtn').addEventListener('click', toggleMap); $('pauseBtn').addEventListener('click', () => pause(true));
const qb = $('qual'); qb.textContent = 'graphics: ' + quality; qb.addEventListener('click', () => { setQuality(quality === 'high' ? 'low' : 'high'); location.reload(); });
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
    const inp = readInput(); updateNav(dt);
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
window.__gta = { nav, prefs, openMapFrom, escape, pedai: { cfg: pedCfg, info: pedDebug, reset: resetPedAI }, story, runtime, journal, conv, npcs, crew, voice, updateStory, tickStory, removeCar, startMission, setWaypoint, getPoi, toggleMap, spawnHighwayCar, doors, lightPhase, env, setHour, enterShop, leaveShop, quality, G, data, player, cars, peds, officers, POIS, addHeat, hurtPlayer, spawnCop, startMission, interact, shoot, pause, begin, spawnHospital, busted, wasted, dispatcher, intel, copCars, reportCrime, ledger, visibleToPlayer, los, phys, renderer, placedLog };
