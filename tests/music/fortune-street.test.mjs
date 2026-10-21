import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../fortune-street/js/', import.meta.url);
const E = await import(new URL('engine.js', dir));
const R = await import(new URL('rules.js', dir));
const B = await import(new URL('board.js', dir));
const AI = await import(new URL('ai.js', dir));
const S = await import(new URL('save.js', dir));
const { CARDS, deckFor } = await import(new URL('cards.js', dir));
const { rollDie } = await import(new URL('rng.js', dir));

const { createGame, dispatch, publicView, validateState } = E;

// ---- helpers ----------------------------------------------------------------------------

function game(mode = 'classic', n = 3, extra = {}) {
  return createGame({
    mode, seed: 12345,
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, kind: 'human' })),
    ...extra,
  });
}

// make the next two dice come up a and b by picking the generator state that produces them
function forceDice(st, a, b) {
  for (let s = 0; s < 1e6; s++) {
    const r = { s };
    if (rollDie(r) === a && rollDie(r) === b) { st.rng.s = s; return; }
  }
  throw new Error('no seed');
}

function ok(st, action) {
  const r = dispatch(st, action);
  assert.ok(r.ok, `${action.type} failed: ${r.error}`);
  return r.state;
}
function bad(st, action, pattern) {
  const r = dispatch(st, action);
  assert.equal(r.ok, false, `${action.type} should have been rejected`);
  assert.equal(r.state, st, 'a rejected action returns the original state');
  if (pattern) assert.match(r.error, pattern);
  return r.error;
}

// roll exactly `total` (as a non-double where possible) for the active player
function rollTo(st, total) {
  const a = Math.min(6, total - 1);
  let b = total - a;
  let x = a;
  if (x === b && x > 1) { x--; b++; }
  forceDice(st, x, b);
  return ok(st, { type: 'ROLL', player: st.turn.player });
}

const own = (st, pid, ...ids) => { for (const id of ids) st.props[id].owner = pid; };
const idx = (st, id) => R.boardOf(st).indexOf[id];

// ---- modules and data -------------------------------------------------------------------

test('every fortune-street module has valid syntax', () => {
  const files = [...fs.readdirSync(dir).filter(f => f.endsWith('.js')), ...fs.readdirSync(new URL('ui/', dir)).filter(f => f.endsWith('.js')).map(f => `ui/${f}`)];
  assert.ok(files.length >= 12);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('boards: sizes, corners, and every space is well defined', () => {
  const full = B.getBoard('full'), quick = B.getBoard('quick');
  assert.equal(full.size, 40);
  assert.equal(quick.size, 28);
  for (const b of [full, quick]) {
    assert.equal(b.size % 4, 0);
    assert.deepEqual([0, 1, 2, 3].map(k => b.spaces[k * b.side].id), ['start', 'impound', 'park', 'towzone']);
    for (const s of b.spaces) {
      assert.ok(['corner', 'property', 'transit', 'service', 'tax', 'bulletin', 'opportunity'].includes(s.type));
      assert.ok(B.spaceName(s), 'every space has a name');
      if (B.ASSETS[s.id]) assert.equal(B.ASSETS[s.id].kind, s.type);
    }
    assert.equal(new Set(b.ownables).size, b.ownables.length, 'no asset appears twice');
    for (const ids of Object.values(b.districts)) assert.ok(ids.length >= 2);
    assert.ok(b.transitIndices.length >= 2);
  }
  assert.equal(Object.keys(full.districts).length, 6);
  const names = Object.values(B.ASSETS).map(a => a.name);
  assert.equal(new Set(names).size, names.length);
  for (const a of Object.values(B.ASSETS)) {
    assert.ok(a.price > 0 && a.mortgage === a.price / 2);
    if (a.kind === 'property') {
      assert.equal(a.rents.length, 5);
      assert.ok(a.rents.every((r, i) => i === 0 || r > a.rents[i - 1]), `${a.id} rent rises with each level`);
      assert.ok(a.devCost > 0 && B.DISTRICTS[a.district]);
    }
  }
  // cheap districts return more per crown invested than premium ones
  const roi = id => B.ASSETS[id].rents[4] / (B.ASSETS[id].price + 4 * B.ASSETS[id].devCost);
  assert.ok(roi('netmakers') > roi('meridian'));
});

test('decks only contain cards that fit the board', () => {
  const quick = B.getBoard('quick');
  for (const deck of ['bulletin', 'opportunity']) {
    const ids = deckFor(deck, quick);
    assert.ok(ids.length >= 8);
    assert.ok(!ids.includes('rentReview'), 'Midtown is not on the quick board');
  }
  for (const c of Object.values(CARDS)) assert.ok(c.title && c.text && typeof c.apply === 'function');
});

test('createGame validates players and options', () => {
  assert.throws(() => createGame({ players: [{ name: 'Solo' }] }));
  const st = createGame({ seed: 1, players: [{ name: '  Ada ', token: 'gull' }, { name: '', token: 'gull', kind: 'ai', personality: 'nope' }, { name: 'C' }] });
  assert.equal(st.players[0].name, 'Ada');
  assert.equal(st.players[1].name, 'Player 2');
  assert.notEqual(st.players[1].token, 'gull', 'tokens stay unique');
  assert.ok(E.PERSONALITY_IDS.includes(st.players[1].personality));
  assert.equal(st.players.every(p => p.cash === 1500), true);
  assert.equal(validateState(st), null);
  const q = game('quick');
  assert.equal(q.boardId, 'quick');
  assert.equal(q.options.auctions, false);
  assert.ok(q.options.wealthTarget > 0 && q.options.roundLimit > 0);
});

// ---- turns, dice and movement --------------------------------------------------------------

test('turn sequence: one roll, one landing, no double moves, no early end', () => {
  let st = game();
  bad(st, { type: 'END_TURN', player: 'p1' }, /Roll the dice first/);
  bad(st, { type: 'ROLL', player: 'p2' });
  st = rollTo(st, 4); // Harbor Levy: pays tax, no decision
  assert.equal(st.players[0].position, 4);
  assert.equal(st.turn.phase, 'postRoll');
  bad(st, { type: 'ROLL', player: 'p1' }, /cannot roll/);
  const landings = st.log.filter(l => /lands on/.test(l.text)).length;
  st = ok(st, { type: 'END_TURN', player: 'p1' });
  assert.equal(st.log.filter(l => /lands on/.test(l.text)).length, landings, 'ending the turn does not re-resolve the space');
  assert.equal(st.turn.player, 'p2');
  assert.equal(st.turn.phase, 'preRoll');
});

test('movement wraps around the board and pays the circuit bonus once', () => {
  let st = game();
  st.players[0].position = 36;
  const cash = st.players[0].cash;
  st = rollTo(st, 6); // 36 -> 2 (City Bulletin)
  assert.equal(st.players[0].position, 2);
  assert.deepEqual(st.fx.moves[0].path, [37, 38, 39, 0, 1, 2]);
  const bonus = st.ledger.filter(l => l.reason.startsWith('Circuit bonus')).length;
  assert.equal(bonus, 1);
  assert.ok(st.players[0].cash >= cash + 200 - 200, 'bonus credited (a card may also have moved money)');
  // landing exactly on Launch Pier also pays
  let s2 = game();
  s2.players[0].position = 34;
  s2 = rollTo(s2, 6);
  assert.equal(s2.players[0].position, 0);
  assert.equal(s2.players[0].cash, 1700);
});

test('every space on both boards can be landed on without breaking the rules', () => {
  for (const mode of ['classic', 'quick']) {
    const board = B.getBoard(mode === 'quick' ? 'quick' : 'full');
    for (let target = 0; target < board.size; target++) {
      for (const total of [5, 8]) {
        let st = game(mode);
        st.players[0].position = (target - total + board.size) % board.size;
        st = rollTo(st, total);
        assert.equal(validateState(st), null);
        assert.ok(['postRoll', 'buy', 'debt', 'preRoll'].includes(st.turn.phase), `${mode} space ${target}: ${st.turn.phase}`);
      }
    }
  }
});

test('doubles give another roll; a third double in one turn means the Impound Lot', () => {
  let st = game();
  forceDice(st, 1, 1); st = ok(st, { type: 'ROLL', player: 'p1' }); // to 2
  if (st.turn.phase === 'buy') st = ok(st, { type: 'DECLINE', player: 'p1' });
  while (st.turn.phase === 'auction') st = ok(st, { type: 'BID', player: R.currentActor(st), amount: 0 });
  assert.equal(st.turn.phase, 'preRoll');
  assert.equal(st.turn.extraRoll, true);
  bad(st, { type: 'END_TURN', player: 'p1' }, /roll again/);
  st.players[0].position = 10; // keep the test away from card spaces
  forceDice(st, 2, 2); st = ok(st, { type: 'ROLL', player: 'p1' });
  if (st.turn.phase === 'buy') st = ok(st, { type: 'DECLINE', player: 'p1' });
  while (st.turn.phase === 'auction') st = ok(st, { type: 'BID', player: R.currentActor(st), amount: 0 });
  forceDice(st, 3, 3); st = ok(st, { type: 'ROLL', player: 'p1' });
  assert.equal(st.players[0].position, 10);
  assert.equal(st.players[0].impounded, true);
  assert.equal(st.turn.phase, 'postRoll');
  bad(st, { type: 'ROLL', player: 'p1' });
});

test('Impound Lot: pay, waiver, doubles, and the third failed attempt', () => {
  let st = game();
  st.players[0].position = 25;
  st = rollTo(st, 5); // Tow Zone
  assert.equal(st.players[0].impounded, true);
  assert.equal(st.players[0].position, 10);
  st.turn.player = 'p1'; st.turn.rolled = false; st.turn.phase = 'preRoll';
  // pay
  let a = ok(structuredClone(st), { type: 'PAY_IMPOUND', player: 'p1' });
  assert.equal(a.players[0].impounded, false);
  assert.equal(a.players[0].cash, st.players[0].cash - 50);
  // waiver
  bad(st, { type: 'USE_WAIVER', player: 'p1' }, /no Tow Waiver/);
  const w = structuredClone(st); w.players[0].waivers = 1;
  a = ok(w, { type: 'USE_WAIVER', player: 'p1' });
  assert.equal(a.players[0].waivers, 0);
  // failed roll stays
  forceDice(st, 1, 2);
  a = ok(st, { type: 'ROLL', player: 'p1' });
  assert.equal(a.players[0].position, 10);
  assert.equal(a.players[0].impoundTurns, 1);
  assert.equal(a.turn.phase, 'postRoll');
  // doubles drive out with no extra roll
  forceDice(st, 2, 2);
  a = ok(st, { type: 'ROLL', player: 'p1' });
  assert.equal(a.players[0].impounded, false);
  assert.equal(a.turn.extraRoll, false);
  // third miss: pay and move
  const third = structuredClone(st); third.players[0].impoundTurns = 2;
  forceDice(third, 1, 3);
  a = ok(third, { type: 'ROLL', player: 'p1' });
  assert.equal(a.players[0].impounded, false);
  assert.equal(a.players[0].position, 14);
  assert.ok(a.ledger.some(l => l.reason === 'Impound release fee'));
});

// ---- buying and auctions ---------------------------------------------------------------------

test('buying: price deducted atomically; short cash is refused without side effects', () => {
  let st = game();
  st = rollTo(st, 3); // Saltbox $60
  assert.equal(st.turn.phase, 'buy');
  bad(st, { type: 'END_TURN', player: 'p1' });
  bad(st, { type: 'BUY', player: 'p2' });
  const poor = structuredClone(st); poor.players[0].cash = 10;
  bad(poor, { type: 'BUY', player: 'p1' }, /costs \$60/);
  assert.equal(poor.props.saltbox.owner, null);
  st = ok(st, { type: 'BUY', player: 'p1' });
  assert.equal(st.props.saltbox.owner, 'p1');
  assert.equal(st.players[0].cash, 1440);
  assert.equal(st.turn.phase, 'postRoll');
  bad(st, { type: 'BUY', player: 'p1' }, /nothing to buy/);
});

test('declining starts a sealed-bid auction: highest bid wins, ties go to the earlier bidder', () => {
  let st = game();
  st = rollTo(st, 3);
  st = ok(st, { type: 'DECLINE', player: 'p1' });
  assert.equal(st.turn.phase, 'auction');
  assert.deepEqual(st.pending.order, ['p1', 'p2', 'p3']);
  bad(st, { type: 'BID', player: 'p2', amount: 50 }, /Waiting on P1/);
  bad(st, { type: 'BID', player: 'p1', amount: 5 }, /minimum/);
  bad(st, { type: 'BID', player: 'p1', amount: 99999 }, /cannot bid more/);
  bad(st, { type: 'BID', player: 'p1', amount: 12.5 });
  st = ok(st, { type: 'BID', player: 'p1', amount: 40 });
  // other players cannot see the sealed bid
  assert.deepEqual(publicView(st, 'p2').pending.bids, {});
  assert.deepEqual(publicView(st, 'p1').pending.bids, { p1: 40 });
  st = ok(st, { type: 'BID', player: 'p2', amount: 55 });
  st = ok(st, { type: 'BID', player: 'p3', amount: 55 });
  assert.equal(st.props.saltbox.owner, 'p2', 'tie goes to the earlier bid');
  assert.equal(st.players[1].cash, 1445);
  assert.equal(st.players[2].cash, 1500);
  assert.equal(st.turn.phase, 'postRoll');
  assert.equal(st.turn.player, 'p1');
});

test('an auction with no bids leaves the property with the City; Quick Match skips auctions', () => {
  let st = game();
  st = rollTo(st, 3);
  st = ok(st, { type: 'DECLINE', player: 'p1' });
  for (const p of ['p1', 'p2', 'p3']) st = ok(st, { type: 'BID', player: p, amount: 0 });
  assert.equal(st.props.saltbox.owner, null);
  let q = game('quick');
  q = rollTo(q, 3);
  assert.equal(q.turn.phase, 'buy');
  q = ok(q, { type: 'DECLINE', player: 'p1' });
  assert.equal(q.pending, null);
  assert.equal(q.turn.phase, 'postRoll');
});

// ---- rent ------------------------------------------------------------------------------------

test('rent: base, full-district double, development, mortgage, stations and services', () => {
  const st = game();
  own(st, 'p2', 'netmakers');
  assert.equal(R.rentFor(st, 'netmakers'), 4);
  own(st, 'p2', 'saltbox', 'crabhouse');
  assert.equal(R.rentFor(st, 'netmakers'), 8, 'complete district doubles base rent');
  st.props.netmakers.level = 2;
  assert.equal(R.rentFor(st, 'netmakers'), B.ASSETS.netmakers.rents[2]);
  st.props.saltbox.mortgaged = true;
  assert.equal(R.rentFor(st, 'saltbox'), 0);
  own(st, 'p3', 'ferry');
  assert.equal(R.rentFor(st, 'ferry'), 25);
  own(st, 'p3', 'rail', 'tram');
  assert.equal(R.rentFor(st, 'ferry'), 100);
  own(st, 'p3', 'power');
  assert.equal(R.rentFor(st, 'power', { dice: 9 }), 36);
  own(st, 'p3', 'fiber');
  assert.equal(R.rentFor(st, 'power', { dice: 9 }), 90);
});

test('landing on an opponent property charges rent once, to the owner', () => {
  let st = game();
  own(st, 'p2', 'saltbox', 'netmakers', 'crabhouse');
  st.props.saltbox.level = 1;
  st = rollTo(st, 3);
  const rent = B.ASSETS.saltbox.rents[1];
  assert.equal(st.players[0].cash, 1500 - rent);
  assert.equal(st.players[1].cash, 1500 + rent);
  assert.equal(st.ledger.filter(l => l.reason === 'Rent at Saltbox Warehouse').length, 1);
});

// ---- development and mortgages ---------------------------------------------------------------

test('development requires the district, builds evenly, caps at a tower, and costs money', () => {
  let st = game();
  own(st, 'p1', 'netmakers', 'saltbox');
  bad(st, { type: 'BUILD', player: 'p1', asset: 'netmakers' }, /Own all of Old Harbor/);
  own(st, 'p1', 'crabhouse');
  bad(st, { type: 'BUILD', player: 'p1', asset: 'ferry' }, /Only district properties/);
  bad(st, { type: 'BUILD', player: 'p2', asset: 'netmakers' });
  st = ok(st, { type: 'BUILD', player: 'p1', asset: 'netmakers' });
  assert.equal(st.props.netmakers.level, 1);
  assert.equal(st.players[0].cash, 1450);
  bad(st, { type: 'BUILD', player: 'p1', asset: 'netmakers' }, /Build evenly/);
  for (let level = 1; level <= 4; level++) for (const id of ['netmakers', 'saltbox', 'crabhouse']) {
    if (st.props[id].level < level) st = ok(st, { type: 'BUILD', player: 'p1', asset: id });
  }
  assert.ok(['netmakers', 'saltbox', 'crabhouse'].every(id => st.props[id].level === 4));
  bad(st, { type: 'BUILD', player: 'p1', asset: 'saltbox' }, /fully developed/);
  assert.equal(st.players[0].cash, 1500 - 12 * 50);
  // selling mirrors the even rule and refunds half
  bad(structuredClone({ ...st, props: { ...st.props, saltbox: { ...st.props.saltbox, level: 3 } } }), { type: 'SELL_BUILDING', player: 'p1', asset: 'saltbox' }, /Sell evenly/);
  st = ok(st, { type: 'SELL_BUILDING', player: 'p1', asset: 'saltbox' });
  assert.equal(st.players[0].cash, 1500 - 600 + 25);
  assert.ok(R.canBuild(st, 'p1', 'saltbox').ok);
  // short of money
  const poor = structuredClone(st); poor.players[0].cash = 10;
  bad(poor, { type: 'BUILD', player: 'p1', asset: 'saltbox' }, /costs \$50/);
});

test('development is only allowed on your own turn outside other decisions', () => {
  let st = game();
  own(st, 'p2', 'netmakers', 'saltbox', 'crabhouse');
  bad(st, { type: 'BUILD', player: 'p2', asset: 'netmakers' }, /cannot build right now/);
  st = rollTo(st, 3); // p1 must pay rent... p2 still cannot build mid-turn
  bad(st, { type: 'BUILD', player: 'p2', asset: 'netmakers' });
});

test('mortgages: blocked by buildings, pay half, repay at 110%, block building', () => {
  let st = game();
  own(st, 'p1', 'netmakers', 'saltbox', 'crabhouse');
  st = ok(st, { type: 'BUILD', player: 'p1', asset: 'netmakers' });
  bad(st, { type: 'MORTGAGE', player: 'p1', asset: 'saltbox' }, /Sell the buildings/);
  st = ok(st, { type: 'SELL_BUILDING', player: 'p1', asset: 'netmakers' });
  const cash = st.players[0].cash;
  st = ok(st, { type: 'MORTGAGE', player: 'p1', asset: 'saltbox' });
  assert.equal(st.players[0].cash, cash + 30);
  bad(st, { type: 'MORTGAGE', player: 'p1', asset: 'saltbox' }, /Already/);
  bad(st, { type: 'BUILD', player: 'p1', asset: 'netmakers' }, /Repay every loan/);
  st = ok(st, { type: 'UNMORTGAGE', player: 'p1', asset: 'saltbox' });
  assert.equal(st.players[0].cash, cash + 30 - 33);
  const w = R.netWorth(st, 'p1');
  assert.equal(w.total, w.cash + w.property + w.buildings - w.loans);
});

// ---- taxes, cards and temporary effects -------------------------------------------------------

test('taxes scale with development and are waived during a Tax Holiday', () => {
  let st = game();
  own(st, 'p1', 'ledger', 'clocktower', 'brassbell', 'exchange');
  st.props.ledger.level = 2; st.props.clocktower.level = 1;
  st = rollTo(st, 4);
  assert.equal(st.players[0].cash, 1500 - (100 + 30));
  let h = game();
  h.effects.push({ kind: 'taxHoliday', until: 1, label: 'Tax Holiday: free' });
  h = rollTo(h, 4);
  assert.equal(h.players[0].cash, 1500);
});

function drawSpecific(st, deck, cardId, pid = 'p1') {
  st.decks[deck].order = [cardId, ...st.decks[deck].order.filter(c => c !== cardId)];
  st.decks[deck].i = 0;
  st.players.find(p => p.id === pid).position = deck === 'bulletin' ? 0 : 5;
  return rollTo(st, 2);
}

test('event effects apply to rent and expire at the end of their last round', () => {
  let st = game();
  own(st, 'p2', 'netmakers');
  st = drawSpecific(st, 'bulletin', 'festival');
  assert.equal(st.effects.length, 1);
  assert.equal(st.effects[0].until, 2);
  assert.equal(R.rentFor(st, 'netmakers'), 6); // 4 x 1.5
  const players = ['p1', 'p2', 'p3'];
  const finishTurn = s => {
    if (s.turn.phase === 'buy') s = ok(s, { type: 'DECLINE', player: s.turn.player });
    while (s.turn.phase === 'auction') s = ok(s, { type: 'BID', player: R.currentActor(s), amount: 0 });
    while (s.turn.phase === 'debt') s = ok(s, { type: 'DECLARE_BANKRUPTCY', player: R.currentActor(s) });
    if (s.turn.phase === 'preRoll') { s.turn.extraRoll = false; s.turn.rolled = true; s.turn.phase = 'postRoll'; }
    return ok(s, { type: 'END_TURN', player: s.turn.player });
  };
  st = finishTurn(st);
  while (st.round === 1) st = finishTurn(st);
  assert.equal(st.round, 2);
  assert.equal(st.effects.length, 1, 'still active in round 2');
  for (let i = 0; i < players.length; i++) st = finishTurn(st);
  assert.equal(st.round, 3);
  assert.equal(st.effects.length, 0, 'expired when round 3 began');
  assert.ok(st.log.some(l => /Waterfront Festival has ended/.test(l.text)));
});

test('cards: inspection charges builders, grant rewards complete districts, gala collects from everyone', () => {
  let st = game();
  own(st, 'p2', 'netmakers', 'saltbox', 'crabhouse');
  st.props.netmakers.level = 2;
  st = drawSpecific(st, 'bulletin', 'inspection');
  assert.equal(st.players[1].cash, 1500 - 50);
  assert.equal(st.players[0].cash, 1500);
  let g = game();
  own(g, 'p3', 'netmakers', 'saltbox', 'crabhouse');
  g = drawSpecific(g, 'bulletin', 'grant');
  assert.equal(g.players[2].cash, 1650);
  let c = game();
  c = drawSpecific(c, 'opportunity', 'gala');
  assert.equal(c.players[0].cash, 1540);
  assert.equal(c.players[1].cash, 1480);
  let t = game();
  t = drawSpecific(t, 'opportunity', 'waiver');
  assert.equal(t.players[0].waivers, 1);
  let x = game();
  own(x, 'p2', 'ferry');
  x = drawSpecific(x, 'opportunity', 'express'); // from 7, next station is rail (15)
  assert.equal(x.players[0].position, 15);
  assert.equal(x.turn.phase, 'buy');
});

// ---- debt and bankruptcy --------------------------------------------------------------------

test('debts block play until paid; liquidation comes before bankruptcy', () => {
  let st = game();
  own(st, 'p2', 'netmakers', 'saltbox', 'crabhouse');
  st.props.saltbox.level = 4;
  own(st, 'p1', 'meridian');
  st.players[0].cash = 100;
  st = rollTo(st, 3);
  assert.equal(st.turn.phase, 'debt');
  const rent = B.ASSETS.saltbox.rents[4];
  assert.equal(st.debts[0].amount, rent);
  assert.equal(st.players[0].cash, 100, 'no partial payment');
  bad(st, { type: 'END_TURN', player: 'p1' });
  bad(st, { type: 'PAY_DEBT', player: 'p1' }, new RegExp(`owe \\$${rent}`));
  bad(st, { type: 'DECLARE_BANKRUPTCY', player: 'p1' }, /still raise/);
  bad(st, { type: 'BUILD', player: 'p1', asset: 'meridian' });
  st = ok(st, { type: 'MORTGAGE', player: 'p1', asset: 'meridian' });
  assert.equal(st.players[0].cash, 310);
  st = ok(st, { type: 'PAY_DEBT', player: 'p1' });
  assert.equal(st.players[0].cash, 310 - rent);
  assert.equal(st.players[1].cash, 1500 + rent);
  assert.equal(st.turn.phase, 'postRoll');
});

test('automatic liquidation keeps complete districts for last', () => {
  let st = game();
  own(st, 'p2', 'netmakers', 'saltbox', 'crabhouse');
  st.props.saltbox.level = 4;
  own(st, 'p1', 'ferry', 'ledger', 'clocktower', 'brassbell', 'exchange');
  st.players[0].cash = 50;
  st = rollTo(st, 3);
  st = ok(st, { type: 'LIQUIDATE', player: 'p1' });
  assert.ok(st.players[0].cash >= B.ASSETS.saltbox.rents[4]);
  assert.equal(st.props.ferry.mortgaged, true);
  assert.ok(['ledger', 'clocktower', 'brassbell', 'exchange'].filter(id => st.props[id].mortgaged).length <= 2);
});

test('bankruptcy hands everything to the creditor and removes the player from rotation', () => {
  let st = game();
  own(st, 'p2', 'netmakers', 'saltbox', 'crabhouse');
  st.props.saltbox.level = 4;
  own(st, 'p1', 'spice');
  st.props.spice.mortgaged = true;
  st.players[0].cash = 20;
  st.players[0].waivers = 1;
  st = rollTo(st, 3);
  st = ok(st, { type: 'DECLARE_BANKRUPTCY', player: 'p1' });
  assert.equal(st.players[0].bankrupt, true);
  assert.equal(st.props.spice.owner, 'p2');
  assert.equal(st.props.spice.mortgaged, true, 'the loan travels with the asset');
  assert.equal(st.players[1].cash, 1520);
  assert.equal(st.players[1].waivers, 1);
  assert.equal(st.turn.player, 'p2');
  assert.equal(st.debts.length, 0);
  // play continues without p1
  st = rollTo(st, 5);
  if (st.turn.phase === 'buy') st = ok(st, { type: 'DECLINE', player: 'p2' });
  while (st.turn.phase === 'auction') {
    assert.notEqual(R.currentActor(st), 'p1');
    st = ok(st, { type: 'BID', player: R.currentActor(st), amount: 0 });
  }
  while (st.turn.phase === 'debt') st = ok(st, { type: 'LIQUIDATE', player: R.currentActor(st) });
  if (st.turn.phase === 'postRoll') st = ok(st, { type: 'END_TURN', player: 'p2' });
  assert.equal(st.turn.player, 'p3');
  assert.equal(validateState(st), null);
});

test('bankruptcy to the City returns properties to the market; last player standing wins', () => {
  let st = game('classic', 2);
  own(st, 'p1', 'spice', 'kettle');
  st.props.kettle.mortgaged = true; st.props.spice.mortgaged = true;
  st.players[0].cash = 10;
  st.players[0].position = 2;
  st = rollTo(st, 2); // Harbor Levy $100
  assert.equal(st.turn.phase, 'debt');
  st = ok(st, { type: 'DECLARE_BANKRUPTCY', player: 'p1' });
  assert.equal(st.props.spice.owner, null);
  assert.equal(st.props.spice.mortgaged, false);
  assert.equal(st.finished, true);
  assert.equal(st.endReason, 'last');
  assert.equal(st.results[0].pid, 'p2');
  assert.equal(st.results[1].bankrupt, true);
  bad(st, { type: 'ROLL', player: 'p2' }, /over/);
});

// ---- trading --------------------------------------------------------------------------------

test('trades validate ownership, cash and buildings, then swap everything at once', () => {
  let st = game();
  own(st, 'p1', 'netmakers', 'saltbox');
  own(st, 'p2', 'crabhouse', 'spice');
  const offer = { from: 'p1', to: 'p2', give: { cash: 100, assets: ['spice'] }, get: { assets: ['crabhouse'] } };
  bad(st, { type: 'PROPOSE_TRADE', player: 'p1', offer }, /does not own Spice Lane/);
  bad(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { ...offer, give: { cash: 5000, assets: [] } } }, /does not have/);
  bad(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { ...offer, give: { cash: -5, assets: [] } } });
  bad(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { ...offer, give: { assets: ['netmakers', 'netmakers'] } } }, /twice/);
  bad(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { from: 'p1', to: 'p2', give: {}, get: {} } }, /empty/);
  bad(st, { type: 'PROPOSE_TRADE', player: 'p2', offer: { ...offer, from: 'p2', to: 'p1' } }, /own turn/);
  const good = { from: 'p1', to: 'p2', give: { cash: 100, assets: ['netmakers'] }, get: { assets: ['crabhouse'] } };
  st = ok(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: good });
  assert.equal(R.currentActor(st), 'p2');
  bad(st, { type: 'ROLL', player: 'p1' });
  bad(st, { type: 'ACCEPT_TRADE', player: 'p1' });
  st = ok(st, { type: 'ACCEPT_TRADE', player: 'p2' });
  assert.equal(st.props.netmakers.owner, 'p2');
  assert.equal(st.props.crabhouse.owner, 'p1');
  assert.equal(st.players[0].cash, 1400);
  assert.equal(st.players[1].cash, 1600);
  assert.equal(st.trade, null);
  // built-up districts cannot change hands
  let b = game();
  own(b, 'p1', 'netmakers', 'saltbox', 'crabhouse');
  b.props.netmakers.level = 1;
  bad(b, { type: 'PROPOSE_TRADE', player: 'p1', offer: { from: 'p1', to: 'p2', give: { assets: ['saltbox'] }, get: { cash: 10 } } }, /buildings/);
});

test('counteroffers flip the parties, are capped, and rejected offers are remembered', () => {
  let st = game();
  own(st, 'p2', 'spice');
  st = ok(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { from: 'p1', to: 'p2', give: { cash: 80 }, get: { assets: ['spice'] } } });
  bad(st, { type: 'COUNTER_TRADE', player: 'p2', offer: { from: 'p2', to: 'p3', give: { assets: ['spice'] }, get: { cash: 150 } } }, /go back/);
  const counter = n => ({ from: n % 2 ? 'p2' : 'p1', to: n % 2 ? 'p1' : 'p2', give: n % 2 ? { assets: ['spice'] } : { cash: 100 + n }, get: n % 2 ? { cash: 150 } : { assets: ['spice'] } });
  st = ok(st, { type: 'COUNTER_TRADE', player: 'p2', offer: counter(1) });
  assert.equal(R.currentActor(st), 'p1');
  st = ok(st, { type: 'COUNTER_TRADE', player: 'p1', offer: counter(2) });
  st = ok(st, { type: 'COUNTER_TRADE', player: 'p2', offer: counter(3) });
  bad(st, { type: 'COUNTER_TRADE', player: 'p1', offer: counter(4) }, /enough/);
  st = ok(st, { type: 'REJECT_TRADE', player: 'p1' });
  assert.equal(st.trade, null);
  assert.equal(Object.keys(st.memory.rejected).length, 1);
  assert.equal(st.props.spice.owner, 'p2');
});

test('a stale offer is re-checked at acceptance and falls through cleanly', () => {
  let st = game();
  own(st, 'p2', 'spice');
  st = ok(st, { type: 'PROPOSE_TRADE', player: 'p1', offer: { from: 'p1', to: 'p2', give: { cash: 1400 }, get: { assets: ['spice'] } } });
  st.players[0].cash = 100; // simulate the proposer's cash vanishing
  st = ok(st, { type: 'ACCEPT_TRADE', player: 'p2' });
  assert.equal(st.props.spice.owner, 'p2');
  assert.equal(st.players[1].cash, 1500);
  assert.ok(st.log.some(l => /fell through/.test(l.text)));
});

// ---- AI ------------------------------------------------------------------------------------

test('AI: public view hides the dice generator, card order and rival bids', () => {
  const st = game();
  const v = publicView(st, 'p2');
  assert.equal(v.rng, undefined);
  assert.equal(v.decks.bulletin.order, undefined);
  assert.ok(v.decks.bulletin.remaining > 0);
});

test('AI: trade evaluation rewards completing districts and refuses lopsided deals', () => {
  const st = createGame({ seed: 3, players: [{ name: 'H' }, { name: 'C', kind: 'ai', personality: 'collector' }, { name: 'F', kind: 'ai', personality: 'financier' }] });
  own(st, 'p2', 'netmakers', 'saltbox');
  own(st, 'p1', 'crabhouse', 'spice');
  const complete = { from: 'p1', to: 'p2', give: { assets: ['crabhouse'] }, get: { cash: 150 } };
  const silly = { from: 'p1', to: 'p2', give: { assets: ['spice'] }, get: { cash: 900 } };
  assert.ok(AI.evaluateTrade(publicView(st, 'p2'), 'p2', complete) > 0, 'the Collector wants the last Old Harbor lot');
  assert.ok(AI.evaluateTrade(publicView(st, 'p2'), 'p2', silly) < 0, 'paying $900 for a $100 lot is refused');
  // giving a rival the last piece of their set needs a big premium
  own(st, 'p3', 'kettle', 'lantern', 'bazaar');
  const handOver = { from: 'p1', to: 'p3', give: { cash: 100 }, get: { assets: [] } };
  st.props.spice.owner = 'p2';
  const hurt = { from: 'p3', to: 'p2', give: { cash: 120 }, get: { assets: ['spice'] } };
  assert.ok(AI.evaluateTrade(publicView(st, 'p2'), 'p2', hurt) < 0);
  assert.ok(AI.evaluateTrade(publicView(st, 'p3'), 'p3', handOver) > 0);
});

test('AI: will not buy what it cannot afford and proposes buyouts for blocked districts', () => {
  let st = createGame({ seed: 4, players: [{ name: 'A', kind: 'ai', personality: 'collector' }, { name: 'B' }] });
  st.players[0].cash = 70;
  st = rollTo(st, 3);
  const a = AI.decide(publicView(st, 'p1'), 'p1');
  assert.equal(a.type, 'DECLINE');
  const t = createGame({ seed: 4, players: [{ name: 'A', kind: 'ai', personality: 'collector' }, { name: 'B' }] });
  own(t, 'p1', 'netmakers', 'saltbox');
  own(t, 'p2', 'crabhouse');
  t.turn.rolled = true; t.turn.phase = 'postRoll';
  const prop = AI.decide(publicView(t, 'p1'), 'p1');
  assert.equal(prop.type, 'PROPOSE_TRADE');
  assert.deepEqual(prop.offer.get.assets, ['crabhouse']);
  assert.ok(prop.offer.give.cash >= 80);
  assert.ok(dispatch(t, prop).ok);
});

test('AI: full matches of every personality only ever take legal actions', () => {
  const modes = ['classic', 'quick', 'sandbox'];
  let finished = 0;
  for (let g = 0; g < 24; g++) {
    const mode = modes[g % 3];
    let st = createGame({ mode, seed: 1000 + g, players: E.PERSONALITY_IDS.slice(0, 2 + (g % 3)).map(p => ({ name: p, kind: 'ai', personality: p })) });
    let steps = 0;
    while (!st.finished && steps < 15000 && st.round <= 35) {
      const pid = R.currentActor(st);
      const action = AI.decide(publicView(st, pid), pid);
      assert.ok(action, `AI returned no action in phase ${st.turn.phase}`);
      const r = dispatch(st, action);
      assert.ok(r.ok, `game ${g}: illegal ${action.type}: ${r.error}`);
      st = r.state;
      assert.ok(st.turn.actions < 80, 'a turn never runs away');
      steps++;
    }
    assert.equal(validateState(st), null);
    for (const p of st.players) assert.ok(p.cash >= 0 && Number.isInteger(p.cash));
    if (st.finished) finished++;
  }
  assert.ok(finished >= 14, 'competitive matches reach their victory condition');
});

// ---- victory and wealth --------------------------------------------------------------------

test('round limit ends the match and ranks players by net worth', () => {
  let st = game('classic', 2, { options: { roundLimit: 1 } });
  own(st, 'p2', 'meridian');
  st.players[1].cash = 1200;
  st = rollTo(st, 4);
  st = ok(st, { type: 'END_TURN', player: 'p1' });
  st = rollTo(st, 4);
  st = ok(st, { type: 'END_TURN', player: 'p2' });
  assert.equal(st.finished, true);
  assert.equal(st.endReason, 'rounds');
  assert.equal(st.round, 1, 'no phantom round after the limit');
  const [first, second] = st.results;
  assert.ok(first.wealth.total >= second.wealth.total);
  assert.equal(first.wealth.total, first.wealth.cash + first.wealth.property + first.wealth.buildings - first.wealth.loans - first.wealth.debts);
});

test('Quick Match ends when someone reaches the net worth target; Sandbox never ends', () => {
  let st = game('quick');
  st.players[1].cash = 5000;
  st = rollTo(st, 7); // Impound Lot, just passing: nothing pending
  assert.equal(st.finished, true);
  assert.equal(st.endReason, 'target');
  assert.equal(st.results[0].pid, 'p2');
  let sb = game('sandbox');
  sb = ok(sb, { type: 'SANDBOX_GRANT', player: 'p1', target: 'p2', amount: 50000 - 45000 });
  assert.equal(sb.finished, false);
  bad(game(), { type: 'SANDBOX_GRANT', player: 'p1', target: 'p2', amount: 100 }, /Sandbox/);
  bad(sb, { type: 'SANDBOX_GRANT', player: 'p1', target: 'p2', amount: -99999 });
  sb = ok(sb, { type: 'SANDBOX_MOVE', player: 'p1', space: 39 });
  assert.equal(sb.players[0].position, 39);
  assert.equal(sb.turn.phase, 'buy');
});

test('net worth separates spendable cash from total wealth', () => {
  const st = game();
  own(st, 'p1', 'netmakers', 'saltbox', 'crabhouse', 'ferry');
  st.props.netmakers.level = 2;
  st.props.ferry.mortgaged = true;
  const w = R.netWorth(st, 'p1');
  assert.equal(w.cash, 1500);
  assert.equal(w.property, 60 + 60 + 80 + 200);
  assert.equal(w.buildings, 100);
  assert.equal(w.loans, 110);
  assert.equal(w.total, 1500 + 400 + 100 - 110);
  assert.equal(R.liquidationValue(st, 'p1'), 1500 + 50 + 30 + 30 + 40);
});

// ---- determinism and saving --------------------------------------------------------------------

function playScript(seed, n) {
  let st = createGame({ seed, players: [{ name: 'A', kind: 'ai', personality: 'developer' }, { name: 'B', kind: 'ai', personality: 'financier' }] });
  const states = [];
  for (let i = 0; i < n && !st.finished; i++) {
    const pid = R.currentActor(st);
    st = dispatch(st, AI.decide(publicView(st, pid), pid)).state;
    states.push(st);
  }
  return states;
}

test('the same seed and the same actions give the same game', () => {
  const a = playScript(77, 300), b = playScript(77, 300);
  assert.deepEqual(a.at(-1), b.at(-1));
  assert.notDeepEqual(playScript(78, 300).at(-1).players, a.at(-1).players);
});

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

test('saves restore mid-decision states exactly and continue identically', () => {
  globalThis.localStorage = memoryStorage();
  const states = playScript(91, 600);
  const phases = new Set();
  for (const st of states) {
    if (st.finished) continue;
    const key = st.trade ? 'trade' : st.turn.phase;
    if (phases.has(key)) continue;
    phases.add(key);
    assert.ok(S.saveGame(st));
    const { state, error } = S.loadGame();
    assert.equal(error, undefined);
    const { fx, ...a } = state, { fx: fx2, ...b } = st;
    assert.deepEqual(a, b, `round-trip in ${key}`);
    // the restored game continues exactly as the original would
    const pid = R.currentActor(st);
    const act = AI.decide(publicView(st, pid), pid);
    const x = dispatch(st, act).state, y = dispatch(state, act).state;
    assert.deepEqual({ ...x, fx: null }, { ...y, fx: null });
  }
  for (const k of ['preRoll', 'postRoll', 'buy', 'auction']) assert.ok(phases.has(k), `covered ${k}`);
  delete globalThis.localStorage;
});

test('bad saves are refused with a reason instead of crashing', () => {
  assert.match(S.parseSave('{nope').error, /corrupted/);
  assert.match(S.parseSave(JSON.stringify({ format: 99 })).error, /format/);
  const st = game();
  const env = s => JSON.stringify({ format: 1, version: 1, state: s });
  assert.match(S.parseSave(JSON.stringify({ format: 1, version: 7, state: st })).error, /incompatible/);
  const neg = structuredClone(st); neg.players[0].cash = -5;
  assert.match(S.parseSave(env(neg)).error, /bad cash/);
  const ghost = structuredClone(st); ghost.props.netmakers.owner = 'p9';
  assert.match(S.parseSave(env(ghost)).error, /bad owner/);
  const tall = structuredClone(st); tall.props.ferry.level = 2;
  assert.match(S.parseSave(env(tall)).error, /building/);
  const lost = structuredClone(st); delete lost.rng;
  assert.match(S.parseSave(env(lost)).error, /random/);
  assert.ok(S.parseSave(env(st)).state);
});

test('settings load with defaults and ignore junk values', () => {
  globalThis.localStorage = memoryStorage();
  localStorage.setItem(S.SETTINGS_KEY, JSON.stringify({ sound: 'loud', theme: 'day', volume: 0.3 }));
  const s = S.loadSettings();
  assert.equal(s.sound, true);
  assert.equal(s.theme, 'day');
  assert.equal(s.volume, 0.3);
  localStorage.setItem(S.SETTINGS_KEY, '{broken');
  assert.deepEqual(S.loadSettings(), S.DEFAULT_SETTINGS);
  delete globalThis.localStorage;
});

test('index.html versions every stylesheet and module with one release number', () => {
  const html = fs.readFileSync(new URL('../index.html', dir), 'utf8');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const files = [...fs.readdirSync(dir).filter(f => f.endsWith('.js')), ...fs.readdirSync(new URL('ui/', dir)).filter(f => f.endsWith('.js')).map(f => `ui/${f}`)];
  const versions = new Set();
  for (const f of files) {
    const target = map[`./js/${f}`];
    assert.ok(target, `${f} is missing from the import map`);
    versions.add(target.split('?v=')[1]);
  }
  for (const m of html.matchAll(/(?:href|src)="(?:css|js)\/[\w/.]+\?v=([\w.]+)"/g)) versions.add(m[1]);
  assert.equal(versions.size, 1, `one version everywhere, found ${[...versions]}`);
});

test('tutorial: the scripted match reaches every step with only the allowed actions', async () => {
  const T = await import(new URL('tutorial.js', dir));
  let st = createGame(T.TUTORIAL_GAME);
  assert.equal(st.props.netmakers.owner, 'p1', 'head start');
  assert.equal(st.decks.bulletin.order[0], 'festival');
  let step = 0, guard = 0;
  const seen = new Set();
  const human = s => {
    const S = T.STEPS[step];
    const options = {
      ROLL: { type: 'ROLL' }, BUY: { type: 'BUY' }, DECLINE: { type: 'DECLINE' }, BID: { type: 'BID', amount: 0 },
      END_TURN: { type: 'END_TURN' }, PAY_IMPOUND: { type: 'PAY_IMPOUND' },
      BUILD: { type: 'BUILD', asset: ['netmakers', 'saltbox', 'crabhouse'].find(id => R.canBuild(s, 'p1', id).ok) },
    };
    // the first allowed action that is legal, building only when the step is about building
    const order = S.title.startsWith('Build a') ? ['BUILD'] : (S.allow || []).filter(t => t !== 'BUILD');
    for (const t of order) {
      const a = { ...options[t], player: 'p1' };
      if (options[t] && T.actionAllowed(S, a) && dispatch(s, a).ok) return a;
    }
    return null;
  };
  const history = [];
  while (step < T.STEPS.length - 1 && guard++ < 500) {
    history.push(st);
    step = T.settleStep(st, step);
    seen.add(step);
    const S = T.STEPS[step];
    if (S.next) { assert.equal(T.actionAllowed(S, { type: 'ROLL' }), false, 'reading steps hold the game'); step++; continue; }
    const pid = R.currentActor(st);
    const a = pid === 'p1' ? human(st) : AI.decide(publicView(st, pid), pid);
    assert.ok(a, `step ${step} (${S.title}) has no way forward in phase ${st.turn.phase}`);
    st = ok(st, a);
  }
  assert.equal(step, T.STEPS.length - 1, 'reached the finale');
  // the lessons actually happened
  assert.ok(['netmakers', 'saltbox', 'crabhouse'].every(id => st.props[id].owner === 'p1'));
  assert.ok(st.ledger.some(l => l.reason === 'Rent at Spice Lane' && l.from === 'p1'));
  assert.ok(st.log.some(l => /Waterfront Festival/.test(l.text)));
  assert.ok(st.log.some(l => /towed to the Impound Lot/.test(l.text)));
  assert.ok(st.log.some(l => /Sealed bids for Lantern Street/.test(l.text)));
  assert.ok(st.ledger.some(l => l.reason === 'Impound release fee'));
  assert.equal(validateState(st), null);
  // reload at any moment: resuming from the start lands on a step the player can complete
  for (const h of history) {
    if (R.currentActor(h) !== 'p1') continue;
    step = T.settleStep(h, 0);
    const S = T.STEPS[step];
    assert.ok(S.next || S.finale || human(h), `turn ${h.turnNumber} ${h.turn.phase}: resumed on "${S.title}" with no legal move`);
  }
  // a resumed tutorial skips steps whose goal is already met, and no further
  const fresh = createGame(T.TUTORIAL_GAME);
  assert.equal(T.settleStep(fresh, 4), 4);
  const bought = ok(ok(fresh, { type: 'ROLL', player: 'p1' }), { type: 'BUY', player: 'p1' });
  assert.equal(T.settleStep(bought, 4), 6, 'roll and buy already done: on to End turn');
});
