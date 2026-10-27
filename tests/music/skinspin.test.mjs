import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../skinspin/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { ITEMS, ITEMS_BY_ID, WEAPON_TYPES, itemValue } = await load('items.js');
const { RARITIES } = await load('rarities.js');
const { WEARS, WEAR_BY_ID } = await load('wear.js');
const { CASES, CASES_BY_ID, CASE_CATEGORIES, validateCase, CHEAPEST_CASE_PRICE, FREE_CASE_COOLDOWN } = await load('cases.js');
const { caseOdds, rollCase, expectedValue } = await load('rewards.js');
const { seededRandom } = await load('rng.js');
const { createPlayer, levelInfo, xpToNext } = await load('playerState.js');
const economy = await load('economy.js');
const { loadSave, savePlayer, sanitizePlayer } = await load('save.js');
const { createStore, createOpener, memoryStorage } = await load('store.js');
const roulette = await load('roulette.js');
const { SAVE_KEY, SAVE_VERSION, STARTING_COINS, ROULETTE, SAVE_BACKUP_PREFIX } = await load('config.js');
const { filterInventory } = await load('views/inventory.js');
const { filterCases } = await load('views/cases.js');

const clone = o => JSON.parse(JSON.stringify(o));
const give = (player, itemId, wear = 'FT', extra = {}) => {
  const inst = { uid: `i${player.nextId++}`, itemId, wear: ITEMS_BY_ID[itemId].hasWear ? wear : null, float: ITEMS_BY_ID[itemId].hasWear ? WEAR_BY_ID[wear].min : null, acquiredAt: 1000 + player.nextId, source: 'starter', locked: false, favorite: false, ...extra };
  player.inventory.push(inst);
  return inst;
};

test('every skinspin module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 20);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

// ---- item database ----

test('item database: 100+ unique, complete items covering every type and rarity', () => {
  assert.ok(ITEMS.length >= 100, `${ITEMS.length} items`);
  assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length, 'ids unique');
  assert.equal(new Set(ITEMS.map(i => i.name)).size, ITEMS.length, 'names unique');
  for (const i of ITEMS) {
    assert.ok(i.id && i.name && i.weaponName && i.finish, i.id);
    assert.ok(WEAPON_TYPES.some(t => t.id === i.type), `${i.id} type`);
    assert.ok(RARITIES.some(r => r.id === i.rarity), `${i.id} rarity`);
    assert.ok(Number.isInteger(i.value) && i.value > 0, `${i.id} value`);
    assert.ok(i.art && Number.isFinite(i.art.hue) && i.art.pattern, `${i.id} art`);
    assert.equal(typeof i.hasWear, 'boolean');
  }
  for (const t of ['rifle', 'pistol', 'smg', 'sniper', 'shotgun', 'mg', 'knife', 'gloves']) assert.ok(ITEMS.some(i => i.type === t), t);
  for (const r of RARITIES) assert.ok(ITEMS.some(i => i.rarity === r.id), r.id);
  assert.equal(RARITIES.length, 7);
  assert.equal(new Set(RARITIES.map(r => r.color)).size, 7, 'distinct rarity colours');
});

test('every item can drop from at least one case', () => {
  const droppable = new Set(CASES.flatMap(c => c.pool));
  for (const i of ITEMS) assert.ok(droppable.has(i.id), i.id);
});

test('item values: wear scales value, vanilla items ignore wear, never below 1', () => {
  const ak = ITEMS.find(i => i.hasWear && i.value >= 100);
  assert.equal(itemValue(ak.id, 'FT'), ak.value);
  assert.ok(itemValue(ak.id, 'FN') > itemValue(ak.id, 'FT'));
  assert.ok(itemValue(ak.id, 'BS') < itemValue(ak.id, 'FT'));
  const vanilla = ITEMS.find(i => !i.hasWear);
  assert.equal(itemValue(vanilla.id, null), vanilla.value);
  for (const i of ITEMS) for (const w of WEARS) assert.ok(itemValue(i.id, w.id) >= 1);
  assert.equal(itemValue('nope', 'FT'), 0);
});

// ---- cases ----

test('case catalogue: the 7 archive cases, sound, across every category', () => {
  assert.deepEqual(CASES.map(c => c.id).sort(), ['daily', 'golden', 'harbor', 'neon', 'starter', 'street', 'void']);
  for (const c of CASES) assert.deepEqual(validateCase(c), [], c.id);
  for (const cat of CASE_CATEGORIES) assert.ok(CASES.some(c => c.category === cat.id), cat.id);
  assert.ok(CASES.some(c => c.featured));
  assert.ok(new Set(CASES.map(c => c.price)).size >= 5, 'varied prices');
  assert.deepEqual(CASES.filter(c => c.free).map(c => c.id), ['daily']);
  assert.equal(CASES_BY_ID.daily.price, 0);
  assert.equal(CHEAPEST_CASE_PRICE, Math.min(...CASES.filter(c => !c.free).map(c => c.price)));
});

test('every case and every archive item has its painted image on disk', () => {
  const assets = new URL('../../skinspin/assets/', import.meta.url);
  for (const c of CASES) assert.ok(fs.existsSync(new URL(`cases/${c.id}.webp`, assets)), `case ${c.id}`);
  const painted = ITEMS.filter(i => i.image);
  assert.equal(painted.length, 31);
  for (const i of painted) assert.ok(fs.existsSync(new URL(`items/${i.image}.webp`, assets)), i.id);
  // the two archive items without a picture are drawn instead
  assert.deepEqual(ITEMS.filter(i => i.collection === 'mill' && !i.image).map(i => i.id).sort(), ['charm-loose-bolt', 'collectible-golden-mug']);
});

test('case weights total exactly 100% and odds split evenly within a rarity', () => {
  for (const c of CASES) {
    const odds = caseOdds(c);
    const total = odds.reduce((s, t) => s + t.chance, 0);
    assert.ok(Math.abs(total - 1) < 1e-12, `${c.id} total ${total}`);
    for (const t of odds) {
      assert.ok(Math.abs(t.chance - c.weights[t.rarity] / 100) < 1e-12, `${c.id} ${t.rarity}`);
      assert.deepEqual(t.items.map(x => x.itemId), [...c.rarityPools[t.rarity]]);
      for (const x of t.items) assert.ok(Math.abs(x.chance - t.chance / t.items.length) < 1e-15);
      for (const x of t.items) assert.equal(ITEMS_BY_ID[x.itemId].rarity, t.rarity);
    }
    const itemTotal = odds.flatMap(t => t.items).reduce((s, x) => s + x.chance, 0);
    assert.ok(Math.abs(itemTotal - 1) < 1e-12);
  }
});

test('case pools only hold items from the case collections or its extras', () => {
  for (const c of CASES) {
    for (const id of c.pool) {
      const it = ITEMS_BY_ID[id];
      assert.ok(c.collections.includes(it.collection) || c.extras.includes(id), `${c.id}: ${id}`);
      assert.ok(c.weights[it.rarity] > 0, `${c.id}: ${id} rarity has no weight`);
    }
  }
});

test('expected return is 80-100% of the price for every paid case', () => {
  for (const c of CASES.filter(x => !x.free)) {
    const ratio = expectedValue(c) / c.price;
    assert.ok(ratio > 0.8 && ratio < 1, `${c.id}: ${ratio.toFixed(3)}`);
  }
});

test('actual draws follow the displayed odds (60k rolls per case)', () => {
  const N = 60000;
  for (const c of CASES) {
    const rng = seededRandom(c.id.length * 7919 + c.price);
    const byRarity = {};
    const byItem = {};
    for (let i = 0; i < N; i++) {
      const d = rollCase(c, rng);
      assert.ok(c.pool.includes(d.itemId), `${c.id} dropped ${d.itemId}`);
      const r = ITEMS_BY_ID[d.itemId].rarity;
      byRarity[r] = (byRarity[r] || 0) + 1;
      byItem[d.itemId] = (byItem[d.itemId] || 0) + 1;
    }
    for (const t of caseOdds(c)) {
      const exp = N * t.chance;
      const sd = Math.sqrt(N * t.chance * (1 - t.chance));
      assert.ok(Math.abs((byRarity[t.rarity] || 0) - exp) <= 5 * sd + 2, `${c.id} ${t.rarity}: ${byRarity[t.rarity]} vs ${exp.toFixed(0)}`);
      for (const x of t.items) {
        const e = N * x.chance, s = Math.sqrt(N * x.chance * (1 - x.chance));
        assert.ok(Math.abs((byItem[x.itemId] || 0) - e) <= 5 * s + 2, `${c.id} ${x.itemId}`);
      }
    }
  }
});

test('wear: floats fall inside their tier, tiers follow their weights, vanilla has none', () => {
  const rng = seededRandom(42);
  const c = CASES_BY_ID.void;
  const counts = {};
  let n = 0;
  for (let i = 0; i < 40000; i++) {
    const d = rollCase(c, rng);
    if (!ITEMS_BY_ID[d.itemId].hasWear) { assert.equal(d.wear, null); assert.equal(d.float, null); continue; }
    const w = WEAR_BY_ID[d.wear];
    assert.ok(d.float >= w.min && d.float < w.max, `${d.wear} ${d.float}`);
    counts[d.wear] = (counts[d.wear] || 0) + 1;
    n++;
  }
  const total = WEARS.reduce((s, w) => s + w.weight, 0);
  for (const w of WEARS) assert.ok(Math.abs(counts[w.id] / n - w.weight / total) < 0.015, w.id);
});

// ---- transactions ----

test('opening: charges once, awards exactly one item, updates stats and activity', () => {
  const p = createPlayer(1);
  const r = economy.openCase(p, 'neon', { rng: seededRandom(1), now: 5 });
  assert.ok(r.ok);
  assert.equal(p.coins, STARTING_COINS - 105);
  assert.equal(p.inventory.length, 1);
  assert.equal(p.inventory[0].uid, r.item.uid);
  assert.equal(r.value, itemValue(r.item.itemId, r.item.wear));
  assert.equal(p.stats.casesOpened, 1);
  assert.equal(p.stats.coinsSpent, 105);
  assert.equal(p.stats.casesById.neon, 1);
  assert.equal(p.recentDrops[0].itemId, r.item.itemId);
  assert.equal(p.activity[0].type, 'open');
  assert.equal(p.activity[0].delta, -105);
  assert.ok(p.xp > 0);
  assert.ok(CASES_BY_ID.neon.pool.includes(r.item.itemId));
});

test('every one of the 7 cases opens and drops from its own pool', () => {
  for (const c of CASES) {
    const p = createPlayer(1);
    p.coins = c.price;
    for (let i = 0; i < 20; i++) {
      p.coins = c.price;
      const r = economy.openCase(p, c.id, { rng: seededRandom(i + c.price), now: 1 + i * FREE_CASE_COOLDOWN });
      assert.ok(r.ok, c.id);
      assert.equal(p.coins, 0);
      assert.ok(c.pool.includes(r.item.itemId));
    }
    assert.equal(p.inventory.length, 20);
  }
});

test('insufficient funds and unknown cases change nothing', () => {
  const p = createPlayer(1);
  p.coins = 104;
  const before = clone(p);
  const r = economy.openCase(p, 'neon');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'insufficient-funds');
  assert.deepEqual(p, before);
  assert.equal(economy.openCase(p, 'missing').error, 'unknown-case');
  assert.deepEqual(p, before);
});

test('balance never goes negative however many openings are attempted', () => {
  const p = createPlayer(1);
  const rng = seededRandom(9);
  let opened = 0;
  for (let i = 0; i < 1000; i++) if (economy.openCase(p, 'void', { rng }).ok) opened++;
  assert.equal(opened, Math.floor(STARTING_COINS / 575));
  assert.ok(p.coins >= 0);
  assert.equal(p.coins, STARTING_COINS - opened * 575);
});

test('selling credits the exact item value and removes only that item', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king', 'FN');
  const b = give(p, 'warden-rust-patch', 'BS');
  const r = economy.sellItems(p, [a.uid]);
  assert.ok(r.ok);
  assert.equal(r.total, itemValue(a.itemId, 'FN'));
  assert.equal(p.coins, STARTING_COINS + itemValue(a.itemId, 'FN'));
  assert.deepEqual(p.inventory.map(i => i.uid), [b.uid]);
  assert.equal(p.stats.itemsSold, 1);
  assert.equal(p.activity[0].type, 'sell');
  // can't sell it twice
  const again = economy.sellItems(p, [a.uid]);
  assert.equal(again.error, 'not-owned');
  assert.equal(p.coins, STARTING_COINS + itemValue(a.itemId, 'FN'));
});

test('locked items cannot be sold, alone or inside a bulk sale', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king');
  const b = give(p, 'lancer-overpass', 'FT', { locked: true });
  const before = clone(p);
  assert.equal(economy.sellItems(p, [b.uid]).error, 'locked');
  assert.equal(economy.sellItems(p, [a.uid, b.uid]).error, 'locked');
  assert.deepEqual(p, before, 'no partial sale');
});

test('bulk selling: totals, duplicates, missing items, favourite protection', () => {
  const p = createPlayer(1);
  const items = ['kodiak-salvage-king', 'lancer-overpass', 'mauler-sandblasted', 'claw-vanilla'].map(id => give(p, id, 'MW'));
  const fav = give(p, 'longbow-iron-lung', 'FT', { favorite: true });
  const before = clone(p);
  assert.equal(economy.sellItems(p, [items[0].uid, items[0].uid]).error, 'duplicate');
  assert.equal(economy.sellItems(p, [items[0].uid, 'i999']).error, 'not-owned');
  assert.equal(economy.sellItems(p, []).error, 'empty');
  assert.equal(economy.sellItems(p, [items[0].uid, fav.uid], { allowFavorites: false }).error, 'favorite');
  assert.deepEqual(p, before);

  const uids = items.map(i => i.uid);
  const expected = items.reduce((s, i) => s + itemValue(i.itemId, i.wear), 0);
  const q = economy.quoteSale(p, uids, { allowFavorites: false });
  assert.equal(q.total, expected);
  const r = economy.sellItems(p, uids, { allowFavorites: false });
  assert.ok(r.ok);
  assert.equal(r.total, expected);
  assert.equal(r.count, 4);
  assert.equal(p.coins, STARTING_COINS + expected);
  assert.deepEqual(p.inventory.map(i => i.uid), [fav.uid]);
  assert.equal(p.activity.length, 1, 'one activity entry per bulk sale');
  assert.equal(economy.inventoryValue(p), itemValue(fav.itemId, 'FT'));
  // favourites can still be sold when explicitly allowed
  assert.ok(economy.sellItems(p, [fav.uid], { allowFavorites: true }).ok);
});

test('flags, settings, rename and refill validate their input', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king');
  assert.ok(economy.setItemFlag(p, a.uid, 'locked', true).ok);
  assert.equal(a.locked, true);
  assert.equal(economy.setItemFlag(p, a.uid, 'coins', 1).ok, false);
  assert.equal(economy.setItemFlag(p, 'nope', 'locked', true).ok, false);
  assert.equal(economy.updateSettings(p, { motion: 'sideways' }).ok, false);
  assert.equal(economy.updateSettings(p, { hack: true }).ok, false);
  assert.ok(economy.updateSettings(p, { instantOpen: true, motion: 'reduced' }).ok);
  assert.equal(p.settings.instantOpen, true);
  assert.equal(economy.renamePlayer(p, '   ').ok, false);
  assert.equal(economy.renamePlayer(p, '  <b>Ace</b>  of   spades and a very long tail ').name.length, 20);
  // refill only when broke
  assert.equal(economy.claimRefill(p).ok, false);
  p.coins = 0;
  p.inventory = [];
  assert.ok(economy.refillEligible(p));
  assert.ok(economy.claimRefill(p).ok);
  assert.equal(p.coins, 1000);
  assert.equal(economy.claimRefill(p).ok, false);
});

test('levels: start at 1 and climb by the XP curve', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(xpToNext(1) - 1).level, 1);
  assert.equal(levelInfo(xpToNext(1)).level, 2);
  assert.equal(levelInfo(xpToNext(1) + xpToNext(2)).level, 3);
  assert.equal(levelInfo(1e12).level, 100);
  assert.equal(createPlayer().coins, 5000);
  assert.equal(levelInfo(createPlayer().xp).level, 1);
});

// ---- store, opener, persistence ----

test('store saves after every successful transaction, and not after failures', () => {
  const storage = memoryStorage();
  const store = createStore({ storage, rng: seededRandom(3), clock: () => 10 });
  assert.equal(store.loadStatus, 'new');
  const r = store.openCase('starter');
  assert.ok(r.ok);
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.coins, STARTING_COINS - 32);
  assert.equal(saved.inventory.length, 1);
  assert.equal(saved.version, SAVE_VERSION);
  const raw = storage.getItem(SAVE_KEY);
  assert.equal(store.sell(['nope']).ok, false);
  assert.equal(storage.getItem(SAVE_KEY), raw);
  // reload: identical state
  const again = createStore({ storage });
  assert.equal(again.loadStatus, 'loaded');
  assert.deepEqual(again.player, store.player);
});

test('opener refuses a second opening until the first finishes', () => {
  const store = createStore({ storage: memoryStorage(), rng: seededRandom(5) });
  const opener = createOpener(store);
  assert.ok(opener.start('starter').ok);
  const second = opener.start('starter');
  assert.equal(second.error, 'busy');
  assert.equal(store.player.inventory.length, 1);
  assert.equal(store.player.coins, STARTING_COINS - 32);
  opener.finish();
  assert.ok(opener.start('starter').ok);
  assert.equal(store.player.inventory.length, 2);
  // a failed start does not lock the opener
  opener.finish();
  store.player.coins = 0;
  assert.equal(opener.start('starter').error, 'insufficient-funds');
  assert.equal(opener.busy, false);
});

test('corrupt saves are backed up and replaced with a fresh profile', () => {
  const storage = memoryStorage({ [SAVE_KEY]: '{not json' });
  const r = loadSave(storage, 77);
  assert.equal(r.status, 'corrupt');
  assert.equal(storage.getItem(`${SAVE_BACKUP_PREFIX}77`), '{not json');
  assert.equal(r.player.coins, STARTING_COINS);
  assert.equal(loadSave(memoryStorage({ [SAVE_KEY]: '[1,2]' })).status, 'corrupt');
  assert.equal(loadSave(memoryStorage({ [SAVE_KEY]: 'null' })).status, 'corrupt');
});

test('damaged saves are repaired field by field', () => {
  const p = createPlayer(1);
  give(p, 'kodiak-salvage-king', 'FN');
  give(p, 'claw-vanilla');
  const data = clone(p);
  data.coins = -50;
  data.inventory.push({ uid: 'i1', itemId: 'kodiak-salvage-king' });        // duplicate uid
  data.inventory.push({ uid: 'i77', itemId: 'gold-plated-toaster' });       // unknown item
  data.inventory.push({ uid: 'i78', itemId: 'lancer-overpass', wear: 'XX', float: 0.3 }); // bad wear, good float
  data.inventory.push('junk');
  delete data.stats;
  data.settings.motion = 'warp';
  const { player, repaired } = sanitizePlayer(data, 5);
  assert.ok(repaired);
  assert.equal(player.coins, STARTING_COINS);
  assert.deepEqual(player.inventory.map(i => i.uid), ['i1', 'i2', 'i78']);
  assert.equal(player.inventory[2].wear, 'FT');
  assert.equal(player.inventory[1].wear, null);
  assert.equal(player.settings.motion, 'system');
  assert.equal(player.stats.casesOpened, 0);
  assert.ok(player.nextId > 78, 'new ids never collide with old ones');
});

test('a clean save loads unchanged and saves from a newer version are backed up', () => {
  const store = createStore({ storage: memoryStorage(), rng: seededRandom(8) });
  for (let i = 0; i < 5; i++) store.openCase('harbor');
  store.setFlag(store.player.inventory[0].uid, 'locked', true);
  store.sell([store.player.inventory[1].uid]);
  const data = clone(store.player);
  const { player, repaired } = sanitizePlayer(data);
  assert.equal(repaired, false);
  assert.deepEqual(player, data);

  const newer = { ...data, version: SAVE_VERSION + 1, futureThing: 1 };
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(newer) });
  const r = loadSave(storage, 99);
  assert.equal(r.status, 'newer');
  assert.ok(storage.getItem(`${SAVE_BACKUP_PREFIX}99`));
  assert.equal(r.player.coins, data.coins);
});

test('a save missing optional sections still loads (forward-compatible shape)', () => {
  const minimal = { version: 1, coins: 1234, inventory: [{ uid: 'i3', itemId: 'moth-prism', wear: 'MW', float: 0.1 }] };
  const r = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(minimal) }));
  assert.equal(r.player.coins, 1234);
  assert.equal(r.player.inventory.length, 1);
  assert.equal(r.player.nextId, 4);
  assert.deepEqual(Object.keys(r.player).sort(), Object.keys(createPlayer()).sort());
});

test('unavailable storage still runs the game without saving', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const store = createStore({ storage: broken });
  assert.equal(store.loadStatus, 'unavailable');
  assert.equal(store.saveOk, false);
  assert.ok(store.openCase('starter').ok);
  assert.equal(savePlayer(broken, store.player), false);
});

test('import replaces the player through the same validation', () => {
  const store = createStore({ storage: memoryStorage() });
  assert.equal(store.importData('nope').ok, false);
  assert.equal(store.importData('{"hello":1}').ok, false);
  const other = createPlayer(1);
  other.coins = 42;
  give(other, 'racer-neon-lights');
  assert.ok(store.importData(JSON.stringify(other)).ok);
  assert.equal(store.player.coins, 42);
  assert.equal(store.player.inventory[0].itemId, 'racer-neon-lights');
});

// ---- roulette ----

test('roulette strip holds the predetermined winner at the winning index', () => {
  const c = CASES_BY_ID.void;
  const winner = { itemId: 'moth-prism', wear: 'FN', float: 0.01 };
  const strip = roulette.buildStrip(c, winner, { rng: seededRandom(1) });
  assert.equal(strip.length, ROULETTE.length);
  assert.equal(strip[ROULETTE.winnerIndex].itemId, 'moth-prism');
  assert.equal(strip[ROULETTE.winnerIndex].winner, true);
  assert.equal(strip.filter(s => s.winner).length, 1);
  for (const d of strip) assert.ok(c.pool.includes(d.itemId));
});

test('roulette always stops exactly on the winning card, at any size and landing jitter', () => {
  for (const cardWidth of [118, 150, 173.5]) {
    for (const viewportWidth of [320, 777, 1064, 1600]) {
      const geo = { cardWidth, gap: 8, viewportWidth };
      for (let seed = 0; seed < 50; seed++) {
        const plan = roulette.planSpin(ROULETTE.winnerIndex, geo, { rng: seededRandom(seed) });
        // where the main spin lands is still inside the winning card
        assert.equal(roulette.indexAtOffset(plan.landing, geo), ROULETTE.winnerIndex);
        // and the final glide centres it exactly
        const end = roulette.offsetAt(plan.total + 1, plan);
        assert.equal(end, plan.final);
        assert.equal(roulette.indexAtOffset(end, geo), ROULETTE.winnerIndex);
        const centre = ROULETTE.winnerIndex * (cardWidth + 8) + cardWidth / 2 - end;
        assert.ok(Math.abs(centre - viewportWidth / 2) < 1e-9);
      }
    }
  }
});

test('roulette motion is time-based: same elapsed time, same position, at any frame rate', () => {
  const geo = { cardWidth: 150, gap: 8, viewportWidth: 1000 };
  const plan = roulette.planSpin(ROULETTE.winnerIndex, geo, { rng: () => 0.9 });
  const sample = fps => {
    const out = new Map();
    for (let t = 0; t <= plan.total + 50; t += 1000 / fps) out.set(t, roulette.offsetAt(t, plan));
    return out;
  };
  const a = sample(25), b = sample(100);
  let shared = 0;
  for (const [t, v] of a) if (b.has(t)) { assert.equal(v, b.get(t)); shared++; }
  assert.ok(shared > 100);
  // it only moves forward during the main spin and slows down towards the end
  let prev = -1, prevStep = Infinity;
  for (let t = 0; t <= plan.duration; t += 100) {
    const v = roulette.offsetAt(t, plan);
    assert.ok(v >= prev);
    if (t > 0) { assert.ok(v - prev <= prevStep + 1e-9); prevStep = v - prev; }
    prev = v;
  }
  assert.equal(roulette.offsetAt(-5, plan), 0);
});

// ---- views' pure filters ----

test('inventory filters and sorts', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king', 'FN', { acquiredAt: 1 });
  const b = give(p, 'warden-rust-patch', 'BS', { acquiredAt: 3, favorite: true });
  const c = give(p, 'claw-blood-moon', 'MW', { acquiredAt: 2, locked: true });
  const ids = list => list.map(i => i.uid);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'newest' })), [b.uid, c.uid, a.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'oldest' })), [a.uid, c.uid, b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'value-desc' })), [c.uid, a.uid, b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'value-asc' })), [b.uid, a.uid, c.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'rarity-desc' })), [c.uid, a.uid, b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { sort: 'name-asc' })), [c.uid, a.uid, b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { q: 'rust' })), [b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { q: 'battle-scarred' })), [b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { type: 'knife' })), [c.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { rarity: 'classified' })), [a.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { show: 'favorites' })), [b.uid]);
  assert.deepEqual(ids(filterInventory(p.inventory, { show: 'locked' })), [c.uid]);
  assert.equal(filterInventory(p.inventory, { show: 'unlocked' }).length, 2);
});

test('case catalogue search, category filter and price sort', () => {
  assert.equal(filterCases().length, 7);
  const asc = filterCases({ sort: 'price-asc' }).map(c => c.price);
  assert.deepEqual(asc, [...asc].sort((x, y) => x - y));
  const desc = filterCases({ sort: 'price-desc' }).map(c => c.price);
  assert.deepEqual(desc, [...asc].reverse());
  assert.ok(filterCases({ category: 'starter' }).every(c => c.category === 'starter'));
  assert.ok(filterCases({ category: 'featured' }).every(c => c.featured));
  assert.deepEqual(filterCases({ q: 'harbor case' }).map(c => c.id), ['harbor']);
  assert.ok(filterCases({ q: 'neon lights' }).some(c => c.id === 'neon'), 'search matches items inside cases');
  assert.deepEqual(filterCases({ q: 'jimmy' }).map(c => c.id), ['void'], 'Magnum-50 | Jimmy only drops from the Void Case');
  assert.equal(filterCases({ q: 'zzzz' }).length, 0);
});
