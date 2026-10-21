// Pure rule queries over a game state: rent, development legality, wealth, whose decision
// it is. Nothing here changes the state; the engine (engine.js) is the only writer.
import {
  getBoard, ASSETS, DISTRICTS, MAX_LEVEL, TAXES, TRANSIT_RENTS, SERVICE_MULTS, UNMORTGAGE_PERCENT,
} from './board.js';

export const boardOf = st => getBoard(st.boardId);
export const player = (st, pid) => st.players.find(p => p.id === pid);
export const alivePlayers = st => st.players.filter(p => !p.bankrupt);
export const playerName = (st, pid) => (pid === 'bank' ? 'the City' : player(st, pid)?.name ?? '?');

export function ownedAssets(st, pid) {
  return boardOf(st).ownables.filter(id => st.props[id].owner === pid);
}

export const districtProps = (st, district) => boardOf(st).districts[district] || [];

export function ownsDistrict(st, pid, district) {
  const ids = districtProps(st, district);
  return ids.length > 0 && ids.every(id => st.props[id].owner === pid);
}

export function completedDistricts(st, pid) {
  return Object.keys(boardOf(st).districts).filter(d => ownsDistrict(st, pid, d));
}

export const districtHasBuildings = (st, district) => districtProps(st, district).some(id => st.props[id].level > 0);

export function totalLevels(st, pid) {
  return ownedAssets(st, pid).reduce((n, id) => n + st.props[id].level, 0);
}

// integer math: 100 * 1.1 in floating point would round up to 111
export const unmortgageCost = id => Math.ceil((ASSETS[id].mortgage * UNMORTGAGE_PERCENT) / 100);

// ---- temporary effects -------------------------------------------------------------

export const hasEffect = (st, kind) => st.effects.some(e => e.kind === kind);

// combined rent multiplier from active effects for one asset
export function effectMultiplier(st, id) {
  const a = ASSETS[id];
  const board = boardOf(st);
  let m = 1;
  for (const e of st.effects) {
    if (e.kind === 'districtRent' && a.kind === 'property' && a.district === e.district) m *= e.mult;
    if (e.kind === 'nearTransit') {
      const i = board.indexOf[id];
      const near = board.transitIndices.some(t => {
        const d = Math.abs(t - i);
        return Math.min(d, board.size - d) <= 2;
      });
      if (near) m *= e.mult;
    }
  }
  return m;
}

// ---- rent --------------------------------------------------------------------------

// rent before effects; dice is the total of the roll that brought the visitor here
export function baseRent(st, id, dice = 7) {
  const a = ASSETS[id];
  const ps = st.props[id];
  if (!ps.owner || ps.mortgaged) return 0;
  if (a.kind === 'property') {
    if (ps.level > 0) return a.rents[ps.level];
    return ownsDistrict(st, ps.owner, a.district) ? a.rents[0] * 2 : a.rents[0];
  }
  const owned = boardOf(st)[a.kind === 'transit' ? 'transits' : 'services']
    .filter(o => st.props[o].owner === ps.owner).length;
  if (a.kind === 'transit') return TRANSIT_RENTS[owned - 1];
  return dice * SERVICE_MULTS[Math.min(owned, SERVICE_MULTS.length) - 1];
}

export function rentFor(st, id, { dice = 7, mult = 1 } = {}) {
  return Math.round(baseRent(st, id, dice) * effectMultiplier(st, id) * mult);
}

// rent at every level for the property card, as if the current owner keeps it
export function rentLadder(st, id) {
  const a = ASSETS[id];
  if (a.kind !== 'property') return [];
  const ps = st.props[id];
  const complete = ps.owner ? ownsDistrict(st, ps.owner, a.district) : false;
  const m = effectMultiplier(st, id);
  return a.rents.map((r, level) => ({
    level,
    rent: Math.round((level === 0 && complete ? r * 2 : r) * m),
    current: ps.owner != null && ps.level === level,
  }));
}

export function taxAmount(st, pid, space) {
  const t = TAXES[space.id];
  return t.base + t.perLevel * totalLevels(st, pid);
}

// ---- development and mortgages -----------------------------------------------------

const ok = extra => ({ ok: true, ...extra });
const no = reason => ({ ok: false, reason });

export function canBuild(st, pid, id) {
  const a = ASSETS[id];
  const ps = st.props[id];
  if (!a || !ps) return no('That is not a property on this board.');
  if (a.kind !== 'property') return no('Only district properties can be developed.');
  if (ps.owner !== pid) return no('You do not own this property.');
  if (!ownsDistrict(st, pid, a.district)) return no(`Own all of ${DISTRICTS[a.district].name} first.`);
  const ids = districtProps(st, a.district);
  if (ids.some(o => st.props[o].mortgaged)) return no('Repay every loan in this district before building.');
  if (ps.level >= MAX_LEVEL) return no('Already a Landmark Tower: fully developed.');
  const minLevel = Math.min(...ids.map(o => st.props[o].level));
  if (ps.level > minLevel) return no('Build evenly: develop the other properties in this district first.');
  const cost = a.devCost;
  if (player(st, pid).cash < cost) return no(`Building costs $${cost}; you have $${player(st, pid).cash}.`);
  return ok({ cost, nextLevel: ps.level + 1, nextRent: a.rents[ps.level + 1] });
}

export function canSellBuilding(st, pid, id) {
  const a = ASSETS[id];
  const ps = st.props[id];
  if (!a || !ps || a.kind !== 'property') return no('Only district properties have buildings.');
  if (ps.owner !== pid) return no('You do not own this property.');
  if (ps.level === 0) return no('There is nothing built here.');
  const maxLevel = Math.max(...districtProps(st, a.district).map(o => st.props[o].level));
  if (ps.level < maxLevel) return no('Sell evenly: sell from the most developed property in this district first.');
  return ok({ refund: Math.floor(a.devCost / 2) });
}

export function canMortgage(st, pid, id) {
  const a = ASSETS[id];
  const ps = st.props[id];
  if (!a || !ps) return no('Unknown asset.');
  if (ps.owner !== pid) return no('You do not own this.');
  if (ps.mortgaged) return no('Already mortgaged.');
  if (a.kind === 'property' && districtHasBuildings(st, a.district)) return no('Sell the buildings in this district first.');
  return ok({ amount: a.mortgage });
}

export function canUnmortgage(st, pid, id) {
  const ps = st.props[id];
  if (!ps) return no('Unknown asset.');
  if (ps.owner !== pid) return no('You do not own this.');
  if (!ps.mortgaged) return no('This is not mortgaged.');
  const cost = unmortgageCost(id);
  if (player(st, pid).cash < cost) return no(`Repaying costs $${cost}.`);
  return ok({ cost });
}

// properties may change hands only while their district has no buildings
export function isTradable(st, id) {
  const a = ASSETS[id];
  if (!a || !st.props[id]) return false;
  return a.kind !== 'property' || !districtHasBuildings(st, a.district);
}

// ---- wealth ------------------------------------------------------------------------

// Net worth = cash + property at purchase price + money invested in buildings
//             - loan payoffs on mortgaged assets - unpaid debts.
// Spendable cash is just `cash`; liquidation value is what could be raised right now.
export function netWorth(st, pid) {
  const p = player(st, pid);
  let property = 0, buildings = 0, loans = 0;
  for (const id of ownedAssets(st, pid)) {
    const a = ASSETS[id], ps = st.props[id];
    property += a.price;
    if (a.kind === 'property') buildings += ps.level * a.devCost;
    if (ps.mortgaged) loans += unmortgageCost(id);
  }
  const debts = st.debts.filter(d => d.debtor === pid).reduce((n, d) => n + d.amount, 0);
  return { cash: p.cash, property, buildings, loans, debts, total: p.cash + property + buildings - loans - debts };
}

export function liquidationValue(st, pid) {
  let v = player(st, pid).cash;
  for (const id of ownedAssets(st, pid)) {
    const a = ASSETS[id], ps = st.props[id];
    if (a.kind === 'property') v += ps.level * Math.floor(a.devCost / 2);
    if (!ps.mortgaged) v += a.mortgage;
  }
  return v;
}

// ---- turn flow ---------------------------------------------------------------------

// who must act next: a trade's recipient, then a debtor, then an auction bidder,
// then the player whose turn it is
export function currentActor(st) {
  if (st.finished) return null;
  if (st.trade) return st.trade.offer.to;
  if (st.debts.length) return st.debts[0].debtor;
  if (st.pending?.kind === 'auction') return st.pending.order[st.pending.idx];
  return st.turn.player;
}

// may this player buy, build, sell or mortgage right now?
export function canManage(st, pid, kind) {
  if (st.finished || st.trade) return false;
  if (st.debts.length) return st.debts[0].debtor === pid && (kind === 'sell' || kind === 'mortgage');
  if (st.pending?.kind === 'auction') return false;
  if (st.pending?.kind === 'buy') return st.pending.player === pid && (kind === 'sell' || kind === 'mortgage');
  return st.turn.player === pid && (st.turn.phase === 'preRoll' || st.turn.phase === 'postRoll');
}

export function canProposeTrade(st, pid) {
  return !st.finished && !st.trade && !st.debts.length && !st.pending
    && st.turn.player === pid && (st.turn.phase === 'preRoll' || st.turn.phase === 'postRoll')
    && st.turn.trades < 3;
}

// ---- trades ------------------------------------------------------------------------

const side = s => ({ cash: s?.cash ?? 0, assets: s?.assets ?? [], waivers: s?.waivers ?? 0 });

// returns null when the offer is legal right now, else the reason it is not
export function validateOffer(st, offer) {
  if (!offer || typeof offer !== 'object') return 'Malformed offer.';
  const from = player(st, offer.from), to = player(st, offer.to);
  if (!from || !to) return 'Unknown trading partner.';
  if (from.id === to.id) return 'You cannot trade with yourself.';
  if (from.bankrupt || to.bankrupt) return 'Bankrupt players cannot trade.';
  const give = side(offer.give), get = side(offer.get);
  for (const [s, who] of [[give, from], [get, to]]) {
    if (!Number.isInteger(s.cash) || s.cash < 0) return 'Cash amounts must be whole, non-negative numbers.';
    if (!Number.isInteger(s.waivers) || s.waivers < 0) return 'Invalid waiver count.';
    if (!Array.isArray(s.assets)) return 'Malformed asset list.';
    if (s.cash > who.cash) return `${who.name} does not have $${s.cash}.`;
    if (s.waivers > who.waivers) return `${who.name} does not hold ${s.waivers} Tow Waiver(s).`;
    for (const id of s.assets) {
      if (!st.props[id]) return 'That asset is not on this board.';
      if (st.props[id].owner !== who.id) return `${who.name} does not own ${ASSETS[id].name}.`;
      if (!isTradable(st, id)) return `${ASSETS[id].name} cannot be traded while its district has buildings.`;
    }
  }
  const all = [...give.assets, ...get.assets];
  if (new Set(all).size !== all.length) return 'An asset is listed twice.';
  const empty = s => !s.cash && !s.assets.length && !s.waivers;
  if (empty(give) && empty(get)) return 'The offer is empty.';
  return null;
}
