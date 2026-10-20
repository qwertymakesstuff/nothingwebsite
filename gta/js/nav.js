// Navigation to the player's waypoint: keeps the route up to date, the distance, the direction arrow and the arrival check.
// The waypoint itself is a marker (markers.js), so the map, the minimap and the world beam keep working; this module only adds
// the route and the HUD. A road route is shown only when navroute.js found one; otherwise the HUD shows a direction arrow.
import { camera } from './render.js';
import { player } from './player.js';
import { G } from './state.js';
import { getMarker, setWaypoint as putWaypoint, clearWaypoint as dropWaypoint } from './markers.js';
import { shoreDist } from './coast.js';
import { WORLD } from './layout.js';
import { planRoute, deviated, remaining, relativeBearing, fmtDist, lengthOf } from './navroute.js';

const $ = id => document.getElementById(id);
/** nav.route: the polyline still ahead ([[x, z], ...]) or null; nav.reason says why there is none */
export const nav = { target: null, route: null, mode: 'none', reason: '', dist: 0, routeLen: 0, replans: 0, onNotice: null };
let planT = 0, hudT = 0, lastText = '', lastRot = '', fwd = null;
const where = () => player.car ? { x: player.car.x, z: player.car.z, deck: (player.car.y || 0) > 4 } : { x: player.x, z: player.z, deck: (player.y || 0) > 4 };
const say = t => { if (nav.onNotice) nav.onNotice(t); };

/** set (or move) the waypoint; refuses open water. -> { ok, message } */
export function setWaypoint(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, message: 'not a place' };
  const inside = x > 0 && x < WORLD && z > 0 && z < WORLD;
  if (!inside && shoreDist(x, z) < 0) return { ok: false, message: 'that is out at sea' };
  putWaypoint(x, z); replan(true); return { ok: true, message: 'waypoint set' };
}
export function clearWaypoint(why) { const had = !!getMarker('waypoint'); dropWaypoint(); reset(); if (had && why) say(why); return had; }
export const hasWaypoint = () => !!getMarker('waypoint');
function reset() { nav.target = null; nav.route = null; nav.mode = 'none'; nav.reason = ''; nav.dist = 0; nav.routeLen = 0; lastText = ''; }

function replan(force) {
  const w = getMarker('waypoint'); if (!w) { if (nav.target) reset(); return; }
  const me = where();
  if (!nav.target || nav.target.x !== w.x || nav.target.z !== w.z) { nav.target = { x: w.x, z: w.z }; force = true; }
  if (!force && nav.route && !deviated(nav.route, me.x, me.z)) { nav.route = remaining(nav.route, me.x, me.z); nav.routeLen = lengthOf(nav.route); return; }
  const r = planRoute(me, w, me.deck); nav.replans++;
  if (r.ok) { nav.route = r.pts; nav.routeLen = r.length; nav.mode = 'road'; nav.reason = ''; }
  else { nav.route = null; nav.routeLen = 0; nav.mode = 'direction'; nav.reason = r.reason; }   // no invented route: just point the way
}

/** every frame while playing */
export function updateNav(dt) {
  const w = getMarker('waypoint'); if (!w) { if (nav.target) reset(); return; }
  const me = where(); nav.dist = Math.hypot(w.x - me.x, w.z - me.z);
  if (nav.dist < 12) { clearWaypoint('you have arrived'); return; }                        // arrived: the waypoint removes itself
  planT -= dt; if (planT <= 0 || !nav.target) { planT = .6; replan(false); }
}

/** the HUD element: an arrow that points the way relative to the camera, and the distance */
export function updateNavHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = .08;
  const el = $('nav'); if (!el) return;
  const w = getMarker('waypoint'); if (!w || G.mode === 'menu') { if (!el.hidden) el.hidden = true; return; }
  if (el.hidden) el.hidden = false;
  const me = where(); let tx = w.x, tz = w.z;
  if (nav.mode === 'road' && nav.route && nav.route.length > 1) { const nx = nav.route[1]; if (Math.hypot(nx[0] - me.x, nx[1] - me.z) > 6) { tx = nx[0]; tz = nx[1]; } else if (nav.route.length > 2) { tx = nav.route[2][0]; tz = nav.route[2][1]; } }
  fwd = fwd || new THREE.Vector3(); camera.getWorldDirection(fwd);
  const a = relativeBearing(fwd.x, fwd.z, tx - me.x, tz - me.z), rot = 'rotate(' + a.toFixed(2) + 'rad)';
  if (rot !== lastRot) { lastRot = rot; $('navArrow').style.transform = rot; }
  const text = fmtDist(nav.mode === 'road' ? Math.max(nav.routeLen, nav.dist) : nav.dist) + (nav.mode === 'road' ? ' by road' : ' straight');
  if (text !== lastText) { lastText = text; $('navText').textContent = text; el.title = nav.mode === 'direction' ? 'no road route: ' + nav.reason : 'waypoint'; }
}
