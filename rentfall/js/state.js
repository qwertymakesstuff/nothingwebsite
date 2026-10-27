// The run: one plain JSON object and the actions that move it forward. Every action works on a
// copy and returns `{ ok, run, ... }`; a failed action returns the original run untouched, so a
// rejected purchase or an out-of-turn click can never half-apply.
//
// Phases:  spin → delivery → (spin … ) → rent → shop → spin …  and finally won / lost.

import { START_COLLECTION, START_MONEY, MAX_EXTRA_SPINS_PER_DEADLINE, SAVE_VERSION, SHOP } from './config.js';
import { SYMBOL_BY_ID } from './symbols.js';
import { RELIC_BY_ID, ITEM_BY_ID } from './relics.js';
import { DEADLINES, FINAL_DEADLINE, rentDue, noticeFor, spinsFor } from './rent.js';
import { createRng, seedToState } from './rng.js';
import { placeGrid, rollSymbols } from './generate.js';
import { resolveSpin } from './effects.js';
import { addInstance, removeInstance, deliveryChoices } from './collection.js';
import * as shop from './shop.js';

export const PHASE_LIST = ['spin', 'delivery', 'rent', 'shop', 'won', 'lost'];

export const emptyStats = () => ({ spins: 0, destroyed: 0, added: 0, bought: 0, removed: 0, bestSpin: 0, itemsUsed: 0 });

export function newRun(seed = 'RAIN-0001', now = Date.now()) {
  const run = {
    version: SAVE_VERSION,
    seed: String(seed),
    rng: seedToState(String(seed)),
    createdAt: now,
    deadline: 0,
    spinsLeft: spinsFor(0),
    spinInDeadline: 0,
    extraSpinsThisDeadline: 0,
    money: START_MONEY,
    totalEarned: 0,
    earnedThisDeadline: 0,
    rentExtra: 0,
    rentDiscount: 0,
    collection: [],
    nextUid: 1,
    relics: [],
    items: [],
    rerolls: 0,
    doubleNext: false,
    phase: 'spin',
    delivery: null,
    shop: null,
    last: null,
    ledger: [],
    removeCount: 0,
    serviceCount: { polish: 0, laminate: 0, photocopy: 0 },
    stats: emptyStats(),
    result: null,
  };
  for (const id of START_COLLECTION) addInstance(run, id);
  run.stats.added = 0;
  return run;
}

const clone = run => structuredClone(run);
const fail = (run, error) => ({ ok: false, run, error });

// Wraps a mutating function in a copy-validate-commit transaction.
function transact(run, fn) {
  const next = clone(run);
  const res = fn(next) || {};
  if (res.ok === false) return { ...res, ok: false, run };
  return { ...res, ok: true, run: next };
}

export const isFinalSpin = run => run.phase === 'spin' && run.spinsLeft === 1;

function spinMultiplier(run) {
  let m = 1; const reasons = [];
  if (run.doubleNext) { m *= 2; reasons.push('Double Shift ×2'); }
  if (run.relics.includes('night_shift') && run.spinsLeft === 1) { m *= 2; reasons.push('Night Shift ×2'); }
  return { m, reasons };
}

export function spin(run) {
  if (run.phase !== 'spin') return fail(run, 'You can only spin when the machine is ready.');
  if (run.spinsLeft <= 0) return fail(run, 'No spins left: rent is due.');
  return transact(run, r => {
    const rng = createRng(r.rng);
    const notice = noticeFor(r.deadline);
    const { grid, leftOver } = placeGrid(r.collection.map(s => s.uid), rng, { landlord: !!notice?.landlord });
    const instances = new Map(r.collection.map(s => [s.uid, s]));
    const { m, reasons } = spinMultiplier(r);
    const res = resolveSpin({ grid, instances, relics: r.relics, deadline: r.deadline, rng, leftOver, spinMult: m, multReasons: reasons });

    // Commit: instance counters were updated in place on the copy; now apply removals and additions.
    const gone = new Set(res.destroyed);
    r.collection = r.collection.filter(s => !gone.has(s.uid));
    const added = res.added.map(id => addInstance(r, id)?.id).filter(Boolean);
    r.stats.destroyed += gone.size;

    r.money = Math.max(0, r.money + res.total);
    if (res.total > 0) { r.totalEarned += res.total; r.earnedThisDeadline += res.total; }
    r.stats.spins += 1;
    r.stats.bestSpin = Math.max(r.stats.bestSpin, res.total);
    r.spinsLeft -= 1;
    r.spinInDeadline += 1;
    const extra = Math.min(res.extraSpins, MAX_EXTRA_SPINS_PER_DEADLINE - r.extraSpinsThisDeadline);
    if (extra > 0) { r.spinsLeft += extra; r.extraSpinsThisDeadline += extra; }
    r.rentExtra += res.rentUp;
    r.rerolls += res.rerolls;
    r.doubleNext = false;

    r.last = { grid, total: res.total, cells: res.cells, payouts: res.payouts, log: res.log, transforms: res.transforms, added, extraSpins: extra, rentUp: res.rentUp, spinMult: res.spinMult, multReasons: res.multReasons, leftOver };
    r.rng = rng.state;
    openDelivery(r);
    return { result: r.last };
  });
}

function openDelivery(r) {
  const rng = createRng(r.rng);
  r.delivery = { options: rollSymbols(rng, r.deadline, deliveryChoices(r)), rerollsUsed: 0 };
  r.rng = rng.state;
  r.phase = 'delivery';
}

export const deliveryRerollCost = run => (run.rerolls > 0 ? 0 : SHOP.deliveryRerollBase + run.deadline + (run.delivery?.rerollsUsed || 0));
export const skipBonus = run => (run.relics.includes('bulk_mail') ? 3 + run.deadline + 1 : 0);

export function rerollDelivery(run) {
  if (run.phase !== 'delivery') return fail(run, 'No delivery to reroll.');
  const cost = deliveryRerollCost(run);
  if (run.money < cost) return fail(run, 'Not enough money to reroll.');
  return transact(run, r => {
    if (r.rerolls > 0) r.rerolls -= 1; else { r.money -= cost; r.delivery.rerollsUsed += 1; }
    const used = r.delivery.rerollsUsed;
    openDelivery(r);
    r.delivery.rerollsUsed = used;
    return { cost };
  });
}

// index: which offered symbol to take, or null to skip.
export function chooseDelivery(run, index) {
  if (run.phase !== 'delivery' || !run.delivery) return fail(run, 'No delivery waiting.');
  if (index != null && !(index >= 0 && index < run.delivery.options.length)) return fail(run, 'That box is not on offer.');
  return transact(run, r => {
    let took = null, bonus = 0;
    if (index != null) took = addInstance(r, r.delivery.options[index])?.id ?? null;
    else { bonus = skipBonus(r); r.money += bonus; }
    r.delivery = null;
    r.phase = r.spinsLeft > 0 ? 'spin' : 'rent';
    return { took, bonus };
  });
}

export function payRent(run) {
  if (run.phase !== 'rent') return fail(run, 'Rent is not due yet.');
  return transact(run, r => {
    const due = rentDue(r);
    const entry = { deadline: r.deadline, title: DEADLINES[r.deadline].title, rent: due, earned: r.earnedThisDeadline, spins: r.spinInDeadline, before: r.money, after: r.money, interest: 0, paid: false };
    if (r.money < due) {
      r.ledger.push(entry);
      r.phase = 'lost';
      r.result = { won: false, deadline: r.deadline, short: due - r.money, rent: due };
      return { paid: false, due, short: due - r.money };
    }
    r.money -= due;
    entry.paid = true;
    let interest = 0;
    for (const id of r.relics) {
      const it = RELIC_BY_ID[id]?.interest;
      if (it) interest += Math.min(it.cap, Math.floor(r.money * it.rate));
    }
    r.money += interest;
    entry.interest = interest;
    entry.after = r.money;
    r.ledger.push(entry);
    if (r.deadline >= FINAL_DEADLINE) {
      r.phase = 'won';
      r.result = { won: true, deadline: r.deadline, rent: due };
      return { paid: true, due, interest, won: true };
    }
    const paidDeadline = r.deadline;
    r.deadline += 1;
    r.spinsLeft = spinsFor(r.deadline);
    r.spinInDeadline = 0;
    r.extraSpinsThisDeadline = 0;
    r.earnedThisDeadline = 0;
    r.rentExtra = 0;
    r.rentDiscount = 0;
    r.phase = 'shop';
    shop.openShop(r, paidDeadline);
    return { paid: true, due, interest, won: false };
  });
}

export function leaveShop(run) {
  if (run.phase !== 'shop') return fail(run, 'The shop is not open.');
  return transact(run, r => { r.shop = null; r.phase = 'spin'; });
}

// Shop actions, wrapped as transactions.
export const buySymbol = (run, k) => transact(run, r => shop.buySymbol(r, k));
export const buyRelic = (run, k) => transact(run, r => shop.buyRelic(r, k));
export const buyItem = (run, k) => transact(run, r => shop.buyItem(r, k));
export const rerollShop = run => transact(run, r => shop.rerollShop(r));
export const removeSymbol = (run, uid) => transact(run, r => shop.removeSymbol(r, uid));
export const buyService = (run, id, uid) => transact(run, r => shop.buyService(r, id, uid));

export function canUseItem(run, k) {
  const id = run.items[k];
  const item = ITEM_BY_ID[id];
  if (!item) return 'No such item.';
  if (['won', 'lost'].includes(run.phase)) return 'The run is over.';
  if (item.when === 'spin' && !['spin', 'shop', 'delivery'].includes(run.phase)) return 'Use this before a spin.';
  if (id === 'double_shift' && run.doubleNext) return 'Your next spin is already doubled.';
  if (id === 'bribe' && run.rentDiscount > 0) return 'The landlord already has an envelope.';
  if (id === 'overtime_pass' && run.phase === 'rent') return 'Rent is already due.';
  return null;
}

export function useItem(run, k) {
  const why = canUseItem(run, k);
  if (why) return fail(run, why);
  return transact(run, r => {
    const [id] = r.items.splice(k, 1);
    let text = '';
    if (id === 'overtime_pass') { r.spinsLeft += 1; text = '+1 spin before rent.'; }
    else if (id === 'double_shift') { r.doubleNext = true; text = 'Your next spin earns ×2.'; }
    else if (id === 'bribe') { r.rentDiscount = 0.15; text = 'Rent lowered by 15%.'; }
    else if (id === 'pest_control') {
      const pests = r.collection.filter(s => ['mouse', 'moth', 'junk'].includes(s.id));
      for (const p of pests) removeInstance(r, p.uid);
      text = pests.length ? `Removed ${pests.length} pests and junk.` : 'Nothing to remove, but it smells nice.';
    } else if (id === 'lucky_coin') { addInstance(r, 'coin'); addInstance(r, 'coin'); text = 'Two Coins added.'; }
    r.stats.itemsUsed += 1;
    return { id, text };
  });
}

// Helpers for the interface.
export function runSummary(run) {
  return {
    seed: run.seed,
    won: !!run.result?.won,
    deadline: run.deadline,
    reached: run.result?.won ? DEADLINES.length : run.deadline,
    totalEarned: run.totalEarned,
    spins: run.stats.spins,
    bestSpin: run.stats.bestSpin,
    collection: run.collection.length,
    relics: run.relics.slice(),
  };
}

export const knownSymbol = id => !!SYMBOL_BY_ID[id];
