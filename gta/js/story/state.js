// LAST EXIT: story state (pure, serialisable). Flags, relationships, choices, finished missions, the active mission and its checkpoint.
// Conditions are short strings so dialogue and missions can branch without code:
//   flag:name   !flag:name   flag:name=value   done:M03   !done:M03   rel:MARA>=TRUSTED   choice:evidence=darius   end:A
// joined with && and || (&& binds tighter).
export const VERSION = 1;
export const LEVELS = { HOSTILE: 0, DISTRUSTED: 1, NEUTRAL: 2, TRUSTED: 3 };
export const LEVEL_NAMES = ['HOSTILE', 'DISTRUSTED', 'NEUTRAL', 'TRUSTED'];
export const REL_MIN = -4, REL_MAX = 4;
/** relationship value -> named level: <= -3 hostile, -2..-1 distrusted, 0..1 neutral, >= 2 trusted */
export const levelOf = v => v <= -3 ? 0 : v < 0 ? 1 : v < 2 ? 2 : 3;
export const levelName = v => LEVEL_NAMES[levelOf(v)];

export function createState() {
  return { v: VERSION, started: false, done: {}, active: null, failed: {}, flags: {}, rel: {}, choices: {}, paid: {}, unlocked: {}, ending: null, played: {}, calls: {} };
}
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const clampRel = v => Math.max(REL_MIN, Math.min(REL_MAX, Math.round(v)));
/** Take whatever was in storage and return a valid state: unknown or broken parts are dropped, never thrown on. */
export function migrate(raw) {
  const s = createState(); if (!isObj(raw)) return s;
  if (typeof raw.v === 'number' && raw.v > VERSION) return s;                       // from a newer game: don't guess
  s.started = !!raw.started;
  for (const k of ['done', 'failed', 'flags', 'choices', 'paid', 'unlocked', 'played', 'calls']) if (isObj(raw[k])) s[k] = Object.assign({}, raw[k]);
  if (isObj(raw.rel)) for (const [k, v] of Object.entries(raw.rel)) if (Number.isFinite(v)) s.rel[k] = clampRel(v);
  if (isObj(raw.active) && typeof raw.active.id === 'string' && Number.isInteger(raw.active.step) && raw.active.step >= 0) s.active = { id: raw.active.id, step: raw.active.step, cp: Number.isInteger(raw.active.cp) && raw.active.cp >= 0 && raw.active.cp <= raw.active.step ? raw.active.cp : raw.active.step, vars: isObj(raw.active.vars) ? Object.assign({}, raw.active.vars) : {} };
  if (typeof raw.ending === 'string') s.ending = raw.ending;
  return s;
}
export const getRel = (s, who) => s.rel[who] || 0;
export function addRel(s, who, n) { s.rel[who] = clampRel(getRel(s, who) + n); return s.rel[who]; }
export const setFlag = (s, k, v) => { s.flags[k] = v === undefined ? true : v; };
/** apply { set: {flag: value}, rel: {WHO: delta}, choice: {key: value}, unlock: [ids] } */
export function applyEffects(s, fx) {
  if (!fx) return;
  if (fx.set) for (const [k, v] of Object.entries(fx.set)) setFlag(s, k, v);
  if (fx.rel) for (const [k, v] of Object.entries(fx.rel)) addRel(s, k, v);
  if (fx.choice) Object.assign(s.choices, fx.choice);
  if (fx.unlock) for (const id of fx.unlock) s.unlocked[id] = true;
}

const cmp = { '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '=': (a, b) => a === b, '!=': (a, b) => a !== b };
function atom(t, s) {
  t = t.trim(); if (!t) return true;
  let neg = false; if (t[0] === '!' ) { neg = true; t = t.slice(1); }
  const i = t.indexOf(':'), kind = i < 0 ? t : t.slice(0, i), rest = i < 0 ? '' : t.slice(i + 1); let r;
  if (kind === 'flag') { const m = rest.match(/^([A-Za-z0-9_]+)(?:=(.+))?$/); r = m ? (m[2] === undefined ? !!s.flags[m[1]] : String(s.flags[m[1]]) === m[2]) : false; }
  else if (kind === 'done') r = !!s.done[rest];
  else if (kind === 'failed') r = !!s.failed[rest];
  else if (kind === 'choice') { const m = rest.match(/^([A-Za-z0-9_]+)=(.+)$/); r = m ? String(s.choices[m[1]]) === m[2] : false; }
  else if (kind === 'end') r = s.ending === rest;
  else if (kind === 'unlocked') r = !!s.unlocked[rest];
  else if (kind === 'rel') { const m = rest.match(/^([A-Z]+)(>=|<=|!=|>|<|=)([A-Z]+)$/); r = m && m[3] in LEVELS ? cmp[m[2]](levelOf(getRel(s, m[1])), LEVELS[m[3]]) : false; }
  else r = false;
  return neg ? !r : r;
}
/** Evaluate a condition string (or an array = all of them). Empty / missing = true. */
export function evalCond(cond, s) {
  if (cond == null || cond === '') return true;
  if (Array.isArray(cond)) return cond.every(c => evalCond(c, s));
  return String(cond).split('||').some(or => or.split('&&').every(a => atom(a, s)));
}
/** every identifier a condition string mentions (used by the content tests to catch typos) */
export function condRefs(cond) {
  const out = []; if (cond == null) return out; if (Array.isArray(cond)) return cond.flatMap(condRefs);
  for (const or of String(cond).split('||')) for (let a of or.split('&&')) { a = a.trim().replace(/^!/, ''); if (a) { const i = a.indexOf(':'); out.push({ kind: i < 0 ? a : a.slice(0, i), rest: i < 0 ? '' : a.slice(i + 1) }); } }
  return out;
}
