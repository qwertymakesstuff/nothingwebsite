import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../../elemental/', import.meta.url);
const DATA = await import(new URL('data/recipes.js', root));
const E = await import(new URL('js/engine.js', root));
const W = await import(new URL('js/workspace.js', root));
const S = await import(new URL('js/storage.js', root));
const index = E.buildIndex(DATA);
const fresh = () => E.createProgress(index, 1000);
// Hand the player a set of elements without going through recipes.
const grant = (p, ...ids) => { for (const id of ids) p.discovered[id] = { at: 1000, order: E.discoveredCount(p), via: null }; return p; };

test('every elemental module has valid syntax', () => {
  for (const dir of ['js/', 'data/']) {
    for (const f of fs.readdirSync(new URL(dir, root)).filter(f => f.endsWith('.js'))) {
      const r = spawnSync(process.execPath, ['--check', new URL(dir + f, root).pathname]);
      assert.equal(r.status, 0, `${f}: ${r.stderr}`);
    }
  }
});

test('recipe data is sound: no unknown ids, duplicate pairs or unreachable elements', () => {
  assert.deepEqual(E.validateData(DATA), []);
  assert.ok(DATA.RECIPES.length >= 200, `only ${DATA.RECIPES.length} recipes`);
  assert.deepEqual(DATA.STARTING, ['air', 'water', 'earth', 'fire']);
  assert.equal(E.reachable(index).size, DATA.ELEMENTS.length);
  for (const c of ['nature', 'science', 'food', 'technology', 'fantasy', 'objects', 'humor']) {
    assert.ok(DATA.ELEMENTS.filter(e => e.category === c).length >= 10, `category ${c} is thin`);
  }
  for (const e of DATA.ELEMENTS) assert.ok(e.desc.length > 10 && e.icon && e.name, e.id);
});

test('validateData catches broken recipes', () => {
  const bad = {
    ...DATA,
    RECIPES: [...DATA.RECIPES, ['fire', 'water', 'lava'], ['water', 'nothing', 'steam'], ['air', 'steam', 'fire']],
    ELEMENTS: [...DATA.ELEMENTS, { id: 'orphan', name: 'Orphan', icon: '?', category: 'humor', desc: 'Nothing makes this one.' }],
  };
  const errs = E.validateData(bad).join('\n');
  assert.match(errs, /fire \+ water = lava: pair already used/);
  assert.match(errs, /unknown element nothing/);
  assert.match(errs, /makes a starting element/);
  const reach = E.validateData({ ...DATA, ELEMENTS: bad.ELEMENTS });
  assert.deepEqual(reach, ['orphan can never be made']);
});

test('combinations do not depend on the order of the two inputs', () => {
  for (const r of index.recipes.filter(r => !r.ordered)) {
    assert.equal(E.findRecipe(index, r.a, r.b)?.result, r.result);
    assert.equal(E.findRecipe(index, r.b, r.a)?.result, r.result);
  }
  const p = grant(fresh());
  assert.equal(E.combine(p, index, 'fire', 'water').result, 'steam');
  const q = grant(fresh());
  assert.equal(E.combine(q, index, 'water', 'fire').result, 'steam');
});

test('ordered recipes only work in their own direction', () => {
  const ordered = index.recipes.filter(r => r.ordered);
  assert.ok(ordered.length >= 2);
  assert.equal(E.findRecipe(index, 'horse', 'human').result, 'centaur');
  assert.equal(E.findRecipe(index, 'human', 'horse').result, 'rider');
  assert.equal(E.findRecipe(index, 'chicken', 'egg').result, 'nest');
  assert.equal(E.findRecipe(index, 'egg', 'chicken').result, 'paradox');
});

test('a new discovery is added once; making it again is a repeat, not a second discovery', () => {
  const p = fresh();
  const first = E.combine(p, index, 'water', 'fire', 2000);
  assert.deepEqual([first.ok, first.result, first.isNew, first.isNewRecipe], [true, 'steam', true, true]);
  assert.equal(E.discoveredCount(p), 5);
  assert.equal(p.discovered.steam.order, 4);
  assert.equal(p.discovered.steam.via, 'fire+water');
  const again = E.combine(p, index, 'fire', 'water', 3000);
  assert.deepEqual([again.ok, again.isNew, again.isNewRecipe], [true, false, false]);
  assert.equal(E.discoveredCount(p), 5);
  assert.equal(p.discovered.steam.at, 2000, 'first discovery time is kept');
  assert.equal(p.stats.repeats, 1);
  // a second route to something already found is a new recipe but not a new element
  grant(p, 'stone', 'wind');
  E.combine(p, index, 'stone', 'air');
  const route = E.combine(p, index, 'stone', 'wind');
  assert.deepEqual([route.result, route.isNew, route.isNewRecipe], ['sand', false, true]);
});

test('invalid combinations change nothing except the attempt counters', () => {
  const p = fresh();
  E.combine(p, index, 'water', 'fire');
  const before = JSON.stringify({ d: p.discovered, r: p.recipes });
  const res = E.combine(p, index, 'steam', 'steam');
  assert.deepEqual(res, { ok: false, reason: 'no-recipe' });
  assert.equal(JSON.stringify({ d: p.discovered, r: p.recipes }), before);
  assert.equal(p.stats.failures, 1);
  assert.equal(p.stats.attempts, 2);
  // elements the player does not have yet cannot be used at all
  assert.equal(E.combine(p, index, 'lava', 'air').ok, false);
  assert.ok(!E.isDiscovered(p, 'stone'));
});

test('the whole game can be completed from the four starting elements', () => {
  const p = fresh();
  for (let pass = 0; pass < 100 && E.discoveredCount(p) < index.list.length; pass++) {
    for (const r of E.availableDiscoveries(p, index)) E.combine(p, index, r.a, r.b);
  }
  assert.equal(E.discoveredCount(p), index.list.length);
  for (const r of E.availableNewRecipes(p, index)) E.combine(p, index, r.a, r.b);
  assert.equal(E.currentHint(p, index), null);
  const s = E.computeStats(p, index);
  assert.equal(s.percent, 100);
  assert.equal(s.recipesFound, s.recipesTotal);
});

test('search ranks prefix matches first, matches words, and ignores case', () => {
  const all = index.list.map(e => e.id);
  assert.deepEqual(E.searchIds(index, all, 'steam'), ['steam']);
  const fire = E.searchIds(index, all, 'FIRE');
  assert.equal(fire[0], 'fire');
  assert.ok(fire.includes('campfire') && fire.includes('fireworks') && fire.includes('firewall'));
  assert.ok(fire.indexOf('fireworks') < fire.indexOf('campfire'), 'prefix before substring');
  assert.ok(E.searchIds(index, all, 'pie').includes('apple_pie'));
  assert.deepEqual(E.searchIds(index, ['air', 'water'], 'zzz'), []);
  assert.deepEqual(E.searchIds(index, ['air', 'water'], '  '), ['air', 'water']);
  assert.ok(E.searchIds(index, all, 'fantasy').includes('dragon'), 'category names match too');
});

test('sorting by discovery order, newest, name and category', () => {
  const p = fresh();
  E.combine(p, index, 'water', 'fire');
  E.combine(p, index, 'earth', 'fire');
  const ids = E.discoveredIds(p);
  assert.deepEqual(E.sortIds(index, p, ids, 'order'), ['air', 'water', 'earth', 'fire', 'steam', 'lava']);
  assert.deepEqual(E.sortIds(index, p, ids, 'recent').slice(0, 2), ['lava', 'steam']);
  assert.deepEqual(E.sortIds(index, p, ids, 'name'), ['air', 'earth', 'fire', 'lava', 'steam', 'water']);
  assert.deepEqual(E.sortIds(index, p, ids, 'category').slice(-2), ['lava', 'steam']);
});

test('hints only point at makeable discoveries, stay put, and reveal in levels', () => {
  const p = fresh();
  const h0 = E.currentHint(p, index, () => 0);
  assert.equal(h0.kind, 'discovery');
  assert.equal(h0.level, 0);
  for (const id of [h0.recipe.a, h0.recipe.b]) assert.ok(E.isDiscovered(p, id));
  assert.ok(!E.isDiscovered(p, h0.recipe.result));
  assert.equal(E.currentHint(p, index, () => 0.99).recipe.key, h0.recipe.key, 'hint is stable');
  assert.equal(E.hintText(index, h0).length, 1);
  assert.ok(!E.hintText(index, h0).join(' ').includes(index.elements.get(h0.recipe.result).name));
  E.revealHint(p, index); E.revealHint(p, index); E.revealHint(p, index); E.revealHint(p, index);
  const h3 = E.currentHint(p, index);
  assert.equal(h3.level, 3);
  assert.equal(p.stats.hintsUsed, 3, 'revealing past the last level is free');
  const text = E.hintText(index, h3).join(' ');
  assert.ok(text.includes(index.elements.get(h3.recipe.result).name));
  // making the hinted element clears the hint and the next one is different
  E.combine(p, index, h3.recipe.a, h3.recipe.b);
  assert.equal(p.hint, null);
  assert.notEqual(E.currentHint(p, index).recipe.result, h3.recipe.result);
  // skipping picks another available discovery
  const before = E.currentHint(p, index).recipe.key;
  assert.notEqual(E.skipHint(p, index, () => 0).recipe.key, before);
});

test('hints for ordered recipes say which way round to drop', () => {
  const r = index.byKey.get('horse>human');
  const text = E.hintText(index, { recipe: r, level: 2, kind: 'discovery' }).join(' ');
  assert.match(text, /Drop Horse onto Human/);
});

test('when everything is discovered, hints point at unused recipes and never reveal more than ingredients', () => {
  const p = grant(fresh(), ...index.list.map(e => e.id));
  const h = E.currentHint(p, index, () => 0);
  assert.equal(h.kind, 'recipe');
  E.revealHint(p, index); E.revealHint(p, index); E.revealHint(p, index);
  assert.equal(E.currentHint(p, index).level, E.maxHintLevel('recipe'));
  assert.equal(p.stats.hintsUsed, 2);
});

test('encyclopedia hint reports how many ingredients the player has', () => {
  const p = fresh();
  assert.equal(E.elementHint(p, index, 'steam').have, 2);
  assert.equal(E.elementHint(p, index, 'stone').have, 1); // lava + air: has air
  assert.equal(E.elementHint(p, index, 'dragon').have, 1); // dinosaur + fire: has fire
  assert.equal(E.elementHint(p, index, 'superhero').have, 0);
});

test('final elements are the ones no recipe uses', () => {
  assert.ok(E.isFinal(index, 'lost_sock'));
  assert.ok(!E.isFinal(index, 'water'));
  const s = E.computeStats(fresh(), index);
  assert.equal(s.discovered, 4);
  assert.equal(s.finalsFound, 0);
  assert.ok(s.finalsTotal > 20);
  assert.equal(s.perCategory.find(c => c.id === 'basic').found, 4);
});

test('a save restores exactly what was saved', () => {
  const p = fresh();
  E.combine(p, index, 'water', 'fire', 2000);
  E.combine(p, index, 'steam', 'air', 3000);
  E.combine(p, index, 'steam', 'steam', 3100);
  E.revealHint(p, index, () => 0);
  const restored = E.parseSave(E.serialize(p), index, 9999);
  assert.deepEqual(restored, p);
});

test('saves go through localStorage and survive a reload; storage failures never throw', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const p = fresh();
  E.combine(p, index, 'earth', 'fire', 2000);
  assert.equal(S.write(S.KEYS.progress, E.serialize(p)), true);
  const back = E.parseSave(S.read(S.KEYS.progress), index);
  assert.ok(E.isDiscovered(back, 'lava'));
  assert.equal(back.discovered.lava.at, 2000);
  S.remove(S.KEYS.progress);
  assert.equal(S.read(S.KEYS.progress), null);
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(S.read('x'), null);
  assert.equal(S.write('x', 'y'), false);
  assert.doesNotThrow(() => S.remove('x'));
  delete globalThis.localStorage;
  assert.equal(S.write('x', 'y'), false);
});

test('importing rejects junk and cleans up tampered saves', () => {
  for (const [text, msg] of [
    ['not json', /valid save data/],
    ['[1,2]', /not an Elemental save/],
    ['{"game":"other","discovered":{}}', /different game/],
    ['{"version":99,"discovered":{}}', /newer version/],
    ['{"version":1}', /no discoveries/],
  ]) assert.throws(() => E.parseSave(text, index), msg);

  const p = E.parseSave(JSON.stringify({
    game: 'elemental', version: 1,
    discovered: { steam: { at: 5, order: 9, via: 'fire+water' }, dragon: { at: 6, order: 2, via: 'air+air' }, bogus: { at: 1 }, water: { at: 1 } },
    recipes: { 'fire+water': 5, 'made+up': 1, 'earth+fire': 3 },
    stats: { attempts: -4, successes: 'lots', hintsUsed: 2.7 },
    hint: { key: 'nope', level: 2 },
  }), index, 100);
  assert.deepEqual(Object.keys(p.discovered), ['air', 'water', 'earth', 'fire', 'dragon', 'steam']);
  assert.equal(p.discovered.dragon.via, null, 'a via recipe that does not make the element is dropped');
  assert.equal(p.discovered.dragon.order, 4);
  assert.equal(p.discovered.steam.order, 5);
  assert.deepEqual(Object.keys(p.recipes), ['fire+water'], 'unknown recipes and recipes for undiscovered results are dropped');
  assert.deepEqual([p.stats.attempts, p.stats.successes, p.stats.hintsUsed], [0, 0, 2]);
  assert.equal(p.hint, null);
  // a bare list of ids is accepted too
  const list = E.parseSave('{"discovered":["steam","lava"]}', index);
  assert.equal(E.discoveredCount(list), 6);
});

test('workspace: place, move, combine, remove, clear and undo', () => {
  const ws = W.createWorkspace();
  const a = W.addItem(ws, 'water', 0.2, 0.2);
  const b = W.addItem(ws, 'fire', 0.6, 0.7);
  W.moveItem(ws, a.uid, 2, -1);
  assert.deepEqual([ws.items.at(-1).x, ws.items.at(-1).y], [1, 0], 'positions are clamped');
  const c = W.combineItems(ws, a.uid, b.uid, 'steam');
  assert.deepEqual(ws.items.map(i => i.id), ['steam']);
  assert.deepEqual([c.x, c.y], [0.6, 0.7], 'result lands where the target was');
  // dropping from the inventory (no dragged uid) only consumes the target
  W.addItem(ws, 'air', 0.1, 0.1);
  W.combineItems(ws, null, c.uid, 'cloud');
  assert.deepEqual(ws.items.map(i => i.id).sort(), ['air', 'cloud']);
  W.clearWorkspace(ws);
  assert.equal(ws.items.length, 0);
  assert.equal(W.clearWorkspace(ws), false, 'clearing an empty board is not an undo step');
  W.undo(ws);
  assert.deepEqual(ws.items.map(i => i.id).sort(), ['air', 'cloud']);
  W.undo(ws); W.undo(ws);
  assert.deepEqual(ws.items.map(i => i.id), ['steam']);
  W.undo(ws); W.undo(ws); W.undo(ws);
  assert.deepEqual(ws.items.map(i => i.id), ['water']);
  W.undo(ws);
  assert.equal(ws.items.length, 0);
  assert.equal(W.undo(ws), false);
  const d = W.addItem(ws, 'earth', 0.5, 0.5);
  assert.ok(d.uid > c.uid, 'uids are never reused after undo');
  for (let i = 0; i < W.UNDO_LIMIT + 20; i++) W.addItem(ws, 'air', 0.5, 0.5);
  assert.equal(ws.history.length, W.UNDO_LIMIT);
});

test('workspace save drops elements the player does not have and survives junk', () => {
  const ws = W.createWorkspace();
  W.addItem(ws, 'water', 0.3, 0.4);
  W.addItem(ws, 'dragon', 0.5, 0.5);
  const back = W.parseWorkspace(W.serializeWorkspace(ws), id => id === 'water');
  assert.deepEqual(back.items, [{ uid: 1, id: 'water', x: 0.3, y: 0.4 }]);
  assert.equal(back.history.length, 0);
  assert.deepEqual(W.parseWorkspace('garbage', () => true).items, []);
  assert.deepEqual(W.parseWorkspace(null, () => true).items, []);
});
