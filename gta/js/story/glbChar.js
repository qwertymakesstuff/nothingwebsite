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
  // idle pose: the moment in the walk cycle when the feet are closest together and level
  let idleT = 0, best = 1e9; const a = new V(), b = new V(), dur = walk.getClip().duration;
  for (let t = 0; t < dur; t += dur / 40) {
    walk.time = t; mixer.update(0); model.updateMatrixWorld(true); lf.getWorldPosition(a); rf.getWorldPosition(b);
    const sc = Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 2; if (sc < best) { best = sc; idleT = t; }
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
