// Region (first-level subdivision) geography, loaded on demand from data/regions/<countryId>.json.
// Geographic only: names, types, ISO 3166-2 codes, areas and shapes from Natural Earth 1:10m admin-1.
// Gameplay about regions (who controls them, development, unrest) belongs in the game state, keyed by region id,
// so this data never changes during play.
import { country } from './db.js';

const cache = new Map();     // id -> Promise
const resolved = new Map();  // id -> data, once loaded
let fetcher = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); });
export function setFetcher(fn) { fetcher = fn; }

export const hasRegions = (id) => (country(id)?.regionCount || 0) > 1;

// Resolves to { country, source, borders, regions:[{id, iso, name, type, areaKm2, cx, cy, box, d}] } or null.
export function loadRegions(id) {
  if (!hasRegions(id)) return Promise.resolve(null);
  if (!cache.has(id)) {
    const p = fetcher(`data/regions/${encodeURIComponent(id)}.json`)
      .then((data) => { resolved.set(id, data); return data; })
      .catch((e) => { cache.delete(id); throw e; });
    cache.set(id, p);
  }
  return cache.get(id);
}
export const loadedRegions = (id) => resolved.get(id) || null;

// Plural label for a country's subdivisions, from the most common Natural Earth type ("16 states", "47 prefectures").
export function regionNoun(data) {
  const counts = {};
  for (const r of data.regions) counts[r.type] = (counts[r.type] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Region';
  const word = top.toLowerCase();
  const plural = word.endsWith('y') && !/[aeiou]y$/.test(word) ? word.slice(0, -1) + 'ies' : word.endsWith('s') ? word : word + 's';
  return { one: word, many: plural };
}
