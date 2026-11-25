// Map overlays ("map modes"). An overlay decides each country's fill and describes its legend; the map just paints.
// To add one: push a definition with
//   id, label, icon, hint                     — shown in the overlay picker
//   fill(country, ctx) -> CSS colour          — ctx = { state, nations } (nations = live simulated values;
//                                                the start screen passes a freshly initialised world)
//   legend(ctx) -> null | { title, steps:[{ color, label }], note }
//   describe?(country, ctx) -> short string    — shown in the map tooltip
// Colours are CSS variables from css/tokens.css, so overlays follow the design system.
import { country, ownerOf } from './db.js';
import { money, people } from './format.js';
import { militaryOf } from './sim.js';

// A stepped scale: thresholds are lower bounds of steps 1..n-1 (step 0 is everything below the first).
// value(country, ctx) reads the live simulation through ctx.nations.
function stepped({ value, thresholds, ramp, format, title, note, zeroIsData = false }) {
  const step = (v) => { let i = 0; while (i < thresholds.length && v >= thresholds[i]) i++; return i; };
  return {
    fill: (c, ctx) => { const v = value(c, ctx); return v > 0 || (zeroIsData && v != null) ? `var(${ramp}-${step(v)})` : 'var(--land-none)'; },
    legend: () => ({
      title, note,
      steps: [0, ...thresholds.map((_, i) => i + 1)].map((i) => ({
        color: `var(${ramp}-${i})`,
        label: i === 0 ? '< ' + format(thresholds[0]) : i === thresholds.length ? format(thresholds[i - 1]) + '+' : format(thresholds[i - 1]),
      })),
    }),
    describe: (c, ctx) => { const v = value(c, ctx); return v > 0 || (zeroIsData && v != null) ? format(v) : c.population === 0 ? 'Uninhabited' : 'No data'; },
  };
}

export const OVERLAYS = [
  {
    id: 'political', label: 'Political', icon: 'flag', hint: 'Countries and who governs them',
    fill(c, { state }) {
      const owner = ownerOf(state, c.id);
      if (state && owner === state.player) return c.id === state.player ? 'var(--land-player)' : 'var(--land-player-ter)';
      return `var(--land-${country(owner)?.tint ?? c.tint})`;
    },
    legend: () => null,
    describe(c, { state }) {
      const owner = ownerOf(state, c.id);
      return owner !== c.id ? `Governed by ${country(owner).name}` : c.government.label;
    },
  },
  {
    id: 'population', label: 'Population', icon: 'people', hint: 'How many people live in each country',
    ...stepped({ value: (c, { nations }) => nations[c.id].pop, thresholds: [1, 5, 20, 50, 100, 300], ramp: '--ramp-pop', format: (v) => people(v), title: 'Population', note: 'People per country' }),
  },
  {
    id: 'economy', label: 'Economy', icon: 'economy', hint: 'Size of each economy (GDP)',
    ...stepped({ value: (c, { nations }) => nations[c.id].gdp, thresholds: [5, 25, 100, 500, 1500, 5000], ramp: '--ramp-eco', format: (v) => money(v), title: 'Economy (GDP)', note: 'US dollars per year' }),
  },
  {
    id: 'stability', label: 'Stability', icon: 'stability', hint: 'How settled each country is',
    ...stepped({ value: (c, { nations }) => (c.population > 0 ? nations[c.id].stability : null), thresholds: [20, 35, 45, 55, 65, 75], ramp: '--ramp-stab', zeroIsData: true,
      format: (v) => Math.round(v) + '%', title: 'Stability', note: 'Low means unrest' }),
  },
  {
    id: 'military', label: 'Military', icon: 'military', hint: 'Military strength (not just troop numbers)',
    ...stepped({ value: (c, ctx) => (ctx.nations[c.id].policy ? militaryOf({ nations: ctx.nations }, c.id).strength : 0), thresholds: [20, 35, 50, 65, 80, 90], ramp: '--ramp-mil',
      format: (v) => 'Strength ' + Math.round(v), title: 'Military strength', note: 'Troops, reserves, equipment and readiness' }),
  },
];
export const overlay = (id) => OVERLAYS.find((o) => o.id === id) || OVERLAYS[0];
