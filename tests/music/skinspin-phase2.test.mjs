import test from 'node:test';
import assert from 'node:assert/strict';

const dir = new URL('../../skinspin/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { ITEMS, ITEMS_BY_ID, COLLECTIONS, itemValue } = await load('items.js');
const { CASES, CASES_BY_ID } = await load('cases.js');
const { WEAR_BY_ID } = await load('wear.js');
const { seededRandom } = await load('rng.js');
const { createPlayer } = await load('playerState.js');
const economy = await load('economy.js');
const upgrade = await load('upgrade.js');
const contracts = await load('contracts.js');
const collections = await load('collections.js');
const battles = await load('battles.js');
const market = await load('market.js');
const { loadSave, sanitizePlayer } = await load('save.js');
const { createStore, memoryStorage } = await load('store.js');
const { SAVE_KEY, SAVE_VERSION, STARTING_COINS, UPGRADE, CONTRACT, MARKET, BATTLE } = await load('config.js');

const clone = o => JSON.parse(JSON.stringify(o));
const give = (player, itemId, wear = 'FT', extra = {}) => {
  const it = ITEMS_BY_ID[itemId];
  const inst = { uid: `i${player.nextId++}`, itemId, wear: it.hasWear ? wear : null, float: it.hasWear ? +(WEAR_BY_ID[wear].min + 0.01).toFixed(4) : null, acquiredAt: 1, source: 'starter', locked: false, favorite: false, ...extra };
  player.inventory.push(inst);
  if (!player.collectionLog.includes(itemId)) player.collectionLog.push(itemId);
  return inst;
};
const ids = list => list.map(i => i.itemId);

// ---- upgrade ----

test('upgrade chance follows the configured formula and caps', () => {
  assert.equal(upgrade.upgradeChance(100, 200), 0.5 * (1 - UPGRADE.houseEdge));
  assert.equal(upgrade.upgradeChance(100, 101), UPGRADE.maxChance);
  assert.equal(upgrade.upgradeChance(0, 100), 0);
  const p = createPlayer(1);
  const inst = give(p, 'kodiak-salvage-king', 'FT'); // 340
  const q = upgrade.quoteUpgrade(p, inst.uid, { itemId: 'longbow-iron-lung', wear: 'FT' }); // 1250
  assert.ok(q.ok);
  assert.equal(q.chance, (340 / 1250) * (1 - UPGRADE.houseEdge));
  assert.equal(q.multiplier, 1250 / 340);
  assert.equal(upgrade.quoteUpgrade(p, inst.uid, { itemId: 'kodiak-salvage-king', wear: 'MW' }).error, 'too-cheap'); // 391 < 1.2 x 340
  assert.equal(upgrade.quoteUpgrade(p, inst.uid, { itemId: 'moth-prism' }).error, 'bad-target');
  assert.equal(upgrade.quoteUpgrade(p, inst.uid, { itemId: 'nope' }).error, 'bad-target');
  const tiny = give(p, 'mauler-sandblasted', 'BS');
  assert.equal(upgrade.quoteUpgrade(p, tiny.uid, { itemId: 'moth-prism', wear: 'FN' }).error, 'too-expensive');
});

test('upgrade success consumes the input and awards the target; failure only consumes', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king');
  const b = give(p, 'kodiak-salvage-king');
  const target = { itemId: 'longbow-iron-lung', wear: 'MW' };
  const win = upgrade.upgradeItem(p, a.uid, target, { rng: () => 0.01, now: 5 });
  assert.ok(win.ok && win.success);
  assert.ok(!p.inventory.some(i => i.uid === a.uid));
  assert.equal(p.inventory.filter(i => i.itemId === 'longbow-iron-lung').length, 1);
  const got = p.inventory.find(i => i.itemId === 'longbow-iron-lung');
  assert.equal(got.wear, 'MW');
  assert.ok(got.float >= WEAR_BY_ID.MW.min && got.float < WEAR_BY_ID.MW.max);
  assert.equal(got.source, 'upgrade');
  const coins = p.coins;
  const loss = upgrade.upgradeItem(p, b.uid, target, { rng: () => 0.99, now: 6 });
  assert.ok(loss.ok && !loss.success);
  assert.equal(p.inventory.length, 1, 'input gone, nothing added');
  assert.equal(p.coins, coins, 'upgrades never touch the balance');
  assert.equal(p.stats.upgradesAttempted, 2);
  assert.equal(p.stats.upgradesWon, 1);
  assert.equal(p.upgrades.length, 2);
  assert.equal(p.upgrades[0].success, false);
  assert.equal(p.activity[0].type, 'upgrade');
});

test('upgrade rolls land at the displayed probability', () => {
  const rng = seededRandom(11);
  for (const [inputId, targetId, wear] of [['kodiak-salvage-king', 'longbow-iron-lung', 'FT'], ['harrier-junkyard-dog', 'kodiak-salvage-king', 'FT'], ['harrier-alpha-wolf', 'moth-vanilla', null]]) {
    let wins = 0, chance = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const p = createPlayer(1);
      const inst = give(p, inputId);
      const r = upgrade.upgradeItem(p, inst.uid, { itemId: targetId, wear }, { rng });
      chance = r.chance;
      if (r.success) wins++;
    }
    const sd = Math.sqrt(N * chance * (1 - chance));
    assert.ok(Math.abs(wins - N * chance) < 5 * sd + 2, `${targetId}: ${wins} vs ${(N * chance).toFixed(0)}`);
  }
});

test('upgrade refuses locked, missing and already-used items without changing state', () => {
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king', 'FT', { locked: true });
  const before = clone(p);
  assert.equal(upgrade.upgradeItem(p, a.uid, { itemId: 'longbow-iron-lung', wear: 'FT' }).error, 'locked');
  assert.equal(upgrade.upgradeItem(p, 'i999', { itemId: 'longbow-iron-lung', wear: 'FT' }).error, 'not-owned');
  assert.deepEqual(p, before);
  // a second submit of the same item fails: it was consumed by the first
  a.locked = false;
  assert.ok(upgrade.upgradeItem(p, a.uid, { itemId: 'longbow-iron-lung', wear: 'FT' }, { rng: () => 0.9 }).ok);
  const after = clone(p);
  assert.equal(upgrade.upgradeItem(p, a.uid, { itemId: 'longbow-iron-lung', wear: 'FT' }).error, 'not-owned');
  assert.deepEqual(p, after);
});

// ---- contracts ----

test('every collection item below Extraordinary has trade-up outputs of the next rarity', () => {
  for (const it of ITEMS) {
    const outs = contracts.outputsFor(it.id);
    if (it.rarity === 'extraordinary') { assert.equal(outs.length, 0); continue; }
    const next = contracts.nextRarity(it.rarity);
    if (it.rarity === 'covert') assert.ok(outs.length > 0, `${it.id} covert has knife/glove outputs`);
    for (const o of outs) assert.equal(ITEMS_BY_ID[o].rarity, next, `${it.id} -> ${o}`);
    if (next !== 'extraordinary') for (const o of outs) assert.equal(ITEMS_BY_ID[o].collection, it.collection);
  }
});

test('contract odds: each input carries an equal share, split over its collection outputs', () => {
  const p = createPlayer(1);
  const uids = [];
  for (let i = 0; i < 5; i++) uids.push(give(p, 'warden-rust-patch', 'BS').uid);   // scrap consumer
  for (let i = 0; i < 5; i++) uids.push(give(p, 'sentinel-concrete', 'FN').uid);   // street consumer
  const q = contracts.quoteContract(p, uids);
  assert.ok(q.ok);
  const total = q.outcomes.reduce((s, o) => s + o.chance, 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
  const scrapInd = contracts.outputsFor('warden-rust-patch');
  for (const id of scrapInd) assert.ok(Math.abs(q.outcomes.find(o => o.itemId === id).chance - 0.5 / scrapInd.length) < 1e-12);
  // output float is the average input float
  const avg = p.inventory.reduce((s, i) => s + i.float, 0) / 10;
  for (const o of q.outcomes) assert.ok(Math.abs(o.float - avg) < 1e-4);
});

test('contract consumes exactly the ten inputs and adds one output from the pool', () => {
  const p = createPlayer(1);
  const uids = Array.from({ length: CONTRACT.size }, () => give(p, 'harrier-junkyard-dog').uid);
  const keep = give(p, 'warden-rust-patch');
  const q = contracts.quoteContract(p, uids);
  const r = contracts.signContract(p, uids, { rng: seededRandom(3), now: 9 });
  assert.ok(r.ok);
  assert.deepEqual(p.inventory.map(i => i.uid).sort(), [keep.uid, r.item.uid].sort());
  assert.ok(q.outcomes.some(o => o.itemId === r.item.itemId));
  assert.equal(ITEMS_BY_ID[r.item.itemId].rarity, 'restricted');
  assert.equal(p.contracts[0].inputs.length, 10);
  assert.equal(p.activity[0].type, 'contract');
  assert.equal(p.stats.contractsCompleted, 1);
  assert.equal(contracts.signContract(p, uids).error, 'not-owned', 'inputs are gone, no second signing');
});

test('contract validation: size, mixed rarity, locks, duplicates, extraordinary', () => {
  const p = createPlayer(1);
  const nine = Array.from({ length: 9 }, () => give(p, 'harrier-junkyard-dog').uid);
  const before = clone(p);
  assert.equal(contracts.quoteContract(p, nine).error, 'size');
  assert.equal(contracts.signContract(p, [...nine, give(p, 'warden-rust-patch').uid]).error, 'mixed');
  const locked = give(p, 'harrier-junkyard-dog', 'FT', { locked: true });
  assert.equal(contracts.signContract(p, [...nine, locked.uid]).error, 'locked');
  assert.equal(contracts.signContract(p, [...nine, nine[0]]).error, 'duplicate');
  const knives = Array.from({ length: 10 }, () => give(p, 'claw-vanilla').uid);
  assert.equal(contracts.signContract(p, knives).error, 'ineligible');
  assert.equal(p.inventory.length, before.inventory.length + 2 + 10, 'nothing consumed by failed contracts');
});

test('contract draws follow the displayed odds', () => {
  const N = 20000;
  const rng = seededRandom(17);
  const counts = {};
  let outcomes;
  for (let i = 0; i < N; i++) {
    const p = createPlayer(1);
    const uids = [];
    for (let k = 0; k < 7; k++) uids.push(give(p, 'kite-corroded').uid);       // scrap restricted
    for (let k = 0; k < 3; k++) uids.push(give(p, 'juggernaut-kraken').uid);   // ocean restricted
    outcomes ||= contracts.quoteContract(p, uids).outcomes;
    const r = contracts.signContract(p, uids, { rng });
    counts[r.item.itemId] = (counts[r.item.itemId] || 0) + 1;
  }
  for (const o of outcomes) {
    const sd = Math.sqrt(N * o.chance * (1 - o.chance));
    assert.ok(Math.abs((counts[o.itemId] || 0) - N * o.chance) < 5 * sd + 2, o.itemId);
  }
});

// ---- collections ----

test('collections cover every item; progress counts items ever obtained', () => {
  const all = Object.values(collections.COLLECTION_ITEMS).flat();
  assert.equal(all.length, ITEMS.length);
  assert.equal(new Set(all).size, ITEMS.length);
  for (const c of COLLECTIONS) assert.ok(collections.collectionSources(c.id).length > 0, `${c.id} drops somewhere`);
  const p = createPlayer(1);
  const inst = give(p, 'kodiak-salvage-king');
  economy.sellItems(p, [inst.uid]);
  const pr = collections.collectionProgress(p, 'scrap');
  assert.equal(pr.found, 1, 'sold items still count as collected');
  assert.equal(pr.owned['kodiak-salvage-king'], undefined);
});

test('collection reward is paid once and only when complete', () => {
  const p = createPlayer(1);
  assert.equal(collections.claimCollection(p, 'arcade').error, 'incomplete');
  for (const id of collections.COLLECTION_ITEMS.arcade) p.collectionLog.push(id);
  const reward = collections.collectionReward('arcade');
  const r = collections.claimCollection(p, 'arcade', { now: 7 });
  assert.ok(r.ok);
  assert.equal(p.coins, STARTING_COINS + reward.coins);
  assert.equal(p.xp, reward.xp);
  const again = collections.claimCollection(p, 'arcade');
  assert.equal(again.error, 'claimed');
  assert.equal(p.coins, STARTING_COINS + reward.coins);
  // and still claimed after a save round trip
  const reloaded = sanitizePlayer(clone(p)).player;
  assert.equal(collections.claimCollection(reloaded, 'arcade').error, 'claimed');
  assert.equal(collections.claimCollection(p, 'nope').error, 'unknown');
});

// ---- battles ----

test('battle charges the entry once, rolls every participant from the case pools, settles once', () => {
  const p = createPlayer(1);
  const setup = { cases: ['starter', 'neon', 'starter'], players: 3 };
  const cost = battles.battleCost(setup.cases);
  assert.equal(cost, 32 + 105 + 32);
  const r = battles.runBattle(p, setup, { rng: seededRandom(4), now: 3 });
  assert.ok(r.ok);
  assert.equal(p.coins, STARTING_COINS - cost);
  const b = r.battle;
  assert.equal(b.participants.length, 3);
  assert.equal(b.participants[0].isPlayer, true);
  for (const part of b.participants) {
    assert.equal(part.drops.length, 3);
    part.drops.forEach((d, i) => assert.ok(CASES_BY_ID[setup.cases[i]].pool.includes(d.itemId)));
    assert.equal(part.total, part.drops.reduce((s, d) => s + d.value, 0));
    for (const d of part.drops) assert.equal(d.value, itemValue(d.itemId, d.wear));
  }
  const pot = b.participants.flatMap(x => x.drops);
  if (r.won) {
    assert.equal(p.inventory.length, pot.length, 'winner takes every item');
    assert.deepEqual(ids(p.inventory).sort(), ids(pot).sort());
    assert.equal(b.awarded.length, pot.length);
  } else {
    assert.equal(p.inventory.length, 0);
  }
  assert.equal(p.battles.length, 1);
  assert.equal(p.stats.battlesPlayed, 1);
  assert.equal(p.activity[0].type, 'battle');
});

test('battle winner is the highest total; ties go to the best single item, then a draw', () => {
  const mk = (...vals) => ({ total: vals.reduce((s, v) => s + v, 0), drops: vals.map(v => ({ value: v })) });
  assert.deepEqual(battles.decideWinner([mk(10, 20), mk(50), mk(5)], () => 0), { winner: 1, tieBreak: false });
  assert.deepEqual(battles.decideWinner([mk(10, 20), mk(25, 5)], () => 0), { winner: 1, tieBreak: true });
  const draw = battles.decideWinner([mk(15, 15), mk(15, 15)], () => 0.99);
  assert.deepEqual(draw, { winner: 1, tieBreak: true });
});

test('battle validation: unaffordable, bad setup, nothing changes', () => {
  const p = createPlayer(1);
  p.coins = 100;
  const before = clone(p);
  assert.equal(battles.runBattle(p, { cases: ['neon'], players: 2 }).error, 'insufficient-funds');
  assert.equal(battles.runBattle(p, { cases: [], players: 2 }).error, 'no-cases');
  assert.equal(battles.runBattle(p, { cases: ['starter'], players: 5 }).error, 'players');
  assert.equal(battles.runBattle(p, { cases: ['starter'], players: 1 }).error, 'players');
  assert.equal(battles.runBattle(p, { cases: Array(BATTLE.maxRounds + 1).fill('starter'), players: 2 }).error, 'too-many');
  assert.equal(battles.runBattle(p, { cases: ['daily'], players: 2 }).error, 'free-case');
  assert.equal(battles.runBattle(p, { cases: ['ghost'], players: 2 }).error, 'unknown-case');
  assert.deepEqual(p, before);
});

test('NPCs and the player draw from the same distribution (no rigging)', () => {
  // Over many battles each seat's average total should match the case's expected value.
  const rng = seededRandom(23);
  const N = 6000;
  const totals = [0, 0, 0, 0];
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const p = createPlayer(1);
    const r = battles.runBattle(p, { cases: ['harbor'], players: 4 }, { rng });
    r.battle.participants.forEach((x, k) => { totals[k] += x.total; });
    if (r.won) wins++;
  }
  const avg = totals.map(t => t / N);
  const spread = Math.max(...avg) / Math.min(...avg);
  assert.ok(spread < 1.25, `seat averages ${avg.map(a => a.toFixed(1))}`);
  assert.ok(Math.abs(wins / N - 0.25) < 0.03, `player win rate ${(wins / N).toFixed(3)}`);
});

// ---- market ----

test('market price stays inside the band every day and the history is deterministic', () => {
  for (const it of ITEMS) {
    for (let d = 0; d < 400; d += 7) {
      const f = market.marketFactor(it.id, 20000 + d);
      assert.ok(f >= 1 - MARKET.priceBand - 1e-12 && f <= 1 + MARKET.priceBand + 1e-12, `${it.id} ${f}`);
    }
  }
  const now = 1.8e12;
  const h = market.priceHistory('moth-prism', 'FN', now);
  assert.equal(h.length, MARKET.historyDays);
  assert.equal(h.at(-1).price, market.marketPrice('moth-prism', 'FN', now));
  assert.deepEqual(market.priceHistory('moth-prism', 'FN', now), h);
});

test('market tick seeds NPC listings, adds more over time, and caps them', () => {
  const p = createPlayer(1);
  const t0 = 1.8e12;
  const r = market.tickMarket(p, { now: t0, rng: seededRandom(1) });
  assert.ok(r.changed);
  assert.equal(p.market.npc.length, MARKET.initialListings);
  for (const l of p.market.npc) {
    const mp = market.marketPrice(l.itemId, l.wear, t0);
    assert.ok(l.price >= Math.floor(mp * MARKET.npcListingMin) && l.price <= Math.ceil(mp * MARKET.npcListingMax), 'NPC prices are bounded');
  }
  assert.equal(market.tickMarket(p, { now: t0 + 1000, rng: seededRandom(2) }).changed, false);
  market.tickMarket(p, { now: t0 + 2 * MARKET.newListingEvery + 5, rng: seededRandom(3) });
  assert.equal(p.market.npc.length, MARKET.initialListings + 2);
  market.tickMarket(p, { now: t0 + 1000 * MARKET.newListingEvery, rng: seededRandom(4) });
  assert.ok(p.market.npc.length <= MARKET.maxNpcListings);
  assert.equal(new Set(p.market.npc.map(l => l.id)).size, p.market.npc.length);
});

test('buying a listing transfers the item once and charges once', () => {
  const p = createPlayer(1);
  market.tickMarket(p, { now: 1.8e12, rng: seededRandom(5) });
  const listing = p.market.npc.filter(l => l.price <= p.coins)[0];
  const r = market.buyListing(p, listing.id, { now: 2 });
  assert.ok(r.ok);
  assert.equal(p.coins, STARTING_COINS - listing.price);
  assert.equal(p.inventory.length, 1);
  assert.equal(p.inventory[0].itemId, listing.itemId);
  assert.equal(p.inventory[0].source, 'market');
  const after = clone(p);
  assert.equal(market.buyListing(p, listing.id).error, 'gone', 'no second purchase');
  assert.deepEqual(p, after);
});

test('buying needs enough money; failures leave everything unchanged', () => {
  const p = createPlayer(1);
  market.tickMarket(p, { now: 1.8e12, rng: seededRandom(6) });
  p.coins = 0;
  const before = clone(p);
  assert.equal(market.buyListing(p, p.market.npc[0].id).error, 'insufficient-funds');
  assert.equal(market.buyListing(p, 'l999999').error, 'gone');
  assert.deepEqual(p, before);
});

test('listing: only owned, unlocked items, bounded price, no buying your own, cancel returns the item', () => {
  const now = 1.8e12;
  const p = createPlayer(1);
  const a = give(p, 'kodiak-salvage-king');
  const locked = give(p, 'lancer-overpass', 'FT', { locked: true });
  const b = market.priceBounds(a.itemId, a.wear, now);
  const before = clone(p);
  assert.equal(market.listItem(p, locked.uid, 50, { now }).error, 'locked');
  assert.equal(market.listItem(p, 'i999', 50, { now }).error, 'not-owned');
  assert.equal(market.listItem(p, a.uid, b.max + 1, { now }).error, 'bad-price');
  assert.equal(market.listItem(p, a.uid, b.min - 1, { now }).error, 'bad-price');
  assert.equal(market.listItem(p, a.uid, 12.5, { now }).error, 'bad-price');
  assert.deepEqual(p, before);
  const r = market.listItem(p, a.uid, b.market, { now });
  assert.ok(r.ok);
  assert.ok(!p.inventory.some(i => i.uid === a.uid), 'listed item leaves the inventory');
  assert.equal(market.listItem(p, a.uid, b.market, { now }).error, 'not-owned', 'cannot list twice');
  assert.equal(market.buyListing(p, r.listing.id).error, 'own-listing');
  // a listed item can't be sold or used in an upgrade either
  assert.equal(economy.sellItems(p, [a.uid]).error, 'not-owned');
  const c = market.cancelListing(p, r.listing.id, { now });
  assert.ok(c.ok);
  assert.ok(p.inventory.some(i => i.uid === a.uid), 'same item comes back');
  assert.equal(market.cancelListing(p, r.listing.id).error, 'gone');
});

test('NPC buyers: cheap listings sell over time, overpriced ones never; payout minus fee, once', () => {
  assert.equal(market.saleChancePerMinute(1.3), 0);
  assert.equal(market.saleChancePerMinute(2), 0);
  assert.ok(market.saleChancePerMinute(0.6) > market.saleChancePerMinute(1));
  const t0 = 1.8e12;
  const p = createPlayer(1);
  market.tickMarket(p, { now: t0, rng: seededRandom(1) });
  const cheap = give(p, 'kodiak-salvage-king');
  const pricey = give(p, 'kodiak-salvage-king');
  const bc = market.priceBounds(cheap.itemId, cheap.wear, t0);
  const l1 = market.listItem(p, cheap.uid, bc.min, { now: t0 }).listing;
  market.listItem(p, pricey.uid, bc.max, { now: t0 });
  const coins = p.coins;
  const r = market.tickMarket(p, { now: t0 + 6 * 60 * 60 * 1000, rng: seededRandom(9) });
  assert.equal(r.sold.length, 1);
  assert.equal(r.sold[0].listing.id, l1.id);
  assert.equal(p.coins, coins + l1.price - market.sellerFee(l1.price));
  assert.equal(p.market.mine.length, 1, 'overpriced listing still waiting');
  assert.equal(p.stats.marketSold, 1);
  const again = market.tickMarket(p, { now: t0 + 6 * 60 * 60 * 1000, rng: seededRandom(9) });
  assert.equal(again.sold.length, 0, 'nothing pays out twice');
});

// ---- shared economy & persistence ----

test('every mode works on the same inventory and balance through one store, and it all persists', () => {
  const storage = memoryStorage();
  let t = 1.8e12;
  const store = createStore({ storage, rng: seededRandom(31), clock: () => t });
  store.tickMarket();
  for (let i = 0; i < 12; i++) store.openCase('starter');
  const p = store.player;
  assert.equal(p.inventory.length, 12);
  const byRarity = {};
  for (const i of p.inventory) (byRarity[ITEMS_BY_ID[i.itemId].rarity] ||= []).push(i.uid);
  // upgrade the most valuable item
  const best = [...p.inventory].sort((a, b) => economy.instanceValue(b) - economy.instanceValue(a))[0];
  const target = ITEMS.find(it => it.hasWear && itemValue(it.id, 'FT') >= economy.instanceValue(best) * 2);
  const u = store.upgrade(best.uid, { itemId: target.id, wear: 'FT' });
  assert.ok(u.ok);
  // list something, buy something
  const listable = p.inventory[0];
  const lb = market.priceBounds(listable.itemId, listable.wear, t);
  assert.ok(store.listItem(listable.uid, lb.market).ok);
  const cheapest = [...p.market.npc].sort((a, b) => a.price - b.price)[0];
  assert.ok(store.buyListing(cheapest.id).ok);
  // battle
  const br = store.battle({ cases: ['starter'], players: 2 });
  assert.ok(br.ok);
  t += 60000;
  store.tickMarket();

  const reloaded = createStore({ storage, clock: () => t });
  assert.equal(reloaded.loadStatus, 'loaded');
  assert.deepEqual(reloaded.player, store.player);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version, SAVE_VERSION);
  // no uid appears twice anywhere
  const all = [...reloaded.player.inventory.map(i => i.uid), ...reloaded.player.market.mine.map(l => l.item.uid)];
  assert.equal(new Set(all).size, all.length);
});

test('a Phase 1 (version 1) save migrates: progress kept, collection log seeded', () => {
  const v1 = {
    version: 1, name: 'Old', coins: 4321, xp: 250, nextId: 9,
    inventory: [
      { uid: 'i3', itemId: 'kodiak-salvage-king', wear: 'FT', float: 0.2, acquiredAt: 10, source: 'rookie', locked: true, favorite: false },
      { uid: 'i5', itemId: 'claw-vanilla', wear: null, float: null, acquiredAt: 11, source: 'edge', locked: false, favorite: true },
    ],
    recentDrops: [{ itemId: 'warden-rust-patch', wear: 'BS', float: 0.6, at: 9, caseId: 'rookie' }],
    activity: [{ id: 'a4', type: 'open', at: 9, delta: -23, caseId: 'rookie', itemId: 'warden-rust-patch', wear: 'BS', value: 2 }],
    stats: { casesOpened: 3, coinsSpent: 69, itemsObtained: 3, itemsSold: 1, coinsFromSales: 2, refillsClaimed: 0, rarityCounts: { consumer: 2 }, casesById: { rookie: 3 }, bestDrop: null },
    settings: { instantOpen: true, motion: 'system', sound: false, protectFavorites: true },
    createdAt: 5,
  };
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(v1) });
  const r = loadSave(storage, 100);
  assert.equal(r.status, 'loaded', 'a valid v1 save is not reported as damaged');
  const p = r.player;
  assert.equal(p.version, SAVE_VERSION);
  assert.equal(p.coins, 4321);
  assert.equal(p.inventory.length, 2);
  assert.equal(p.inventory[0].locked, true);
  assert.equal(p.settings.instantOpen, true);
  assert.equal(p.stats.casesOpened, 3);
  assert.equal(p.stats.upgradesAttempted, 0);
  assert.deepEqual([...p.collectionLog].sort(), ['claw-vanilla', 'kodiak-salvage-king', 'warden-rust-patch']);
  assert.deepEqual(p.market.npc, []);
  assert.equal(p.nextId, 9);
  // old case ids were rewritten to the archive cases that replaced them
  assert.deepEqual(p.inventory.map(i => i.source), ['starter', 'void']);
  assert.equal(p.recentDrops[0].caseId, 'starter');
  assert.equal(p.activity[0].caseId, 'starter');
  assert.deepEqual(p.stats.casesById, { starter: 3 });
  // and it keeps working
  const store = createStore({ storage, rng: seededRandom(2) });
  assert.ok(store.openCase('starter').ok);
  assert.equal(store.player.inventory.at(-1).uid, 'i9');
});

test('a broken market listing returns its item to the inventory instead of losing it', () => {
  const p = createPlayer(1);
  const data = clone(p);
  data.market.mine = [{ id: 'l4', price: -5, listedAt: 1, item: { uid: 'i2', itemId: 'moth-prism', wear: 'FN', float: 0.01, acquiredAt: 1 } }];
  data.nextId = 3;
  const { player, repaired } = sanitizePlayer(data);
  assert.ok(repaired);
  assert.equal(player.market.mine.length, 0);
  assert.equal(player.inventory[0].itemId, 'moth-prism');
  // and a uid can't be both listed and in the inventory
  const dup = clone(p);
  dup.inventory = [{ uid: 'i2', itemId: 'moth-prism', wear: 'FN', float: 0.01, acquiredAt: 1 }];
  dup.market.mine = [{ id: 'l4', price: 100, listedAt: 1, item: { uid: 'i2', itemId: 'moth-prism', wear: 'FN', float: 0.01, acquiredAt: 1 } }];
  const fixed = sanitizePlayer(dup).player;
  assert.equal(fixed.inventory.length + fixed.market.mine.length, 1);
});

// ---- asset archive: free case and the case replacement ----

test('the Daily Free Case costs nothing and can be opened once per cooldown', async () => {
  const { FREE_CASE_COOLDOWN } = await load('cases.js');
  const p = createPlayer(1);
  p.coins = 0;
  const t0 = 1.8e12;
  const r = economy.openCase(p, 'daily', { rng: seededRandom(1), now: t0 });
  assert.ok(r.ok);
  assert.equal(p.coins, 0);
  assert.equal(p.inventory.length, 1);
  assert.ok(CASES_BY_ID.daily.pool.includes(r.item.itemId));
  const before = clone(p);
  assert.equal(economy.openCase(p, 'daily', { now: t0 + FREE_CASE_COOLDOWN - 1 }).error, 'cooldown');
  assert.deepEqual(p, before, 'a refused free opening changes nothing');
  assert.ok(economy.openCase(p, 'daily', { rng: seededRandom(2), now: t0 + FREE_CASE_COOLDOWN }).ok);
  // the timer survives a save round trip
  const reloaded = sanitizePlayer(clone(p)).player;
  assert.equal(economy.openCase(reloaded, 'daily', { now: t0 + FREE_CASE_COOLDOWN + 1 }).error, 'cooldown');
});

test('a version 2 save keeps everything, with old case ids moved to the archive cases', () => {
  const v2 = clone(createPlayer(1));
  v2.version = 2;
  v2.inventory = [{ uid: 'i2', itemId: 'moth-prism', wear: 'FN', float: 0.01, acquiredAt: 5, source: 'cutthroat', locked: false, favorite: false }];
  v2.stats.casesById = { rookie: 2, scrapyard: 1, neon: 4, edge: 1 };
  v2.stats.bestDrop = { itemId: 'moth-prism', wear: 'FN', float: 0.01, value: 15400, at: 5, caseId: 'cutthroat' };
  v2.battles = [{ id: 'b3', at: 6, cases: ['rookie', 'oceanic'], cost: 83, tieBreak: false, winner: 0, awarded: [],
    participants: [
      { name: 'Player', isPlayer: true, total: 7, drops: [{ itemId: 'warden-rust-patch', wear: 'FT', float: 0.2, value: 4 }, { itemId: 'mauler-driftwood', wear: 'FT', float: 0.2, value: 3 }] },
      { name: 'Mako', isPlayer: false, total: 6, drops: [{ itemId: 'warden-rust-patch', wear: 'FT', float: 0.2, value: 4 }, { itemId: 'mauler-driftwood', wear: 'BS', float: 0.6, value: 2 }] },
    ] }];
  v2.market.mine = [{ id: 'l4', price: 90, listedAt: 7, item: { uid: 'i1', itemId: 'kodiak-salvage-king', wear: 'FT', float: 0.2, acquiredAt: 3, source: 'gilded' } }];
  v2.nextId = 5;
  const r = loadSave(memoryStorage({ [SAVE_KEY]: JSON.stringify(v2) }));
  assert.equal(r.status, 'loaded');
  const p = r.player;
  assert.equal(p.version, SAVE_VERSION);
  assert.equal(p.inventory[0].source, 'void');
  assert.deepEqual(p.stats.casesById, { starter: 3, neon: 4, void: 1 });
  assert.equal(p.stats.bestDrop.caseId, 'void');
  assert.equal(p.battles.length, 1, 'old battles are kept');
  assert.deepEqual(p.battles[0].cases, ['starter', 'harbor']);
  assert.equal(p.market.mine.length, 1);
  assert.equal(p.market.mine[0].item.source, 'golden');
});

test('Mill Street items have the archive names, rarities and values', () => {
  const mill = ITEMS.filter(i => i.collection === 'mill');
  assert.equal(mill.length, 33);
  const byName = Object.fromEntries(mill.map(i => [i.name, i]));
  assert.equal(byName['Magnum-50 | Jimmy'].rarity, 'extraordinary');
  assert.equal(byName['Magnum-50 | Jimmy'].value, 8500);
  assert.equal(byName['★ Karambit | Ember Fade'].rarity, 'covert');
  assert.equal(byName['Sticker | FRAGILE'].hasWear, false);
  assert.equal(byName['P9 | Bubble Wrap'].rarity, 'industrial');
  for (const t of ['charm', 'sticker', 'collectible']) assert.ok(mill.some(i => i.type === t), t);
  // each archive case still contains exactly its archive list among its Mill Street items
  assert.deepEqual(CASES_BY_ID.daily.pool.length, 10);
  assert.ok(CASES_BY_ID.void.pool.includes('magnum-jimmy'));
});
