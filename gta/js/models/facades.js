// Procedural facade textures (canvas). Each kind gets a colour map and an emissive map of the lit windows, so night turns windows on.
import { rng } from '../util.js';

export const KINDS = {
  brick:    { tw: 12, th: 12.8 }, plaster: { tw: 12, th: 12.8 }, concrete: { tw: 12, th: 12.8 }, glass: { tw: 12, th: 12.8 },
  house:    { tw: 9, th: 6.4 },   metal: { tw: 6, th: 6 },        shop: { tw: 8, th: 3.6 }, hospital: { tw: 12, th: 12.8 }
};
const cache = new Map(), mats = [];
export const facadeMaterials = mats;

function draw(kind, base, seed) {
  const R = rng(seed), mk = () => { const c = document.createElement('canvas'); c.width = c.height = kind === 'shop' ? 256 : 256; return c; };
  const m = mk(), e = mk(), g = m.getContext('2d'), eg = e.getContext('2d'), S = 256;
  const shade = (hex, f) => { const r = Math.min(255, ((hex >> 16) & 255) * f), gg = Math.min(255, ((hex >> 8) & 255) * f), b = Math.min(255, (hex & 255) * f); return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')'; };
  g.fillStyle = shade(base, 1); g.fillRect(0, 0, S, S); eg.fillStyle = '#000'; eg.fillRect(0, 0, S, S);
  const speckle = n => { for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(0,0,0,' + R() * .1 + ')'; g.fillRect(R() * S, R() * S, 2 + R() * 3, 1 + R() * 3); } };
  const win = (x, y, w, h, lit, frame) => {
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, lit ? '#e9d38a' : '#5a7488'); gr.addColorStop(.5, lit ? '#d9bd6a' : '#1f2e3b'); gr.addColorStop(1, lit ? '#c9a850' : '#33495c');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (!lit && R() < .35) { g.fillStyle = 'rgba(' + (200 + R() * 40 | 0) + ',' + (150 + R() * 60 | 0) + ',' + (120 + R() * 60 | 0) + ',.55)'; g.fillRect(x, y, w, h * (.3 + R() * .5)); } // curtains
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillStyle = shade(base, 1.25); g.fillRect(x - 5, y + h + 3, w + 10, 3);                // mullion + sill
    if (lit) { eg.fillStyle = 'rgb(255,' + (190 + R() * 40 | 0) + ',' + (110 + R() * 50 | 0) + ')'; eg.fillRect(x, y, w, h); }
  };
  if (kind === 'brick') {
    for (let y = 0; y < S; y += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, S, 1); for (let x = (y / 8 % 2) * 12; x < S; x += 24) g.fillRect(x, y, 1, 8); }
    speckle(500);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) win(c * 64 + 16, r * 64 + 14, 32, 36, R() < .3, shade(base, .55));
  } else if (kind === 'plaster' || kind === 'hospital') {
    speckle(350);
    for (let r = 0; r < 4; r++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, r * 64 + 60, S, 4); for (let c = 0; c < 4; c++) win(c * 64 + 14, r * 64 + 14, 36, 36, R() < .3, shade(base, .7)); }
  } else if (kind === 'concrete') {
    for (let x = 0; x < S; x += 64) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 2, S); } speckle(700);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) win(c * 128 + 12, r * 64 + 16, 104, 30, R() < .3, shade(base, .6));
  } else if (kind === 'glass') {
    g.fillStyle = shade(base, .6); g.fillRect(0, 0, S, S);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const x = c * 32 + 1, y = r * 64 + 8, lit = R() < .28, gr = g.createLinearGradient(x, y, x + 30, y + 50);
      gr.addColorStop(0, lit ? '#ecd58a' : shade(base, 1.5)); gr.addColorStop(.6, lit ? '#d6b865' : shade(base, .75)); gr.addColorStop(1, lit ? '#c9a850' : shade(base, 1.1));
      g.fillStyle = gr; g.fillRect(x, y, 30, 50); if (lit) { eg.fillStyle = 'rgb(255,210,130)'; eg.fillRect(x, y, 30, 50); }
    }
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, S); g.lineTo(S * .6, 0); g.lineTo(S * .8, 0); g.lineTo(S * .2, S); g.fill();
  } else if (kind === 'house') {
    speckle(300);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) win(c * 128 + 34, r * 128 + 26, 52, 56, R() < .3, '#f0ece0');
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 124, S, 6);
  } else if (kind === 'metal') {
    for (let x = 0; x < S; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, shade(base, 1.15)); gr.addColorStop(.5, shade(base, .8)); gr.addColorStop(1, shade(base, 1.0)); g.fillStyle = gr; g.fillRect(x, 0, 16, S); }
    speckle(900); g.fillStyle = 'rgba(70,40,20,.15)'; for (let i = 0; i < 12; i++) g.fillRect(R() * S, 0, 3 + R() * 5, S * R());
    g.fillStyle = shade(base, .5); g.fillRect(0, 120, S, 6); win(40, 150, 60, 36, R() < .4, shade(base, .4)); win(160, 150, 60, 36, R() < .4, shade(base, .4));
  } else if (kind === 'shop') {
    g.fillStyle = shade(base, .8); g.fillRect(0, 0, S, S);
    for (let c = 0; c < 2; c++) { // big shop windows, awning above
      const x = c * 128 + 10, lit = R() < .6;
      g.fillStyle = shade(base, .4); g.fillRect(x - 3, 70, 116, 160);
      const gr = g.createLinearGradient(x, 74, x + 110, 230); gr.addColorStop(0, lit ? '#f0dc9a' : '#6a8498'); gr.addColorStop(1, lit ? '#d8bc70' : '#27394a'); g.fillStyle = gr; g.fillRect(x, 74, 110, 152);
      if (lit) { eg.fillStyle = 'rgb(255,215,140)'; eg.fillRect(x, 74, 110, 152); }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x, 226); g.lineTo(x + 60, 74); g.lineTo(x + 78, 74); g.lineTo(x + 18, 226); g.fill();
      const ac = ['#b8322f', '#2f5fb8', '#2f9a58', '#d2a52f'][(R() * 4) | 0];
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f0f0f0' : ac; g.fillRect(x - 4 + k * 15, 36, 15, 34); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 4, 70, 120, 4);
    }
  }
  const tex = (c, enc) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  return { map: tex(m), em: tex(e) };
}
/** Shared facade material for a kind + colour. */
export function facadeMat(kind, base) {
  const key = kind + ':' + base;
  let m = cache.get(key);
  if (!m) {
    const t = draw(kind, base, base ^ kind.length * 977);
    m = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.em, emissive: 0xffffff, emissiveIntensity: 0, roughness: .85, metalness: kind === 'glass' ? .35 : 0 });
    m.userData.kind = kind; cache.set(key, m); mats.push(m);
  }
  return m;
}
export function setWindowGlow(v) { mats.forEach(m => { m.emissiveIntensity = v; }); }

/** Box with side faces UV-mapped in metres, split into { sides, top } so each can take a different material. */
export function boxFaces(w, h, d, kind) {
  const K = KINDS[kind], g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
  const sides = [], top = [];
  const f = { sides: new THREE.BufferGeometry(), top: new THREE.BufferGeometry() };
  const take = (faces) => { const P = [], N = [], U = []; faces.forEach(fi => { for (let v = 0; v < 6; v++) { const i = fi * 6 + v; P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(uv.getX(i), uv.getY(i)); } }); return { P, N, U }; };
  const mkGeo = (faces, scaleFn) => { const t = take(faces), geo = new THREE.BufferGeometry(); const U = t.U.slice(); for (let i = 0; i < U.length / 2; i++) { const fi = faces[Math.floor(i / 6)]; const s = scaleFn(fi); U[i * 2] *= s[0]; U[i * 2 + 1] *= s[1]; } geo.setAttribute('position', new THREE.Float32BufferAttribute(t.P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(t.N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); return geo; };
  f.sides = mkGeo([0, 1, 4, 5], fi => fi < 2 ? [d / K.tw, h / K.th] : [w / K.tw, h / K.th]);
  f.top = mkGeo([2], () => [w / 8, d / 8]);
  return f;
}
