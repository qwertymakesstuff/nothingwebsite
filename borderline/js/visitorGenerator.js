// Generates ordinary entrants from structured data: a person, the papers they carry and,
// optionally, one planted flaw. The flaw is recorded in `generated` for tests and reports;
// whether the entrant may enter is decided by the rules engine from the papers alone.
import { NATIONS, SETTING, FORGED_SEALS } from '../data/setting.js';
import { NAMES } from '../data/names.js';
import { PURPOSES, DOCUMENT_TYPES } from '../data/documents.js';
import { makeDocument, passportNumber, corvennaNumber } from './documentFactory.js';
import { addDays, ageOn } from './dates.js';
import { poolPortrait } from './portrait.js';

// What the regulations in force demand of a traveller's papers. Clean entrants are built to
// satisfy these; flaws break exactly one of them.
export function requirements(rules = []) {
  const of = kind => rules.filter(r => r.kind === kind);
  const requires = doc => of('requireDocument').find(r => r.params.document === doc);
  const health = requires('healthCert');
  const covers = of('coversStay')[0];
  return {
    topics: new Set(rules.map(r => r.topic || r.id)),
    entryPermit: Boolean(requires('entryPermit')),
    healthNations: health ? health.params.who : [],
    maxStay: of('maxDuration')[0]?.params || null,
    coversStay: Boolean(covers),
    routes: of('allowedValues').find(r => r.params.document === 'transitPass' && r.params.field === 'route')?.params.values || null,
    restricted: of('restrictNationality').map(r => r.params),
    grace: rules.find(r => r.topic === 'passport-valid' && r.params.exception)?.params.exception || null,
  };
}

const SKIN = ['#f0d0b4', '#e8c0a0', '#e2b896', '#d6a882', '#c99a76', '#a8724e', '#8a5a3c', '#6a4430'];
const HAIR = ['#1e1814', '#2a2420', '#3a2a1e', '#5a3a22', '#7a5530', '#a87a40', '#c9a15a', '#8a8580', '#d8d4cc'];
const COATS = ['#3c4a5a', '#4a4a3a', '#5a4a3a', '#6b5a48', '#2f3f3a', '#7a3b32', '#3b3346', '#4d5550', '#5c4632'];
const COLLARS = ['#e6e0d0', '#d9d2c0', '#cfc8b4', '#efe8d8', '#b9a77a'];
const STYLES = { M: ['short', 'short', 'cap', 'bald'], F: ['long', 'bun', 'scarf', 'short'] };

const titleCase = s => s.charAt(0) + s.slice(1).toLowerCase();
const expiryKey = type => DOCUMENT_TYPES[type].fields.find(f => f.kind === 'expiry')?.key;
const weighted = (rng, weights) => {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = rng.next() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1][0];
};

// a believable misspelling that is always different from the original
export function misspell(rng, word) {
  const w = word.toUpperCase();
  const i = rng.int(1, Math.max(1, w.length - 2));
  const options = [
    w.slice(0, i) + w[i] + w.slice(i),                                  // doubled letter
    w.length > 4 ? w.slice(0, i) + w.slice(i + 1) : null,               // dropped letter
    w[i] !== w[i + 1] && w[i + 1] ? w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2) : null, // swapped pair
    w.slice(0, i) + ('AEIOU'.includes(w[i]) ? 'Y' : 'E') + w.slice(i + 1), // replaced letter
  ].filter(v => v && v !== w);
  return rng.pick(options);
}

function tweakDigit(rng, number) {
  const digits = [...number].map((c, i) => (/\d/.test(c) ? i : -1)).filter(i => i >= 0);
  const i = rng.pick(digits);
  const d = (Number(number[i]) + rng.int(1, 9)) % 10;
  return number.slice(0, i) + d + number.slice(i + 1);
}

const has = type => v => v.documents.some(d => d.type === type);
const doc = (v, type) => v.documents.find(d => d.type === type);
const remove = (v, type) => { v.documents = v.documents.filter(d => d.type !== type); };
const others = v => v.documents.filter(d => d.type !== 'passport');
const isCitizen = v => doc(v, 'passport')?.nationality === SETTING.country.code;
const restrictionFor = (ctx, nat) => ctx.need.restricted.find(r => r.nations.includes(nat)) || null;
const coveredByGrace = (p, ctx) => Boolean(ctx.need.grace) && p.nationality === ctx.need.grace.nationality && ageOn(p.dob, ctx.date) >= ctx.need.grace.minAge;
// papers whose expiry a flaw may move into the past without breaking a second rule
const expirable = (v, ctx) => others(v).filter(d => expiryKey(d.type) && !(d.type === 'workPermit' && ctx.need.coversStay));

// every flaw a generated entrant can carry, the regulation topic it breaks and the change it
// makes; applies(visitor, ctx) says whether it suits an entrant. `legal: true` marks a
// special case that looks wrong but is allowed by an exception.
export const FLAWS = [
  {
    id: 'expiredPassport', category: 'expired', topic: 'passport-valid', applies: v => has('passport')(v),
    apply(rng, v, ctx) {
      const p = doc(v, 'passport');
      // anyone the expiry exception covers must be past its grace period to be refused
      const lo = coveredByGrace(p, ctx) ? ctx.need.grace.graceDays + 1 : 1;
      p.expires = addDays(ctx.date, -rng.int(lo, lo + 900));
    },
  },
  {
    id: 'elderGrace', category: 'exception', topic: 'passport-valid', legal: true,
    applies: (v, ctx) => has('passport')(v) && coveredByGrace(doc(v, 'passport'), ctx),
    apply(rng, v, ctx) { doc(v, 'passport').expires = addDays(ctx.date, -rng.int(1, ctx.need.grace.graceDays - 1)); },
  },
  {
    id: 'expiredPaper', category: 'expired', topic: 'papers-valid', applies: (v, ctx) => expirable(v, ctx).length > 0,
    apply(rng, v, ctx) {
      const d = rng.pick(expirable(v, ctx));
      d[expiryKey(d.type)] = addDays(ctx.date, -rng.int(1, 400));
    },
  },
  {
    id: 'missingPassport', category: 'incomplete', topic: 'passport-required', applies: has('declaration'),
    apply(rng, v) { remove(v, 'passport'); v.lines.greet = rng.pick(['My passport? I... it was stolen on the train. I have these.', 'I left my passport with my agent. These should be enough.']); },
  },
  { id: 'missingIdCard', category: 'incomplete', topic: 'citizen-id', applies: has('idCard'), apply: (rng, v) => remove(v, 'idCard') },
  {
    id: 'missingDeclaration', category: 'incomplete', topic: 'foreign-declaration',
    applies: (v, ctx) => has('declaration')(v) && !restrictionFor(ctx, doc(v, 'passport').nationality),
    apply: (rng, v) => remove(v, 'declaration'),
  },
  { id: 'missingWorkPermit', category: 'incomplete', topic: 'work-permit', applies: has('workPermit'), apply: (rng, v) => remove(v, 'workPermit') },
  { id: 'missingTransitPass', category: 'incomplete', topic: 'transit-pass', applies: has('transitPass'), apply: (rng, v) => remove(v, 'transitPass') },
  { id: 'missingEntryPermit', category: 'incomplete', topic: 'entry-permit', applies: has('entryPermit'), apply: (rng, v) => remove(v, 'entryPermit') },
  { id: 'missingHealthCert', category: 'incomplete', topic: 'health-cert', applies: has('healthCert'), apply: (rng, v) => remove(v, 'healthCert') },
  {
    id: 'nameMismatch', category: 'contradictory', topic: 'documents-agree', applies: v => others(v).length > 0,
    apply(rng, v) {
      const d = rng.pick(others(v));
      const key = rng.pick(['surname', 'given']);
      d[key] = misspell(rng, d[key]);
    },
  },
  {
    id: 'numberMismatch', category: 'contradictory', topic: 'documents-agree', applies: v => others(v).some(d => d.passportNo),
    apply(rng, v) {
      const d = rng.pick(others(v).filter(x => x.passportNo));
      d.passportNo = tweakDigit(rng, d.passportNo);
    },
  },
  {
    id: 'dobMismatch', category: 'contradictory', topic: 'documents-agree', applies: has('idCard'),
    apply(rng, v) {
      const d = doc(v, 'idCard');
      d.dob = addDays(d.dob, rng.pick([-1, 1]) * rng.int(1, 3) * 365 + rng.int(-20, 20));
    },
  },
  {
    id: 'nationalityMismatch', category: 'contradictory', topic: 'documents-agree', applies: has('declaration'),
    apply(rng, v) {
      const d = doc(v, 'declaration');
      d.nationality = rng.pick(Object.keys(NATIONS).filter(c => c !== d.nationality && c !== SETTING.country.code));
    },
  },
  {
    id: 'purposeMismatch', category: 'contradictory', topic: 'documents-agree',
    applies: (v, ctx) => has('entryPermit')(v) && ctx.need.topics.has('documents-agree') && ctx.rules.some(r => r.kind === 'consistent' && r.params.kinds.includes('purpose')),
    apply(rng, v) {
      const d = doc(v, 'entryPermit');
      d.purpose = rng.pick(Object.keys(PURPOSES).filter(p => p !== d.purpose));
    },
  },
  {
    id: 'unknownIssuer', category: 'forged', topic: 'passport-issuer', applies: has('passport'),
    apply(rng, v) { doc(v, 'passport').issuedIn = rng.pick(SETTING.unrecognizedCities); },
  },
  {
    id: 'forgedSeal', category: 'forged', topic: 'passport-seal', applies: has('passport'),
    apply(rng, v) { const p = doc(v, 'passport'); p.seal = FORGED_SEALS[NATIONS[p.nationality].emblem]; },
  },
  {
    // perfect papers, but from a nation whose entry is restricted, for a purpose not allowed
    id: 'restrictedNationality', category: 'restricted', topic: 'restricted-nationality',
    applies: (v, ctx) => ctx.need.restricted.length > 0 && has('passport')(v) && has('declaration')(v) && !restrictionFor(ctx, doc(v, 'passport').nationality),
    apply(rng, v, ctx) {
      const rule = rng.pick(ctx.need.restricted);
      const nat = rng.pick(rule.nations), n = NATIONS[nat];
      const p = doc(v, 'passport');
      const number = passportNumber(rng, nat);
      Object.assign(p, { nationality: nat, seal: n.emblem, issuedIn: rng.pick(n.cities), number });
      for (const d of others(v)) {
        if ('passportNo' in d) d.passportNo = number;
        if ('nationality' in d) d.nationality = nat;
      }
      const decl = doc(v, 'declaration');
      if (rule.exceptPurposes.includes(decl.purpose)) {
        decl.purpose = rng.pick(['Visit', 'Business'].filter(x => !rule.exceptPurposes.includes(x)));
        if (doc(v, 'entryPermit')) doc(v, 'entryPermit').purpose = decl.purpose;
      }
    },
  },
  {
    id: 'overstay', category: 'travel', topic: 'max-stay',
    applies: (v, ctx) => ctx.need.maxStay && has('declaration')(v) && !['Transit', ...ctx.need.maxStay.exceptPurposes].includes(doc(v, 'declaration').purpose),
    apply(rng, v, ctx) { doc(v, 'declaration').duration = ctx.need.maxStay.days + rng.int(1, 60); },
  },
  {
    id: 'permitTooShort', category: 'travel', topic: 'permit-covers-stay',
    applies: (v, ctx) => ctx.need.coversStay && has('workPermit')(v) && has('declaration')(v) && doc(v, 'declaration').duration >= 2,
    apply(rng, v, ctx) { doc(v, 'workPermit').validUntil = addDays(ctx.date, rng.int(0, doc(v, 'declaration').duration - 1)); },
  },
  {
    id: 'closedRoute', category: 'travel', topic: 'transit-routes',
    applies: (v, ctx) => Boolean(ctx.need.routes) && has('transitPass')(v),
    apply(rng, v, ctx) { doc(v, 'transitPass').route = rng.pick(SETTING.transitRoutes.filter(r => !ctx.need.routes.includes(r))); },
  },
];
export const FLAWS_BY_ID = Object.fromEntries(FLAWS.map(f => [f.id, f]));

const GREETINGS = {
  citizen: ['Back home at last. The roads in the east are terrible.', 'Good day. I have been away for work.', 'Evening, officer. It has been a long journey.'],
  Visit: ['I have always wanted to see {dest}.', 'Just a short visit to {dest}. Sightseeing.'],
  Business: ['I have meetings in {dest} this week.', 'Business. My buyers in {dest} are expecting me.'],
  'Family visit': ['My daughter lives in {dest}. I have not seen her in years.', 'Visiting my brother in {dest}.'],
  Study: ['I have a place at the institute in {dest}.', 'I am here to study. The term starts soon.'],
  Work: ['I have a job waiting at {employer}.', 'Work. {employer} took me on for the season.'],
  Transit: ['I am only passing through. I leave by {route}.', 'Transit only, officer. I will be gone in a day or two.'],
};
const ACCEPTED = ['Thank you.', 'Finally. Thank you, officer.', 'Good. Have a pleasant day.', 'Much obliged.'];
const REJECTED = ['What? Why?', 'This is ridiculous.', 'I came all this way...', 'You are making a mistake.'];

const DEFAULT_NATIONS = { COR: 3, OSK: 2, VEL: 2, DRA: 2, KAL: 2 };

function makePerson(rng, ctx) {
  const nationality = weighted(rng, ctx.nations || DEFAULT_NATIONS);
  const sex = rng.chance(0.5) ? 'M' : 'F';
  const pool = NAMES[nationality];
  const given = rng.pick(pool[sex]), surname = rng.pick(pool.surnames);
  const dob = addDays(ctx.date, -(rng.int(18, 80) * 365 + rng.int(0, 364)));
  return { nationality, sex, given: given.toUpperCase(), surname: surname.toUpperCase(), dob, passportNo: passportNumber(rng, nationality) };
}

function makeLook(rng, sex, age) {
  return {
    skin: rng.pick(SKIN),
    hair: age > 62 && rng.chance(0.7) ? rng.pick(['#8a8580', '#d8d4cc']) : rng.pick(HAIR.slice(0, 7)),
    hairStyle: rng.pick(STYLES[sex]),
    coat: rng.pick(COATS), collar: rng.pick(COLLARS),
    beard: sex === 'M' && rng.chance(0.3), glasses: rng.chance(0.2),
  };
}

// a purpose the regulations allow this nationality, by the day's weights
function choosePurpose(rng, ctx, nationality) {
  const restriction = restrictionFor(ctx, nationality);
  const allowed = Object.keys(PURPOSES).filter(p => !restriction || restriction.exceptPurposes.includes(p));
  return weighted(rng, Object.fromEntries(allowed.map(p => [p, ctx.purposes?.[p] ?? 1])));
}

// Builds one entrant whose papers satisfy `rules` (the regulations in force), then plants a
// flaw if asked: `flaw` is null for papers in order, a flaw id, or 'random' to pick one that
// suits the entrant from `allowedFlaws` (default: all).
//   nations / purposes: optional relative weights for the day's mix of travellers
export function generateVisitor(rng, { id, date, rules = [], flaw = null, allowedFlaws = null, nations = null, purposes = null }) {
  const ctx = { date, rules, need: requirements(rules), nations, purposes };
  const p = makePerson(rng, ctx);
  const citizen = p.nationality === SETTING.country.code;
  const documents = [makeDocument('passport', p, {
    issuedIn: rng.pick(NATIONS[p.nationality].cities), expires: addDays(date, rng.int(1, 2200)), number: p.passportNo,
  })];
  let purpose = null;
  const fill = {};
  if (citizen) {
    documents.push(makeDocument('idCard', p, { district: rng.pick(SETTING.districts), expires: addDays(date, rng.int(30, 3000)), number: corvennaNumber(rng, 'idCard') }));
  } else {
    purpose = choosePurpose(rng, ctx, p.nationality);
    const spec = PURPOSES[purpose];
    let duration = rng.int(...spec.days);
    const limit = ctx.need.maxStay;
    if (limit && !limit.exceptPurposes.includes(purpose)) duration = Math.min(duration, limit.days);
    const destination = purpose === 'Transit' ? 'In transit' : rng.pick(SETTING.destinations);
    documents.push(makeDocument('declaration', p, { purpose, duration, destination }));
    fill.dest = destination;
    if (spec.document === 'workPermit') {
      const employer = rng.pick(SETTING.employers);
      fill.employer = employer;
      // always long enough to cover the declared stay
      documents.push(makeDocument('workPermit', p, { occupation: rng.pick(SETTING.occupations), employer, validUntil: addDays(date, duration + rng.int(0, 300)), number: corvennaNumber(rng, 'workPermit') }));
    }
    if (spec.document === 'transitPass') {
      const route = rng.pick(ctx.need.routes || SETTING.transitRoutes);
      fill.route = route.split('→ ')[1];
      documents.push(makeDocument('transitPass', p, { route, exitBy: addDays(date, rng.int(Math.max(1, duration), 4)), number: corvennaNumber(rng, 'transitPass') }));
    }
    if (ctx.need.entryPermit) {
      documents.push(makeDocument('entryPermit', p, { nationality: p.nationality, purpose, validUntil: addDays(date, duration + rng.int(0, 120)), number: corvennaNumber(rng, 'entryPermit') }));
    }
  }
  if (ctx.need.healthNations.includes(p.nationality)) {
    const on = addDays(date, -rng.int(5, 300));
    documents.push(makeDocument('healthCert', p, { vaccine: SETTING.vaccine, vaccinatedOn: on, expires: addDays(on, 365), number: corvennaNumber(rng, 'healthCert') }));
  }
  const greet = rng.pick(GREETINGS[citizen ? 'citizen' : purpose]).replace(/\{(\w+)\}/g, (_, k) => fill[k] || '');
  const visitor = {
    id,
    name: `${titleCase(p.given)} ${titleCase(p.surname)}`,
    look: makeLook(rng, p.sex, ageOn(p.dob, date)),
    lines: { greet, accepted: rng.pick(ACCEPTED), rejected: rng.pick(REJECTED) },
    documents,
    generated: { flaw: null, topic: null, category: 'legitimate' },
  };
  let chosen = flaw;
  if (flaw === 'random') {
    const pool = FLAWS.filter(f => (!allowedFlaws || allowedFlaws.includes(f.id)) && f.applies(visitor, ctx));
    chosen = pool.length ? rng.pick(pool).id : null;
  }
  if (chosen) {
    const f = FLAWS_BY_ID[chosen];
    if (!f) throw new Error(`unknown flaw "${chosen}"`);
    if (!f.applies(visitor, ctx)) throw new Error(`flaw "${chosen}" does not suit ${visitor.name}`);
    f.apply(rng, visitor, ctx);
    visitor.generated = { flaw: f.id, topic: f.topic, category: f.category };
  }
  // the face fits the person the passport describes (a flaw may have changed the nationality)
  const face = doc(visitor, 'passport') || p;
  visitor.portrait = poolPortrait(face.nationality, face.sex || p.sex, face.dob || p.dob, date);
  return visitor;
}
