// LAST EXIT: the people of the story. Each has a body built from their cast profile (cast.js `look`), stands where the mission or their
// own hangout says, turns to face the player when near, and can be hurt (the witness in M08). They are not part of the pedestrian crowd.
import { scene } from '../render.js';
import { createCharacter } from '../models/characters.js';
import { pushOut } from '../city.js';
import { layDown } from '../people.js';
import { player } from '../player.js';
import { CAST, HAS_BODY, nameOf } from './cast.js';

export const npcs = new Map();
const FAR = 140;

export function spawn(id, o) {
  o = o || {}; if (!HAS_BODY(id)) return null;
  let n = npcs.get(id);
  if (!n) {
    const ch = createCharacter(CAST[id].look); scene.add(ch.root);
    n = { id, name: nameOf(id), x: 0, z: 0, yaw: 0, ch, root: ch.root, hp: 100, dead: false, hang: false, face: true };
    npcs.set(id, n);
  }
  n.hang = !!o.hang; n.hp = o.hp != null ? o.hp : 100; n.dead = false; n.root.visible = true; n.ch.update(0, 0, {});
  place(n, o.x, o.z, o.yaw);
  return n;
}
function place(n, x, z, yaw) {
  if (x != null) { const r = pushOut(x, z, .45); n.x = r[0]; n.z = r[1]; }
  if (yaw != null) n.yaw = yaw;
  n.root.position.set(n.x, 0, n.z); n.root.rotation.y = n.yaw;
}
/** put someone at a spot (the conversation does this to gather everyone round the player) */
export function moveTo(id, x, z, yaw) { const n = npcs.get(id); if (n) place(n, x, z, yaw); return n; }
export const get = id => npcs.get(id) || null;
export const posOf = id => { const n = npcs.get(id); return n ? { x: n.x, z: n.z } : null; };
export function remove(id) {
  const n = npcs.get(id); if (!n) return; scene.remove(n.root); npcs.delete(id);
  n.root.traverse(o => { if (o.isMesh && o !== n.ch.gun && o.geometry) o.geometry.dispose(); });          // the body geometry is built per person; the shared pistol and the materials stay
}
/** everyone put there by a mission step (hangout people stay as long as the player is near) */
export function clearStory() { for (const n of [...npcs.values()]) if (!n.hang) remove(n.id); }
export function clearAll() { for (const id of [...npcs.keys()]) remove(id); }
export function hurt(id, d) { const n = npcs.get(id); if (!n || n.dead) return; n.hp -= d; if (n.hp <= 0) { n.hp = 0; n.dead = true; layDown(n.ch); } }
export function nearest(maxDist, filter) {
  let best = null, bd = maxDist;
  for (const n of npcs.values()) { if (n.dead || (filter && !filter(n))) continue; const d = Math.hypot(n.x - player.x, n.z - player.z); if (d < bd) { bd = d; best = n; } }
  return best;
}
const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export function update(dt) {
  for (const n of npcs.values()) {
    const d = Math.hypot(n.x - player.x, n.z - player.z); n.root.visible = d < FAR;
    if (!n.root.visible || n.dead) continue;
    if (n.face && d < 9) n.yaw += wrap(Math.atan2(player.x - n.x, player.z - n.z) - n.yaw) * Math.min(1, dt * 4);
    n.root.rotation.y = n.yaw; n.ch.update(dt, 0, {});
  }
}
