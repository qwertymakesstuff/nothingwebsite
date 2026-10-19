// Articulated low-poly people: one merged "upper" mesh (torso, head, hair, accessories), two arms and two legs that pivot at the
// shoulders/hips. Parts are colour-baked (vertex colours) and share one material, so a character is five cheap draw calls.
import { part, merge, BOX, CYL, SPH } from './mesh.js';
import { vcLambert } from './materials.js';
import { pick, rand } from '../util.js';

const SKIN = [0xf1c9a5, 0xe0ac84, 0xc68863, 0x9a6540, 0x6e4529];
const HAIR = [0x1c1410, 0x3a2418, 0x5a3a20, 0x8a6a3a, 0xc9b06a, 0x8a8a8a, 0x2a2a2a, 0x7a2a1a];
const TOPS = [0xc0463c, 0x3a6ab8, 0x3a9a5a, 0xd8b030, 0x7a4ab8, 0xe0e0e0, 0x2e8a8a, 0xd8742a, 0x4a4a52, 0xb83a7a];
const BOTTOMS = [0x2a3348, 0x3a3a44, 0x5a4a3a, 0x1f2a3a, 0x6a6a72, 0x3d2f26, 0x2a4a3a];
const SHOES = [0x1c1c1c, 0x3a2a1a, 0xe8e8e8, 0x2a3a6a];
const dark = (c, f) => { const r = ((c >> 16) & 255) * f, g = ((c >> 8) & 255) * f, b = (c & 255) * f; return (r << 16) | (g << 8) | b; };

/** Random civilian. Any field can be overridden. */
export function civilianSpec(o) {
  const female = Math.random() < .5;
  return Object.assign({
    h: rand(.92, 1.08) * (female ? .96 : 1), w: rand(.9, 1.2) * (female ? .9 : 1), belly: Math.random() < .25 ? rand(.3, 1) : 0, female,
    skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(female ? ['long', 'long', 'bun', 'short', 'bob'] : ['short', 'short', 'bald', 'cap', 'beanie', 'afro', 'short']),
    top: pick(TOPS), sleeves: Math.random() < .55 ? 'short' : 'long', bottom: pick(BOTTOMS), shorts: Math.random() < .15, skirt: female && Math.random() < .25, shoes: pick(SHOES),
    acc: [Math.random() < .2 && 'glasses', Math.random() < .18 && 'backpack', Math.random() < .15 && 'bag', Math.random() < .12 && 'tie'].filter(Boolean)
  }, o || {});
}
export const officerSpec = (o) => civilianSpec(Object.assign({ top: 0x3a5a9a, sleeves: 'short', bottom: 0x14203a, shoes: 0x111111, shorts: false, skirt: false, hairStyle: 'cap', hair: 0x1c1410, acc: ['badge', 'belt'], w: 1.1, belly: Math.random() < .3 ? .5 : 0 }, o || {}));
export const playerSpec = (outfit) => civilianSpec({ female: false, h: 1.04, w: 1.05, belly: 0, skin: 0xe0ac84, hair: 0x1c1410, hairStyle: 'short', top: [0x2f3f6a, 0x9a2f2f, 0x2f6a4a, 0x1c1c1c][outfit || 0], sleeves: 'long', bottom: 0x2a3348, shorts: false, skirt: false, shoes: 0xe8e8e8, acc: ['glasses'] });

const HIP = .92, SHOULDER = 1.5;
function legGeo(s, side) {
  const pants = s.skirt ? s.skin : s.bottom, upper = s.shorts || s.skirt ? (s.skirt ? s.bottom : s.bottom) : s.bottom, shin = (s.shorts || s.skirt) ? s.skin : s.bottom;
  const w = s.w;
  return merge([
    part(CYL(.088 * w, .07 * w, .46, 7), upper, { y: -.23 }),
    part(CYL(.07 * w, .056 * w, .42, 7), shin, { y: -.67 }),
    part(BOX, s.shoes, { sx: .12 * w, sy: .075, sz: .27, y: -.9, z: .05 })
  ]);
}
function armGeo(s) {
  const sleeve = s.top, forearm = s.sleeves === 'long' ? s.top : s.skin, w = s.w;
  return merge([
    part(CYL(.062 * w, .055 * w, .3, 7), sleeve, { y: -.15 }),
    part(CYL(.052 * w, .045 * w, .28, 7), forearm, { y: -.44 }),
    part(SPH(.052, 7, 5), s.skin, { y: -.61 })
  ]);
}
function hairParts(s) {
  const h = s.hair, p = [], y = 1.7;
  switch (s.hairStyle) {
    case 'short': p.push(part(SPH(.142, 9, 6), h, { y: y + .03, z: -.01, sy: .9 })); break;
    case 'afro': p.push(part(SPH(.2, 9, 7), h, { y: y + .06, z: -.02 })); break;
    case 'long': p.push(part(SPH(.145, 9, 6), h, { y: y + .03, sy: .9 }), part(CYL(.13, .1, .36, 8), h, { y: y - .17, z: -.06, sz: .7 })); break;
    case 'bob': p.push(part(SPH(.15, 9, 6), h, { y: y + .02, sy: .95 }), part(CYL(.15, .14, .16, 8), h, { y: y - .06, z: -.02 })); break;
    case 'bun': p.push(part(SPH(.142, 9, 6), h, { y: y + .03, sy: .9 }), part(SPH(.07, 6, 5), h, { y: y + .17, z: -.08 })); break;
    case 'cap': p.push(part(SPH(.145, 9, 6), s.top === 0x3a5a9a ? 0x14203a : s.top, { y: y + .035, sy: .8 }), part(BOX, s.top === 0x3a5a9a ? 0x14203a : s.top, { sx: .2, sy: .02, sz: .13, y: y + .02, z: .15 })); break;
    case 'beanie': p.push(part(SPH(.15, 9, 6), pick([0xc0463c, 0x2a6aa8, 0x3a3a3a]), { y: y + .045, sy: .95 })); break;
    default: break; // bald
  }
  return p;
}
function upperGeo(s) {
  const w = s.w, f = s.female, parts = [];
  const shoulderW = (f ? .19 : .22) * w;
  parts.push(part(CYL(shoulderW, (f ? .15 : .17) * w, .58, 9), s.top, { y: 1.2, sz: .62 }));                         // torso
  if (s.belly) parts.push(part(SPH(.17 * w, 8, 6), s.top, { y: 1.1, z: .05, sz: .62 + s.belly * .25, sy: .85, sx: 1 + s.belly * .15 }));
  parts.push(part(CYL(.175 * w, .18 * w, s.skirt ? .34 : .2, 9), s.skirt ? s.bottom : s.bottom, { y: s.skirt ? .98 : .98, sz: .64 }));  // hips / skirt
  parts.push(part(CYL(.055, .06, .1, 6), s.skin, { y: 1.53 }));                                                        // neck
  parts.push(part(SPH(.13, 10, 8), s.skin, { y: 1.66, sy: 1.12, sz: .98 }));                                           // head
  parts.push(part(SPH(.028, 5, 4), s.skin, { x: -.128, y: 1.66 }), part(SPH(.028, 5, 4), s.skin, { x: .128, y: 1.66 })); // ears
  parts.push(part(BOX, dark(s.skin, .88), { sx: .03, sy: .05, sz: .05, y: 1.645, z: .128 }));                           // nose
  parts.push(part(BOX, 0x15110f, { sx: .028, sy: .02, sz: .01, x: -.05, y: 1.685, z: .122 }), part(BOX, 0x15110f, { sx: .028, sy: .02, sz: .01, x: .05, y: 1.685, z: .122 })); // eyes
  parts.push(part(BOX, dark(s.skin, .7), { sx: .05, sy: .012, sz: .01, y: 1.6, z: .12 }));                              // mouth
  parts.push(...hairParts(s));
  for (const a of s.acc) {
    if (a === 'glasses') parts.push(part(BOX, 0x14110f, { sx: .24, sy: .035, sz: .02, y: 1.685, z: .125 }));
    else if (a === 'backpack') parts.push(part(BOX, pick([0x3a4a2a, 0x7a2a2a, 0x2a3a5a]), { sx: .3 * w, sy: .4, sz: .16, y: 1.2, z: -.19 }));
    else if (a === 'bag') parts.push(part(BOX, 0x6a4a2a, { sx: .05, sy: .6, sz: .06, x: .08, y: 1.25, z: .1, rz: .5 }), part(BOX, 0x6a4a2a, { sx: .26, sy: .2, sz: .1, x: -.26 * w, y: .95, z: .02 }));
    else if (a === 'tie') parts.push(part(BOX, 0xaa2a2a, { sx: .04, sy: .3, sz: .015, y: 1.3, z: .13 * w + .03 }));
    else if (a === 'badge') parts.push(part(BOX, 0xe8c040, { sx: .06, sy: .07, sz: .015, x: .08, y: 1.36, z: .13 * w + .03 }), part(BOX, 0xe8c040, { sx: .1, sy: .02, sz: .01, y: 1.8, z: .0, x: 0 }));
    else if (a === 'belt') parts.push(part(BOX, 0x151515, { sx: .37 * w, sy: .05, sz: .21, y: 1.0 }), part(BOX, 0x151515, { sx: .08, sy: .12, sz: .08, x: -.22 * w, y: .95, z: .06 }));
  }
  if (s.top === 0x3a5a9a && s.acc.includes('badge')) parts.push(part(BOX, 0x9ab8e8, { sx: .13 * w, sy: .1, sz: .13, y: 1.5 })); // open collar of the uniform shirt
  return merge(parts);
}
const pistolGeo = merge([part(BOX, 0x222222, { sx: .05, sy: .07, sz: .22, z: .1 }), part(BOX, 0x181818, { sx: .045, sy: .12, sz: .06, y: -.07, z: .03 })]);

/** Build a character. `ch.update(dt, speed, flags)` animates it; flags: {aim, seated, dead, run}. */
export function createCharacter(spec) {
  const s = spec, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mk = g => { const m = new THREE.Mesh(g, vcLambert); m.castShadow = true; return m; };
  const upper = mk(upperGeo(s)), legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  const lg = legGeo(s), ag = armGeo(s);
  const ll = mk(lg), lr = mk(lg), al = mk(ag), ar = mk(ag);
  legL.add(ll); legR.add(lr); armL.add(al); armR.add(ar);
  legL.position.set(-.1 * s.w, HIP, 0); legR.position.set(.1 * s.w, HIP, 0);
  armL.position.set(-.26 * s.w, SHOULDER, 0); armR.position.set(.26 * s.w, SHOULDER, 0);
  const gun = new THREE.Mesh(pistolGeo, vcLambert); gun.position.set(0, -.6, .02); gun.rotation.x = Math.PI / 2; gun.visible = false; armR.add(gun);
  body.add(upper, legL, legR, armL, armR);
  root.scale.setScalar(s.h);
  const ch = { root, body, upper, legL, legR, armL, armR, gun, spec: s, phase: Math.random() * 6, blend: 0, aimBlend: 0, seatBlend: 0, handsBlend: 0 };
  ch.update = function (dt, speed, f) {
    f = f || {};
    const moving = speed > .25 ? 1 : 0;
    ch.blend += (moving - ch.blend) * Math.min(1, dt * 10);
    ch.phase += dt * speed * 4.1;                                // phase follows distance travelled: feet don't skate
    const amp = (.22 + .62 * Math.min(1, speed / 8)) * ch.blend, sw = Math.sin(ch.phase);
    ch.aimBlend += ((f.aim ? 1 : 0) - ch.aimBlend) * Math.min(1, dt * 14);
    ch.seatBlend += ((f.seated ? 1 : 0) - ch.seatBlend) * Math.min(1, dt * 12);
    const ab = ch.aimBlend, sb = ch.seatBlend, t = performance.now() / 1000;
    legL.rotation.x = (sw * amp) * (1 - sb) + -1.35 * sb; legR.rotation.x = (-sw * amp) * (1 - sb) + -1.25 * sb;
    armL.rotation.x = (-sw * amp * .9) * (1 - sb) * (1 - ab * .6) + -.9 * sb + -1.2 * ab * (1 - sb);
    armR.rotation.x = (sw * amp * .9) * (1 - ab) * (1 - sb) + -1.0 * sb + -1.52 * ab * (1 - sb);
    armL.rotation.z = .03 + .03 * (1 - ab); armR.rotation.z = -.03 - .03 * (1 - ab);
    ch.handsBlend += ((f.hands ? 1 : 0) - ch.handsBlend) * Math.min(1, dt * 10);
    if (ch.handsBlend > .01) { const hb = ch.handsBlend; armL.rotation.x += (-2.9 - armL.rotation.x) * hb; armR.rotation.x += (-2.9 - armR.rotation.x) * hb; armL.rotation.z -= .35 * hb; armR.rotation.z += .35 * hb; }
    gun.visible = ab > .5 && !f.seated && ch.handsBlend < .5;
    const idle = (1 - ch.blend) * Math.sin(t * 1.8 + ch.phase) * .006;
    body.position.y = Math.abs(Math.cos(ch.phase)) * .035 * ch.blend * Math.min(1.4, speed / 4) - .42 * sb + idle;
    body.rotation.x = (f.run ? .16 : .04) * ch.blend + (ab ? .0 : 0);
    upper.rotation.y = sw * amp * .18 * (1 - ab);
    if (f.dead) { root.rotation.x = -Math.PI / 2; root.position.y = .16; } else { root.rotation.x = 0; root.position.y = 0; }
  };
  return ch;
}

/** A small seated driver (head, shoulders, steering arms) for cars the player isn't in. Shared geometries per look. */
const bustCache = [];
export function createBust(police) {
  if (!bustCache.length) for (let i = 0; i < 6; i++) { const skin = SKIN[i % SKIN.length], top = [0x3a6ab8, 0xb83a3a, 0x3a9a5a, 0xd8d8d8, 0x4a4a52, 0xd8742a][i], hair = HAIR[i % 5];
    bustCache.push(merge([part(BOX, top, { sx: .46, sy: .5, sz: .26, y: .25 }), part(SPH(.12, 8, 6), skin, { y: .66, sy: 1.1 }), part(SPH(.125, 8, 6), hair, { y: .7, z: -.015, sy: .75 }), part(BOX, top, { sx: .12, sy: .12, sz: .4, x: -.2, y: .36, z: .25 }), part(BOX, top, { sx: .12, sy: .12, sz: .4, x: .2, y: .36, z: .25 })])); }
  if (!bustCache.cop) bustCache.cop = merge([part(BOX, 0x3a5a9a, { sx: .46, sy: .5, sz: .26, y: .25 }), part(SPH(.12, 8, 6), SKIN[1], { y: .66, sy: 1.1 }), part(SPH(.13, 8, 6), 0x14203a, { y: .72, sy: .65 }), part(BOX, 0x3a5a9a, { sx: .12, sy: .12, sz: .4, x: -.2, y: .36, z: .25 }), part(BOX, 0x3a5a9a, { sx: .12, sy: .12, sz: .4, x: .2, y: .36, z: .25 })]);
  return new THREE.Mesh(police ? bustCache.cop : bustCache[Math.floor(Math.random() * 6)], vcLambert);
}
