// WORLD DOMINION simulation engine — the one place where the world's numbers change.
//
// • Time advances in whole months: tickMonth(state) is the only way the world moves. It never reads the clock,
//   so the same save + the same decisions always give the same result (noise comes from hash(seed, month, id)).
// • Every country runs the same rules, the player's included. AI countries additionally get decide() calls.
// • The UI never calculates: it reads view(state, id), which returns the same breakdowns the tick uses.
//
// Units: population in millions, money in US$ billions (per year for GDP and budgets; treasury is a stock),
// troops in thousands, rates as fractions per year unless named "/mo".
import { ALL, country, ownerOf, hash01 } from './db.js';
import { MIL_SPEND, CRISIS } from '../data/nations.js';

export const POLICY_LIMITS = { tax: [5, 65], military: [0.3, 12], invest: [0, 6], recruit: [0, 4], reserve: [0, 60] };
export const RECRUIT_LEVELS = ['Halt', 'Low', 'Standard', 'High', 'Maximum'];
const RECRUIT_TARGET = [0, 0.15, 0.3, 0.55, 0.85];        // army size each level aims for, as a share of the manpower pool
const GOV_STABILITY = { dem: 62, mon: 64, abs: 60, one: 58, aut: 54, jun: 42, theo: 50, ter: 66 };
const GOV_MANPOWER = { dem: 0.004, mon: 0.004, abs: 0.01, one: 0.01, aut: 0.008, jun: 0.01, theo: 0.01, ter: 0 };   // share of people available to serve
const STRENGTH_REF = 2000;                                 // power at which the strength index reaches 100
export const TIERS = [[85, 'Superpower'], [70, 'Major power'], [50, 'Regional power'], [30, 'Modest'], [0, 'Minimal']];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (n) => Math.round(n * 100) / 100;
const noise = (state, id, key) => hash01(`${state.seed}:${state.month}:${id}:${key}`) - 0.5;   // deterministic, in [-0.5, 0.5)
const perCapita = (n) => (n.pop > 0 ? (n.gdp / n.pop) * 1000 : 0);                              // US$ per person
const infraNorm = (pc) => clamp(36 * Math.log10(Math.max(pc, 300)) - 94, 5, 95);                // what this wealth usually affords
const wage = (n) => clamp(perCapita(n) * 2.2, 1500, 220000);   // yearly cost of a soldier (pay, food, housing, pensions), US$
export const isAgent = (state, id) => !country(id).territory && ownerOf(state, id) === id;

// ——— Setup ———
// A nation's simulated state. Starting values come from the country database (realistic estimates).
export function initNation(id) {
  const c = country(id);
  const n = { pop: c.population, gdp: c.gdp, stability: c.stability, infra: c.infrastructure, troops: c.troops, reserves: 0, quality: 0.4,
    growth: 0, popGrowth: 0, crisis: CRISIS[id] || 0, mods: [], log: [], acquired: [], last: null };
  if (c.territory) return n;
  const upkeepShare = (n.troops * 1000 * wage(n)) / 1e9 / Math.max(n.gdp, 0.01) * 100;           // % of GDP the army costs
  const govBonus = { jun: 1.5, abs: 2, aut: 0.8, one: 0.8, theo: 1.5 }[c.government.key] || 0;
  const military = n.troops <= 0 ? 0.3 : clamp(MIL_SPEND[id] ?? Math.max(1.2 + govBonus, upkeepShare * 1.3), 0.5, 12);   // no army: a token budget
  const invest = 1.5;
  // a tax rate that roughly balances the starting budget (+1% of GDP), given how well this country collects tax
  const eff = 0.55 + 0.45 * n.infra / 100;
  const needed = 0.15 + 0.035 * n.infra / 100 + (military + invest) / 100 + 0.01;
  n.policy = { tax: Math.round(clamp((needed / eff) * 100, 12, 55)), military: r2(military), invest, recruit: 2, reserve: 0 };
  n.treasury = n.gdp * 0.04;                  // a few weeks of cash; public debt is not modelled at the start
  // manpower: the share of people the state can draw on; at least enough that today's army fits the "High" level
  n.manpowerShare = clamp(Math.max(GOV_MANPOWER[c.government.key] || 0.005, n.troops / (RECRUIT_TARGET[3] * Math.max(n.pop * 1000, 1))), 0, 0.06);
  // start on the lowest recruitment level that keeps today's army (none for countries without one)
  const pool = n.pop * 1000 * n.manpowerShare;
  n.policy.recruit = n.troops <= 0 ? 0 : Math.max(1, RECRUIT_TARGET.findIndex((t) => t * pool >= n.troops * 0.98));
  if (n.policy.recruit < 0) n.policy.recruit = 4;
  // equipment quality starts where the current budget would take it
  n.quality = qualityTarget(n, 1);
  n.personality = { militarist: clamp(hash01(id + ':mil') * 0.8 + govBonus * 0.12, 0, 1) };
  return n;
}
export function initNations() { const out = {}; for (const c of ALL) out[c.id] = initNation(c.id); return out; }

// ——— Economy ———
export function budget(state, id) {
  const n = state.nations[id];
  if (!n.policy) return null;
  const p = n.policy, stab = n.stability;
  const efficiency = (0.55 + 0.45 * n.infra / 100) * (stab < 40 ? 0.8 + stab * 0.005 : 1);
  const income = [{ key: 'tax', label: 'Taxes', value: n.gdp * p.tax / 100 * efficiency }];
  // other places this nation governs pay a share of their output (resistance and distance lose the rest)
  let held = 0;
  for (const c of ALL) if (c.id !== id && ownerOf(state, c.id) === id) held += state.nations[c.id].gdp * p.tax / 100 * efficiency * 0.6;
  if (held > 0) income.push({ key: 'held', label: 'Territories', value: held });
  const mil = militaryOf(state, id);
  const debt = Math.max(0, -n.treasury);
  const debtRatio = debt / Math.max(n.gdp, 0.01);
  const interestRate = 0.03 + Math.max(0, debtRatio - 0.6) * 0.05 + (stab < 35 ? 0.03 : 0);
  const expenses = [
    { key: 'services', label: 'Public services', value: n.gdp * 0.15 },
    { key: 'upkeep', label: 'Infrastructure upkeep', value: n.gdp * n.infra / 100 * 0.035 },
    { key: 'military', label: 'Military', value: mil.budget },
    { key: 'invest', label: 'Development', value: n.gdp * p.invest / 100 },
  ];
  if (debt > 0) expenses.push({ key: 'interest', label: 'Debt interest', value: debt * interestRate });
  const inc = income.reduce((a, x) => a + x.value, 0), exp = expenses.reduce((a, x) => a + x.value, 0);
  // per-month figures are what the treasury actually sees each tick
  return { income, expenses, incomeTotal: inc, expenseTotal: exp, balance: inc - exp, monthly: (inc - exp) / 12, efficiency, debt, debtRatio, interestRate };
}

export function growthOf(state, id) {
  const n = state.nations[id], c = country(id);
  const pc = perCapita(n), factors = [];
  const add = (label, v) => { if (Math.abs(v) >= 0.0005) factors.push({ label, value: v }); return v; };
  let g = add('Catch-up potential', 0.02 - 0.006 * Math.log10(Math.max(pc, 300) / 1000));
  g += add('Population growth', n.popGrowth * 0.6);
  g += add('Infrastructure', (n.infra - infraNorm(pc)) * 0.0004);
  g += add('Stability', (n.stability - 60) * 0.0004);
  if (n.crisis) g += add('Conflict and crisis', n.crisis * 0.0006);
  if (n.policy) {
    const b = budget(state, id);
    g += add('Taxes', -Math.max(0, n.policy.tax - 25) * 0.0007 + Math.max(0, 20 - n.policy.tax) * 0.0003);
    g += add('Military burden', -Math.max(0, n.policy.military - 2) * 0.003);
    g += add('Development spending', n.policy.invest * 0.0025);
    g += add('Debt', -Math.max(0, b.debtRatio - 0.6) * 0.04);
  }
  for (const m of n.mods) if (m.growth) g += add(m.label, m.growth);
  return { rate: clamp(g, -0.1, 0.12), factors: factors.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)), territory: c.territory };
}

export function popGrowthOf(state, id) {
  const n = state.nations[id], pc = perCapita(n);
  let r = clamp(0.026 - 0.008 * Math.log10(Math.max(pc, 300) / 500), -0.004, 0.03);
  if (n.stability < 25) r -= 0.01;                       // people leave unstable countries
  return r;
}

// ——— Stability: drifts each month toward a target made of named factors ———
export function stabilityOf(state, id) {
  const n = state.nations[id], c = country(id), factors = [];
  const add = (label, v) => { if (Math.abs(v) >= 0.5) factors.push({ label, value: Math.round(v * 10) / 10 }); return v; };
  let t = add(`${c.government.label}`, GOV_STABILITY[c.government.key] ?? 55);
  if (n.policy) {
    t += add('Taxes', (28 - n.policy.tax) * 0.55);
    const b = budget(state, id);
    if (b.debtRatio > 0.8) t += add('Debt', -Math.min(15, (b.debtRatio - 0.8) * 20));
    const mil = militaryOf(state, id);
    if (mil.readiness < 0.6) t += add('Unpaid soldiers', -4);
    if (mil.poolUsed > 0.6) t += add('Conscription burden', -(mil.poolUsed - 0.6) * 15);
  }
  t += add('Economy', clamp(n.growth * 100 * 2.2, -14, 8));
  t += add('Development', (n.infra - 50) * 0.1);
  if (n.crisis) t += add('Conflict and crisis', n.crisis * 0.8);
  if (n.popGrowth > 0.022 && perCapita(n) < 4000) t += add('Young, fast-growing population', -3);
  // newly acquired land is restless for three years
  for (const a of n.acquired) { const age = state.month - a.month; if (age < 36) t += add(`New territory: ${country(a.id).name}`, -10 * (1 - age / 36)); }
  // places governed by this nation that are much poorer than it resent the gap
  let gap = 0;
  const myPc = perCapita(n);
  for (const o of ALL) if (o.id !== id && ownerOf(state, o.id) === id && !o.territory) {
    const on = state.nations[o.id];
    gap += Math.min(1, on.pop / Math.max(n.pop, 0.01)) * Math.max(0, 1 - perCapita(on) / Math.max(myPc, 1)) * 12;
  }
  if (gap) t += add('Regional inequality', -Math.min(12, gap));
  for (const m of n.mods) if (m.stability) t += add(m.label, m.stability);
  return { value: n.stability, target: clamp(t, 0, 100), factors: factors.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)) };
}

// ——— Military ———
function qualityTarget(n, readiness) {
  const total = n.troops + n.reserves;
  if (!n.policy || total <= 0) return 0.1;
  const perSoldier = (n.gdp * n.policy.military / 100 * 1e9) / (total * 1000);
  return clamp(0.15 + 0.4 * Math.log10(Math.max(perSoldier, 1) / 20000), 0.05, 1) * Math.max(readiness, 0.3);
}
export function militaryOf(state, id) {
  const n = state.nations[id];
  const total = n.troops + n.reserves;
  const pool = n.pop * 1000 * (n.manpowerShare || 0);
  const free = Math.max(0, pool - total);
  const w = wage(n);
  const upkeep = (n.troops * 1000 * w + n.reserves * 1000 * w * 0.25) / 1e9;          // US$ bn per year
  const budgetY = n.policy ? n.gdp * n.policy.military / 100 : 0;
  const readiness = upkeep > 0 ? clamp(budgetY / upkeep, 0, 1) : 1;
  const spare = Math.max(0, budgetY - upkeep);
  const trainCost = (w * 0.5) / 1e6;                                                   // US$ bn per thousand recruits
  const attrition = total * (0.06 / 12 + (1 - readiness) * 0.03 + (n.stability < 30 ? 0.01 : 0));
  // recruitment replaces losses and closes 5% of the gap to the target each month — if there is money and goodwill
  const target = n.policy ? pool * RECRUIT_TARGET[n.policy.recruit] : 0;
  let recruits = 0;
  if (n.policy && n.policy.recruit > 0) {
    const wanted = Math.max(0, attrition + (Math.min(target, pool) - total) * 0.05) * (0.5 + 0.5 * n.stability / 100);
    const affordable = (spare * 0.5 / 12) / Math.max(trainCost, 1e-9);
    recruits = Math.max(0, Math.min(wanted, affordable, free));
  }
  const power = (n.troops + 0.35 * n.reserves) * (0.25 + n.quality) * (0.4 + 0.6 * readiness) * (0.75 + 0.25 * n.infra / 100);
  const strength = Math.round(clamp(100 * Math.log1p(power) / Math.log1p(STRENGTH_REF), 0, 100));
  return { troops: n.troops, reserves: n.reserves, total, pool, free, target, poolUsed: pool > 0 ? total / pool : 1, upkeep, budget: budgetY, readiness,
    recruitsPerMonth: recruits, attritionPerMonth: attrition, quality: n.quality, power, strength, tier: TIERS.find(([m]) => strength >= m)[1] };
}

// ——— The monthly tick ———
// Advances the whole world by one month. Returns what happened to the player, for events and notifications.
export function tickMonth(state) {
  const before = state.nations[state.player] ? snapshot(state, state.player) : null;
  // 1. compute everything from the current state first, so the order countries are processed in doesn't matter
  const plans = {};
  for (const c of ALL) {
    const id = c.id, n = state.nations[id];
    plans[id] = { growth: growthOf(state, id).rate + noise(state, id, 'g') * 0.01, popGrowth: popGrowthOf(state, id), stab: stabilityOf(state, id).target,
      budget: n.policy ? budget(state, id) : null, mil: n.policy ? militaryOf(state, id) : null };
  }
  // 2. apply
  for (const c of ALL) {
    const id = c.id, n = state.nations[id], p = plans[id];
    n.popGrowth = p.popGrowth;
    n.pop *= Math.pow(1 + p.popGrowth, 1 / 12);
    n.growth = p.growth;
    n.gdp *= Math.pow(1 + p.growth, 1 / 12);
    n.stability = clamp(n.stability + (p.stab - n.stability) * 0.1 + noise(state, id, 's') * 0.8, 0, 100);
    n.crisis *= 0.98;
    if (Math.abs(n.crisis) < 0.5) n.crisis = 0;
    if (n.policy) {
      const b = p.budget, m = p.mil;
      n.treasury += b.monthly;
      n.last = { income: b.incomeTotal / 12, expenses: b.expenseTotal / 12, balance: b.monthly, recruits: m.recruitsPerMonth, attrition: m.attritionPerMonth };
      // infrastructure: development spending builds it, wear and unrest erode it
      const dInfra = n.policy.invest * 2.2 * (1 - n.infra / 110) - 1 - (n.stability < 30 ? 2 : 0);
      n.infra = clamp(n.infra + dInfra / 12, 1, 100);
      // army: recruits join the active force, losses come from both, then shift toward the chosen reserve share
      const total = n.troops + n.reserves;
      const lossShare = total > 0 ? m.attritionPerMonth / total : 0;
      n.troops = Math.max(0, n.troops * (1 - lossShare) + m.recruitsPerMonth);
      n.reserves = Math.max(0, n.reserves * (1 - lossShare));
      const target = (n.troops + n.reserves) * n.policy.reserve / 100;
      const shift = (target - n.reserves) * 0.08;
      n.reserves += shift; n.troops -= shift;
      n.quality = clamp(n.quality + (qualityTarget(n, m.readiness) - n.quality) * 0.04, 0.05, 1);
    } else {
      n.stability = clamp(n.stability, 0, 100);
    }
    n.mods = n.mods.map((x) => ({ ...x, months: x.months - 1 })).filter((x) => x.months > 0);
  }
  state.month++;
  // 3. AI countries review their policies (each on its own quarter, so the world doesn't move in lock-step)
  const strengths = {};
  for (const c of ALL) if (state.nations[c.id].policy) strengths[c.id] = militaryOf(state, c.id).strength;
  for (const c of ALL) {
    if (c.id === state.player || !isAgent(state, c.id)) continue;
    if ((state.month + Math.floor(hash01(c.id + ':q') * 3)) % 3 === 0) decide(state, c.id, strengths);
  }
  return before ? { before, after: snapshot(state, state.player) } : null;
}
export function snapshot(state, id) {
  const n = state.nations[id], b = n.policy ? budget(state, id) : null, m = n.policy ? militaryOf(state, id) : null;
  return { treasury: n.treasury, stability: n.stability, growth: n.growth, gdp: n.gdp, pop: n.pop, troops: n.troops, debtRatio: b?.debtRatio || 0, readiness: m?.readiness ?? 1, poolUsed: m?.poolUsed ?? 0, balance: b?.monthly || 0 };
}

// ——— AI ———
// Simple, readable rules. Each country weighs money, stability and the strongest army on its borders,
// nudged by a fixed personality (some build armies, some build roads). Decisions are logged for the UI.
export function decide(state, id, strengths = {}) {
  const n = state.nations[id], p = n.policy, c = country(id);
  const b = budget(state, id), m = militaryOf(state, id), stab = n.stability;
  const did = [];
  const set = (key, v, text) => { const nv = clampPolicy(key, v); if (nv !== p[key]) { p[key] = nv; did.push(text); } };
  const monthsOfCash = n.treasury / Math.max(b.expenseTotal / 12, 0.001);
  // money
  if (b.balance < 0 && (n.treasury < 0 || monthsOfCash < 6)) {
    if (stab > 45 && p.tax < 45) set('tax', p.tax + 1, `Raised taxes to ${p.tax + 1}%`);
    else if (p.invest > 0.5) set('invest', p.invest - 0.5, 'Cut development spending');
    else if (m.readiness > 0.95 && p.military > 1) set('military', p.military - 0.3, 'Cut the military budget');
    else set('tax', p.tax + 1, `Raised taxes to ${p.tax + 1}%`);
  } else if (b.balance > n.gdp * 0.005 && n.treasury > n.gdp * 0.1) {
    if (stab < 55 && p.tax > 15) set('tax', p.tax - 1, `Cut taxes to ${p.tax - 1}%`);
    else if (n.personality.militarist > 0.6) set('military', p.military + 0.3, 'Increased military spending');
    else set('invest', p.invest + 0.5, 'Invested in development');
  }
  // unrest
  if (stab < 35 && p.tax > 18 && n.treasury > 0) set('tax', p.tax - 2, `Cut taxes to calm unrest`);
  // security: compare with the strongest neighbour
  const threat = Math.max(0, ...c.neighbors.map((x) => strengths[x] || 0)) - m.strength;
  if (m.readiness < 0.85) {
    if (b.balance > 0 || n.treasury > 0) set('military', p.military + 0.3, 'Raised pay for unpaid soldiers');
    if (p.recruit > 1) set('recruit', p.recruit - 1, 'Slowed recruitment');
  } else if (m.poolUsed > 0.85 && p.recruit > 1) set('recruit', p.recruit - 1, 'Slowed recruitment: few recruits left');
  else if (threat > 12 && p.recruit < 4 && b.balance >= 0) {
    set('recruit', p.recruit + 1, 'Stepped up recruitment');
    if (n.personality.militarist > 0.4) set('military', p.military + 0.2, 'Increased military spending');
  } else if (threat < -25 && b.balance < 0 && p.recruit > 1 && n.personality.militarist < 0.5) set('recruit', p.recruit - 1, 'Eased recruitment to save money');
  if (did.length) { n.log.unshift({ month: state.month, text: did.join(' · ') }); n.log.length = Math.min(n.log.length, 5); }
  return did;
}

// ——— Player-facing actions (the UI calls these; they are the same rules the AI uses) ———
export function clampPolicy(key, v) {
  const [lo, hi] = POLICY_LIMITS[key];
  const x = clamp(v, lo, hi);
  return key === 'recruit' || key === 'tax' || key === 'reserve' ? Math.round(x) : Math.round(x * 10) / 10;
}
export function setPolicy(state, id, key, v) { const n = state.nations[id]; n.policy[key] = clampPolicy(key, v); return n.policy[key]; }
// Event outcomes: immediate changes plus timed modifiers ({ label, months, stability?, growth? }).
export function applyEffects(state, id, fx) {
  const n = state.nations[id];
  if (fx.treasury) n.treasury += fx.treasury;
  if (fx.treasuryShare) n.treasury += n.gdp * fx.treasuryShare;
  if (fx.debtRelief && n.treasury < 0) n.treasury *= 1 - fx.debtRelief;
  if (fx.stability) n.stability = clamp(n.stability + fx.stability, 0, 100);
  if (fx.troops) n.troops = Math.max(0, n.troops + fx.troops);
  if (fx.policy) for (const [k, v] of Object.entries(fx.policy)) setPolicy(state, id, k, n.policy[k] + v);
  if (fx.mod) n.mods.push({ ...fx.mod });
}
// Conquest, independence and annexation all go through here (used from the military checkpoint on).
export function transferOwnership(state, id, newOwner) {
  state.owners[id] = newOwner;
  if (newOwner !== id) state.nations[newOwner].acquired.push({ id, month: state.month });
}

// ——— Everything the UI shows about a country, in one place ———
export function view(state, id) {
  const n = state.nations[id], c = country(id);
  const st = stabilityOf(state, id), gr = growthOf(state, id);
  const out = { id, pop: n.pop, gdp: n.gdp, gdpPerCapita: perCapita(n), growth: n.growth, projectedGrowth: gr.rate, growthFactors: gr.factors,
    popGrowth: n.popGrowth || popGrowthOf(state, id), stability: n.stability, stabilityTarget: st.target, stabilityFactors: st.factors, infra: n.infra,
    resources: c.resources, government: c.government, agent: isAgent(state, id), log: n.log, mods: n.mods };
  if (n.policy) Object.assign(out, { treasury: n.treasury, policy: { ...n.policy }, budget: budget(state, id), military: militaryOf(state, id) });
  else out.military = { troops: 0, reserves: 0, strength: 0, tier: 'None (defended by its sovereign)' };
  return out;
}
