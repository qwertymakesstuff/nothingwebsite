// Third-person camera: smoothed follow, pulls in instead of clipping through buildings, hides the player if it gets too close.
import { camera } from './render.js';
import { pushOut } from './city.js';
import { G } from './state.js';
import { clamp, angDiff } from './util.js';
import { player } from './player.js';
import { cars, carDist } from './vehicles.js';
import { zoneAt, HW_H } from './highway.js';
import { setEngine } from './audio.js';

const focus = { x: 0, z: 0, y: 0, set: false }, cam = { dist: 6.5, shake: 0 };
export function snapCamera() { focus.set = false; cam.dist = 6.5; }
export function updateCamera(dt) {
  const c = player.car;
  if (c) { // behind the car, unless the player is looking around
    G.camDrag -= dt;
    if (G.camDrag <= 0 && Math.abs(c.speed) > 2) G.camYaw += angDiff(c.speed > 0 ? c.yaw : c.yaw + Math.PI, G.camYaw) * Math.min(1, dt * 3);
  }
  if (!focus.set) { focus.x = player.x; focus.z = player.z; focus.y = player.y || 0; focus.set = true; }
  const k = 1 - Math.exp(-dt * (c ? 9 : 14));
  focus.x += (player.x - focus.x) * k; focus.z += (player.z - focus.z) * k; focus.y += ((player.y || 0) - focus.y) * Math.min(1, dt * 8);
  if (Math.hypot(player.x - focus.x, player.z - focus.z) > 12) { focus.x = player.x; focus.z = player.z; } // teleport (respawn)
  const inside = !!G.interior, want = inside ? 6.2 : c ? 9.5 + Math.min(4, Math.abs(c.speed) * .1) : 6.5, ty = c ? 1.4 : 1.5;
  const cp = Math.cos(G.camPitch), sp = Math.sin(G.camPitch), fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
  // march from the player back towards the camera and stop before the first wall
  let free = want;
  if (!inside) for (let d = 1.2; d <= want; d += .8) { { const sx = focus.x - fx * cp * d, sz = focus.z - fz * cp * d; if (pushOut(sx, sz, .5, true)[2] || cars.some(k => k !== c && Math.abs(k.x - sx) < 8 && Math.abs(k.z - sz) < 8 && carDist(k, sx, sz) < .9)) { free = Math.max(1, d - .8); break; } } }
  cam.dist += (free - cam.dist) * (free < cam.dist ? 1 : Math.min(1, dt * 4));  // snap in, ease out
  if (inside) cam.dist += (want - cam.dist) * .5;
  let camY = Math.max(.8, focus.y + ty + sp * cam.dist + 1.2);
  if (!(player.y > 1) && !inside && zoneAt(focus.x, focus.z) === 'deck') camY = Math.min(camY, HW_H - 1.3);   // under the deck the camera stays below it
  camera.position.set(focus.x - fx * cp * cam.dist, camY, focus.z - fz * cp * cam.dist);
  if (G.shake) { cam.shake = G.shake; G.shake = 0; } cam.shake = Math.max(0, cam.shake - dt * 2.5);
  camera.position.x += (Math.random() - .5) * cam.shake; camera.position.y += (Math.random() - .5) * cam.shake;
  camera.lookAt(focus.x, focus.y + ty + .6, focus.z);
  const fov = 65 + (c ? Math.min(14, Math.abs(c.speed) * .35) : 0);
  if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  if (player.mesh && !c && !player.vis) player.mesh.visible = cam.dist > 1.7 || G.camPitch > .9; // too close: get out of the way of the lens
  setEngine(c && !c.wreck ? c.speed : null);
}
