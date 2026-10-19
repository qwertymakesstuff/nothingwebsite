// LAST EXIT: the campaign inside the game. This is the `env` adapter that lets the pure Story engine (engine.js) drive the real city:
// markers and beams, the mission strip, mission cars, people, ambushes, wanted level, money, saving and dialogue. It also puts the
// story's start markers and the people you can talk to into the world, and keeps the older systems quiet while a story mission runs.
import { Story } from './engine.js';
import { createState, migrate, evalCond, getRel, levelName } from './state.js';
import { SCENES } from './dialogue.js';
import { MISSIONS, MISSION_LIST, HANGOUTS } from './missions.js';
import { PLACES } from './places.js';
import { CAST, nameOf, RELATIONSHIPS } from './cast.js';
import { hooks } from './hooks.js';
import * as conv from './conversation.js';
import * as npcs from './npcs.js';
import * as crew from './crew.js';
import * as voice from './voice.js';
import { G, canAct, addMoney, bump } from '../state.js';
import { data, persist } from '../save.js';
import { getPoi, resolveTarget } from '../pois.js';
import { addMarker, removeMarker } from '../markers.js';
import { storyHud, cancelMission } from '../missions.js';
import { player, enterCar } from '../player.js';
import { cars, makeCar, removeCar } from '../vehicles.js';
import { banner, say } from '../ui.js';
import { reportCrime } from '../reporting.js';
import { addHeat } from '../state.js';
import { STAR_AT } from '../crime.js';
import { nodePos, nearestNode } from '../roads.js';
import { setHour } from '../environment.js';
import { snapCamera } from '../camera.js';
import { fireball, smoke } from '../effects.js';
import { rand } from '../util.js';

const missionCars = new Map();
export const runtime = { enabled: false };

/* ---- places ---- */
function resolve(ref) {
  if (ref === 'player') return { x: player.x, z: player.z, name: 'here' };
  const key = String(ref).replace('place:', ''), pl = PLACES[key]; if (!pl) return null;
  const t = resolveTarget('poi:' + pl.poi), poi = getPoi(pl.poi); if (!t || !poi) return null;
  return { x: t.x, z: t.z, y: t.y || 0, name: pl.name, px: poi.x, pz: poi.z };
}
function roadYaw(x, z) { const n = nearestNode(x, z), c = nodePos(n[0], n[1]); return Math.abs(x - c[0]) < Math.abs(z - c[1]) ? 0 : Math.PI / 2; }

/* ---- the env the engine talks to ---- */
const env = {
  player: () => ({ x: player.x, z: player.z, inCar: !!player.car, carTag: player.car ? player.car.tag || null : null, mode: G.mode }),
  stars: () => G.stars,
  setStars(n) { if (n <= 0 || G.stars >= n) return; reportCrime('attack_cop_car', player.x, player.z); if (G.heat < STAR_AT[n - 1]) addHeat(STAR_AT[n - 1] - G.heat); },
  resolve,
  marker(m) { if (!m) return removeMarker('mission'); addMarker({ id: 'mission', x: m.x, z: m.z, color: '#ffee55', glyph: '!', label: m.label || '', kind: 'mission', beam: true, height: 40 }); },
  objective(t) { storyHud.text = t || ''; },
  banner, say,
  playScene: id => conv.play(id),
  cleanupScenes: () => conv.cancelAll(),
  spawnCar(tag, spec) {
    removeTagged(tag);
    const at = spec.at || resolve('player'), yaw = roadYaw(at.x, at.z); let c = null;
    for (const off of [0, 7, -7, 14, -14, 21]) {
      const x = at.x + (yaw === 0 ? 0 : off), z = at.z + (yaw === 0 ? off : 0);
      if (cars.some(o => !o.wreck && Math.hypot(o.x - x, o.z - z) < 6)) continue;
      c = spec.kind === 'flee' ? crew.makeFleeCar(x, z, yaw, spec.color, spec.type, tag) : makeCar(x, z, yaw, 'owned', spec.color, spec.type); break;
    }
    if (!c) c = makeCar(at.x + 4, at.z + 4, yaw, 'owned', spec.color, spec.type);
    c.tag = tag; c.driver = spec.kind === 'flee' ? 'crew' : null; missionCars.set(tag, c); return c;
  },
  carInfo(tag) { const c = missionCars.get(tag); if (!c) return null; return { alive: cars.includes(c) && !c.wreck, x: c.x, z: c.z, playerIn: player.car === c }; },
  removeAllCars() { adoptHangouts(); npcs.clearStory(); for (const c of missionCars.values()) { if (player.car === c) { c.tag = null; continue; } removeCar(c); } missionCars.clear(); },
  spawnNpc(id, spec) {
    const at = spec.at || resolve('player'), x = at.px != null ? at.px : at.x, z = at.pz != null ? at.pz : at.z;
    let k = 0; for (const n of npcs.npcs.values()) if (n.id !== id && Math.hypot(n.x - x, n.z - z) < 1.6) k++;
    npcs.spawn(id, { x: x + k * 1.5, z: z + k * .4, yaw: spec.yaw || 0 });
  },
  removeNpc: id => npcs.remove(id), npcPos: id => npcs.posOf(id),
  startAmbush: (id, spec) => crew.startAmbush(id, spec), stopAmbush: id => crew.stopAmbush(id), ambushInfo: id => crew.info(id),
  addMoney(n) { addMoney(n); bump('jobs'); },
  save: persist,
  log() {},
  world(name) { if (name === 'burn') { story.s.flags.world_burned = true; persist(); } },
  spawnCruiser() {},
  missionDone() { persist(); }
};
function removeTagged(tag) { const c = missionCars.get(tag); if (c) { if (player.car !== c) removeCar(c); missionCars.delete(tag); } }

export const story = new Story(env, createState());
conv.conv.bind(() => story.s);

/* ---- starting, continuing, leaving the campaign ---- */
function adopt(s) { story.setState(s); data.story = s; }
export function loadStory() { adopt(migrate(data.story)); return story.s; }
export const progress = () => { const s = story.s; return s.done.M09 ? 'finished' : s.started ? 'started' : 'new'; };

/** mode: 'new' | 'continue' | 'free' */
export function startCampaign(mode) {
  runtime.enabled = mode !== 'free';
  voice.loadManifest(); voice.applyVolume();
  if (mode === 'free') { storyHud.busy = false; return; }
  if (mode === 'new' || !story.s.started) {
    crew.clearAmbushes(); npcs.clearAll(); adopt(createState()); data.money = 38; persist(); setHour(18.4);
    story.start('M00');
    const at = { x: player.x + 3.5, z: player.z + 1 }, c = makeCar(at.x, at.z, roadYaw(at.x, at.z), 'owned', 0x8a5a34, 'sedan'); c.driver = null; enterCar(c); G.camYaw = c.yaw; snapCamera();   // the car that shudders on left turns; the camera looks down the road, not into the wall behind
  } else if (story.s.active) {
    const id = story.s.active.id; if (MISSIONS[id] && !story.s.done[id]) { story.start(id, { resume: true }); say('resuming: ' + MISSIONS[id].title.toLowerCase(), 3.5); } else story.s.active = null;
  }
}

/* ---- the world around the story: markers, hangouts, talk, ambient radio ---- */
let sig = '', tickT = 0, radioT = 30, radioI = 0;
function syncMarkers() {
  const pts = runtime.enabled ? story.startPoints() : [], s = pts.map(p => p.id + p.label).join('|');
  if (s === sig) return; sig = s;
  for (const m of MISSION_LIST) removeMarker('story:' + m.id);
  for (const p of pts) { const t = resolve(p.at); if (t) addMarker({ id: 'story:' + p.id, x: t.x, z: t.z, color: p.main ? '#ff7a3c' : '#4fc3ff', glyph: p.main ? '!' : '?', label: p.label, kind: 'poi', category: 'story', beam: true, height: 36, minimap: true, map: true, story: p.id }); }
}
function hangoutEligible(h) { return runtime.enabled && evalCond(h.req, story.s); }
function adoptHangouts() {                      // people a mission put in the world stay if they belong there afterwards
  for (const h of HANGOUTS) { const n = npcs.get(h.id), poi = getPoi(PLACES[h.at.replace('place:', '')].poi); if (n && !n.hang && hangoutEligible(h) && Math.hypot(n.x - poi.x, n.z - poi.z) < 30) n.hang = true; }
}
function hangoutTick() {
  for (const h of HANGOUTS) {
    const poi = getPoi(PLACES[h.at.replace('place:', '')].poi), d = Math.hypot(poi.x - player.x, poi.z - player.z), n = npcs.get(h.id), ok = hangoutEligible(h);
    if (!n && ok && d < 70) npcs.spawn(h.id, { x: poi.x, z: poi.z, yaw: Math.random() * 6.28, hang: true });
    else if (n && n.hang && (!ok || d > 120)) npcs.remove(h.id);
  }
}
function pickHangout(h) {
  const cands = h.scenes.filter(x => SCENES[x.s] && evalCond(x.req, story.s) && (!SCENES[x.s].if || evalCond(SCENES[x.s].if, story.s)));
  let best = null; for (const c of cands) if (!best || (story.s.played[c.s] || 0) < (story.s.played[best.s] || 0)) best = c;
  return best && best.s;
}
hooks.talker = key => {
  if (!runtime.enabled || story.s.active || conv.conv.busy || G.interior || player.car) return null;
  const n = npcs.nearest(3.4, x => x.hang); if (!n) return null;
  const h = HANGOUTS.find(x => x.id === n.id), sc = h && pickHangout(h); if (!sc) return null;
  return { text: key + ': talk to ' + nameOf(n.id), run() { story.s.played[sc] = (story.s.played[sc] || 0) + 1; persist(); conv.play(sc); } };
};
hooks.repairFactor = () => !runtime.enabled ? 1 : story.s.flags.eddie_closure ? .5 : levelName(getRel(story.s, 'EDDIE')) === 'TRUSTED' ? .7 : 1;

/** radio between the stories: the host, the news and Sloane's adverts change as the campaign moves on */
function ambientRadio(dt) {
  if (!player.car || data.radio === false || !runtime.enabled) { radioT = Math.max(radioT, 12); return; }
  radioT -= dt; if (radioT > 0 || conv.conv.busy || G.stars > 0 || G.mode !== 'playing') return;
  radioT = rand(55, 95);
  const list = Object.values(SCENES).filter(s => s.mission === 'X01' && (!s.if || evalCond(s.if, story.s)));
  if (list.length) conv.play(list[radioI++ % list.length].id);
}
/** after the ending the city shows it: the fires of ending C never go out */
let fxT = 0;
const BURN_SPOTS = ['site', 'yard', 'warehouse'];
function worldFx(dt) {
  if (!story.s.flags.world_burned) return; fxT -= dt; if (fxT > 0) return; fxT = .35;
  for (const k of BURN_SPOTS) {
    const p = getPoi(PLACES[k].poi); if (!p || Math.hypot(p.x - player.x, p.z - player.z) > 190) continue;
    smoke(p.x + rand(-5, 5), p.z + rand(-5, 5)); if (Math.random() < .12) fireball(p.x + rand(-6, 6), p.z + rand(-6, 6));
  }
}

/** a mission that just ended at its own next marker (Eddie's garage) does not restart the moment you stand still: walk away and come back */
const disarmed = new Set(); let wasActive = false;
const nearPoint = p => { const t = resolve(p.at); return t ? Math.hypot(t.x - player.x, t.z - player.z) : 1e9; };
/** every frame the world runs */
export function updateStory(dt) {
  crew.updateGroups(dt);
  if (!runtime.enabled) { storyHud.busy = false; return; }
  const a = story.active;
  storyHud.busy = !!a; storyHud.title = a ? a.title : ''; storyHud.target = a && story.target && story.cur && story.cur.at ? story.target : null;
  if (a && G.mission) cancelMission();                                                       // a story mission replaces any random job
  story.update(dt);
  const act = !!story.s.active;
  if (wasActive && !act) for (const p of story.startPoints()) if (nearPoint(p) < 16) disarmed.add(p.id);
  wasActive = act;
  if (!act && canAct() && G.stars === 0 && !conv.conv.busy) {                                    // walk (or drive) into a story marker
    const pts = story.startPoints();
    for (const id of [...disarmed]) { const p = pts.find(q => q.id === id); if (!p || nearPoint(p) > 16) disarmed.delete(id); }
    for (const p of pts) if (!disarmed.has(p.id) && nearPoint(p) < 5.5) { story.start(p.id); break; }
  }
}
/** every frame (menus excluded): conversation timing, people, markers, ambient things */
export function tickStory(dt) {
  conv.update(dt); npcs.update(dt);
  if (!runtime.enabled) return;
  tickT -= dt; if (tickT <= 0) { tickT = .5; syncMarkers(); hangoutTick(); }
  if (G.mode === 'playing') { ambientRadio(dt); worldFx(dt); }
}

/* ---- for menus and tests ---- */
export function journal() {
  const s = story.s, st = id => s.done[id] ? 'done' : s.active && s.active.id === id ? 'active' : s.failed[id] ? 'retry' : story.isAvailable(MISSIONS[id]) ? 'open' : 'locked';
  const chains = {};
  for (const m of MISSION_LIST) if (m.chain) (chains[m.chain] = chains[m.chain] || []).push({ id: m.id, title: m.title, status: st(m.id) });
  return {
    current: s.active ? { title: MISSIONS[s.active.id].title, text: storyHud.text } : null,
    main: MISSION_LIST.filter(m => m.main && m.id !== 'M00').map(m => ({ id: m.id, title: m.title, status: st(m.id), desc: s.done[m.id] || story.isAvailable(m) ? m.desc : '' })),
    chains: Object.entries(chains).map(([name, list]) => ({ name, list })),
    rel: RELATIONSHIPS.filter(id => s.rel[id] !== undefined || id === 'EDDIE' || id === 'MARA').map(id => ({ id, name: nameOf(id), level: levelName(getRel(s, id)), color: CAST[id].color })),
    ending: s.ending
  };
}
export function abandonStory() { if (story.s.active) story.abandon(); }
