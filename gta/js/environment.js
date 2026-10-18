// Sun, sky, fog, time of day and the night-time look (lit windows, street lamps, headlights).
import { scene, camera, renderer } from './render.js';
import { quality } from './settings.js';
import { clamp } from './util.js';
import { setWindowGlow } from './models/facades.js';
import { setWaterEnv } from './terrain.js';
import { setNightProps } from './models/props.js';
import { lampTint } from './models/vehicles3d.js';

export const env = { hour: 16.4, night: 0, sunY: 1, daySeconds: 600 };   // a full day takes 10 minutes
const C = h => new THREE.Color(h);
// keyframes by hour: sky top, horizon, fog, sun colour+intensity, hemisphere sky/ground + intensity
const KF = [
  [0,    0x070b22, 0x1a2444, 0x131b30, 0x7a8ab8, .42, 0x3a4a7a, 0x1c2028, .8],
  [5,    0x0a1030, 0x1f2a4c, 0x182038, 0x7a8ab8, .38, 0x3a4a7a, 0x1c2028, .75],
  [6.6,  0x4a6a9a, 0xf0a070, 0xc09a88, 0xffb070, .6, 0xa0a8c0, 0x504840, .62],
  [8.2,  0x5a9ad8, 0xc4dcf0, 0xb4cce0, 0xfff0d8, .95, 0xdfe9f2, 0x59605a, .9],
  [12,   0x3f8ee0, 0xb8d8f4, 0xaccce8, 0xffffff, 1.05, 0xdfe9f2, 0x59605a, .95],
  [16.5, 0x5a8ed0, 0xe8d4b8, 0xd8c8b0, 0xffd8a0, .95, 0xe0e4ee, 0x5a5a54, .9],
  [18.8, 0x4a5a9a, 0xff8a50, 0xd09068, 0xff8a40, .65, 0x9a90b0, 0x5a4840, .62],
  [20.4, 0x1c2450, 0x6a4a6a, 0x4a3a5a, 0x8a6a8a, .3, 0x4a4a7a, 0x2a2630, .5],
  [22,   0x0a1030, 0x1f2a4c, 0x182038, 0x7a8ab8, .4, 0x3a4a7a, 0x1c2028, .78],
  [24,   0x070b22, 0x1a2444, 0x131b30, 0x7a8ab8, .42, 0x3a4a7a, 0x1c2028, .8]
];
export const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x59605a, .9);
export const sun = new THREE.DirectionalLight(0xfff1d6, 1);
export const headlights = [new THREE.SpotLight(0xfff0cf, 0, 55, .55, .6, 1.2), new THREE.SpotLight(0xfff0cf, 0, 55, .55, .6, 1.2)];
scene.add(hemi, sun, sun.target);
headlights.forEach(h => { scene.add(h, h.target); });
if (renderer && quality === 'high') {
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = c.bottom = -75; c.right = c.top = 75; c.near = 10; c.far = 420; sun.shadow.bias = -.0006; sun.shadow.normalBias = .4;
}
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: C(0x3f8ee0) }, hor: { value: C(0xb8d8f4) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C(0xffffff) }, night: { value: 0 }, time: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec3 vD; uniform vec3 top, hor, sunDir, sunCol; uniform float night, time;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec3 d = normalize(vD); float y = max(d.y, 0.0);
      vec3 col = mix(hor, top, pow(y, 0.55));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      col += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.28);
      if (d.y > 0.02) {
        vec2 p = d.xz / (d.y + 0.25) * 2.2 + vec2(time * 0.012, 0.0);
        float c = n(p) * 0.55 + n(p * 2.1) * 0.3 + n(p * 4.3) * 0.15; c = smoothstep(0.52, 0.82, c) * smoothstep(0.02, 0.25, d.y);
        col = mix(col, mix(vec3(1.0), hor * 1.1, 0.35) * (1.0 - night * 0.8), c * 0.65);
        vec2 sp = floor(d.xz / (d.y + 0.2) * 90.0); float st = step(0.9965, h(sp)) * night * smoothstep(0.1, 0.4, d.y); col += vec3(st);
      }
      gl_FragColor = vec4(col, 1.0);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

const tmp = { top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), sunC: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), a: new THREE.Color(), b: new THREE.Color() };
function sample(hour) {
  let i = 0; while (i < KF.length - 2 && hour >= KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1], u = clamp((hour - a[0]) / (b[0] - a[0]), 0, 1);
  const lerp = (k, out) => out.copy(tmp.a.setHex(a[k])).lerp(tmp.b.setHex(b[k]), u);
  lerp(1, tmp.top); lerp(2, tmp.hor); lerp(3, tmp.fog); lerp(4, tmp.sunC); lerp(6, tmp.hs); lerp(7, tmp.hg);
  return { sunI: a[5] + (b[5] - a[5]) * u, hemiI: a[8] + (b[8] - a[8]) * u };
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function setHour(h) { env.hour = ((h % 24) + 24) % 24; }
const sdir = new THREE.Vector3();
export function updateEnvironment(dt, fx, fz, play) {
  if (play) setHour(env.hour + dt * 24 / env.daySeconds);
  const h = env.hour, k = sample(h);
  env.night = 1 - Math.max(smooth(5.2, 6.9, h) * (1 - smooth(19.2, 21, h)), 0);
  // sun path: rises at 6, sets at 18; the same light becomes a dim moon at night
  const a = (h - 6) / 12 * Math.PI, day = h > 6 && h < 18;
  sdir.set(Math.cos(a) * .85, Math.sin(a), .35).normalize(); if (!day) sdir.set(-Math.cos(a) * .6, Math.abs(Math.sin(a)) * .8 + .35, -.4).normalize();
  env.sunY = sdir.y;
  skyMat.uniforms.top.value.copy(tmp.top); skyMat.uniforms.hor.value.copy(tmp.hor); skyMat.uniforms.sunCol.value.copy(tmp.sunC);
  skyMat.uniforms.sunDir.value.set(Math.cos(a) * .85, Math.sin(a), .35); skyMat.uniforms.night.value = env.night; skyMat.uniforms.time.value += dt;
  sky.position.copy(camera.position);
  scene.fog.color.copy(tmp.fog); if (renderer) renderer.setClearColor(tmp.fog);
  hemi.color.copy(tmp.hs); hemi.groundColor.copy(tmp.hg); hemi.intensity = k.hemiI;
  sun.color.copy(tmp.sunC); sun.intensity = k.sunI;
  // the shadow box follows the player, snapped to shadow texels so edges don't crawl
  const snap = 150 / 2048, sx = Math.round(fx / snap) * snap, sz = Math.round(fz / snap) * snap;
  sun.target.position.set(sx, 0, sz); sun.position.set(sx + sdir.x * 160, sdir.y * 160, sz + sdir.z * 160);
  setWaterEnv(sdir, tmp.sunC, tmp.hor, env.night);
  setWindowGlow(env.night * 1.15);
  setNightProps(env.night);
  const g = .5 + .5 * env.night; lampTint.color.setRGB(g, g * .97, g * .88);
}
/** Headlight beams for the car the player is driving (two fixed lights, so shaders never recompile). */
export function updateHeadlights(car) {
  const on = !!car && !car.wreck && env.night > .3;
  headlights.forEach((l, n) => {
    l.intensity = on ? 1.6 * env.night : 0; if (!on) return;
    const s = n ? 1 : -1, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw), rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
    l.position.set(car.x + fx * 1.8 + rx * s * .6, .8, car.z + fz * 1.8 + rz * s * .6); l.target.position.set(car.x + fx * 14 + rx * s * .8, 0, car.z + fz * 14 + rz * s * .8);
  });
}
