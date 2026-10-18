// Jobs: step into a yellow beam to start a package run, taxi fare or street race. State lives in G.mission.
import { beam } from './city.js';
import { N } from './layout.js';
import { nodePos } from './roads.js';
import { POIS } from './locations.js';
import { G, canAct, addMoney, bump } from './state.js';
import { data, persist } from './save.js';
import { pick } from './util.js';
import { sfx } from './audio.js';
import { player } from './player.js';
import { banner, say } from './ui.js';

const markers = beam(0, 0, 0xffee55, 40); markers.visible = false;
const rnode = () => nodePos(Math.floor(Math.random() * (N + 1)), Math.floor(Math.random() * (N + 1)));
const where = () => player.car ? [player.car.x, player.car.z] : [player.x, player.z];

export function cancelMission() { G.mission = null; markers.visible = false; }
export function startMission(type) {
  type = type || pick(['delivery', 'taxi', 'race']);
  let pts, time, reward, label;
  if (type === 'race') {
    const a0 = Math.floor(Math.random() * (N - 1)), b0 = Math.floor(Math.random() * (N - 1));
    pts = [[a0 + 2, b0], [a0 + 2, b0 + 2], [a0, b0 + 2], [a0, b0], [a0 + 2, b0], [a0 + 2, b0 + 2]].map(n => nodePos(n[0], n[1]));
    time = 80; reward = 700; label = 'street race: hit every checkpoint';
  } else {
    const [px, pz] = where(), a = rnode(); let b = rnode(), tries = 0; while (Math.hypot(a[0] - b[0], a[1] - b[1]) < 120 && tries++ < 30) b = rnode();
    pts = [a, b]; const d = Math.hypot(a[0] - px, a[1] - pz) + Math.hypot(a[0] - b[0], a[1] - b[1]);
    time = Math.round(d * .16 + 35); reward = Math.round(150 + d * .9);
    label = type === 'delivery' ? 'package run: pick it up, drop it off' : 'taxi fare: you need a car';
  }
  G.mission = { type, pts, idx: 0, left: time, total: time, reward, label, need: type !== 'delivery' };
  markers.visible = true; banner(type === 'race' ? 'STREET RACE' : type === 'taxi' ? 'TAXI FARE' : 'PACKAGE RUN', '#ffd23f', 2);
}
/** Text for the mission strip, or '' when no job is running. */
export function missionText() {
  const m = G.mission; if (!m) return '';
  const t = m.pts[m.idx], [x, z] = where(), d = Math.ceil(Math.hypot(t[0] - x, t[1] - z));
  const stage = m.type === 'race' ? 'checkpoint ' + (m.idx + 1) + '/' + m.pts.length : m.idx === 0 ? 'go to the pickup' : 'go to the drop-off';
  return m.label + ' - ' + stage + ' - ' + d + 'm - ' + Math.max(0, Math.ceil(m.left)) + 's' + (needsCar(m) ? ' - GET IN A CAR' : '');
}
const needsCar = m => m.need && !player.car;

export function updateMission(dt) {
  const m = G.mission; G.missionCd -= dt;
  const [px, pz] = where();
  if (!m) {
    if (G.missionCd <= 0 && canAct()) for (const p of POIS) if (p.type === 'job' && Math.hypot(p.x - px, p.z - pz) < 3.5) { startMission(); break; }
    return;
  }
  if (!canAct()) return;
  m.left -= dt;
  const t = m.pts[m.idx]; markers.position.set(t[0], 20, t[1]);
  if (Math.hypot(t[0] - px, t[1] - pz) < 6 && !needsCar(m)) {
    m.idx++; sfx.cash();
    if (m.idx >= m.pts.length) {
      let r = m.reward;
      if (m.type === 'race') { const used = m.total - m.left; r += Math.round(Math.max(0, m.left) * 8); if (!data.bestRace || used < data.bestRace) { data.bestRace = used; say('new best race time: ' + used.toFixed(1) + 's', 3); } }
      addMoney(r); bump('jobs'); persist(); banner('MISSION PASSED  $' + r, '#7ae27a', 3); cancelMission(); G.missionCd = 4;
    }
  }
  if (G.mission && m.left <= 0) { banner('MISSION FAILED', '#d33', 2.5); cancelMission(); G.missionCd = 4; }
}
