import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The rigged character files are loaded in the browser (story/glbChar.js loadBody). Keep them small and structurally what the loader expects.
const read = name => { const d = fs.readFileSync(new URL('../../gta/models/' + name, import.meta.url)); const cl = d.readUInt32LE(12); return { size: d.length, magic: d.toString('ascii', 0, 4), json: JSON.parse(d.toString('utf8', 20, 20 + cl)), d }; };
const NEED = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];

for (const f of ['ped_ash.glb', 'ped_crowd1.glb']) test(f + ' is a small, valid, rigged GLB with the bones the pose layer drives', () => {
  const g = read(f);
  assert.equal(g.magic, 'glTF'); assert.ok(g.size < 3 * 1024 * 1024, 'texture kept small: ' + g.size + ' bytes');
  assert.equal(g.json.skins.length, 1); assert.equal(g.json.meshes.length, 1);
  const names = new Set(g.json.nodes.map(n => (n.name || '').replace(/^mixamorig:?/, '')));
  for (const n of NEED) assert.ok(names.has(n), 'bone ' + n);
  const img = g.json.images[0], v = g.json.bufferViews[img.bufferView];
  assert.ok(v.byteLength < 1.2 * 1024 * 1024, 'image ' + v.byteLength);
  assert.equal(img.mimeType, 'image/jpeg');
});
