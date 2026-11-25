// Builds WORLD DOMINION's geographic data (no gameplay numbers — those live in world-dominion/js/data/nations.js):
//   world-dominion/js/data/world.js        countries: ids, ISO codes, sovereignty, projected shapes, borders, labels
//   world-dominion/data/regions/<ID>.json  first-level subdivisions per country, loaded on demand
//   world-dominion/flags/<iso2>.svg        flags (flag-icons, MIT) for every country that has one
//
// Sources (both public domain): Natural Earth 1:50m admin-0 countries and 1:10m admin-1 states/provinces,
// from github.com/nvkelso/natural-earth-vector (geojson/). Usage:
//   mkdir -p /tmp/wd && cd /tmp/wd && npm init -y && npm i d3-geo@3 topojson-client@3 mapshaper@0.6 flag-icons@7
//   B=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
//   curl -LO $B/ne_50m_admin_0_countries.geojson && curl -LO $B/ne_10m_admin_1_states_provinces.geojson
//   node tools/world-dominion/build-world.mjs /tmp/wd /tmp/wd
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const depsDir = resolve(process.argv[2] || '.');
const neDir = resolve(process.argv[3] || depsDir);
const require = createRequire(depsDir + '/');
const topojson = require('topojson-client');
const mapshaper = require('mapshaper');
const d3 = await import(require.resolve('d3-geo'));
const GAME = fileURLToPath(new URL('../../world-dominion/', import.meta.url));

const W = 1600, H = 820, PAD = 10, EARTH_KM = 6371.0088;
const DROP = new Set(['ATA', 'KAS']);            // Antarctica; Siachen Glacier (a tiny disputed sliver)
// Natural Earth lists these under another sovereign; the game treats them as follows (see README "Data limitations").
const OWNER_OVERRIDE = { PSE: null, ESH: 'MAR' };  // Palestine self-governing; Western Sahara administered by Morocco
const NAME_OVERRIDE = {
  USA: 'United States', COD: 'DR Congo', COG: 'Congo', FRO: 'Faroe Islands', SWZ: 'Eswatini', CYN: 'Northern Cyprus',
  TLS: 'East Timor', CIV: "Côte d'Ivoire", VAT: 'Vatican City', FSM: 'Micronesia', ESH: 'Western Sahara', PSE: 'Palestine',
  BHS: 'Bahamas', GMB: 'Gambia', ALA: 'Åland', MAF: 'Saint-Martin', BLM: 'Saint-Barthélemy', ATF: 'French Southern Lands',
  SGS: 'South Georgia', HMD: 'Heard and McDonald Islands', IOA: 'Australian Indian Ocean Territories', ATC: 'Ashmore and Cartier Islands',
};
const r1 = (n) => Math.round(n * 10) / 10;

// Compact SVG path writer for d3.geoPath: 0.1-unit grid (~2.5 km on the world view), drops repeated points,
// relative "l" segments. Roughly 45% of the size of d3's default output for the same shapes.
class PathWriter {
  constructor() { this.s = ''; this.x = 0; this.y = 0; this.n = 0; }
  static num(t) { const v = t / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/^(-?)0\./, '$1.'); }
  pair(a, b) { const A = PathWriter.num(a), B = PathWriter.num(b); return A + (B[0] === '-' ? '' : ',') + B; }
  moveTo(x, y) { x = Math.round(x * 10); y = Math.round(y * 10); this.s += 'M' + this.pair(x, y); this.x = x; this.y = y; this.n = 0; }
  lineTo(x, y) {
    x = Math.round(x * 10); y = Math.round(y * 10);
    if (x === this.x && y === this.y) return;
    const seg = this.pair(x - this.x, y - this.y);
    this.s += this.n ? (seg[0] === '-' ? seg : ' ' + seg) : 'l' + seg;
    this.n++; this.x = x; this.y = y;
  }
  closePath() { this.s += 'z'; }
  arc() {}
  result() { const r = this.s; this.s = ''; return r; }
}

async function shaper(cmd, inputs) {
  const out = await mapshaper.applyCommands(cmd, inputs);
  return JSON.parse(out[Object.keys(out)[0]]);
}

// ——— Countries ———
const raw = JSON.parse(readFileSync(join(neDir, 'ne_50m_admin_0_countries.geojson'), 'utf8'));
raw.features = raw.features.filter((f) => !DROP.has(f.properties.ADM0_A3));
// Stable id: ISO 3166-1 alpha-3 where Natural Earth has a valid, unique one, else Natural Earth's ADM0_A3.
const isoOwners = {};
for (const f of raw.features) { const p = f.properties; if (p.ISO_A3_EH !== '-99' && (p.ADM0_A3 === p.ISO_A3_EH || !isoOwners[p.ISO_A3_EH])) isoOwners[p.ISO_A3_EH] = p.ADM0_A3; }
const idOf = (p) => (p.ISO_A3_EH !== '-99' && isoOwners[p.ISO_A3_EH] === p.ADM0_A3 ? p.ISO_A3_EH : p.ADM0_A3);
const holdsIso = (p) => p.ISO_A3_EH !== '-99' && isoOwners[p.ISO_A3_EH] === p.ADM0_A3;
const adm0ToId = {}; for (const f of raw.features) adm0ToId[f.properties.ADM0_A3] = idOf(f.properties);
// Sovereign of each entity: the feature that shares its SOV_A3 and whose ADMIN is the SOVEREIGNT.
const sovHome = {}; for (const f of raw.features) { const p = f.properties; if (p.ADMIN === p.SOVEREIGNT) sovHome[p.SOV_A3] = idOf(p); }
for (const f of raw.features) f.properties.WD_ID = idOf(f.properties);

const topo = await shaper('-i in.json -simplify interval=2000 keep-shapes -o out.json format=topojson quantization=1e6', { 'in.json': raw });
const obj = topo.objects[Object.keys(topo.objects)[0]];
const geoms = obj.geometries;
const neighbourIdx = topojson.neighbors(geoms);
const features = topojson.feature(topo, obj).features;
const projection = d3.geoNaturalEarth1().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], { type: 'FeatureCollection', features });
const path = d3.geoPath(projection);
const writer = new PathWriter();
const draw = (g) => { d3.geoPath(projection, writer)(g); return writer.result(); };

const countries = features.map((f, i) => {
  const p = f.properties, id = p.WD_ID;
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c })) : [f.geometry];
  const main = polys.map((g) => ({ g, a: path.area(g) })).sort((a, b) => b.a - a.a)[0].g;
  const [[x0, y0], [x1, y1]] = path.bounds(main);
  let [lx, ly] = projection([p.LABEL_X, p.LABEL_Y]) || path.centroid(main);
  if (!(lx >= x0 - 2 && lx <= x1 + 2 && ly >= y0 - 2 && ly <= y1 + 2)) [lx, ly] = path.centroid(main);
  const sov = sovHome[p.SOV_A3] || id;
  let owner = sov === id ? null : sov;
  if (id in OWNER_OVERRIDE) owner = OWNER_OVERRIDE[id];
  const name = NAME_OVERRIDE[id] || (p.NAME.includes('.') ? p.NAME_LONG : p.NAME);
  return {
    id,
    // ISO codes only on the entity that holds them (Natural Earth repeats Australia's on its Indian Ocean Territories)
    ...(holdsIso(p) ? { iso2: p.ISO_A2_EH, iso3: p.ISO_A3_EH, isoNum: p.ISO_N3_EH } : { iso2: null, iso3: null, isoNum: null }),
    name, formal: p.FORMAL_EN || name, status: owner ? 'territory' : p.TYPE === 'Disputed' || p.TYPE === 'Indeterminate' ? 'disputed' : 'sovereign',
    owner, continent: p.CONTINENT, subregion: p.SUBREGION,
    areaKm2: Math.round(d3.geoArea(f) * EARTH_KM * EARTH_KM),
    pop2019: p.POP_EST, gdp2019: Math.round(p.GDP_MD / 100) / 10,     // Natural Earth's own estimates (people; US$ bn)
    d: draw(f), cx: r1(lx), cy: r1(ly), box: [r1(x0), r1(y0), r1(x1), r1(y1)],
    neighbors: [...new Set(neighbourIdx[i].filter((j) => j !== i).map((j) => geoms[j].properties.WD_ID))],
  };
});

// Map colouring: territories share their owner's colour, so colour owner groups so touching groups differ.
const byId = new Map(countries.map((c) => [c.id, c]));
const group = (c) => c.owner || c.id;
const adj = new Map();
for (const c of countries) for (const n of c.neighbors) {
  const a = group(c), b = group(byId.get(n)); if (a === b) continue;
  if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b);
}
const tints = {};
const groups = [...new Set(countries.map(group))].sort((a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0) || a.localeCompare(b));
for (const g of groups) { const used = new Set([...(adj.get(g) || [])].map((x) => tints[x])); let t = 0; while (used.has(t)) t++; tints[g] = t % 6; }
for (const c of countries) c.tint = tints[group(c)];

// ——— Regions (first-level subdivisions), one file per country ———
const rawR = JSON.parse(readFileSync(join(neDir, 'ne_10m_admin_1_states_provinces.geojson'), 'utf8'));
for (const f of rawR.features) f.properties = { id: f.properties.adm1_code, iso: f.properties.iso_3166_2, name: f.properties.name_en || f.properties.name || f.properties.adm1_code,   // English where Natural Earth has it
  type: f.properties.type_en || f.properties.type || 'Region', country: adm0ToId[f.properties.adm0_a3] };
rawR.features = rawR.features.filter((f) => f.properties.country && byId.has(f.properties.country));
const topoR = await shaper('-i in.json -simplify interval=2500 keep-shapes -o out.json format=topojson quantization=1e6', { 'in.json': rawR });
const objR = topoR.objects[Object.keys(topoR.objects)[0]];
const regionDir = join(GAME, 'data/regions');
rmSync(regionDir, { recursive: true, force: true }); mkdirSync(regionDir, { recursive: true });
const byCountry = {};
for (const g of objR.geometries) (byCountry[g.properties.country] ||= []).push(g);
let regionBytes = 0, regionTotal = 0;
for (const [cid, gs] of Object.entries(byCountry)) {
  if (gs.length < 2) continue;                                           // a single "region" is just the country
  const sub = { type: 'GeometryCollection', geometries: gs };
  const borders = draw(topojson.mesh(topoR, sub, (a, b) => a !== b));
  const regions = topojson.feature(topoR, sub).features.map((f) => {
    const [[x0, y0], [x1, y1]] = path.bounds(f); const [cx, cy] = path.centroid(f);
    return { id: f.properties.id, iso: f.properties.iso && f.properties.iso !== '-99' ? f.properties.iso : null, name: f.properties.name, type: f.properties.type,
      areaKm2: Math.round(d3.geoArea(f) * EARTH_KM * EARTH_KM), cx: r1(cx), cy: r1(cy), box: [r1(x0), r1(y0), r1(x1), r1(y1)], d: draw(f) };
  }).sort((a, b) => b.areaKm2 - a.areaKm2);
  const json = JSON.stringify({ country: cid, source: 'Natural Earth 1:10m admin-1', borders, regions });
  writeFileSync(join(regionDir, cid + '.json'), json);
  byId.get(cid).regions = regions.length; regionBytes += json.length; regionTotal += regions.length;
}

// ——— Flags ———
const flagSrc = join(depsDir, 'node_modules/flag-icons/flags/4x3');
const flagDir = join(GAME, 'flags');
rmSync(flagDir, { recursive: true, force: true }); mkdirSync(flagDir, { recursive: true });
let flags = 0;
for (const c of countries) {
  const code = c.id === 'KOS' ? 'xk' : c.iso2?.toLowerCase();
  if (code && existsSync(join(flagSrc, code + '.svg'))) { copyFileSync(join(flagSrc, code + '.svg'), join(flagDir, code + '.svg')); c.flag = code; flags++; }
  else c.flag = null;
}
copyFileSync(join(depsDir, 'node_modules/flag-icons/LICENSE'), join(flagDir, 'LICENSE.txt'));

// ——— world.js ———
const out = `// GENERATED by tools/world-dominion/build-world.mjs — do not edit by hand.
// GEOGRAPHIC DATA ONLY. Natural Earth 1:50m admin-0 countries (public domain), Natural Earth projection, ${W}x${H}.
// pop2019 / gdp2019 are Natural Earth's own attribute estimates, kept as a reference and fallback; the game's
// starting statistics live in nations.js.
export const MAP_W = ${W};
export const MAP_H = ${H};
export const OUTLINE = ${JSON.stringify(draw({ type: 'Sphere' }))};
export const GRATICULE = ${JSON.stringify(draw(d3.geoGraticule10()))};
export const COUNTRIES = [
${countries.sort((a, b) => a.name.localeCompare(b.name)).map((c) => JSON.stringify({ ...c, regions: c.regions || 0 })).join(',\n')}
];
`;
writeFileSync(join(GAME, 'js/data/world.js'), out);
console.log(`countries: ${countries.length} (${(out.length / 1024).toFixed(0)} KB)`);
console.log(`regions: ${regionTotal} in ${countries.filter((c) => c.regions).length} files (${(regionBytes / 1024).toFixed(0)} KB total)`);
console.log(`flags: ${flags}; without a flag: ${countries.filter((c) => !c.flag).map((c) => c.id).join(' ')}`);
