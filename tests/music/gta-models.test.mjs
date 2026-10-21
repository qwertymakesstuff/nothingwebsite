import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The rigged character files are loaded in the browser (story/glbChar.js loadBody). Keep them small and structurally what the loader expects.
const read = name => { const d = fs.readFileSync(new URL('../../gta/models/' + name, import.meta.url)); const cl = d.readUInt32LE(12); return { size: d.length, magic: d.toString('ascii', 0, 4), json: JSON.parse(d.toString('utf8', 20, 20 + cl)), d }; };
const NEED = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];

const PEDS = ['ped_ash', 'ped_crowd1', 'ped_crowd2', 'ped_crowd3', 'ped_crowd4', 'ped_crowd5', 'ped_crowd6', 'ped_eddie', 'ped_mara', 'ped_rowan', 'ped_sloane', 'ped_officer_m', 'ped_officer_f'].map(n => n + '.glb');
for (const f of PEDS) test(f + ' is a small, valid, rigged GLB with the bones the pose layer drives', () => {
  const g = read(f);
  assert.equal(g.magic, 'glTF'); assert.ok(g.size < 3 * 1024 * 1024, 'texture kept small: ' + g.size + ' bytes');
  assert.equal(g.json.skins.length, 1); assert.equal(g.json.meshes.length, 1);
  const names = new Set(g.json.nodes.map(n => (n.name || '').replace(/^mixamorig:?/, '')));
  for (const n of NEED) assert.ok(names.has(n), 'bone ' + n);
  const img = g.json.images[0], v = g.json.bufferViews[img.bufferView];
  assert.ok(v.byteLength < 1.2 * 1024 * 1024, 'image ' + v.byteLength);
  assert.equal(img.mimeType, 'image/jpeg');
});

for (const f of ['car_sedan.glb', 'car_cruiser.glb']) test(f + ' is a small static GLB with one mesh and a baked texture', () => {
  const g = read(f);
  assert.equal(g.magic, 'glTF'); assert.ok(g.size < 3 * 1024 * 1024, 'size ' + g.size);
  assert.equal((g.json.skins || []).length, 0); assert.equal(g.json.meshes.length, 1); assert.equal(g.json.meshes[0].primitives.length, 1);
  assert.ok(g.json.materials[0].pbrMetallicRoughness.baseColorTexture, 'baked base colour');
});
