// Ground and sea outside the city square: a terrain mesh that slopes from land into the sea, a texture painted from the shoreline
// function (wet sand, dry sand, dunes, grass, rock) with the planned roads / car parks / paths on top, and a wave shader for the water.
import { scene } from './render.js';
import { WORLD as W, RD } from './layout.js';
import { quality } from './settings.js';
import { shoreDist, heightFromD, SEA_LEVEL, rockiness, beachWidth, fbm, vnoise, SPURS, LOTS, COAST_ROADS, PATHS, piers } from './coast.js';

export const REGION = { x0: -430, z0: -430, size: W + 860 };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mix = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const COL = {
  sandDry: [234, 216, 168], sandWet: [176, 154, 112], seabed: [168, 148, 104], deep: [74, 110, 118],
  rock: [128, 124, 118], rockDark: [92, 90, 86], grass: [112, 146, 76], grassDark: [86, 120, 60], dune: [156, 166, 96], dirt: [138, 120, 86], gravel: [150, 148, 140]
};
const lerpC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

function paintTexture(T) {
  const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d'), img = g.createImageData(T, T), px = img.data, k = REGION.size / T;
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const x = REGION.x0 + (i + .5) * k, z = REGION.z0 + (j + .5) * k; let col, warm = 0;
    if (x > 2 && x < W - 2 && z > 2 && z < W - 2) col = COL.grass;
    else {
      const d = shoreDist(x, z), n1 = fbm(x, z), n2 = vnoise(x / 3.5, z / 3.5), rk = rockiness(x, z), bw = beachWidth(x, z);
      if (d < 0) col = lerpC(COL.sandWet, COL.deep, sm(0, 55, -d + (n1 - .5) * 10));
      else {
        const sandEnd = bw + (n1 - .5) * 10, wet = 1 - sm(0, 7, d + (n2 - .5) * 3);
        let sand = lerpC(COL.sandDry, COL.sandWet, wet * .85);
        if (n2 > .78 && d > 4) sand = lerpC(sand, [200, 186, 150], .5);                    // shell / pebble flecks
        const toDune = sm(sandEnd - 2, sandEnd + 16, d + (n1 - .5) * 12);
        const grassBase = lerpC(COL.grass, COL.grassDark, sm(.35, .75, n1)), land = lerpC(grassBase, COL.dirt, sm(.62, .85, vnoise(x / 28 + 5, z / 28)) * .55);
        col = lerpC(lerpC(sand, COL.dune, clamp(toDune * 2, 0, 1)), land, sm(.55, 1, toDune)); warm = clamp(1 - toDune * 1.2, 0, 1) * (1 - wet * .6);       // dry sand is lifted and warmed below
        if (rk > .02) { const rcol = lerpC(COL.rock, COL.rockDark, sm(.3, .8, n2)); col = lerpC(col, rcol, sm(.15, .6, rk) * (1 - sm(18, 34, d))); }
        // a gravel shoulder along the outer edge of the city's ring road
        const ex = Math.max(0, -x, x - W), ez = Math.max(0, -z, z - W), e = Math.hypot(ex, ez);
        if (e < 5) col = lerpC(COL.gravel, col, sm(1.5, 5, e));
      }
    }
    const o = (j * T + i) * 4; px[o] = col[0] * (.74 + .09 * warm); px[o + 1] = col[1] * (.74 + .07 * warm); px[o + 2] = col[2] * (.72 + .03 * warm); px[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const s = T / REGION.size, X = x => (x - REGION.x0) * s, Z = z => (z - REGION.z0) * s;
  // planned features on top
  g.lineCap = 'butt'; g.lineJoin = 'round';
  for (const r of COAST_ROADS) { g.strokeStyle = '#37383c'; g.lineWidth = r.w * s; g.beginPath(); r.pts.forEach((p, n) => n ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke();
    g.strokeStyle = '#d8b84a'; g.lineWidth = Math.max(1, .25 * s); g.setLineDash([3 * s, 3 * s]); g.stroke(); g.setLineDash([]); g.strokeStyle = 'rgba(236,236,230,.8)'; g.lineWidth = Math.max(1, .18 * s); for (const o of [-r.w / 2 + .5, r.w / 2 - .5]) { g.beginPath(); r.pts.forEach((p, n) => { const q = r.pts[Math.min(r.pts.length - 1, n + 1)], pp = r.pts[Math.max(0, n - 1)], tx = q[0] - pp[0], tz = q[1] - pp[1], l = Math.hypot(tx, tz) || 1; const nx = -tz / l * o, nz = tx / l * o; n ? g.lineTo(X(p[0] + nx), Z(p[1] + nz)) : g.moveTo(X(p[0] + nx), Z(p[1] + nz)); }); g.stroke(); } }
  for (const sp of SPURS) { // the roads that leave the city ring road
    g.strokeStyle = '#34353a'; g.lineWidth = sp.w * s; g.beginPath(); g.moveTo(X(sp.x0), Z(sp.z0)); g.lineTo(X(sp.x1 + sp.dx * 14), Z(sp.z1 + sp.dz * 14)); g.stroke();
    const ox = -sp.dz, oz = sp.dx; g.strokeStyle = '#d8b84a'; g.lineWidth = Math.max(1, .14 * s); for (const o of [-.3, .3]) { g.beginPath(); g.moveTo(X(sp.x0 + ox * o), Z(sp.z0 + oz * o)); g.lineTo(X(sp.x1 + sp.dx * 14 + ox * o), Z(sp.z1 + sp.dz * 14 + oz * o)); g.stroke(); }
    g.strokeStyle = 'rgba(236,236,230,.8)'; g.lineWidth = Math.max(1, .16 * s); for (const o of [-sp.w / 2 + .6, sp.w / 2 - .6]) { g.beginPath(); g.moveTo(X(sp.x0 + ox * o), Z(sp.z0 + oz * o)); g.lineTo(X(sp.x1 + sp.dx * 14 + ox * o), Z(sp.z1 + sp.dz * 14 + oz * o)); g.stroke(); } }
  for (const l of LOTS) { g.fillStyle = '#3a3a3d'; g.fillRect(X(l.cx - l.w / 2), Z(l.cz - l.d / 2), l.w * s, l.d * s); g.strokeStyle = '#c8c8c2'; g.lineWidth = Math.max(1, .14 * s);
    g.strokeRect(X(l.cx - l.w / 2), Z(l.cz - l.d / 2), l.w * s, l.d * s);
    const along = l.dx ? 'z' : 'x'; for (let t = -l.w / 2 + 2; t < l.w / 2; t += 2.8) { if (along === 'z') continue; }
    if (l.dx) { for (let t = -l.d / 2 + 2; t < l.d / 2 - 1; t += 2.8) for (const rowX of [-l.w / 2 + 1.5, l.w / 2 - 6.5]) { g.beginPath(); g.moveTo(X(l.cx + rowX), Z(l.cz + t)); g.lineTo(X(l.cx + rowX + 5), Z(l.cz + t)); g.stroke(); } }
    else { for (let t = -l.w / 2 + 2; t < l.w / 2 - 1; t += 2.8) for (const rowZ of [-l.d / 2 + 1.5, l.d / 2 - 6.5]) { g.beginPath(); g.moveTo(X(l.cx + t), Z(l.cz + rowZ)); g.lineTo(X(l.cx + t), Z(l.cz + rowZ + 5)); g.stroke(); } } }
  g.strokeStyle = 'rgba(214,190,140,.8)'; g.lineWidth = 1.6 * s; g.lineCap = 'round'; g.setLineDash([2 * s, 1.5 * s]);
  for (const p of PATHS) { g.beginPath(); g.moveTo(X(p.x0), Z(p.z0)); g.lineTo(X(p.x1), Z(p.z1)); g.stroke(); } g.setLineDash([]);
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.anisotropy = 4; return t;
}

/* ---------- the water ---------- */
const waterUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
  time: { value: 0 }, depthMap: { value: null }, origin: { value: new THREE.Vector2(REGION.x0, REGION.z0) }, regionSize: { value: REGION.size },
  shallow: { value: new THREE.Color(0x2fb7b0) }, deep: { value: new THREE.Color(0x0a3556) }, sky: { value: new THREE.Color(0xaad0ee) },
  sunDir: { value: new THREE.Vector3(.4, .8, .3) }, sunCol: { value: new THREE.Color(0xffffff) }, night: { value: 0 }
}]);
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms, transparent: true, depthWrite: false, fog: true,
  vertexShader: 'varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
  fragmentShader: `varying vec3 vW; uniform float time, regionSize, night; uniform sampler2D depthMap; uniform vec2 origin; uniform vec3 shallow, deep, sky, sunDir, sunCol;
    #include <fog_pars_fragment>
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float wave(vec2 p){ float t = time; return n(p * .09 + vec2(t * .05, t * .03)) * .6 + n(p * .21 - vec2(t * .08, t * .02)) * .3 + n(p * .55 + vec2(t * .12, -t * .1)) * .1; }
    void main(){
      vec2 uv = (vW.xz - origin) / regionSize; float depth = 1.0;
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) depth = texture2D(depthMap, uv).r;
      float e = .6, w0 = wave(vW.xz), dx = wave(vW.xz + vec2(e, 0.0)) - w0, dz = wave(vW.xz + vec2(0.0, e)) - w0;
      vec3 nrm = normalize(vec3(-dx * 2.4, 1.0, -dz * 2.4));
      vec3 v = normalize(cameraPosition - vW); float fres = pow(1.0 - max(dot(nrm, v), 0.0), 3.0);
      vec3 col = mix(shallow, deep, smoothstep(0.0, .75, depth));
      col *= 1.0 - .8 * night;
      vec3 sk = sky * (1.0 - .6 * night);
      col = mix(col, sk, clamp(fres * .75 + .05, 0.0, 1.0));
      vec3 r = reflect(-normalize(sunDir), nrm); col += sunCol * pow(max(dot(r, v), 0.0), 90.0) * (1.0 - night * .6) * .9;
      float line = smoothstep(.1, .0, abs(fract(depth * 9.0 - time * .12) - .5) * .5) * (1.0 - smoothstep(.0, .3, depth)) * .35;   // lines of foam rolling in
      float foam = 1.0 - smoothstep(.0, .05 + .025 * sin(time * 1.4 + vW.x * .13 + vW.z * .09), depth + (w0 - .5) * .04);
      foam = max(foam, line * (.6 + .4 * w0)); col = mix(col, vec3(.95, .97, 1.0) * (1.0 - .6 * night), clamp(foam, 0.0, 1.0));
      float a = mix(.45, .97, smoothstep(.0, .3, depth)); a = max(a, foam);
      gl_FragColor = vec4(col, a);
      #include <fog_fragment>
    }`
});
export function setWaterEnv(sunDir, sunCol, skyCol, night) { waterUniforms.sunDir.value.copy(sunDir); waterUniforms.sunCol.value.copy(sunCol); waterUniforms.sky.value.copy(skyCol); waterUniforms.night.value = night; }
export function updateWater(t) { waterUniforms.time.value = t; }

/* ---------- build ---------- */
export let terrain = null, sea = null;
export function buildTerrain() {
  const hi = quality === 'high', T = hi ? 2048 : 1024, DS = hi ? 1024 : 512;
  // depth texture for the water shader: 0 at the shore, 1 at 60 m offshore
  const dd = new Uint8Array(DS * DS * 4), k = REGION.size / DS;
  for (let j = 0; j < DS; j++) for (let i = 0; i < DS; i++) { const x = REGION.x0 + (i + .5) * k, z = REGION.z0 + (j + .5) * k, d = (x > 0 && x < W && z > 0 && z < W) ? 1000 : shoreDist(x, z), o = (j * DS + i) * 4; dd[o] = d >= 0 ? 0 : clamp(-d / 60, 0, 1) * 255; dd[o + 3] = 255; }
  const depthTex = new THREE.DataTexture(dd, DS, DS, THREE.RGBAFormat); depthTex.magFilter = depthTex.minFilter = THREE.LinearFilter; depthTex.needsUpdate = true; waterUniforms.depthMap.value = depthTex;
  // terrain mesh: flat on land, sloping into the sea; the quads that are entirely under the city are skipped
  const STEP = 14, n = Math.ceil(REGION.size / STEP), pos = [], uv = [], idx = [], vid = (i, j) => j * (n + 1) + i;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = REGION.x0 + i * STEP, z = REGION.z0 + j * STEP, inside = x > 0 && x < W && z > 0 && z < W, d = inside ? 1000 : shoreDist(x, z); pos.push(x, heightFromD(d), z); uv.push((x - REGION.x0) / REGION.size, (z - REGION.z0) / REGION.size); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x0 = REGION.x0 + i * STEP, z0 = REGION.z0 + j * STEP; if (x0 > -2 && z0 > -2 && x0 + STEP < W + 2 && z0 + STEP < W + 2) continue; const a = vid(i, j), b = vid(i + 1, j), c = vid(i, j + 1), e = vid(i + 1, j + 1); idx.push(a, c, b, b, c, e); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const tm = new THREE.MeshLambertMaterial({ map: paintTexture(T) });
  tm.onBeforeCompile = sh => {                                   // procedural ground detail: grain up close, grass tones, dry patches and a few wildflowers (the 1.5 m/px texture can't carry these)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nfloat gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }\nfloat gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1.,0.)),f.x), mix(gh(i+vec2(0.,1.)),gh(i+vec2(1.,1.)),f.x), f.y); }')
      .replace('#include <map_fragment>', `#include <map_fragment>
 float near = 1.0 - smoothstep(20.0, 120.0, length(vWp.xz - cameraPosition.xz));
 float grass = smoothstep(.015, .09, diffuseColor.g - max(diffuseColor.r * .92, diffuseColor.b));
 float big = gn(vWp.xz * .045), mid = gn(vWp.xz * .22), fine = gh(floor(vWp.xz * 5.0));
 diffuseColor.rgb *= 1.0 + (fine - .5) * .2 * near + (mid - .5) * .16;
 diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.22, 1.06, .72), grass * smoothstep(.55, .85, big) * .8);   // sun-dried patches
 diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.78, .96, .8), grass * smoothstep(.6, .15, big) * .6);       // lush patches
 float fl = gh(floor(vWp.xz * 1.6)); vec3 fc = gh(floor(vWp.xz * 1.6) + 7.3) < .5 ? vec3(1., .86, .3) : vec3(.96, .62, .72);
 diffuseColor.rgb = mix(diffuseColor.rgb, fc, grass * near * step(.985, fl) * step(.45, gn(vWp.xz * .3)) * .9);`);
  };
  terrain = new THREE.Mesh(geo, tm); terrain.receiveShadow = false; scene.add(terrain);
  sea = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), waterMat); sea.rotation.x = -Math.PI / 2; sea.position.set(W / 2, SEA_LEVEL, W / 2); sea.renderOrder = 2; scene.add(sea);
  return terrain;
}
