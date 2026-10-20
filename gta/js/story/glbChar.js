// LAST EXIT: a rigged glTF character that drops into the NPC base (npcs.js) in place of the built-in blocky body. It has the same small
// interface as createCharacter(): { root, update(dt, speed, flags), dispose() }. The model and the loader are only fetched when asked for
// (nothing is downloaded in normal play). The file has two clips, Walking and Running; with no idle clip, standing still holds the
// walk cycle at the moment the feet pass each other and breathes a little.
const loaded = {};
function script(src) {
  if (loaded[src]) return loaded[src];
  return (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); }));
}
const here = rel => new URL(rel, import.meta.url).href;
const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

/** Load a rigged model. opts: { url, scale }. Resolves to a character object. */
export async function loadRigged(opts) {
  opts = opts || {};
  if (!THREE.GLTFLoader) await script(here('../../lib/GLTFLoader.js'));
  const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().load(opts.url || here('../../models/kaidin.glb'), res, undefined, rej));
  const model = gltf.scene, root = new THREE.Group(); root.add(model); root.scale.setScalar(opts.scale || 1.05);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });                // skinned meshes move outside their rest bounds
  const mixer = new THREE.AnimationMixer(model), clip = n => gltf.animations.find(c => c.name === n) || gltf.animations[0];
  const walk = mixer.clipAction(clip('Walking')), run = mixer.clipAction(clip('Running'));
  walk.play(); run.play(); run.setEffectiveWeight(0);
  const bone = n => { let f = null; model.traverse(o => { if (!f && o.name.replace(/^mixamorig:?/, '') === n) f = o; }); return f; };   // the loader strips the ':' from node names
  const lf = bone('LeftFoot'), rf = bone('RightFoot'), spine = bone('Spine1'), V = THREE.Vector3;
  if (!lf || !rf) throw new Error('the model has no foot bones');
  // idle pose: the moment in the walk cycle when the feet are together and level and the hands hang closest to the body
  const lh = bone('LeftHand'), rh = bone('RightHand'), hips = bone('Hips'); let idleT = 0, best = 1e9; const a = new V(), b = new V(), c = new V(), d = new V(), e = new V(), dur = walk.getClip().duration;
  for (let t = 0; t < dur; t += dur / 40) {
    walk.time = t; mixer.update(0); model.updateMatrixWorld(true); lf.getWorldPosition(a); rf.getWorldPosition(b); lh.getWorldPosition(c); rh.getWorldPosition(d); hips.getWorldPosition(e);
    const sc = Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 2 + 1.4 * (Math.abs(c.x - e.x) + Math.abs(d.x - e.x)); if (sc < best) { best = sc; idleT = t; }
  }
  // stand on the ground: the lowest sole over every pose of both clips (and the idle pose) sits exactly on y = 0
  let skinned = null; model.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (skinned) {
    const pos = skinned.geometry.attributes.position, soles = []; for (let i = 0; i < pos.count && soles.length < 3000; i++) if (pos.getY(i) < .14) soles.push(i);
    let low = 1e9; const p = new V(), lowest = () => { model.updateMatrixWorld(true); skinned.skeleton.update(); for (const i of soles) { skinned.boneTransform(i, p); p.applyMatrix4(skinned.matrixWorld); if (p.y < low) low = p.y; } };
    for (const act of [walk, run]) { const du = act.getClip().duration; for (let t = 0; t < du; t += du / 24) { act.time = t; mixer.update(0); lowest(); } }
    walk.time = idleT; mixer.update(0); lowest(); run.time = 0;
    model.position.y = -low / root.scale.y + .015;
  }
  walk.time = idleT; walk.paused = true; mixer.update(0);
  const ch = { root, model, mixer, state: 'idle', t: Math.random() * 6, spec: { rigged: true }, gun: null };
  ch.update = function (dt, speed, f) {
    f = f || {}; ch.t += dt;
    if (f.dead) { root.rotation.x = -Math.PI / 2; root.position.y = .25; mixer.update(0); return; }
    const state = speed < .3 ? 'idle' : speed < 3.6 ? 'walk' : 'run';
    if (state !== ch.state) {
      if (state === 'idle') { walk.paused = true; walk.time = idleT; walk.setEffectiveWeight(1); run.setEffectiveWeight(0); }
      else if (state === 'walk') { walk.paused = false; walk.setEffectiveWeight(1); run.setEffectiveWeight(0); }
      else { walk.setEffectiveWeight(0); run.setEffectiveWeight(1); }
      ch.state = state;
    }
    walk.timeScale = Math.max(.6, Math.min(1.8, speed / 1.5)); run.timeScale = Math.max(.8, Math.min(1.6, speed / 5));
    mixer.update(dt);
    if (state === 'idle' && spine) spine.rotation.x += Math.sin(ch.t * 1.7) * .012;                           // breathing
  };
  ch.dispose = () => model.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } });
  void wrap;
  return ch;
}

/* ======================================================================================================================
 * Posed bodies (ped_ash.glb, ped_crowd1.glb): rigged models that replace the blocky body for the player and for some pedestrians.
 * Same small interface as createCharacter(). The models bring one clip each (Ash: a running loop; crowd1: a single still pose), so
 * everything else is a pose layer on the skeleton: every limb is pointed in a direction in model space (aimAt), which does not depend on
 * how the bones happen to be oriented. Walking is the run clip at a smaller amplitude (Ash) or a procedural gait (crowd1); aiming, hands
 * up, sitting at the wheel and the pedestrians' gestures are the same limb directions.
 * ==================================================================================================================== */
const rawFiles = {};
async function gltfOf(url) {
  if (!THREE.GLTFLoader) await script(here('../../lib/GLTFLoader.js'));
  if (!rawFiles[url]) rawFiles[url] = fetch(url).then(r => { if (!r.ok) throw new Error('could not load ' + url + ' (' + r.status + ')'); return r.arrayBuffer(); });
  const buf = await rawFiles[url];
  return new Promise((res, rej) => new THREE.GLTFLoader().parse(buf.slice(0), new URL('.', url).href, res, rej));      // parsed per instance: skinned meshes cannot be shared without SkeletonUtils
}
export const BODIES = { ash: here('../../models/ped_ash.glb'), crowd1: here('../../models/ped_crowd1.glb') };

/** opts: { url, scale, tint (hex multiplied into the colours, for the jacket choices) } */
export async function loadBody(opts) {
  const gltf = await gltfOf(opts.url), model = gltf.scene, root = new THREE.Group(); root.add(model); root.scale.setScalar(opts.scale || 1.05);
  const V = THREE.Vector3, Q = THREE.Quaternion, clipped = gltf.animations[0] && gltf.animations[0].duration > .2;
  const mats = []; model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; for (const m of [].concat(o.material)) { if (m.emissive) m.emissive.setScalar(.5); if (m.emissiveIntensity != null) m.emissiveIntensity = 1; mats.push(m); } } });   // the export is fully emissive: keep some of it so the lights still shape the body
  const boost = opts.boost || 1, setTint = hex => { const c = new THREE.Color(hex == null ? 0xffffff : hex).multiplyScalar(boost); for (const m of mats) { m.color.copy(c); if (m.emissive) m.emissive.copy(c).multiplyScalar(.5); } };
  setTint(opts.tint);
  const names = {}; model.traverse(o => { if (o.isBone) names[o.name.replace(/^mixamorig:?/, '')] = o; });
  const B = n => names[n] || null, need = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];
  for (const n of need) if (!B(n)) throw new Error('the model has no bone ' + n);
  const bones = Object.values(names), rest = bones.map(b => b.quaternion.clone()), restPos = B('Hips').position.clone();
  let skinned = null; model.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  let mixer = null, action = null, idleT = 0, idleQ = null, idleHip = null;
  if (clipped) {
    mixer = new THREE.AnimationMixer(model); action = mixer.clipAction(gltf.animations[0]); action.play();
    // idle pose: the moment of the loop when the feet are together and level and the hands hang closest to the body
    const a = new V(), b = new V(), c = new V(), d = new V(), e = new V(), dur = action.getClip().duration, lf = B('LeftFoot'), rf = B('RightFoot'), lh = B('LeftHand'), rh = B('RightHand'), hips = B('Hips'); let best = 1e9;
    for (let t = 0; t < dur; t += dur / 40) {
      action.time = t; mixer.update(0); model.updateMatrixWorld(true); lf.getWorldPosition(a); rf.getWorldPosition(b); lh.getWorldPosition(c); rh.getWorldPosition(d); hips.getWorldPosition(e);
      const sc = Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 2 + 1.4 * (Math.abs(c.x - e.x) + Math.abs(d.x - e.x)); if (sc < best) { best = sc; idleT = t; }
    }
    action.time = idleT; mixer.update(0); idleQ = bones.map(b => b.quaternion.clone()); idleHip = B('Hips').position.clone();
  }
  /* point a limb: bone -> child along `dir` (model space, +z forward, +y up, the character's left is +x), blended by w */
  const pA = new V(), pB = new V(), dW = new V(), qA = new Q(), qB = new Q(), qC = new Q();
  function aimAt(bone, child, x, y, z, w) {
    if (!bone || !child || w < .004) return;
    bone.getWorldPosition(pA); child.getWorldPosition(pB); pB.sub(pA); if (pB.lengthSq() < 1e-10) return; pB.normalize();
    model.getWorldQuaternion(qA); dW.set(x, y, z).normalize().applyQuaternion(qA);
    qB.setFromUnitVectors(pB, dW); bone.getWorldQuaternion(qC).premultiply(qB); bone.parent.getWorldQuaternion(qA).invert(); qA.multiply(qC);
    if (w >= .996) bone.quaternion.copy(qA); else bone.quaternion.slerp(qA, w);
    bone.updateMatrixWorld(true);
  }
  const L = { up: B('LeftUpLeg'), leg: B('LeftLeg'), foot: B('LeftFoot'), toe: B('LeftToeBase'), arm: B('LeftArm'), fore: B('LeftForeArm'), hand: B('LeftHand') };
  const R = { up: B('RightUpLeg'), leg: B('RightLeg'), foot: B('RightFoot'), toe: B('RightToeBase'), arm: B('RightArm'), fore: B('RightForeArm'), hand: B('RightHand') };
  const S = { L, R }, sgn = { L: 1, R: -1 };                                     // outward is +x on the left, -x on the right
  const legs = (s, thx, thy, thz, shx, shy, shz, w) => { const k = S[s]; aimAt(k.up, k.leg, thx, thy, thz, w); aimAt(k.leg, k.foot, shx, shy, shz, w); if (k.toe) aimAt(k.foot, k.toe, 0, -.22, 1, w); };
  const arm = (s, ux, uy, uz, fx, fy, fz, w) => { const k = S[s], o = sgn[s]; aimAt(k.arm, k.fore, o * ux, uy, uz, w); aimAt(k.fore, k.hand, o * fx, fy, fz, w); };

  // stand on the ground: the lowest sole over the standing pose (and the run, for Ash) sits exactly on y = 0
  let lift = 0;
  if (skinned) {
    const pos = skinned.geometry.attributes.position, soles = []; for (let i = 0; i < pos.count && soles.length < 3000; i++) if (pos.getY(i) < .14) soles.push(i);
    let low = 1e9; const p = new V(), lowest = () => { model.updateMatrixWorld(true); skinned.skeleton.update(); for (const i of soles) { skinned.boneTransform(i, p); p.applyMatrix4(skinned.matrixWorld); if (p.y < low) low = p.y; } };
    if (clipped) { const du = action.getClip().duration; for (let t = 0; t < du; t += du / 24) { action.time = t; mixer.update(0); lowest(); } action.time = idleT; mixer.update(0); lowest(); }
    else { bones.forEach((b, i) => b.quaternion.copy(rest[i])); model.updateMatrixWorld(true); legs('L', 0, -1, 0, 0, -1, 0, 1); legs('R', 0, -1, 0, 0, -1, 0, 1); lowest(); }
    lift = -low / root.scale.y + .015; model.position.y = lift;
  }
  const gun = new THREE.Mesh(new THREE.BoxGeometry(.035, .09, .2), new THREE.MeshLambertMaterial({ color: 0x1a1a1c })); gun.visible = false; root.add(gun);
  const ch = { root, model, mixer, spec: { rigged: true }, gun, seatDrop: .4, seatBack: .08, t: Math.random() * 6, ph: Math.random() * 6, amp: 0, runW: 0, ab: 0, sb: 0, hb: 0, gb: 0, gname: null, setTint, state: 'idle' };
  const GEST = {                                                          // [arm, ux, uy, uz, fx, fy, fz] for the right arm unless it says both
    startle: { both: [.5, .45, .6, .25, 1, .3] }, shake: { r: [.2, .35, 1, .1, .9, .5], l: [.15, -1, .1, .1, -1, .2] }, point: { r: [.1, .12, 1, .1, .12, 1] },
    phone: { r: [-.1, -.55, .5, -.45, 1, .3] }, wave: { r: [.75, .7, .1, .3, 1, 0] }, punch: { r: [.1, .1, 1, .1, .1, 1] }
  };
  const tgt = new THREE.Vector3(), here0 = new V();
  ch.update = function (dt, speed, f) {
    f = f || {}; ch.t += dt;
    if (f.dead) { root.rotation.x = -Math.PI / 2; root.position.y = .25; return; }
    const state = speed < .3 ? 'idle' : speed < 3.6 ? 'walk' : 'run', want = state === 'idle' ? 0 : state === 'walk' ? .55 : 1;
    ch.amp += (want - ch.amp) * Math.min(1, dt * 9); ch.state = state;
    const k = x => Math.min(1, dt * x);
    ch.ab += ((f.aim ? 1 : 0) - ch.ab) * k(14); ch.sb += ((f.seated ? 1 : 0) - ch.sb) * k(12); ch.hb += ((f.hands ? 1 : 0) - ch.hb) * k(10);
    const g = f.gest && GEST[f.gest] ? f.gest : null; if (g) ch.gname = g; ch.gb += ((g ? 1 : 0) - ch.gb) * k(10);
    const sit = ch.sb, walkW = 1 - sit;
    // 1) the base pose: the T-pose with the procedural stance and gait; Ash's run clip is blended in on top while running
    bones.forEach((b, i) => b.quaternion.copy(rest[i])); B('Hips').position.copy(restPos); model.updateMatrixWorld(true);
    ch.ph += dt * (state === 'run' ? 4 + speed * 1.3 : state === 'walk' ? speed * 3.7 : 0);
    const A = ch.amp * .6 * (state === 'run' ? 1.25 : 1) * walkW, br = ch.t * 1.7;
    for (const s of ['L', 'R']) {
      const o = s === 'L' ? 0 : Math.PI, psi = ch.ph + o, th = A * Math.sin(psi), bend = ch.amp * .85 * Math.max(0, Math.cos(psi)) * walkW, al = -A * 1.05 * Math.sin(psi), el = .15 + ch.amp * .5;
      legs(s, 0, -Math.cos(th), Math.sin(th), 0, -Math.cos(th - bend), Math.sin(th - bend), walkW);
      arm(s, .1, -Math.cos(al), Math.sin(al), .05, -Math.cos(al + el), Math.sin(al + el), walkW);
    }
    if (state === 'idle') { const sw = Math.sin(br) * .02; aimAt(B('Spine1') || B('Spine'), B('Spine2') || B('Neck'), 0, 1, sw, .4); }
    if (clipped) {
      const runW = state === 'run' ? 1 : 0; ch.runW += (runW - ch.runW) * k(10);
      if (ch.runW > .01) {
        const pq = bones.map(b => b.quaternion.clone()), hp = B('Hips').position.clone();
        action.paused = false; action.timeScale = Math.max(.8, Math.min(1.5, speed / 5)); mixer.update(dt);
        const w = ch.runW * walkW; bones.forEach((b, i) => { b.quaternion.copy(pq[i]).slerp(b.quaternion.clone(), w); }); B('Hips').position.lerpVectors(hp, B('Hips').position, w); model.updateMatrixWorld(true);
      }
    }
    // 2) sitting at the wheel
    if (sit > .01) {
      for (const s of ['L', 'R']) { legs(s, .12, -.08, 1, .1, -1, .14, sit); arm(s, .15, -.72, .55, .1, -.14, 1, sit); }
    }
    // 3) aiming: the right arm out front, the left across to steady it
    if (ch.ab > .01) { const w = ch.ab * (1 - sit); arm('R', .1, .04, 1, .08, .1, 1, w); arm('L', -.35, -.2, .9, -.3, 0, 1, w * .8); }
    // 4) hands up
    if (ch.hb > .01) { const w = ch.hb; arm('L', .3, .9, .1, .15, 1, .05, w); arm('R', .3, .9, .1, .15, 1, .05, w); }
    // 5) a gesture
    if (ch.gb > .01 && ch.gname) {
      const gd = GEST[ch.gname], w = ch.gb * (1 - sit), tt = ch.t;
      if (gd.both) { const j = Math.sin(tt * 18) * .08; arm('L', gd.both[0], gd.both[1], gd.both[2] + j, gd.both[3], gd.both[4], gd.both[5], w); arm('R', gd.both[0], gd.both[1], gd.both[2] + j, gd.both[3], gd.both[4], gd.both[5], w); }
      else {
        let r = gd.r.slice();
        if (ch.gname === 'wave') r[3] = .3 + Math.sin(tt * 8) * .6; else if (ch.gname === 'shake') { r[4] = .9 + Math.sin(tt * 10) * .35; r[5] = .5 + Math.cos(tt * 10) * .25; } else if (ch.gname === 'punch') { const p = Math.sin(tt * 14) * .5 + .5; r = [.1, .1 + (1 - p) * .5, .4 + p * .6, .1, .3 + (1 - p) * .7, .3 + p * .7]; }
        arm('R', r[0], r[1], r[2], r[3], r[4], r[5], w); if (gd.l) arm('L', gd.l[0], gd.l[1], gd.l[2], gd.l[3], gd.l[4], gd.l[5], w);
      }
    }
    // the pistol sits in the right hand while aiming
    gun.visible = ch.ab > .5 && sit < .3 && ch.hb < .5;
    if (gun.visible) { R.hand.getWorldPosition(tgt); root.worldToLocal(tgt); gun.position.copy(tgt); gun.position.y += .02; gun.position.z += .1; gun.rotation.set(0, 0, 0); }
    // breathing, and the body relaxes into the pose while standing still
    if (state === 'idle') { const spine = B('Spine1') || B('Spine'); if (spine) spine.rotation.x += Math.sin(ch.t * 1.7) * .012; }
    void here0;
  };
  ch.dispose = () => { model.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } }); gun.geometry.dispose(); gun.material.dispose(); };
  ch.update(0, 0, {});
  return ch;
}
