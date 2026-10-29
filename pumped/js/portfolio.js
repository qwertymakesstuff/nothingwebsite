// Cash, positions and trades. Pure functions over a plain object; prices are passed in.
//
// A position: { t, qty, avg, cost, debt, lev, opened }
//   qty   units held               avg   average entry price
//   cost  cash the player put in (including buy fees); P/L is measured against it
//   debt  borrowed money (leverage); repaid out of the sale
//   lev   leverage (1 = no leverage). A position keeps one leverage until it is closed.
// Equity of a position = qty × price − debt (never below 0). Net worth = cash + Σ equity.
// A leveraged position is liquidated when its equity falls to LIQ_LEVEL × its margin.

export const FEE = 0.001;          // 0.1% of the traded value, both ways
export const MIN_TRADE = 1;        // $1 minimum order
export const LIQ_LEVEL = 0.1;
export const TX_LEN = 250;

const cents = x => Math.round(x * 100) / 100;

export function createPortfolio(cash = 1000) {
  return { cash: cents(cash), start: cents(cash), positions: {}, realized: 0, fees: 0, txs: [], txId: 0 };
}

export const equityOf = (pos, price) => Math.max(0, pos.qty * price - pos.debt);
export const marginOf = pos => (pos.qty * pos.avg) / pos.lev;

export function liqPrice(pos) {
  if (pos.lev <= 1) return 0;
  return (pos.debt + LIQ_LEVEL * marginOf(pos)) / pos.qty;
}

export function netWorth(pf, priceOf) {
  let w = pf.cash;
  for (const t in pf.positions) w += equityOf(pf.positions[t], priceOf(t));
  return w;
}

export function unrealized(pf, priceOf) {
  let u = 0;
  for (const t in pf.positions) { const p = pf.positions[t]; u += equityOf(p, priceOf(t)) - p.cost; }
  return u;
}

function record(pf, tx) {
  tx.id = ++pf.txId;
  pf.txs.unshift(tx);
  if (pf.txs.length > TX_LEN) pf.txs.length = TX_LEN;
  return tx;
}

// Spend `amount` of cash on `t` at `price` with leverage `lev`.
export function buy(pf, { t, price, amount, lev = 1, tick = 0 }) {
  amount = Math.floor(Number(amount) * 100 + 1e-6) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter an amount to buy.' };
  if (!(price > 0) || !Number.isFinite(price)) return { ok: false, error: 'This asset can\'t be traded right now.' };
  if (!Number.isInteger(lev) || lev < 1) return { ok: false, error: 'Invalid leverage.' };
  if (amount < MIN_TRADE) return { ok: false, error: `Minimum order is $${MIN_TRADE}.` };
  if (amount > pf.cash + 1e-9) return { ok: false, error: `Not enough cash. You have $${pf.cash.toFixed(2)}.` };
  const held = pf.positions[t];
  if (held && held.lev !== lev) return { ok: false, error: `You hold ${t} at ${held.lev}×. Sell it before trading it at ${lev}×.` };

  const margin = amount / (1 + lev * FEE);
  const fee = amount - margin;
  const qty = (margin * lev) / price;
  const pos = held || (pf.positions[t] = { t, qty: 0, avg: 0, cost: 0, debt: 0, lev, opened: tick });
  pos.avg = (pos.qty * pos.avg + qty * price) / (pos.qty + qty);
  pos.qty += qty;
  pos.cost += amount;
  pos.debt += margin * (lev - 1);
  pf.cash = cents(pf.cash - amount);
  if (pf.cash < 0) pf.cash = 0;
  pf.fees += fee;
  return { ok: true, tx: record(pf, { side: 'buy', t, qty, price, amount, fee, lev, tick }) };
}

// Sell part of a position: give `fraction` (0..1] of it, or `value` in dollars of its current worth.
export function sell(pf, { t, price, fraction = null, value = null, tick = 0 }) {
  const pos = pf.positions[t];
  if (!pos || pos.qty <= 0) return { ok: false, error: `You don't own any ${t}.` };
  if (!(price > 0) || !Number.isFinite(price)) return { ok: false, error: 'This asset can\'t be traded right now.' };
  const worth = equityOf(pos, price);
  let f;
  if (fraction != null) f = Number(fraction);
  else {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return { ok: false, error: 'Enter an amount to sell.' };
    if (worth <= 0) f = 1;
    else {
      if (v > worth * 1.0001 + 0.01) return { ok: false, error: `You only own $${worth.toFixed(2)} of ${t}.` };
      f = v / worth;
    }
  }
  if (!Number.isFinite(f) || f <= 0) return { ok: false, error: 'Enter an amount to sell.' };
  if (f > 1 + 1e-9) return { ok: false, error: `You can't sell more ${t} than you own.` };
  if (f > 0.9999) f = 1;                         // don't leave dust behind

  const qty = pos.qty * f, debt = pos.debt * f, cost = pos.cost * f;
  const gross = qty * price;
  const fee = gross * FEE;
  const proceeds = cents(Math.max(0, gross - debt - fee));
  const pnl = proceeds - cost;
  pf.cash = cents(pf.cash + proceeds);
  pf.realized += pnl;
  pf.fees += Math.min(fee, Math.max(0, gross - debt));
  if (f === 1) delete pf.positions[t];
  else { pos.qty -= qty; pos.debt -= debt; pos.cost -= cost; }
  const held = tick - pos.opened;
  return { ok: true, tx: record(pf, { side: 'sell', t, qty, price, amount: proceeds, fee, lev: pos.lev, tick, pnl, pct: cost > 0 ? pnl / cost * 100 : 0, held, closed: f === 1 }) };
}

// Close every leveraged position whose equity has fallen to the liquidation level.
export function checkLiquidations(pf, priceOf, tick = 0) {
  const out = [];
  for (const t of Object.keys(pf.positions)) {
    const pos = pf.positions[t];
    if (pos.lev <= 1) continue;
    const price = priceOf(t);
    if (equityOf(pos, price) > LIQ_LEVEL * marginOf(pos) + 1e-12) continue;
    // whatever equity is left goes to the liquidation fee
    delete pf.positions[t];
    const pnl = -pos.cost;
    pf.realized += pnl;
    out.push(record(pf, { side: 'liquidation', t, qty: pos.qty, price, amount: 0, fee: 0, lev: pos.lev, tick, pnl, pct: -100, held: tick - pos.opened, closed: true }));
  }
  return out;
}

export function sellAll(pf, priceOf, tick = 0) {
  const txs = [];
  for (const t of Object.keys(pf.positions)) {
    const r = sell(pf, { t, price: priceOf(t), fraction: 1, tick });
    if (r.ok) txs.push(r.tx);
  }
  return txs;
}

// Out of the game: can't afford the minimum order and holds nothing worth selling.
export function isBankrupt(pf, priceOf) {
  return netWorth(pf, priceOf) < MIN_TRADE;
}
