import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../../play/public/blockroll/levels.js';
import { parseLevel, solve, step } from '../../play/public/blockroll/solver.js';
import { PUZZLES } from '../../play/public/slideout/puzzles.js';
import { solvePuzzle } from '../../play/public/slideout/solver.js';
import { readFileSync, existsSync } from 'node:fs';

test('block roll: every level has a start, a goal and a solution (and replaying it really wins)', () => {
  assert.ok(LEVELS.length >= 10);
  LEVELS.forEach((rows, i) => {
    const lvl = parseLevel(rows);
    assert.ok(lvl.start && lvl.goal, `level ${i + 1} has S and G`);
    const sol = solve(lvl);
    assert.ok(sol && sol.length >= 4, `level ${i + 1} is solvable`);
    // replay with the game's own move rules
    let st = { x: lvl.start[0], y: lvl.start[1], o: 'U', bridge: false }, won = false;
    for (const d of sol) { const r = step(lvl, st, d); assert.ok(r.ok, `level ${i + 1}: move ${d} is legal`); st = r; won = r.won; }
    assert.ok(won, `level ${i + 1}: the solution ends in the hole`);
  });
});

test('block roll: falling and fragile tiles behave', () => {
  const lvl = parseLevel(['oSo', 'ofo', 'ooG']);
  assert.equal(step(lvl, { x: 1, y: 0, o: 'U', bridge: false }, 'U').ok, false, 'off the edge');
  assert.equal(step(lvl, { x: 1, y: 0, o: 'V', bridge: false }, 'D').ok, true, 'lying across the fragile tile is fine');
  const standOnFragile = step(lvl, { x: 1, y: 0, o: 'V', bridge: false }, 'U');
  assert.equal(standOnFragile.ok, false);
  const sw = parseLevel(['oSxbG']);
  assert.equal(step(sw, { x: 1, y: 0, o: 'U', bridge: false }, 'R').ok, false, 'a bridge tile is not there until the switch is pressed');
});

test('slide out: every puzzle is solvable in exactly its stated minimum number of moves', () => {
  assert.ok(PUZZLES.length >= 12);
  let prev = 0;
  PUZZLES.forEach((p, i) => {
    assert.equal(solvePuzzle(p.cars), p.min, `puzzle ${i + 1}`);
    assert.ok(p.min >= prev, 'puzzles get harder');
    prev = p.min;
    // no overlapping cars, everything on the board
    const seen = new Set();
    p.cars.forEach(([x, y, l, o]) => { for (let k = 0; k < l; k++) { const c = o === 'h' ? `${x + k},${y}` : `${x},${y + k}`; assert.ok(!seen.has(c), `puzzle ${i + 1}: cars overlap`); seen.add(c); assert.ok(x + (o === 'h' ? l - 1 : 0) < 6 && y + (o === 'v' ? l - 1 : 0) < 6); } });
    assert.equal(p.cars[0][1], 2); assert.equal(p.cars[0][3], 'h');
  });
});

test('play site: every game listed on the homepage has a page, a script and a banner', () => {
  const games = JSON.parse(readFileSync(new URL('../../play/public/games.json', import.meta.url)));
  assert.ok(games.length >= 22);
  const slugs = new Set();
  for (const g of games) {
    const slug = g.url.replace(/\//g, '');
    assert.ok(!slugs.has(slug), `duplicate ${slug}`); slugs.add(slug);
    for (const f of [`${slug}/index.html`, `${slug}/${slug}.js`, g.image.replace(/^\//, '')]) assert.ok(existsSync(new URL(`../../play/public/${f}`, import.meta.url)), `${g.name}: missing ${f}`);
    assert.ok(g.name && g.description && g.group);
  }
});
