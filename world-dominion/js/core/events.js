// Events: things that happen to the player because of the simulation. Two severities drive the UI:
//   major — pauses the game and opens the event window; every choice has concrete effects (sim.applyEffects)
//   minor — a dismissible notification; the game keeps running
// checkEvents(state, change) runs after each monthly tick with the player's before/after snapshot.
// Conditions read the simulation; nothing here invents numbers.
import { country } from './db.js';
import { budget } from './sim.js';
import { money } from './format.js';

const DEFS = [
  {
    id: 'protests', severity: 'major', cooldown: 18,
    when: (s, { after }) => after.stability < 45,
    build(s) {
      const n = s.nations[s.player], c = country(s.player);
      const cost = Math.max(0.05, Math.round(n.gdp * 0.004 * 100) / 100);
      return {
        tone: 'warn', icon: 'megaphone', kicker: 'Domestic unrest', title: `Protests in ${c.capital || c.name}`,
        body: `Stability has fallen to ${Math.round(n.stability)}%. Thousands are marching through ${c.capital || 'the capital'} over prices, taxes and jobs. Ministers want a decision before the crowds grow.`,
        choices: [
          { label: 'Meet their demands', effects: { treasury: -cost, mod: { label: 'Concessions to protesters', months: 12, stability: 8 } }, outcome: 'The crowds disperse, satisfied for now.' },
          { label: 'Promise reforms later', effects: { mod: { label: 'Promised reforms', months: 6, stability: 2 } }, outcome: 'The protesters go home, unconvinced.' },
          { label: 'Send in the police', effects: { stability: -3, mod: { label: 'Crackdown', months: 12, stability: -6 } }, outcome: 'The square is cleared. Resentment is spreading.' },
        ],
      };
    },
  },
  {
    id: 'debt-crisis', severity: 'major', cooldown: 24,
    when: (s, { after }) => after.debtRatio > 0.9,
    build(s) {
      const n = s.nations[s.player], b = budget(s, s.player);
      return {
        tone: 'bad', icon: 'coins', kicker: 'Debt crisis', title: 'Lenders lose patience',
        body: `Public debt has reached ${Math.round(b.debtRatio * 100)}% of the economy and interest now costs ${money(b.expenses.find((x) => x.key === 'interest')?.value || 0)} a year. Markets demand action.`,
        choices: [
          { label: 'Austerity: raise taxes, cut development', effects: { policy: { tax: 5, invest: -1 }, mod: { label: 'Austerity', months: 12, stability: -8 } }, outcome: 'Belts are tightened. The budget starts to recover.' },
          { label: 'Borrow from abroad on harsh terms', effects: { mod: { label: 'Foreign loan conditions', months: 18, growth: -0.01 } }, outcome: 'The money keeps flowing, at a price to growth.' },
          { label: 'Default on part of the debt', effects: { debtRelief: 0.5, mod: { label: 'Debt default', months: 24, stability: -12, growth: -0.02 } }, outcome: 'Half the debt is gone, and so is the country’s credit.' },
        ],
      };
    },
  },
  { id: 'recession', severity: 'minor', cooldown: 6, when: (s, { before, after }) => after.growth < 0 && before.growth >= 0,
    note: (s, { after }) => `<b>Recession.</b> The economy is shrinking (${(after.growth * 100).toFixed(1)}% a year).`, tone: 'bad', icon: 'economy' },
  { id: 'recovery', severity: 'minor', cooldown: 6, when: (s, { before, after }) => after.growth > 0 && before.growth <= 0 && s.month > 1,
    note: () => '<b>Recovery.</b> The economy is growing again.', tone: 'good', icon: 'economy' },
  { id: 'deficit', severity: 'minor', cooldown: 12, when: (s, { before, after }) => after.treasury < 0 && before.treasury >= 0,
    note: () => '<b>The treasury is empty.</b> You are now borrowing, and debt costs interest.', tone: 'bad', icon: 'coins' },
  { id: 'unpaid', severity: 'minor', cooldown: 12, when: (s, { before, after }) => after.readiness < 0.8 && before.readiness >= 0.8,
    note: () => '<b>Soldiers are going unpaid.</b> The military budget no longer covers the army; troops are leaving.', tone: 'bad', icon: 'military' },
  { id: 'manpower', severity: 'minor', cooldown: 24, when: (s, { after }) => after.poolUsed > 0.9 && s.nations[s.player].policy.recruit >= 3,
    note: () => '<b>Recruitment is drying up.</b> Few people are left who can be called up.', tone: 'warn', icon: 'people' },
  { id: 'unrest-low', severity: 'minor', cooldown: 6, when: (s, { before, after }) => after.stability < 55 && before.stability >= 55,
    note: () => '<b>Discontent is growing.</b> Stability has slipped below 55%.', tone: 'warn', icon: 'stability' },
];

// Returns the events that fire this month (at most one major), and records cooldowns.
export function checkEvents(state, change) {
  if (!change) return [];
  const out = [];
  let major = false;
  for (const d of DEFS) {
    const ready = (state.cooldowns[d.id] ?? -Infinity) + d.cooldown <= state.month;
    if (!ready || !d.when(state, change)) continue;
    if (d.severity === 'major') { if (major) continue; major = true; out.push({ id: d.id, severity: 'major', ...d.build(state) }); }
    else out.push({ id: d.id, severity: 'minor', message: d.note(state, change), tone: d.tone, icon: d.icon });
    state.cooldowns[d.id] = state.month;
  }
  return out;
}
export function forceEvent(state, id) { const d = DEFS.find((x) => x.id === id); return { id, severity: d.severity, ...d.build(state) }; }

// Human-readable effect chips for a choice.
export function describeEffects(fx) {
  const out = [];
  const sign = (v) => (v > 0 ? '+' : '−');
  if (fx.treasury) out.push({ text: `${money(fx.treasury, { sign: true })} treasury`, dir: fx.treasury > 0 ? 'up' : 'down' });
  if (fx.debtRelief) out.push({ text: `−${Math.round(fx.debtRelief * 100)}% debt`, dir: 'up' });
  if (fx.stability) out.push({ text: `${sign(fx.stability)}${Math.abs(fx.stability)} stability now`, dir: fx.stability > 0 ? 'up' : 'down' });
  if (fx.policy?.tax) out.push({ text: `${sign(fx.policy.tax)}${Math.abs(fx.policy.tax)} pts tax`, dir: 'neutral' });
  if (fx.policy?.invest) out.push({ text: `${sign(fx.policy.invest)}${Math.abs(fx.policy.invest)}% development`, dir: fx.policy.invest > 0 ? 'up' : 'down' });
  if (fx.mod?.stability) out.push({ text: `${sign(fx.mod.stability)}${Math.abs(fx.mod.stability)} stability for ${fx.mod.months} months`, dir: fx.mod.stability > 0 ? 'up' : 'down' });
  if (fx.mod?.growth) out.push({ text: `${sign(fx.mod.growth)}${Math.abs(fx.mod.growth * 100)}% growth for ${fx.mod.months} months`, dir: fx.mod.growth > 0 ? 'up' : 'down' });
  if (!out.length) out.push({ text: 'No immediate effect', dir: 'neutral' });
  return out;
}
