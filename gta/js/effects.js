// Short-lived visuals: explosions, smoke, bullet tracers.
import { scene } from './render.js';
export const fx = [];
export function addFx(mesh, dur, grow, rise) { scene.add(mesh); fx.push({ mesh, t: 0, dur, grow: grow || 0, rise: rise || 0 }); }
export function tracer(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)]);
  addFx(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfff0a0 })), .07, 0);
}
export function fireball(x, z) {
  addFx(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9020, transparent: true, opacity: .9 })).translateX(x).translateY(1.5).translateZ(z), .9, 7);
}
export function smoke(x, z) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(.5, 6, 6), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: .6 }));
  s.position.set(x, 1.2, z); addFx(s, 1.2, 1.5, 2);
}
export function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const u = f.t / f.dur;
    if (f.grow && f.mesh.material) { f.mesh.scale.setScalar(1 + u * f.grow); f.mesh.material.opacity = Math.max(0, .9 * (1 - u)); if (f.rise) f.mesh.position.y += f.rise * dt; }
    if (u >= 1) { scene.remove(f.mesh); fx.splice(i, 1); }
  }
}
export function clearFx() { fx.forEach(f => scene.remove(f.mesh)); fx.length = 0; }

const flashMat = new THREE.SpriteMaterial({ color: 0xffd070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
export function muzzleFlash(x, y, z) { const s = new THREE.Sprite(flashMat); s.scale.set(.7, .7, 1); s.position.set(x, y, z); addFx(s, .06, 0); }
