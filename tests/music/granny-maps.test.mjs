import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} }; ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(new URL('../../granny/maps.js', import.meta.url), 'utf8'), ctx);
const M = ctx.window.GRANNY_MAPS || ctx.GRANNY_MAPS;

const SOLID = '#HBTSE';
const count = (rows, ch) => rows.join('').split(ch).length - 1;

test('three floors with equal-width rows and only known tiles', () => {
  assert.equal(M.floors.length, 3);
  for (const f of M.floors) {
    assert.equal(f.rows.length, 14);
    for (const r of f.rows) { assert.equal(r.length, 23); assert.match(r, /^[#.DHBTSUNEXPGKAQM]+$/); }
    for (const r of [f.rows[0], f.rows[13]]) assert.match(r, /^#+$/);
  }
});

test('one start, one granny, one exit, a key on each floor, four notes', () => {
  const all = M.floors.map(f => f.rows);
  assert.equal(all.reduce((n, r) => n + count(r, 'P'), 0), 1);
  assert.equal(all.reduce((n, r) => n + count(r, 'G'), 0), 1);
  assert.equal(all.reduce((n, r) => n + count(r, 'E'), 0), 1);
  all.forEach(r => assert.ok(count(r, 'K') >= 1));
  assert.equal(all.reduce((n, r) => n + count(r, 'M'), 0), 4);
  assert.equal(M.notes.length, 4);
});

test('stairs pair up and every open cell is reachable from the start', () => {
  const g = M.floors.map(f => f.rows.map(r => r.split('')));
  const find = (f, ch) => { for (let r = 0; r < 14; r++) for (let c = 0; c < 23; c++) if (g[f][r][c] === ch) return [f, c, r]; return null; };
  assert.ok(find(0, 'U') && find(1, 'N') && find(1, 'U') && find(2, 'N'));
  const seen = new Set(), q = [find(2, 'P')];
  const key = ([f, c, r]) => f + ',' + c + ',' + r;
  seen.add(key(q[0]));
  for (let i = 0; i < q.length; i++) {
    const [f, c, r] = q[i];
    const ch = g[f][r][c];
    const nexts = [[f, c + 1, r], [f, c - 1, r], [f, c, r + 1], [f, c, r - 1]];
    if (ch === 'U' && f + 1 < 3) nexts.push(find(f + 1, 'N'));
    if (ch === 'N' && f > 0) nexts.push(find(f - 1, 'U'));
    for (const n of nexts) {
      if (!n || SOLID.includes(g[n[0]][n[2]]?.[n[1]] ?? '#') || seen.has(key(n))) continue;
      seen.add(key(n)); q.push(n);
    }
  }
  for (let f = 0; f < 3; f++) for (let r = 0; r < 14; r++) for (let c = 0; c < 23; c++) {
    if (!SOLID.includes(g[f][r][c])) assert.ok(seen.has(f + ',' + c + ',' + r), `floor ${f} cell ${c},${r} (${g[f][r][c]}) unreachable`);
  }
  // the exit is reachable (its neighbour is)
  const [ef, ec, er] = find(1, 'E');
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => seen.has(ef + ',' + (ec + dc) + ',' + (er + dr))));
});

test('granny game scripts have valid syntax', () => {
  for (const f of ['game.js', 'maps.js']) new vm.Script(fs.readFileSync(new URL('../../granny/' + f, import.meta.url), 'utf8'));
});

test('harbor city (gta) script has valid syntax', () => {
  new vm.Script(fs.readFileSync(new URL('../../gta/game.js', import.meta.url), 'utf8'));
});
