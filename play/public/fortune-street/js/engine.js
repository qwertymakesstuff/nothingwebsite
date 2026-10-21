// The rules engine: the only code that changes a game state.
//
// dispatch(state, action) validates the action against the current state, applies it to a
// copy and returns { ok, state, error }. If validation fails or anything throws, the original
// state comes back untouched, so every action (a purchase, a trade, a bankruptcy) either
// happens completely or not at all. UI buttons and AI players both go through dispatch.
//
// Turn flow (state.turn.phase):
//   preRoll  -> the active player may manage assets, trade, or ROLL
//   buy      -> they landed on an unowned asset: BUY or DECLINE (DECLINE starts an auction)
//   auction  -> each player places one sealed BID in turn; the highest bid wins
//   debt     -> someone owes more than their cash: sell, mortgage, PAY_DEBT or go bankrupt
//   postRoll -> manage assets, trade, END_TURN
// Doubles grant another roll (back to preRoll); a third double in one turn is "speeding"
// and sends the player to the Impound Lot, so a turn has at most three rolls.
import {
  getBoard, ASSETS, DISTRICTS, START_CASH, CIRCUIT_BONUS, IMPOUND_FEE, MIN_BID, TOKENS, SEAT_COLORS,
  LEVELS, spaceName, BOARD_IDS, MAX_LEVEL,
} from './board.js';
import * as R from './rules.js';
import { CARDS, deckFor, DECK_NAMES } from './cards.js';
import { rollDie, shuffle, makeSeed } from './rng.js';

export const STATE_VERSION = 1;
const LOG_LIMIT = 250;
const LEDGER_LIMIT = 400;

export const MODES = {
  classic: {
    name: 'Classic Meridian', board: 'full',
    options: { startCash: START_CASH, roundLimit: 30, wealthTarget: 0, auctions: true },
  },
  local: {
    name: 'Local Pass-and-Play', board: 'full',
    options: { startCash: START_CASH, roundLimit: 30, wealthTarget: 0, auctions: true },
  },
  quick: {
    name: 'Quick Match', board: 'quick',
    options: { startCash: 1200, roundLimit: 15, wealthTarget: 2500, auctions: false },
  },
  sandbox: {
    name: 'Sandbox', board: 'full', sandbox: true,
    options: { startCash: 5000, roundLimit: 0, wealthTarget: 0, auctions: true },
  },
  // the guided tutorial: a normal match whose first rolls and cards are scripted (cfg.script)
  tutorial: {
    name: 'Tutorial', board: 'full', tutorial: true,
    options: { startCash: START_CASH, roundLimit: 0, wealthTarget: 0, auctions: true },
  },
};
export const PERSONALITY_IDS = ['collector', 'developer', 'financier', 'opportunist'];

// ---- creating a game ----------------------------------------------------------------

const clampInt = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function createGame(cfg = {}) {
  const mode = MODES[cfg.mode] ? cfg.mode : 'classic';
  const m = MODES[mode];
  const o = { ...m.options, ...(cfg.options || {}) };
  const options = {
    startCash: clampInt(o.startCash, 200, 20000, m.options.startCash),
    roundLimit: clampInt(o.roundLimit, 0, 200, m.options.roundLimit),
    wealthTarget: clampInt(o.wealthTarget, 0, 100000, m.options.wealthTarget),
    auctions: !!o.auctions,
  };
  const seats = Array.isArray(cfg.players) ? cfg.players.slice(0, 4) : [];
  if (seats.length < 2) throw new Error('A match needs 2 to 4 players.');
  const usedTokens = new Set();
  const players = seats.map((s, i) => {
    let token = TOKENS.some(t => t.id === s.token) && !usedTokens.has(s.token) ? s.token : null;
    token ||= TOKENS.find(t => !usedTokens.has(t.id)).id;
    usedTokens.add(token);
    const kind = s.kind === 'ai' ? 'ai' : 'human';
    return {
      id: `p${i + 1}`,
      name: String(s.name || '').trim().slice(0, 18) || `Player ${i + 1}`,
      color: SEAT_COLORS[i], token, kind,
      personality: kind === 'ai' ? (PERSONALITY_IDS.includes(s.personality) ? s.personality : PERSONALITY_IDS[i % 4]) : null,
      cash: options.startCash, position: 0,
      bankrupt: false, impounded: false, impoundTurns: 0, waivers: 0,
    };
  });
  const board = getBoard(m.board);
  const seed = Number.isInteger(cfg.seed) ? cfg.seed >>> 0 : makeSeed();
  const st = {
    version: STATE_VERSION, mode, boardId: m.board, options, sandbox: !!m.sandbox,
    players, props: {},
    turn: newTurn(players[0].id),
    pending: null, debts: [], trade: null, effects: [],
    decks: {}, round: 1, turnNumber: 1,
    rng: { s: seed },
    log: [], ledger: [], seq: 0, n: 0,
    fx: emptyFx(),
    finished: false, endReason: null, results: null, eliminated: [],
    memory: { rejected: {} },
  };
  for (const id of board.ownables) st.props[id] = { owner: null, level: 0, mortgaged: false };
  for (const deck of ['bulletin', 'opportunity']) st.decks[deck] = { order: shuffle(st.rng, deckFor(deck, board)), i: 0 };
  if (m.tutorial) applyScript(st, cfg.script || {});
  log(st, `Welcome to ${board.name}. ${players.map(p => p.name).join(', ')} each start with $${options.startCash}.`, 'info');
  log(st, `${players[0].name} goes first.`, 'turn');
  settle(st);
  return st;
}

// Tutorial setup: dice queued per player (used before the random generator), cards moved to
// the top of their decks, and assets owned from the start. Only the tutorial mode reads this.
function applyScript(st, script) {
  const ids = new Set(st.players.map(p => p.id));
  st.script = { dice: {} };
  for (const [pid, rolls] of Object.entries(script.dice || {})) {
    if (!ids.has(pid)) continue;
    st.script.dice[pid] = rolls.filter(r => Array.isArray(r) && r.length === 2 && r.every(n => Number.isInteger(n) && n >= 1 && n <= 6));
  }
  for (const [deck, first] of Object.entries(script.topCards || {})) {
    const d = st.decks[deck];
    if (!d) continue;
    const want = [].concat(first).filter(c => d.order.includes(c));
    d.order = [...want, ...d.order.filter(c => !want.includes(c))];
  }
  for (const [pid, assets] of Object.entries(script.owned || {})) {
    if (!ids.has(pid)) continue;
    for (const id of assets) if (st.props[id] && !st.props[id].owner) st.props[id].owner = pid;
  }
}

function newTurn(pid) {
  return { player: pid, phase: 'preRoll', rolled: false, extraRoll: false, doubles: 0, dice: null, trades: 0, actions: 0 };
}
const emptyFx = () => ({ dice: null, moves: [], cards: [], sounds: [] });

// ---- dispatch -----------------------------------------------------------------------

export function dispatch(state, action) {
  if (!action || typeof action !== 'object' || !HANDLERS[action.type]) {
    return { ok: false, error: 'Unknown action.', state };
  }
  if (state.finished && !action.type.startsWith('SANDBOX')) return { ok: false, error: 'The match is over.', state };
  const st = structuredClone(state);
  st.fx = emptyFx();
  try {
    const err = HANDLERS[action.type](st, action);
    if (err) return { ok: false, error: err, state };
    st.seq++;
    st.turn.actions++;
    checkEnd(st);
    settle(st);
    return { ok: true, state: st };
  } catch (e) {
    return { ok: false, error: `Rules error: ${e.message}`, state };
  }
}

// convenience for tests and the AI: is this action legal right now?
export const isLegal = (state, action) => dispatch(state, action).ok;

const P = (st, pid) => R.player(st, pid);
const N = (st, pid) => R.playerName(st, pid);

function log(st, text, tone = 'info') {
  st.log.push({ n: ++st.n, round: st.round, text, tone });
  if (st.log.length > LOG_LIMIT) st.log.splice(0, st.log.length - LOG_LIMIT);
}

function ledger(st, from, to, amount, reason) {
  st.ledger.push({ n: ++st.n, round: st.round, from, to, amount, reason });
  if (st.ledger.length > LEDGER_LIMIT) st.ledger.splice(0, st.ledger.length - LEDGER_LIMIT);
}

function settle(st) {
  const t = st.turn;
  if (st.finished) t.phase = 'gameOver';
  else if (st.debts.length) t.phase = 'debt';
  else if (st.pending) t.phase = st.pending.kind;
  else t.phase = !t.rolled || t.extraRoll ? 'preRoll' : 'postRoll';
}

function mustBeActor(st, pid) {
  if (R.currentActor(st) !== pid) {
    const who = R.currentActor(st);
    return `Waiting on ${who ? N(st, who) : 'nobody'}, not ${N(st, pid)}.`;
  }
  return null;
}

// ---- money --------------------------------------------------------------------------

function credit(st, pid, amount, reason) {
  amount = Math.round(amount);
  if (amount <= 0) return;
  P(st, pid).cash += amount;
  ledger(st, 'bank', pid, amount, reason);
  st.fx.sounds.push('coin');
}

// Moves money from `from` (a player) to `to` (a player or 'bank'). If the payer is short,
// nothing moves and the full amount becomes a debt they must settle before play continues.
function charge(st, from, to, amount, reason) {
  amount = Math.round(amount);
  if (amount <= 0) return true;
  if (from === 'bank') { credit(st, to, amount, reason); return true; }
  const payer = P(st, from);
  if (payer.cash >= amount) {
    transfer(st, from, to, amount, reason);
    return true;
  }
  st.debts.push({ debtor: from, creditor: to, amount, reason });
  log(st, `${payer.name} owes $${amount} to ${N(st, to)} (${reason}) but has only $${payer.cash}. They must raise the money or go bankrupt.`, 'warn');
  return false;
}

function transfer(st, from, to, amount, reason) {
  P(st, from).cash -= amount;
  if (to !== 'bank') P(st, to).cash += amount;
  ledger(st, from, to, amount, reason);
  st.fx.sounds.push('pay');
}

// ---- movement -----------------------------------------------------------------------

function moveBy(st, pid, steps) {
  const board = R.boardOf(st);
  const p = P(st, pid);
  const path = [];
  const dir = Math.sign(steps);
  for (let k = 0; k < Math.abs(steps); k++) {
    p.position = (p.position + dir + board.size) % board.size;
    path.push(p.position);
    if (dir > 0 && p.position === 0) {
      credit(st, pid, CIRCUIT_BONUS, 'Circuit bonus at Launch Pier');
      log(st, `${p.name} passes Launch Pier and collects $${CIRCUIT_BONUS}.`, 'good');
    }
  }
  st.fx.moves.push({ player: pid, path });
}

function moveForwardTo(st, pid, target) {
  const board = R.boardOf(st);
  const steps = (target - P(st, pid).position + board.size) % board.size;
  if (steps) moveBy(st, pid, steps);
}

function sendToImpound(st, pid) {
  const p = P(st, pid);
  p.position = R.boardOf(st).indexOf.impound;
  p.impounded = true;
  p.impoundTurns = 0;
  st.fx.moves.push({ player: pid, path: [p.position], jump: true });
  if (st.turn.player === pid) { st.turn.extraRoll = false; st.turn.doubles = 0; }
  log(st, `${p.name} is towed to the Impound Lot.`, 'bad');
}

// What happens on arrival. depth guards card chains (a card that moves you onto a card space).
function resolveLanding(st, pid, ctx = {}) {
  const board = R.boardOf(st);
  const p = P(st, pid);
  const space = board.spaces[p.position];
  const depth = ctx.depth || 0;
  const dice = ctx.dice ?? (st.turn.dice ? st.turn.dice[0] + st.turn.dice[1] : 7);
  log(st, `${p.name} lands on ${spaceName(space)}.`, 'move');
  switch (space.type) {
    case 'property': case 'transit': case 'service': {
      const ps = st.props[space.id];
      const a = ASSETS[space.id];
      if (!ps.owner) {
        st.pending = { kind: 'buy', asset: space.id, player: pid };
        return;
      }
      if (ps.owner === pid) return;
      if (ps.mortgaged) { log(st, `${a.name} is mortgaged, so no rent is due.`); return; }
      const rent = R.rentFor(st, space.id, { dice, mult: ctx.rentMult || 1 });
      log(st, `${p.name} owes ${N(st, ps.owner)} $${rent} rent at ${a.name}.`, 'pay');
      charge(st, pid, ps.owner, rent, `Rent at ${a.name}`);
      return;
    }
    case 'tax': {
      if (R.hasEffect(st, 'taxHoliday')) { log(st, 'Tax Holiday: nothing to pay.', 'good'); return; }
      const amount = R.taxAmount(st, pid, space);
      charge(st, pid, 'bank', amount, spaceName(space));
      return;
    }
    case 'bulletin': case 'opportunity':
      if (depth < 3) drawCard(st, pid, space.type, depth);
      return;
    case 'corner':
      if (space.id === 'towzone') sendToImpound(st, pid);
      return;
  }
}

function drawCard(st, pid, deckName, depth) {
  const deck = st.decks[deckName];
  if (deck.i >= deck.order.length) {
    deck.order = shuffle(st.rng, deck.order);
    deck.i = 0;
  }
  const card = CARDS[deck.order[deck.i++]];
  st.fx.cards.push({ deck: deckName, id: card.id, player: pid });
  log(st, `${DECK_NAMES[deckName]}: ${card.title}. ${card.text}`, deckName === 'bulletin' ? 'event' : 'card');
  const board = R.boardOf(st);
  const ops = {
    credit: (to, amount, reason) => credit(st, to, amount, reason),
    charge: (from, to, amount, reason) => charge(st, from, to, amount, reason),
    advanceTo: (index, extra = {}) => { moveForwardTo(st, pid, index); resolveLanding(st, pid, { ...extra, depth: depth + 1 }); },
    moveBy: n => { moveBy(st, pid, n); resolveLanding(st, pid, { depth: depth + 1 }); },
    toImpound: () => sendToImpound(st, pid),
    giveWaiver: () => { P(st, pid).waivers++; },
    addEffect: e => addEffect(st, e),
    log: text => log(st, text),
  };
  card.apply({ st, pid, ops, board });
}

function addEffect(st, e) {
  const { rounds, ...rest } = e;
  // an effect drawn in round r lasting n rounds is active through the end of round r+n-1
  st.effects.push({ ...rest, until: st.round + rounds - 1, id: ++st.n });
  log(st, `${e.label} (until the end of round ${st.round + rounds - 1}).`, 'event');
}

function expireEffects(st) {
  const gone = st.effects.filter(e => e.until < st.round);
  if (!gone.length) return;
  st.effects = st.effects.filter(e => e.until >= st.round);
  for (const e of gone) log(st, `${e.label.split(':')[0]} has ended.`, 'event');
}

// ---- turn order and the end of the match ---------------------------------------------

function advanceTurn(st) {
  if (st.finished) return;
  const n = st.players.length;
  const idx = st.players.findIndex(p => p.id === st.turn.player);
  let next = -1, wrapped = false;
  for (let k = 1; k <= n; k++) {
    const j = (idx + k) % n;
    if (!st.players[j].bankrupt) { next = j; wrapped = idx + k >= n; break; }
  }
  if (next < 0) { finish(st, 'last'); return; }
  if (wrapped) {
    // the last round is over: end here rather than starting a round nobody will play
    if (!st.sandbox && st.options.roundLimit && st.round >= st.options.roundLimit) { finish(st, 'rounds'); return; }
    st.round++;
    expireEffects(st);
    log(st, `Round ${st.round} begins.`, 'round');
  }
  st.turnNumber++;
  st.turn = newTurn(st.players[next].id);
  const p = st.players[next];
  log(st, `${p.name}'s turn${p.impounded ? ' (in the Impound Lot)' : ''}.`, 'turn');
}

function checkEnd(st) {
  if (st.finished || st.sandbox) return;
  if (R.alivePlayers(st).length <= 1) { finish(st, 'last'); return; }
  if (st.debts.length || st.pending || st.trade) return;
  if (st.options.wealthTarget) {
    const top = R.alivePlayers(st).find(p => R.netWorth(st, p.id).total >= st.options.wealthTarget);
    if (top) finish(st, 'target');
  }
}

export const END_REASONS = {
  last: 'Every rival has gone bankrupt.',
  rounds: 'The round limit was reached; the wealthiest owner wins.',
  target: 'A player reached the net worth target.',
};

function finish(st, reason) {
  st.finished = true;
  st.endReason = reason;
  st.pending = null;
  st.trade = null;
  const alive = R.alivePlayers(st).map(p => ({ pid: p.id, wealth: R.netWorth(st, p.id) }))
    .sort((a, b) => b.wealth.total - a.wealth.total || b.wealth.cash - a.wealth.cash);
  const out = st.eliminated.slice().reverse().map(pid => ({ pid, wealth: R.netWorth(st, pid), bankrupt: true }));
  st.results = [...alive, ...out].map((r, i) => ({ ...r, rank: i + 1 }));
  const w = P(st, st.results[0].pid);
  log(st, `${w.name} wins with a net worth of $${st.results[0].wealth.total}. ${END_REASONS[reason]}`, 'win');
  st.fx.sounds.push('win');
}

// ---- bankruptcy ---------------------------------------------------------------------

function bankrupt(st, pid, creditor) {
  const p = P(st, pid);
  const assets = R.ownedAssets(st, pid);
  for (const id of assets) {
    const ps = st.props[id];
    if (ps.level) {
      const refund = ps.level * Math.floor(ASSETS[id].devCost / 2);
      p.cash += refund;
      ledger(st, 'bank', pid, refund, `Buildings on ${ASSETS[id].name} sold to the city`);
      ps.level = 0;
    }
  }
  const toPlayer = creditor !== 'bank' && P(st, creditor) && !P(st, creditor).bankrupt;
  if (p.cash > 0) transfer(st, pid, toPlayer ? creditor : 'bank', p.cash, `Bankruptcy settlement from ${p.name}`);
  for (const id of assets) {
    const ps = st.props[id];
    if (toPlayer) ps.owner = creditor; // mortgaged assets keep their loans
    else Object.assign(ps, { owner: null, mortgaged: false, level: 0 });
  }
  if (toPlayer) P(st, creditor).waivers += p.waivers;
  p.waivers = 0;
  p.bankrupt = true;
  p.impounded = false;
  st.eliminated.push(pid);
  st.debts = st.debts.filter(d => d.debtor !== pid);
  for (const d of st.debts) if (d.creditor === pid) d.creditor = 'bank';
  if (st.trade && (st.trade.offer.from === pid || st.trade.offer.to === pid)) st.trade = null;
  if (st.pending?.kind === 'auction') {
    const a = st.pending;
    const pos = a.order.indexOf(pid);
    if (pos >= 0) { a.order.splice(pos, 1); if (pos < a.idx) a.idx--; delete a.bids[pid]; }
    if (a.idx >= a.order.length) resolveAuction(st);
  }
  log(st, `${p.name} is bankrupt. ${assets.length ? `Their holdings go to ${toPlayer ? N(st, creditor) : 'the City and return to the market'}.` : ''}`, 'bad');
  st.fx.sounds.push('bankrupt');
  if (st.turn.player === pid) {
    if (st.pending?.player === pid) st.pending = null;
    if (!st.sandbox && R.alivePlayers(st).length <= 1) finish(st, 'last');
    else advanceTurn(st);
  }
}

// sell buildings and mortgage until `target` cash is reached, cheapest sacrifices first
function autoRaise(st, pid, target) {
  const p = P(st, pid);
  let steps = 0;
  while (p.cash < target && steps++ < 200) {
    const owned = R.ownedAssets(st, pid);
    const mortgageable = owned.filter(id => R.canMortgage(st, pid, id).ok)
      .sort((a, b) => score(a) - score(b));
    if (mortgageable.length) { doMortgage(st, pid, mortgageable[0]); continue; }
    const sellable = owned.filter(id => R.canSellBuilding(st, pid, id).ok)
      .sort((a, b) => ASSETS[a].devCost - ASSETS[b].devCost);
    if (sellable.length) { doSell(st, pid, sellable[0]); continue; }
    break;
  }
  // keep complete districts for last; among the rest, give up the cheapest first
  function score(id) {
    const a = ASSETS[id];
    const complete = a.kind === 'property' && R.ownsDistrict(st, pid, a.district);
    return (complete ? 10000 : 0) + a.mortgage;
  }
}

function doMortgage(st, pid, id) {
  const a = ASSETS[id];
  st.props[id].mortgaged = true;
  credit(st, pid, a.mortgage, `Mortgaged ${a.name}`);
  log(st, `${N(st, pid)} mortgages ${a.name} for $${a.mortgage}.`, 'pay');
}

function doSell(st, pid, id) {
  const a = ASSETS[id];
  const refund = Math.floor(a.devCost / 2);
  const ps = st.props[id];
  ps.level--;
  credit(st, pid, refund, `Sold a ${LEVELS[ps.level + 1].name} on ${a.name}`);
  log(st, `${N(st, pid)} sells a level on ${a.name} (now ${LEVELS[ps.level].name}) for $${refund}.`, 'pay');
}

function resolveAuction(st) {
  const a = st.pending;
  const asset = ASSETS[a.asset];
  let best = null;
  for (const pid of a.order) {
    const b = a.bids[pid] || 0;
    if (b > 0 && (!best || b > best.amount)) best = { pid, amount: b };
  }
  const shown = a.order.map(pid => `${N(st, pid)} ${a.bids[pid] ? `$${a.bids[pid]}` : 'passed'}`).join(', ');
  log(st, `Sealed bids for ${asset.name} opened: ${shown}.`, 'info');
  st.pending = null;
  if (!best) { log(st, `No bids: ${asset.name} stays with the City.`); return; }
  transfer(st, best.pid, 'bank', best.amount, `Won ${asset.name} at auction`);
  st.props[a.asset].owner = best.pid;
  log(st, `${N(st, best.pid)} wins ${asset.name} for $${best.amount}.`, 'good');
}

// ---- action handlers ----------------------------------------------------------------
// Each returns an error string to reject the action, or nothing to accept it.

const isManagePhase = st => st.turn.phase === 'preRoll' || st.turn.phase === 'postRoll';

const HANDLERS = {
  ROLL(st, a) {
    const t = st.turn;
    if (a.player !== t.player || t.phase !== 'preRoll') return 'You cannot roll right now.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    const p = P(st, a.player);
    const scripted = st.script?.dice?.[a.player]?.shift();
    const d = scripted || [rollDie(st.rng), rollDie(st.rng)];
    const total = d[0] + d[1], dbl = d[0] === d[1];
    t.dice = d; t.rolled = true; t.extraRoll = false;
    st.fx.dice = d;
    st.fx.sounds.push('dice');
    log(st, `${p.name} rolls ${d[0]} + ${d[1]} = ${total}${dbl ? ' (doubles)' : ''}.`, 'roll');
    if (p.impounded) {
      if (dbl) {
        p.impounded = false; p.impoundTurns = 0;
        log(st, `Doubles! ${p.name} drives out of the Impound Lot.`, 'good');
      } else if (++p.impoundTurns >= 3) {
        p.impounded = false; p.impoundTurns = 0;
        log(st, `Third try without doubles: ${p.name} must pay the $${IMPOUND_FEE} release fee.`, 'warn');
        charge(st, p.id, 'bank', IMPOUND_FEE, 'Impound release fee');
      } else {
        log(st, `No doubles; ${p.name} stays impounded (attempt ${p.impoundTurns} of 3).`);
        return;
      }
      moveBy(st, p.id, total);
      resolveLanding(st, p.id, { dice: total });
      return; // leaving the lot never earns an extra roll
    }
    if (dbl && ++t.doubles >= 3) {
      log(st, `Three doubles in a row: ${p.name} is pulled over for speeding.`, 'bad');
      sendToImpound(st, p.id);
      return;
    }
    moveBy(st, p.id, total);
    resolveLanding(st, p.id, { dice: total });
    if (dbl && !p.impounded && !p.bankrupt && st.turn.player === p.id) t.extraRoll = true;
  },

  PAY_IMPOUND(st, a) {
    const t = st.turn, p = P(st, a.player);
    if (a.player !== t.player || t.phase !== 'preRoll' || t.rolled || !p?.impounded) return 'You can only pay the release fee at the start of a turn in the Impound Lot.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    if (p.cash < IMPOUND_FEE) return `The fee is $${IMPOUND_FEE}; you have $${p.cash}.`;
    transfer(st, p.id, 'bank', IMPOUND_FEE, 'Impound release fee');
    p.impounded = false; p.impoundTurns = 0;
    log(st, `${p.name} pays $${IMPOUND_FEE} to leave the Impound Lot.`, 'pay');
  },

  USE_WAIVER(st, a) {
    const t = st.turn, p = P(st, a.player);
    if (a.player !== t.player || t.phase !== 'preRoll' || t.rolled || !p?.impounded) return 'A Tow Waiver can only be used at the start of a turn in the Impound Lot.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    if (!p.waivers) return 'You have no Tow Waiver.';
    p.waivers--; p.impounded = false; p.impoundTurns = 0;
    log(st, `${p.name} uses a Tow Waiver to leave the Impound Lot.`, 'good');
  },

  BUY(st, a) {
    const pend = st.pending;
    if (pend?.kind !== 'buy' || pend.player !== a.player) return 'There is nothing to buy right now.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    const asset = ASSETS[pend.asset], p = P(st, a.player);
    if (p.cash < asset.price) return `${asset.name} costs $${asset.price}; you have $${p.cash}. Mortgage or sell something first, or decline.`;
    transfer(st, p.id, 'bank', asset.price, `Bought ${asset.name}`);
    st.props[asset.id].owner = p.id;
    st.pending = null;
    st.fx.sounds.push('buy');
    log(st, `${p.name} buys ${asset.name} for $${asset.price}.`, 'good');
    if (asset.kind === 'property' && R.ownsDistrict(st, p.id, asset.district)) {
      log(st, `${p.name} now owns all of ${DISTRICTS[asset.district].name}! Rent doubles and building is unlocked.`, 'good');
    }
  },

  DECLINE(st, a) {
    const pend = st.pending;
    if (pend?.kind !== 'buy' || pend.player !== a.player) return 'There is nothing to decline.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    const asset = ASSETS[pend.asset];
    if (!st.options.auctions) {
      st.pending = null;
      log(st, `${N(st, a.player)} passes on ${asset.name}; it stays with the City.`);
      return;
    }
    const n = st.players.length;
    const start = st.players.findIndex(p => p.id === a.player);
    const order = [];
    for (let k = 0; k < n; k++) {
      const p = st.players[(start + k) % n];
      if (!p.bankrupt) order.push(p.id);
    }
    st.pending = { kind: 'auction', asset: asset.id, order, idx: 0, bids: {}, opener: a.player };
    log(st, `${N(st, a.player)} declines ${asset.name}. Sealed-bid auction: each player bids once (minimum $${MIN_BID}), highest bid wins.`, 'info');
  },

  BID(st, a) {
    const pend = st.pending;
    if (pend?.kind !== 'auction') return 'No auction is running.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    const amount = Number(a.amount);
    if (!Number.isInteger(amount) || amount < 0) return 'Bids must be whole dollars.';
    if (amount > 0 && amount < MIN_BID) return `The minimum bid is $${MIN_BID} (or bid 0 to pass).`;
    if (amount > P(st, a.player).cash) return `You cannot bid more than your $${P(st, a.player).cash} cash.`;
    pend.bids[a.player] = amount;
    pend.idx++;
    log(st, `${N(st, a.player)} ${amount ? 'seals a bid' : 'passes'}.`);
    if (pend.idx >= pend.order.length) resolveAuction(st);
  },

  BUILD(st, a) {
    if (!R.canManage(st, a.player, 'build')) return 'You cannot build right now.';
    const c = R.canBuild(st, a.player, a.asset);
    if (!c.ok) return c.reason;
    const asset = ASSETS[a.asset];
    transfer(st, a.player, 'bank', c.cost, `Built ${LEVELS[c.nextLevel].name} on ${asset.name}`);
    st.props[a.asset].level = c.nextLevel;
    st.fx.sounds.push('build');
    log(st, `${N(st, a.player)} builds a ${LEVELS[c.nextLevel].name} on ${asset.name} for $${c.cost}. Rent is now $${asset.rents[c.nextLevel]}.`, 'good');
  },

  SELL_BUILDING(st, a) {
    if (!R.canManage(st, a.player, 'sell')) return 'You cannot sell buildings right now.';
    const c = R.canSellBuilding(st, a.player, a.asset);
    if (!c.ok) return c.reason;
    doSell(st, a.player, a.asset);
  },

  MORTGAGE(st, a) {
    if (!R.canManage(st, a.player, 'mortgage')) return 'You cannot mortgage right now.';
    const c = R.canMortgage(st, a.player, a.asset);
    if (!c.ok) return c.reason;
    doMortgage(st, a.player, a.asset);
  },

  UNMORTGAGE(st, a) {
    if (!R.canManage(st, a.player, 'unmortgage')) return 'You cannot repay loans right now.';
    const c = R.canUnmortgage(st, a.player, a.asset);
    if (!c.ok) return c.reason;
    st.props[a.asset].mortgaged = false;
    transfer(st, a.player, 'bank', c.cost, `Repaid loan on ${ASSETS[a.asset].name}`);
    log(st, `${N(st, a.player)} repays the loan on ${ASSETS[a.asset].name} ($${c.cost}).`, 'pay');
  },

  PAY_DEBT(st, a) {
    const d = st.debts[0];
    if (!d || d.debtor !== a.player) return 'You have no debt to pay.';
    const p = P(st, a.player);
    if (p.cash < d.amount) return `You owe $${d.amount} but have $${p.cash}. Sell buildings or mortgage assets first.`;
    st.debts.shift();
    transfer(st, p.id, d.creditor, d.amount, d.reason);
    log(st, `${p.name} pays the $${d.amount} owed to ${N(st, d.creditor)}.`, 'pay');
  },

  LIQUIDATE(st, a) {
    const d = st.debts[0];
    if (!d || d.debtor !== a.player) return 'You have no debt to cover.';
    const p = P(st, a.player);
    if (p.cash >= d.amount) return 'You already have enough cash to pay.';
    const before = p.cash;
    autoRaise(st, p.id, d.amount);
    if (p.cash === before) return 'There is nothing left to sell or mortgage.';
    log(st, `${p.name} raises $${p.cash - before} by selling and mortgaging.`, 'pay');
  },

  DECLARE_BANKRUPTCY(st, a) {
    const d = st.debts[0];
    if (!d || d.debtor !== a.player) return 'You can only go bankrupt over a debt you cannot pay.';
    const owed = st.debts.filter(x => x.debtor === a.player).reduce((n, x) => n + x.amount, 0);
    if (R.liquidationValue(st, a.player) >= owed) {
      return `You can still raise $${R.liquidationValue(st, a.player)} by selling and mortgaging, enough to pay the $${owed} you owe.`;
    }
    bankrupt(st, a.player, d.creditor);
  },

  END_TURN(st, a) {
    const t = st.turn;
    if (a.player !== t.player || t.phase !== 'postRoll') {
      return t.phase === 'preRoll' && t.player === a.player ? (t.extraRoll ? 'You rolled doubles: roll again first.' : 'Roll the dice first.') : 'You cannot end the turn right now.';
    }
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    advanceTurn(st);
  },

  // ---- trading ----
  PROPOSE_TRADE(st, a) {
    const offer = normalizeOffer(a.offer);
    if (!offer || offer.from !== a.player) return 'Malformed offer.';
    if (!R.canProposeTrade(st, a.player)) {
      return st.turn.trades >= 3 ? 'You have made 3 offers this turn; try again next turn.' : 'You can only propose trades on your own turn, outside other decisions.';
    }
    const err = R.validateOffer(st, offer); if (err) return err;
    st.turn.trades++;
    st.trade = { offer, counters: 0, opened: a.player };
    log(st, `${N(st, offer.from)} makes a trade offer to ${N(st, offer.to)}.`, 'trade');
  },

  ACCEPT_TRADE(st, a) {
    if (!st.trade || st.trade.offer.to !== a.player) return 'There is no offer for you to accept.';
    const offer = st.trade.offer;
    const err = R.validateOffer(st, offer);
    if (err) { st.trade = null; log(st, `The trade fell through: ${err}`, 'warn'); return; }
    applyTrade(st, offer);
    st.trade = null;
  },

  REJECT_TRADE(st, a) {
    if (!st.trade || st.trade.offer.to !== a.player) return 'There is no offer for you to reject.';
    const o = st.trade.offer;
    st.memory.rejected[tradeKey(o)] = st.round;
    st.trade = null;
    log(st, `${N(st, a.player)} rejects ${N(st, o.from)}'s offer.`, 'trade');
  },

  COUNTER_TRADE(st, a) {
    if (!st.trade || st.trade.offer.to !== a.player) return 'There is no offer to counter.';
    if (st.trade.counters >= 3) return 'This negotiation has gone back and forth enough: accept or reject.';
    const offer = normalizeOffer(a.offer);
    const prev = st.trade.offer;
    if (!offer || offer.from !== prev.to || offer.to !== prev.from) return 'A counteroffer must go back to the player who made the offer.';
    const err = R.validateOffer(st, offer); if (err) return err;
    st.trade = { offer, counters: st.trade.counters + 1, opened: st.trade.opened };
    log(st, `${N(st, offer.from)} counters ${N(st, offer.to)}'s offer.`, 'trade');
  },

  CANCEL_TRADE(st, a) {
    if (!st.trade || st.trade.offer.from !== a.player) return 'You have no open offer to withdraw.';
    st.trade = null;
    log(st, `${N(st, a.player)} withdraws their offer.`, 'trade');
  },

  // ---- sandbox tools ----
  SANDBOX_GRANT(st, a) {
    if (!st.sandbox) return 'Only available in Sandbox mode.';
    const p = P(st, a.target);
    const amount = Number(a.amount);
    if (!p || p.bankrupt) return 'Unknown player.';
    if (!Number.isInteger(amount) || Math.abs(amount) > 10000 || !amount) return 'Choose a whole amount up to $10,000.';
    if (p.cash + amount < 0) return `${p.name} only has $${p.cash}.`;
    if (amount > 0) credit(st, p.id, amount, 'Sandbox grant');
    else transfer(st, p.id, 'bank', -amount, 'Sandbox withdrawal');
    log(st, `Sandbox: ${amount > 0 ? 'gave' : 'took'} $${Math.abs(amount)} ${amount > 0 ? 'to' : 'from'} ${p.name}.`, 'info');
  },

  SANDBOX_MOVE(st, a) {
    if (!st.sandbox) return 'Only available in Sandbox mode.';
    const t = st.turn, p = P(st, a.player);
    if (a.player !== t.player || t.phase !== 'preRoll' || p.impounded) return 'You can only jump instead of rolling at the start of a free turn.';
    const bad = mustBeActor(st, a.player); if (bad) return bad;
    const board = R.boardOf(st);
    const target = Number(a.space);
    if (!Number.isInteger(target) || target < 0 || target >= board.size) return 'Pick a space on the board.';
    if (target === p.position) return 'Already there.';
    t.rolled = true; t.extraRoll = false; t.dice = null;
    log(st, `Sandbox: ${p.name} jumps to ${spaceName(board.spaces[target])}.`, 'info');
    moveForwardTo(st, p.id, target);
    resolveLanding(st, p.id, { dice: 7 });
  },
};

function normalizeOffer(o) {
  if (!o || typeof o !== 'object') return null;
  const side = s => ({
    cash: Number(s?.cash ?? 0),
    assets: Array.isArray(s?.assets) ? s.assets.map(String) : [],
    waivers: Number(s?.waivers ?? 0),
  });
  return { from: String(o.from), to: String(o.to), give: side(o.give), get: side(o.get) };
}

export const tradeKey = o => `${o.from}>${o.to}:${[...o.get.assets].sort().join(',')}`;

function applyTrade(st, o) {
  const from = P(st, o.from), to = P(st, o.to);
  if (o.give.cash) transfer(st, from.id, to.id, o.give.cash, `Trade with ${to.name}`);
  if (o.get.cash) transfer(st, to.id, from.id, o.get.cash, `Trade with ${from.name}`);
  for (const id of o.give.assets) st.props[id].owner = to.id;
  for (const id of o.get.assets) st.props[id].owner = from.id;
  from.waivers += o.get.waivers - o.give.waivers;
  to.waivers += o.give.waivers - o.get.waivers;
  const list = s => [
    ...s.assets.map(id => ASSETS[id].name),
    ...(s.cash ? [`$${s.cash}`] : []),
    ...(s.waivers ? [`${s.waivers} Tow Waiver${s.waivers > 1 ? 's' : ''}`] : []),
  ].join(', ') || 'nothing';
  log(st, `Trade done: ${from.name} gives ${list(o.give)}; ${to.name} gives ${list(o.get)}.`, 'trade');
  st.fx.sounds.push('trade');
  for (const pl of [from, to]) {
    for (const d of R.completedDistricts(st, pl.id)) {
      const ids = R.districtProps(st, d);
      if ([...o.give.assets, ...o.get.assets].some(id => ids.includes(id))) {
        log(st, `${pl.name} now owns all of ${DISTRICTS[d].name}!`, 'good');
      }
    }
  }
}

// ---- AI-safe public view --------------------------------------------------------------

// What a player is allowed to know: no random generator state, no upcoming card order,
// no other players' sealed bids. AI opponents only ever see this.
export function publicView(st, viewer) {
  const v = structuredClone(st);
  delete v.rng;
  for (const d of Object.values(v.decks)) { d.remaining = d.order.length - d.i; delete d.order; }
  if (v.pending?.kind === 'auction') {
    v.pending.bids = Object.fromEntries(Object.entries(v.pending.bids).filter(([pid]) => pid === viewer));
  }
  return v;
}

// ---- save validation ----------------------------------------------------------------

const PHASES = ['preRoll', 'postRoll', 'buy', 'auction', 'debt', 'gameOver'];
const finite = n => typeof n === 'number' && Number.isFinite(n);

// returns null for a coherent state, else what is wrong with it
export function validateState(st) {
  if (!st || typeof st !== 'object') return 'not an object';
  if (st.version !== STATE_VERSION) return `version ${st.version} is not supported`;
  if (!MODES[st.mode] || !BOARD_IDS.includes(st.boardId)) return 'unknown mode or board';
  const board = getBoard(st.boardId);
  if (!Array.isArray(st.players) || st.players.length < 2 || st.players.length > 4) return 'bad player list';
  const ids = new Set();
  for (const p of st.players) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id)) return 'bad player id';
    ids.add(p.id);
    if (!finite(p.cash) || p.cash < 0 || !Number.isInteger(p.cash)) return `bad cash for ${p.id}`;
    if (!Number.isInteger(p.position) || p.position < 0 || p.position >= board.size) return `bad position for ${p.id}`;
    if (!Number.isInteger(p.waivers) || p.waivers < 0) return 'bad waivers';
  }
  if (!st.props || Object.keys(st.props).length !== board.ownables.length) return 'property table does not match the board';
  for (const id of board.ownables) {
    const ps = st.props[id];
    if (!ps) return `missing ${id}`;
    if (ps.owner !== null && !ids.has(ps.owner)) return `bad owner for ${id}`;
    if (!Number.isInteger(ps.level) || ps.level < 0 || ps.level > MAX_LEVEL) return `bad level for ${id}`;
    if (ps.level && (ASSETS[id].kind !== 'property' || ps.mortgaged)) return `impossible building on ${id}`;
    if (ps.owner && P(st, ps.owner).bankrupt) return `${id} owned by a bankrupt player`;
  }
  if (!st.turn || !ids.has(st.turn.player) || !PHASES.includes(st.turn.phase)) return 'bad turn';
  if (!st.finished && P(st, st.turn.player).bankrupt) return 'active player is bankrupt';
  if (!Array.isArray(st.debts) || !Array.isArray(st.effects) || !Array.isArray(st.log) || !Array.isArray(st.ledger)) return 'missing lists';
  for (const d of st.debts) if (!ids.has(d.debtor) || !(d.creditor === 'bank' || ids.has(d.creditor)) || !finite(d.amount)) return 'bad debt';
  if (!st.rng || !finite(st.rng.s)) return 'missing random state';
  for (const deck of ['bulletin', 'opportunity']) {
    const d = st.decks?.[deck];
    if (!d || !Array.isArray(d.order) || d.order.some(c => !CARDS[c]) || !Number.isInteger(d.i)) return `bad ${deck} deck`;
  }
  if (st.pending && !['buy', 'auction'].includes(st.pending.kind)) return 'bad pending decision';
  if (st.script && (typeof st.script !== 'object' || Object.values(st.script.dice || {}).some(q => !Array.isArray(q)))) return 'bad tutorial script';
  if (st.pending && !st.props[st.pending.asset]) return 'pending asset missing';
  if (st.trade && R.validateOffer(st, st.trade.offer)) return 'stale trade';
  return null;
}
