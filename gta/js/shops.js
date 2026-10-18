// Walking into shops: switches the player into a cut-away interior room and back, and sells the one item each shop has.
import { scene } from './render.js';
import { G, spend, getMoney } from './state.js';
import { data, persist } from './save.js';
import { doors } from './models/buildings.js';
import { getRoom, showRoom } from './models/interiors.js';
import { player, dressPlayer } from './player.js';
import { say, flash } from './ui.js';
import { snapCamera } from './camera.js';
import { sfx } from './audio.js';

const voidFloor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: 0x0b0d12 }));
voidFloor.rotation.x = -Math.PI / 2; voidFloor.position.set(1250, -.05, 1200); voidFloor.visible = false; scene.add(voidFloor);

export function nearestDoor(x, z, r) { let best = null, bd = r; for (const d of doors) { const dd = Math.hypot(d.x - x, d.z - z); if (dd < bd) { bd = dd; best = d; } } return best; }
export function enterShop(d) {
  const room = getRoom(d.kind); G.interior = { room, door: d };
  showRoom(room, true); voidFloor.visible = true;
  player.x = room.start[0]; player.z = room.start[1]; player.vx = player.vz = 0; player.yaw = Math.PI; G.camYaw = Math.PI; G.camPitch = .85;
  player.vis = null; flash(.9, '#000'); snapCamera(); sfx.door();
  say(room.K.label + ': ' + room.K.item + ' $' + room.K.price, 3);
}
export function leaveShop() {
  const it = G.interior; if (!it) return;
  showRoom(it.room, false); voidFloor.visible = false; G.interior = null;
  player.x = it.door.x; player.z = it.door.z; player.vx = player.vz = 0; player.yaw = Math.atan2(it.door.nx, it.door.nz); G.camYaw = player.yaw + Math.PI; G.camPitch = .35;
  flash(.9, '#000'); snapCamera(); sfx.door();
}
export function buyHere() {
  const it = G.interior; if (!it) return false;
  const K = it.room.K;
  if (K.item === 'health kit' || K.item === 'burger') {
    const heal = K.item === 'burger' ? 25 : 100;
    if (player.hp >= 100) { say('you are already in good shape', 2); return false; }
    if (!spend(K.price)) { say('not enough money ($' + K.price + ')', 2); return false; }
    player.hp = Math.min(100, player.hp + heal); say('bought a ' + K.item + ' (-$' + K.price + ')', 2.5); sfx.cash(); return true;
  }
  if (!spend(K.price)) { say('not enough money ($' + K.price + ')', 2); return false; }
  data.outfit = ((data.outfit || 0) + 1) % 4; persist(); dressPlayer(); say('new jacket (-$' + K.price + ')', 2.5); sfx.cash(); return true;
}
export const nearBuySpot = () => G.interior && Math.hypot(G.interior.room.buy[0] - player.x, G.interior.room.buy[1] - player.z) < 2.4;
export const nearExitSpot = () => G.interior && Math.hypot(G.interior.room.exit[0] - player.x, G.interior.room.exit[1] - player.z) < 2.2;
