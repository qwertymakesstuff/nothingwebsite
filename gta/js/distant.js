// Distant scenery: a ring of hills all round and a skyline across the bay, drawn behind everything at the far plane (so it can never
// poke through the city), tinted towards the haze colour for atmospheric depth, with a few lit windows at night.
// One cheap cylinder with a canvas texture: no geometry cost, nothing to cull.
import { scene, camera } from './render.js';
import { rng } from './util.js';

const W = 2048, H = 256;
function makeTexture() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = rng(77);
  const base = H - 1; g.clearRect(0, 0, W, H);
  // layer 1: rolling hills (a sum of waves, higher inland, lower over the open sea) -- alpha is the silhouette
  const hill = x => { const u = x / W * Math.PI * 2; return 26 + 20 * Math.sin(u * 3 + 1) + 12 * Math.sin(u * 7 + 2) + 6 * Math.sin(u * 17); };
  g.fillStyle = 'rgba(0,0,255,1)'; g.beginPath(); g.moveTo(0, base);
  for (let x = 0; x <= W; x += 8) { const near = Math.max(0, Math.sin(x / W * Math.PI * 2 - 1.2)); g.lineTo(x, base - hill(x) * (.35 + .65 * near)); } g.lineTo(W, base); g.fill();
  // layer 2: a skyline of towers across the bay (one arc of the circle). R channel marks the lit windows
  const x0 = W * .56, x1 = W * .74; let x = x0;
  while (x < x1) {
    const w = 14 + R() * 24, mid = 1 - Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2)), h = 30 + R() * 50 * (.4 + mid) + (R() < .12 ? 50 : 0);
    g.fillStyle = 'rgb(0,0,255)'; g.fillRect(x, base - h, w, h); if (R() < .3) g.fillRect(x + w * .35, base - h - 14 - R() * 16, w * .3, 18);
    g.fillStyle = 'rgb(255,0,255)'; for (let wy = base - h + 6; wy < base - 10; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (R() < .35) g.fillRect(wx, wy, 2, 3);
    x += w + 2 + R() * 6;
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const mat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false, side: THREE.BackSide,
  uniforms: { map: { value: null }, col: { value: new THREE.Color(0x6a7e96) }, night: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: 'varying vec2 vUv; uniform sampler2D map; uniform vec3 col; uniform float night; void main(){ vec4 t = texture2D(map, vUv); vec3 c = col + vec3(1.0, .82, .5) * t.r * night * .9; gl_FragColor = vec4(c, t.b > .5 ? 1.0 : 0.0); }'
});
let ring = null;
export function buildDistant() {
  mat.uniforms.map.value = makeTexture();
  ring = new THREE.Mesh(new THREE.CylinderGeometry(850, 850, 180, 48, 1, true), mat); ring.position.y = 70; ring.frustumCulled = false; ring.renderOrder = -9; scene.add(ring);
}
const tint = new THREE.Color(), deep = new THREE.Color(), dayDeep = new THREE.Color(0x6a7f98), nightDeep = new THREE.Color(0x0a1022);
/** follow the camera and pick up the current haze colour / night level */
export function updateDistant(fogColor, night) {
  if (!ring) return;
  ring.position.x = camera.position.x; ring.position.z = camera.position.z;
  deep.copy(dayDeep).lerp(nightDeep, night); tint.copy(fogColor).lerp(deep, .5);
  mat.uniforms.col.value.copy(tint); mat.uniforms.night.value = night;
}
