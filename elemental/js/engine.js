// Elemental game rules: recipe lookup, discovery, hints, search/sort, stats and save handling.
// Pure functions over plain objects (no DOM), so they run under `node --test`.

export const SAVE_VERSION = 1;
export const HINT_LEVELS = 3;
// A hint for another route to something already found never reveals the result (it is known).
export const maxHintLevel = kind => (kind === 'discovery' ? HINT_LEVELS : HINT_LEVELS - 1);

export const pairKey = (a, b) => (a < b ? `${a}+${b}` : `${b}+${a}`);
export const orderedKey = (dragged, target) => `${dragged}>${target}`;

function normalizeRecipe(r) {
  if (Array.isArray(r)) return { a: r[0], b: r[1], result: r[2], ordered: false };
  return { a: r.a, b: r.b, result: r.result, ordered: !!r.ordered };
}

// Builds lookup tables from the data module (ELEMENTS, RECIPES, CATEGORIES, STARTING).
export function buildIndex(data) {
  const elements = new Map(data.ELEMENTS.map(e => [e.id, e]));
  const categories = new Map(data.CATEGORIES.map(c => [c.id, c]));
  const recipes = data.RECIPES.map(normalizeRecipe).map(r => ({ ...r, key: r.ordered ? orderedKey(r.a, r.b) : pairKey(r.a, r.b) }));
  const byKey = new Map();
  const byResult = new Map();
  const byInput = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(v)) m.get(k).push(v); };
  for (const r of recipes) {
    if (!byKey.has(r.key)) byKey.set(r.key, r);
    push(byResult, r.result, r);
    push(byInput, r.a, r);
    push(byInput, r.b, r);
  }
  return { elements, categories, list: data.ELEMENTS, recipes, byKey, byResult, byInput, starting: [...data.STARTING] };
}

// Every element the starting set can eventually make.
export function reachable(index) {
  const known = new Set(index.starting);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of index.recipes) {
      if (!known.has(r.result) && known.has(r.a) && known.has(r.b)) { known.add(r.result); grew = true; }
    }
  }
  return known;
}

// Data sanity checks. Returns a list of human-readable problems (empty when the data is sound).
export function validateData(data) {
  const errors = [];
  const ids = new Set();
  const cats = new Set(data.CATEGORIES.map(c => c.id));
  for (const e of data.ELEMENTS) {
    if (ids.has(e.id)) errors.push(`duplicate element id ${e.id}`);
    ids.add(e.id);
    for (const f of ['id', 'name', 'icon', 'category', 'desc']) if (!e[f] || typeof e[f] !== 'string') errors.push(`${e.id}: missing ${f}`);
    if (!cats.has(e.category)) errors.push(`${e.id}: unknown category ${e.category}`);
  }
  for (const s of data.STARTING) if (!ids.has(s)) errors.push(`unknown starting element ${s}`);
  const seen = new Map();
  for (const raw of data.RECIPES) {
    const r = normalizeRecipe(raw);
    const label = `${r.a} + ${r.b} = ${r.result}`;
    for (const id of [r.a, r.b, r.result]) if (!ids.has(id)) errors.push(`${label}: unknown element ${id}`);
    if (data.STARTING.includes(r.result)) errors.push(`${label}: makes a starting element`);
    if (r.result === r.a || r.result === r.b) errors.push(`${label}: result is one of its own inputs`);
    const key = r.ordered ? orderedKey(r.a, r.b) : pairKey(r.a, r.b);
    if (seen.has(key)) errors.push(`${label}: pair already used by ${seen.get(key)}`);
    seen.set(key, label);
  }
  // An ordered recipe must not share its pair with an unordered one, or one drop direction is ambiguous.
  for (const raw of data.RECIPES) {
    const r = normalizeRecipe(raw);
    if (r.ordered && seen.has(pairKey(r.a, r.b))) errors.push(`${r.a} > ${r.b}: also used by unordered ${seen.get(pairKey(r.a, r.b))}`);
  }
  if (!errors.length) {
    const index = buildIndex(data);
    const reach = reachable(index);
    for (const id of ids) if (!reach.has(id)) errors.push(`${id} can never be made`);
  }
  return errors;
}

// Recipe for dropping `dragged` onto `target`, or null. Unordered recipes match either way round;
// an ordered recipe only matches its own direction and takes priority.
export function findRecipe(index, dragged, target) {
  return index.byKey.get(orderedKey(dragged, target)) || index.byKey.get(pairKey(dragged, target)) || null;
}

export function createProgress(index, now = Date.now()) {
  const discovered = {};
  index.starting.forEach((id, i) => { discovered[id] = { at: now, order: i, via: null }; });
  return {
    version: SAVE_VERSION,
    discovered,
    recipes: {},
    hint: null,
    stats: { attempts: 0, successes: 0, failures: 0, repeats: 0, hintsUsed: 0, startedAt: now, lastPlayed: now },
  };
}

export const isDiscovered = (progress, id) => Object.prototype.hasOwnProperty.call(progress.discovered, id);
export const discoveredIds = progress => Object.keys(progress.discovered);
export const discoveredCount = progress => discoveredIds(progress).length;
export const isFinal = (index, id) => !(index.byInput.get(id) || []).length;

// Combine two discovered elements. Mutates progress and reports what happened:
// { ok: false } for no recipe; otherwise { ok, recipe, result, isNew, isNewRecipe }.
export function combine(progress, index, dragged, target, now = Date.now()) {
  progress.stats.lastPlayed = now;
  if (!isDiscovered(progress, dragged) || !isDiscovered(progress, target)) return { ok: false, reason: 'unknown' };
  progress.stats.attempts++;
  const recipe = findRecipe(index, dragged, target);
  if (!recipe) { progress.stats.failures++; return { ok: false, reason: 'no-recipe' }; }
  progress.stats.successes++;
  const isNew = !isDiscovered(progress, recipe.result);
  const isNewRecipe = !progress.recipes[recipe.key];
  if (isNew) progress.discovered[recipe.result] = { at: now, order: discoveredCount(progress), via: recipe.key };
  else progress.stats.repeats++;
  if (isNewRecipe) progress.recipes[recipe.key] = now;
  if (progress.hint && index.byKey.get(progress.hint.key)?.result === recipe.result) progress.hint = null;
  return { ok: true, recipe, result: recipe.result, isNew, isNewRecipe };
}

// Recipes the player could make right now that would discover something new.
export function availableDiscoveries(progress, index) {
  return index.recipes.filter(r => !isDiscovered(progress, r.result) && isDiscovered(progress, r.a) && isDiscovered(progress, r.b));
}

// Recipes the player could make right now for things they already have but by a route they have not used.
export function availableNewRecipes(progress, index) {
  return index.recipes.filter(r => isDiscovered(progress, r.result) && !progress.recipes[r.key] && isDiscovered(progress, r.a) && isDiscovered(progress, r.b));
}

// The current hint, kept stable until it is discovered. Picks a new target when needed.
// Returns { recipe, level, kind } or null when nothing is left to find.
export function currentHint(progress, index, rand = Math.random) {
  const valid = h => {
    const r = h && index.byKey.get(h.key);
    if (!r || !isDiscovered(progress, r.a) || !isDiscovered(progress, r.b)) return null;
    if (h.kind === 'discovery' && isDiscovered(progress, r.result)) return null;
    if (h.kind === 'recipe' && progress.recipes[r.key]) return null;
    return r;
  };
  let recipe = valid(progress.hint);
  if (!recipe) {
    let pool = availableDiscoveries(progress, index);
    let kind = 'discovery';
    if (!pool.length) { pool = availableNewRecipes(progress, index); kind = 'recipe'; }
    if (!pool.length) { progress.hint = null; return null; }
    recipe = pool[Math.floor(rand() * pool.length) % pool.length];
    progress.hint = { key: recipe.key, level: 0, kind };
  }
  return { recipe, level: progress.hint.level, kind: progress.hint.kind };
}

// Reveal the next level of the current hint (counts as one hint used).
export function revealHint(progress, index, rand = Math.random) {
  const h = currentHint(progress, index, rand);
  if (!h) return null;
  if (progress.hint.level < maxHintLevel(progress.hint.kind)) { progress.hint.level++; progress.stats.hintsUsed++; }
  return currentHint(progress, index, rand);
}

// Swap the hint for a different one without spending a level.
export function skipHint(progress, index, rand = Math.random) {
  const old = progress.hint?.key;
  progress.hint = null;
  const pool = availableDiscoveries(progress, index).filter(r => r.key !== old);
  if (pool.length) {
    const r = pool[Math.floor(rand() * pool.length) % pool.length];
    progress.hint = { key: r.key, level: 0, kind: 'discovery' };
  }
  return currentHint(progress, index, rand);
}

const nameOf = (index, id) => index.elements.get(id)?.name || id;
const catOf = (index, id) => index.categories.get(index.elements.get(id)?.category)?.name || '';

// Words for a hint at a given level. Level 0 shows only what kind of thing is waiting.
export function hintText(index, hint) {
  const { recipe: r, level, kind } = hint;
  const lines = [];
  const resultCat = catOf(index, r.result);
  lines.push(kind === 'discovery'
    ? `There is an undiscovered ${resultCat} element you can make right now.`
    : `You can make ${nameOf(index, r.result)} another way.`);
  if (level >= 1) lines.push(`One ingredient is ${nameOf(index, r.a)}.`);
  if (level >= 2) lines.push(r.ordered
    ? `Drop ${nameOf(index, r.a)} onto ${nameOf(index, r.b)} (this one only works that way round).`
    : `Combine ${nameOf(index, r.a)} with ${nameOf(index, r.b)}.`);
  if (level >= 3 && kind === 'discovery') lines.push(`It makes: ${nameOf(index, r.result)}.`);
  return lines;
}

// Encyclopedia hint for one undiscovered element: the easiest recipe for it, with how many of its
// ingredients the player already has.
export function elementHint(progress, index, id) {
  const options = (index.byResult.get(id) || []).map(r => ({ recipe: r, have: [r.a, r.b].filter(x => isDiscovered(progress, x)).length }));
  options.sort((x, y) => y.have - x.have);
  return options[0] || null;
}

// Search by name (and category name). Prefix matches rank above substring matches.
export function searchIds(index, ids, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [...ids];
  const scored = [];
  for (const id of ids) {
    const e = index.elements.get(id);
    if (!e) continue;
    const name = e.name.toLowerCase();
    const cat = (index.categories.get(e.category)?.name || '').toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.split(/[\s-]+/).some(w => w.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 3;
    else if (cat.startsWith(q)) score = 4;
    if (score >= 0) scored.push([score, id]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(s => s[1]);
}

export const SORTS = { order: 'Discovery order', recent: 'Newest first', name: 'A–Z', category: 'Category' };

export function sortIds(index, progress, ids, mode = 'order') {
  const name = id => index.elements.get(id).name;
  const order = id => progress.discovered[id]?.order ?? Infinity;
  const catPos = new Map([...index.categories.keys()].map((c, i) => [c, i]));
  const out = [...ids];
  if (mode === 'name') out.sort((a, b) => name(a).localeCompare(name(b)));
  else if (mode === 'recent') out.sort((a, b) => order(b) - order(a));
  else if (mode === 'category') out.sort((a, b) => (catPos.get(index.elements.get(a).category) - catPos.get(index.elements.get(b).category)) || name(a).localeCompare(name(b)));
  else out.sort((a, b) => order(a) - order(b));
  return out;
}

export function computeStats(progress, index) {
  const ids = discoveredIds(progress).filter(id => index.elements.has(id));
  const perCategory = [...index.categories.values()].map(c => {
    const all = index.list.filter(e => e.category === c.id);
    return { ...c, found: all.filter(e => isDiscovered(progress, e.id)).length, total: all.length };
  });
  const finals = index.list.filter(e => isFinal(index, e.id));
  const s = progress.stats;
  return {
    discovered: ids.length,
    total: index.list.length,
    percent: Math.floor((ids.length / index.list.length) * 100),
    recipesFound: Object.keys(progress.recipes).filter(k => index.byKey.has(k)).length,
    recipesTotal: index.recipes.length,
    finalsFound: finals.filter(e => isDiscovered(progress, e.id)).length,
    finalsTotal: finals.length,
    available: availableDiscoveries(progress, index).length,
    attempts: s.attempts, successes: s.successes, failures: s.failures, repeats: s.repeats, hintsUsed: s.hintsUsed,
    accuracy: s.attempts ? Math.round((s.successes / s.attempts) * 100) : 0,
    startedAt: s.startedAt, lastPlayed: s.lastPlayed,
    perCategory,
  };
}

// --- saving -----------------------------------------------------------------------------------

export function serialize(progress) {
  return JSON.stringify({ game: 'elemental', ...progress });
}

const num = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? v : d);

// Rebuilds a clean progress object from untrusted saved data (localStorage or an imported file).
// Unknown elements and recipes are dropped; the starting elements are always present.
// Throws an Error with a readable message when the data is not an Elemental save at all.
export function parseSave(text, index, now = Date.now()) {
  let raw;
  try { raw = typeof text === 'string' ? JSON.parse(text) : text; } catch { throw new Error('That is not valid save data (could not read JSON).'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('That is not an Elemental save.');
  if (raw.game !== undefined && raw.game !== 'elemental') throw new Error('That save belongs to a different game.');
  if (typeof raw.version === 'number' && raw.version > SAVE_VERSION) throw new Error('That save is from a newer version of Elemental.');
  if (!raw.discovered || typeof raw.discovered !== 'object') throw new Error('That save has no discoveries in it.');

  const fresh = createProgress(index, now);
  const entries = Array.isArray(raw.discovered)
    ? raw.discovered.map((id, i) => [id, { order: i }])
    : Object.entries(raw.discovered);
  const discovered = { ...fresh.discovered };
  for (const [id, v] of entries) if (index.starting.includes(id) && v && typeof v === 'object') discovered[id] = { ...discovered[id], at: num(v.at, now) };
  const kept = entries
    .filter(([id]) => typeof id === 'string' && index.elements.has(id) && !index.starting.includes(id))
    .map(([id, v]) => [id, v && typeof v === 'object' ? v : {}])
    .sort((a, b) => num(a[1].order, Infinity) - num(b[1].order, Infinity));
  kept.forEach(([id, v], i) => {
    const via = typeof v.via === 'string' && index.byKey.get(v.via)?.result === id ? v.via : null;
    discovered[id] = { at: num(v.at, now), order: index.starting.length + i, via };
  });

  const recipes = {};
  if (raw.recipes && typeof raw.recipes === 'object') {
    for (const [key, at] of Object.entries(raw.recipes)) {
      const r = index.byKey.get(key);
      if (r && discovered[r.result] && discovered[r.a] && discovered[r.b]) recipes[key] = num(at, now);
    }
  }
  for (const v of Object.values(discovered)) if (v.via && !recipes[v.via]) recipes[v.via] = v.at;

  const st = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const stats = { ...fresh.stats };
  for (const k of ['attempts', 'successes', 'failures', 'repeats', 'hintsUsed']) stats[k] = Math.floor(num(st[k]));
  stats.startedAt = num(st.startedAt, now);
  stats.lastPlayed = num(st.lastPlayed, now);

  let hint = null;
  if (raw.hint && typeof raw.hint === 'object' && index.byKey.has(raw.hint.key)) {
    const kind = raw.hint.kind === 'recipe' ? 'recipe' : 'discovery';
    hint = { key: raw.hint.key, level: Math.min(maxHintLevel(kind), Math.floor(num(raw.hint.level))), kind };
  }
  return { version: SAVE_VERSION, discovered, recipes, hint, stats };
}
