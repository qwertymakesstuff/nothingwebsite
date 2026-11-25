// The country database. One record per map entity, joining:
//   geo   — world.js (Natural Earth: shape, ISO codes, sovereignty, area, borders)          → facts about the map
//   start — nations.js (rounded real-world estimates) or Natural Earth's 2019 attributes    → realistic starting values
//   game  — derived here (stability, infrastructure, military strength)                       → simulated game values
// Each record says where its numbers came from in `sources`, so the UI can tell facts from game values.
// Records are immutable starting data; anything that changes in play (ownership, relations, buildings,
// regional control) lives in the game state and is read through the helpers at the bottom.
import { COUNTRIES } from '../data/world.js';
import { NATIONS, GOV, TERRITORY_CAPITALS, RESOURCES, CRISIS } from '../data/nations.js';

const BASE_STABILITY = { dem: 70, mon: 72, abs: 66, one: 62, aut: 58, jun: 42, theo: 52, ter: 74 };
export const STRENGTH_TIERS = [[85, 'Superpower'], [70, 'Major power'], [50, 'Regional power'], [30, 'Modest'], [0, 'Minimal']];

// Stable pseudo-random number in [0,1) for a string.
export function hash01(s) { let x = 2166136261; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const RES_BY_COUNTRY = {};
for (const [res, ids] of Object.entries(RESOURCES)) ids.forEach((id, rank) => (RES_BY_COUNTRY[id] ||= []).push({ id: res, rank }));

function build(geo) {
  const row = NATIONS[geo.id];
  const territory = geo.status === 'territory';
  const [capital, population, gdp, gov, troops] = row || [TERRITORY_CAPITALS[geo.id] || null, geo.pop2019 / 1e6, geo.gdp2019, territory ? 'ter' : 'aut', 0];
  const perCapita = population > 0 ? (gdp * 1e9) / (population * 1e6) : 0;
  const infrastructure = clamp(Math.round(36 * Math.log10(Math.max(perCapita, 300)) - 94), 5, 95);
  const strength = clamp(Math.round(100 * (0.5 * Math.log(troops + 1) / Math.log(2500) + 0.5 * Math.log(gdp + 1) / Math.log(30000))), 0, 100);
  const stability = clamp(Math.round((BASE_STABILITY[gov] ?? 60) + (CRISIS[geo.id] || 0) + (hash01(geo.id) - 0.5) * 8), 5, 95);
  return Object.freeze({
    id: geo.id, iso2: geo.iso2, iso3: geo.iso3, isoNum: geo.isoNum,
    name: geo.name, formal: geo.formal, status: geo.status, territory,
    sovereign: geo.owner,                     // who governs it at the start (null for independent countries)
    continent: geo.continent, subregion: geo.subregion, areaKm2: geo.areaKm2,
    neighbors: geo.neighbors, regionCount: geo.regions, flag: geo.flag, tint: geo.tint,
    capital,
    population,                               // millions
    gdp,                                      // US$ billions
    gdpPerCapita: Math.round(perCapita),      // US$
    government: { key: gov, label: GOV[gov] || GOV.aut },
    troops,                                   // thousands, active
    military: { strength, tier: STRENGTH_TIERS.find(([min]) => strength >= min)[1] },
    stability,                                // 0..100
    infrastructure,                           // 0..100
    resources: (RES_BY_COUNTRY[geo.id] || []).sort((a, b) => a.rank - b.rank).map((r) => r.id),
    sources: {
      geography: 'Natural Earth 1:50m',
      population: row ? 'estimate' : 'Natural Earth 2019',
      economy: row ? 'estimate' : 'Natural Earth 2019',
      military: row ? 'estimate' : 'none',
      stability: 'game', infrastructure: 'game', strength: 'game',
    },
  });
}

export const ALL = COUNTRIES.map(build);
const BY_ID = new Map(ALL.map((c) => [c.id, c]));
export const country = (id) => BY_ID.get(id) || null;
export const ids = () => ALL.map((c) => c.id);
export const playable = (id) => { const c = BY_ID.get(id); return !!c && !c.territory && c.population > 0; };

// ——— Live values (game state) ———
// Ownership is country-level today: state.owners[id] overrides the starting sovereign. Regional control
// (partial conquest, separatism) goes in state.regionOwners[regionId] and falls back to the country's owner.
export function ownerOf(state, id) {
  const o = state?.owners?.[id];
  if (o) return o;
  return BY_ID.get(id)?.sovereign || id;
}
export function regionOwnerOf(state, regionId, countryId) { return state?.regionOwners?.[regionId] || ownerOf(state, countryId); }
export function stabilityOf(state, id) { return state && id === state.player ? state.stability : BY_ID.get(id)?.stability ?? 50; }
export function troopsOf(state, id) { return state && id === state.player ? state.army : BY_ID.get(id)?.troops ?? 0; }
export function buildingsOf(state, id) { return state?.buildings?.[id] || []; }
