// AI opponents. decide(view, pid) looks at a public view of the game (engine.publicView:
// no random state, no upcoming cards, no rival bids) and returns one action, which then goes
// through engine.dispatch exactly like a human's click. The AI never touches the state.
import { ASSETS, DISTRICTS, MIN_BID, IMPOUND_FEE } from './board.js';
import * as R from './rules.js';

export const PERSONALITIES = {
  collector: {
    name: 'The Collector', blurb: 'Hunts for complete districts and pays a premium to finish a set.',
    reserve: 150, completion: 1.6, buildReserve: 250, tradeMargin: 15, rivalry: 0.8,
    auction: 0.95, liquidity: 1.2, buyBias: 1.15, mortgageForBuy: false, mortgageToBuild: false,
  },
  developer: {
    name: 'The Developer', blurb: 'Builds aggressively wherever rent can climb fastest.',
    reserve: 100, completion: 1.2, buildReserve: 90, tradeMargin: 25, rivalry: 0.7,
    auction: 0.85, liquidity: 1.0, buyBias: 1.0, mortgageForBuy: false, mortgageToBuild: true,
  },
  financier: {
    name: 'The Financier', blurb: 'Keeps cash on hand, uses loans cleverly and drives hard bargains.',
    reserve: 320, completion: 1.0, buildReserve: 380, tradeMargin: 40, rivalry: 0.9,
    auction: 0.8, liquidity: 2.0, buyBias: 0.9, mortgageForBuy: true, mortgageToBuild: false,
  },
  opportunist: {
    name: 'The Opportunist', blurb: 'Waits for bargains: cheap auctions and lopsided deals.',
    reserve: 180, completion: 1.1, buildReserve: 200, tradeMargin: 50, rivalry: 0.75,
    auction: 0.7, liquidity: 1.3, buyBias: 0.95, mortgageForBuy: false, mortgageToBuild: false,
  },
};

const persona = (view, pid) => PERSONALITIES[R.player(view, pid).personality] || PERSONALITIES.collector;
const round5 = n => Math.floor(n / 5) * 5;

export function decide(view, pid) {
  if (R.currentActor(view) !== pid) return null;
  const P = persona(view, pid);
  const me = R.player(view, pid);
  const act = (type, extra = {}) => ({ type, player: pid, ...extra });

  if (view.trade) return respondToTrade(view, pid, P);

  if (view.debts.length) {
    const owed = view.debts.filter(d => d.debtor === pid).reduce((n, d) => n + d.amount, 0);
    if (me.cash >= view.debts[0].amount) return act('PAY_DEBT');
    if (R.liquidationValue(view, pid) >= owed) return act('LIQUIDATE');
    return act('DECLARE_BANKRUPTCY');
  }

  switch (view.turn.phase) {
    case 'auction': return act('BID', { amount: auctionBid(view, pid, P) });
    case 'buy': return buyDecision(view, pid, P);
    case 'preRoll': {
      if (me.impounded && !view.turn.rolled) {
        if (me.waivers) return act('USE_WAIVER');
        // early on, getting out to buy matters; later, sitting in the lot avoids rent
        const unowned = R.boardOf(view).ownables.filter(id => !view.props[id].owner).length;
        if (unowned > 4 && me.cash >= IMPOUND_FEE + P.reserve) return act('PAY_IMPOUND');
      }
      return act('ROLL');
    }
    case 'postRoll': return manage(view, pid, P) || act('END_TURN');
  }
  return null;
}

// ---- valuing things -------------------------------------------------------------------

// how much owning `id` is worth to pid, beyond its price
export function assetWorth(view, pid, id, P = persona(view, pid)) {
  const a = ASSETS[id];
  let worth = a.price;
  if (a.kind === 'property') {
    const ids = R.districtProps(view, a.district);
    const others = ids.filter(o => o !== id);
    const mine = others.filter(o => view.props[o].owner === pid).length;
    const total = ids.reduce((n, o) => n + ASSETS[o].price, 0);
    if (mine === others.length) worth += total * 0.6 * P.completion; // completes the set
    else if (mine > 0) worth += a.price * 0.3 * P.completion;
    const owners = new Set(others.map(o => view.props[o].owner));
    if (owners.size === 1 && !owners.has(null) && !owners.has(pid)) worth += a.price * 0.5; // blocks a rival
    // cheap districts pay off sooner; value them a little more in the early rounds
    if (view.round < 8 && a.price <= 140) worth += 20;
  } else {
    const group = R.boardOf(view)[a.kind === 'transit' ? 'transits' : 'services'];
    worth += group.filter(o => view.props[o].owner === pid).length * (a.kind === 'transit' ? 45 : 60);
  }
  return worth;
}

function completes(view, pid, id) {
  const a = ASSETS[id];
  if (a.kind !== 'property') return false;
  return R.districtProps(view, a.district).every(o => o === id || view.props[o].owner === pid);
}

// assets that can be mortgaged without hurting a complete district, cheapest first
function spareMortgages(view, pid, except) {
  return R.ownedAssets(view, pid)
    .filter(id => id !== except && R.canMortgage(view, pid, id).ok)
    .filter(id => ASSETS[id].kind !== 'property' || !R.ownsDistrict(view, pid, ASSETS[id].district))
    .sort((a, b) => ASSETS[a].mortgage - ASSETS[b].mortgage);
}

function buyDecision(view, pid, P) {
  const me = R.player(view, pid);
  const id = view.pending.asset;
  const a = ASSETS[id];
  const worth = assetWorth(view, pid, id, P) * P.buyBias;
  const finishes = completes(view, pid, id);
  const reserve = P.reserve * (finishes ? 0.35 : 1);
  const good = worth >= a.price * (P === PERSONALITIES.opportunist ? 1.0 : 0.9) || finishes;
  if (good && me.cash - a.price >= reserve) return { type: 'BUY', player: pid };
  if (good && finishes && P.mortgageForBuy && me.cash < a.price) {
    const spare = spareMortgages(view, pid, id);
    const raise = spare.reduce((n, o) => n + ASSETS[o].mortgage, 0);
    if (spare.length && me.cash + raise >= a.price + reserve) return { type: 'MORTGAGE', player: pid, asset: spare[0] };
  }
  // the Opportunist will still buy cheap starter properties when rich
  if (me.cash - a.price >= reserve * 2.5) return { type: 'BUY', player: pid };
  return { type: 'DECLINE', player: pid };
}

function auctionBid(view, pid, P) {
  const me = R.player(view, pid);
  const id = view.pending.asset;
  const worth = assetWorth(view, pid, id, P);
  const factor = completes(view, pid, id) ? Math.max(P.auction, 1.05) : P.auction;
  const cap = me.cash - P.reserve * 0.5;
  const bid = round5(Math.min(worth * factor, cap));
  return bid >= MIN_BID ? bid : 0;
}

// ---- managing assets on the AI's own turn ------------------------------------------------

function manage(view, pid, P) {
  const me = R.player(view, pid);
  const owned = R.ownedAssets(view, pid);

  // 1. repay loans when flush, complete districts first
  const mortgaged = owned.filter(id => view.props[id].mortgaged)
    .sort((a, b) => Number(isSetPiece(view, pid, b)) - Number(isSetPiece(view, pid, a)));
  for (const id of mortgaged) {
    const c = R.canUnmortgage(view, pid, id);
    if (c.ok && me.cash - c.cost >= P.reserve + 150) return { type: 'UNMORTGAGE', player: pid, asset: id };
  }

  // 2. build where the next level adds the most rent per crown
  const buildable = owned.filter(id => ASSETS[id].kind === 'property' && R.ownsDistrict(view, pid, ASSETS[id].district))
    .map(id => ({ id, c: R.canBuild(view, pid, id) }))
    .filter(x => x.c.ok || /costs/.test(x.c.reason || ''));
  const scored = buildable.map(x => {
    const a = ASSETS[x.id], lvl = view.props[x.id].level;
    const gain = lvl < 4 ? a.rents[lvl + 1] - (lvl === 0 ? a.rents[0] * 2 : a.rents[lvl]) : 0;
    return { ...x, gain: gain / a.devCost };
  }).filter(x => x.gain > 0).sort((a, b) => b.gain - a.gain);
  for (const x of scored) {
    if (x.c.ok && me.cash - x.c.cost >= P.buildReserve) return { type: 'BUILD', player: pid, asset: x.id };
  }
  if (P.mortgageToBuild && scored.length) {
    const cost = ASSETS[scored[0].id].devCost;
    const spare = spareMortgages(view, pid);
    if (spare.length && me.cash < cost + P.buildReserve && me.cash + ASSETS[spare[0]].mortgage >= cost + P.buildReserve) {
      return { type: 'MORTGAGE', player: pid, asset: spare[0] };
    }
  }

  // 3. one trade proposal per turn
  if (view.turn.trades === 0 && R.canProposeTrade(view, pid)) {
    const offer = proposeTrade(view, pid, P);
    if (offer) return { type: 'PROPOSE_TRADE', player: pid, offer };
  }
  return null;
}

const isSetPiece = (view, pid, id) => ASSETS[id].kind === 'property' && R.ownsDistrict(view, pid, ASSETS[id].district);

// ---- trades -----------------------------------------------------------------------------

// A position score: cash (minus a penalty for sitting below the reserve), asset values, and a
// large bonus for every complete district. Trades are judged by how they change this score
// for the AI, minus how much they strengthen the partner.
function positionScore(view, pid, P) {
  const me = R.player(view, pid);
  let s = me.cash - Math.max(0, P.reserve - me.cash) * P.liquidity;
  for (const id of R.ownedAssets(view, pid)) {
    const a = ASSETS[id];
    s += view.props[id].mortgaged ? a.price - R.unmortgageCost(id) : a.price;
  }
  s += threat(view, pid, P);
  s += me.waivers * 30;
  return s;
}

// the strategic part of a position: complete districts, near-complete ones, station groups
function threat(view, pid, P) {
  let s = 0;
  for (const [d, ids] of Object.entries(R.boardOf(view).districts)) {
    const mine = ids.filter(id => view.props[id].owner === pid).length;
    const total = ids.reduce((n, id) => n + ASSETS[id].price, 0);
    if (mine === ids.length) s += total * 0.8 * P.completion;
    else if (mine === ids.length - 1 && ids.length > 1) s += total * 0.12;
  }
  const t = R.boardOf(view).transits.filter(id => view.props[id].owner === pid).length;
  if (t > 1) s += (t - 1) * 60;
  return s;
}

function applyOffer(view, o) {
  const v = structuredClone(view);
  const from = R.player(v, o.from), to = R.player(v, o.to);
  from.cash += (o.get.cash || 0) - (o.give.cash || 0);
  to.cash += (o.give.cash || 0) - (o.get.cash || 0);
  from.waivers += (o.get.waivers || 0) - (o.give.waivers || 0);
  to.waivers += (o.give.waivers || 0) - (o.get.waivers || 0);
  for (const id of o.give.assets) v.props[id].owner = o.to;
  for (const id of o.get.assets) v.props[id].owner = o.from;
  return v;
}

// net value of an offer for pid (who may be either side). Positive = good for pid.
const fullSide = s => ({ cash: s?.cash || 0, assets: s?.assets || [], waivers: s?.waivers || 0 });

export function evaluateTrade(view, pid, offer, P = persona(view, pid)) {
  offer = { ...offer, give: fullSide(offer.give), get: fullSide(offer.get) };
  if (R.validateOffer(view, offer)) return -Infinity;
  const partner = offer.from === pid ? offer.to : offer.from;
  const after = applyOffer(view, offer);
  const mine = positionScore(after, pid, P) - positionScore(view, pid, P);
  const theirs = threat(after, partner, P) - threat(view, partner, P);
  return mine - P.rivalry * theirs;
}

function respondToTrade(view, pid, P) {
  const { offer, counters } = view.trade;
  const value = evaluateTrade(view, pid, offer, P);
  if (value >= P.tradeMargin) return { type: 'ACCEPT_TRADE', player: pid };
  // close enough: ask for more cash instead of walking away
  if (counters < 2 && value > -1500) {
    const need = Math.ceil((P.tradeMargin - value) / 10) * 10 + 10;
    const proposer = R.player(view, offer.from);
    const counter = {
      from: pid, to: offer.from,
      give: { cash: offer.get.cash, assets: [...offer.get.assets], waivers: offer.get.waivers || 0 },
      get: { cash: offer.give.cash, assets: [...offer.give.assets], waivers: offer.give.waivers || 0 },
    };
    // first drop any cash we were asked to pay, then ask the proposer for the rest
    const cut = Math.min(counter.give.cash, need);
    counter.give.cash -= cut;
    counter.get.cash += need - cut;
    if (counter.get.cash <= proposer.cash && evaluateTrade(view, pid, counter, P) >= P.tradeMargin) {
      return { type: 'COUNTER_TRADE', player: pid, offer: counter };
    }
  }
  return { type: 'REJECT_TRADE', player: pid };
}

// look for a district one rival is blocking and offer to buy them out
export function proposeTrade(view, pid, P = persona(view, pid)) {
  const me = R.player(view, pid);
  const candidates = [];
  for (const [d, ids] of Object.entries(R.boardOf(view).districts)) {
    const mine = ids.filter(id => view.props[id].owner === pid);
    const missing = ids.filter(id => view.props[id].owner !== pid);
    if (!mine.length || !missing.length || missing.length > 2) continue;
    const owners = new Set(missing.map(id => view.props[id].owner));
    if (owners.size !== 1 || owners.has(null)) continue;
    const target = [...owners][0];
    if (R.player(view, target).bankrupt || !missing.every(id => R.isTradable(view, id))) continue;
    const key = `${pid}>${target}:${[...missing].sort().join(',')}`;
    const when = view.memory?.rejected?.[key];
    if (when != null && view.round - when < 3) continue;
    const price = missing.reduce((n, id) => n + ASSETS[id].price, 0);
    candidates.push({ d, missing, target, price });
  }
  candidates.sort((a, b) => b.price - a.price);
  for (const c of candidates) {
    const budget = me.cash - P.reserve * 0.6;
    // a property the partner wants (it would complete or nearly complete one of their sets)
    const sweetener = R.ownedAssets(view, pid).find(id => {
      const a = ASSETS[id];
      if (a.kind !== 'property' || a.district === c.d || !R.isTradable(view, id) || view.props[id].mortgaged) return false;
      const ids = R.districtProps(view, a.district);
      return ids.filter(o => view.props[o].owner === c.target).length >= ids.length - 1
        && !ids.some(o => o !== id && view.props[o].owner === pid);
    });
    const premium = P === PERSONALITIES.collector ? 1.5 : 1.3;
    let cash = round5(Math.min(c.price * premium, budget));
    const give = { cash: 0, assets: [], waivers: 0 };
    if (sweetener) { give.assets.push(sweetener); cash = round5(Math.max(0, Math.min(cash, c.price * premium - ASSETS[sweetener].price))); }
    give.cash = Math.max(0, cash);
    if (give.cash + (sweetener ? ASSETS[sweetener].price : 0) < c.price) continue;
    const offer = { from: pid, to: c.target, give, get: { cash: 0, assets: c.missing, waivers: 0 } };
    if (evaluateTrade(view, pid, offer, P) > 0) return offer;
  }
  return null;
}

// a short human-readable reason shown in the trade dialog when an AI answers
export function explainTrade(view, pid, offer) {
  const v = evaluateTrade(view, pid, offer);
  const P = persona(view, pid);
  const partner = offer.from === pid ? offer.to : offer.from;
  const after = applyOffer(view, offer);
  const helpsRival = R.completedDistricts(after, partner).length > R.completedDistricts(view, partner).length;
  if (v >= P.tradeMargin) return 'This deal works for me.';
  if (helpsRival) return 'That would hand you a complete district. I need much more for that.';
  if (R.player(after, pid).cash < P.reserve) return 'That leaves me too short on cash.';
  return 'The numbers do not add up for me.';
}

export const personalityName = id => PERSONALITIES[id]?.name ?? 'AI';
export const districtName = d => DISTRICTS[d]?.name ?? d;
