// Small helpers for building low-poly models: transform + colour parts, then merge them into one geometry.
// Models are authored facing +z, +y up, origin on the ground at the model's centre.
export function xf(geo, t) {
  t = t || {}; const g = geo.clone();
  if (t.sx != null || t.sy != null || t.sz != null) g.scale(t.sx == null ? 1 : t.sx, t.sy == null ? 1 : t.sy, t.sz == null ? 1 : t.sz);
  if (t.rx) g.rotateX(t.rx); if (t.ry) g.rotateY(t.ry); if (t.rz) g.rotateZ(t.rz);
  if (t.x || t.y || t.z) g.translate(t.x || 0, t.y || 0, t.z || 0);
  return g;
}
const col = new THREE.Color();
export function paint(geo, hex) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3); col.set(hex);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
/** transform + paint in one go */
export const part = (geo, hex, t) => paint(xf(geo, t), hex);
/** Concatenate geometries (position/normal/uv/color). Missing uv/color are filled so the attributes line up. */
export function merge(geos, keepUv) {
  const list = geos.map(g => g.index ? g.toNonIndexed() : g);
  let total = 0; list.forEach(g => { total += g.attributes.position.count; });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = keepUv ? new Float32Array(total * 2) : null, c = new Float32Array(total * 3).fill(1);
  let o = 0;
  list.forEach(g => {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (keepUv && g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (g.attributes.color) c.set(g.attributes.color.array, o * 3);
    o += n;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (keepUv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(c, 3));
  out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
// shared unit primitives (cloned by xf, never mutated)
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 8);
export const SPH = (r, ws, hs) => new THREE.SphereGeometry(r, ws || 8, hs || 6);
/** four corner points -> flat quad (normal from the winding), used for windscreens and signs */
export function quad(a, b, c, d) {
  const g = new THREE.BufferGeometry(), p = [...a, ...b, ...c, ...a, ...c, ...d];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2)); g.computeVertexNormals(); return g;
}
