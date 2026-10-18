// Jobs: step into a yellow beam to start one. Definitions are data (missionDefs.js) that point at places by reference;
// the destination shows as a marker in the world, on the minimap and on the map. State lives in G.mission.
import { G, canAct, addMoney, bump } from './state.js';
import { data, persist } from './save.js';
import { POIS, getPoi, resolveTarget } from './pois.js';
import { DEFS, defsFor } from './missionDefs.js';
import { addMarker, removeMarker, moveMarker } from './markers.js';
import { pick } from './util.js';
import { sfx } from './audio.js';
import { player } from './player.js';
import { banner, say } from './ui.js';

const where = () => player.car ? [player.car.x, player.car.z, player.car.y] : [player.x, player.z, 0];
export function cancelMission() { G.mission = null; removeMarker('mission'); }
function farTarget(refFrom, refTo) { // pick a destination that is not right next to the start
  const a = resolveTarget(refFrom); let b = null;
  for (let k = 0; k < 20; k++) { const t = resolveTarget(refTo); if (t && (!a || Math.hypot(t.x - a.x, t.z - a.z) > 90) && (!b || true)) { b = t; if (a && Math.hypot(t.x - a.x, t.z - a.z) > 90) break; } }
  return [a, b];
}
export function startMission(defId, giverId) {
  const def = defId ? DEFS.find(d => d.id === defId) : pick(giverId ? defsFor(giverId) : DEFS); if (!def) return false;
  let pts, time, reward;
  if (def.type === 'race') {
    pts = def.route.map(r => resolveTarget(r)).filter(Boolean); time = def.limit; reward = def.reward;
  } else {
    const [a, b] = farTarget(def.from, def.to); if (!a || !b) return false; pts = [a, b];
    const [px, pz] = where(), d = Math.hypot(a.x - px, a.z - pz) + Math.hypot(a.x - b.x, a.z - b.z);
    time = Math.round(d * .17 + 35); reward = Math.round(150 + d * .9);
  }
  G.mission = { id: def.id, type: def.type, title: def.title, text: def.text || '', pts, idx: 0, left: time, total: time, reward, need: !!def.need };
  const t = pts[0]; addMarker({ id: 'mission', x: t.x, z: t.z, y: t.y || 0, color: '#ffee55', glyph: '!', label: t.name, kind: 'mission', beam: true, height: 40 });
  banner(def.title, '#ffd23f', 2); return true;
}
const needsCar = m => m.need && !player.car;
/** Text for the mission strip, or '' when no job is running. */
export function missionText() {
  const m = G.mission; if (!m) return '';
  const t = m.pts[m.idx], [x, z] = where(), d = Math.ceil(Math.hypot(t.x - x, t.z - z));
  const stage = m.type === 'race' ? 'checkpoint ' + (m.idx + 1) + '/' + m.pts.length + ': ' + t.name : m.idx === 0 ? m.text + ' at ' + t.name : 'deliver to ' + t.name;
  return m.title.toLowerCase() + ' - ' + stage + ' - ' + d + 'm - ' + Math.max(0, Math.ceil(m.left)) + 's' + (needsCar(m) ? ' - GET IN A CAR' : '');
}
export const missionTarget = () => G.mission ? G.mission.pts[G.mission.idx] : null;
export function updateMission(dt) {
  const m = G.mission; G.missionCd -= dt;
  const [px, pz, py] = where();
  if (!m) {
    if (G.missionCd <= 0 && canAct()) for (const p of POIS) if (p.category === 'mission' && Math.hypot(p.x - px, p.z - pz) < 3.5) { startMission(null, p.id); break; }
    return;
  }
  if (!canAct()) return;
  m.left -= dt;
  const t = m.pts[m.idx]; moveMarker('mission', t.x, t.z, t.y || 0);
  if (Math.hypot(t.x - px, t.z - pz) < 6 && Math.abs((t.y || 0) - py) < 3.5 && !needsCar(m)) {
    m.idx++; sfx.cash();
    if (m.idx >= m.pts.length) {
      let r = m.reward;
      if (m.type === 'race') { const used = m.total - m.left; r += Math.round(Math.max(0, m.left) * 8); const best = (data.bestRaces || {})[m.id]; if (!best || used < best) { data.bestRaces = Object.assign({}, data.bestRaces, { [m.id]: used }); data.bestRace = used; say('new best time: ' + used.toFixed(1) + 's', 3); } }
      addMoney(r); bump('jobs'); persist(); banner('MISSION PASSED  $' + r, '#7ae27a', 3); cancelMission(); G.missionCd = 4;
    }
  }
  if (G.mission && m.left <= 0) { banner('MISSION FAILED', '#d33', 2.5); cancelMission(); G.missionCd = 4; }
}
