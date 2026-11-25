// Map overlays ("map modes"). An overlay decides each country's fill and describes its legend; the map just paints.
// To add one: push a definition with
//   id, label, icon, hint                     — shown in the overlay picker
//   fill(country, ctx) -> CSS colour          — ctx = { state } (game state, or null on the start screen)
//   legend(ctx) -> null | { title, steps:[{ color, label }], note }
//   describe?(country, ctx) -> short string    — shown in the map tooltip
// Colours are CSS variables from css/tokens.css, so overlays follow the design system.
import { country, ownerOf } from './db.js';
import { money, people } from './format.js';

// A stepped scale: thresholds are lower bounds of steps 1..n-1 (step 0 is everything below the first).
function stepped({ value, thresholds, ramp, format, title, note }) {
  const step = (v) => { let i = 0; while (i < thresholds.length && v >= thresholds[i]) i++; return i; };
  return {
    fill: (c) => { const v = value(c); return v > 0 ? `var(${ramp}-${step(v)})` : 'var(--land-none)'; },
    legend: () => ({
      title, note,
      steps: [0, ...thresholds.map((_, i) => i + 1)].map((i) => ({
        color: `var(${ramp}-${i})`,
        label: i === 0 ? '< ' + format(thresholds[0]) : i === thresholds.length ? format(thresholds[i - 1]) + '+' : format(thresholds[i - 1]),
      })),
    }),
    describe: (c) => { const v = value(c); return v > 0 ? format(v) : c.population === 0 ? 'Uninhabited' : 'No data'; },
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
    ...stepped({ value: (c) => c.population, thresholds: [1, 5, 20, 50, 100, 300], ramp: '--ramp-pop', format: (v) => people(v), title: 'Population', note: 'People per country' }),
  },
  {
    id: 'economy', label: 'Economy', icon: 'economy', hint: 'Size of each economy (GDP)',
    ...stepped({ value: (c) => c.gdp, thresholds: [5, 25, 100, 500, 1500, 5000], ramp: '--ramp-eco', format: (v) => money(v), title: 'Economy (GDP)', note: 'US dollars per year' }),
  },
];
export const overlay = (id) => OVERLAYS.find((o) => o.id === id) || OVERLAYS[0];
