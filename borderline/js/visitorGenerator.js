// Generates ordinary entrants from structured data: a person, the papers they carry and,
// optionally, one planted flaw. The flaw is recorded in `generated` for tests and reports;
// whether the entrant may enter is decided by the rules engine from the papers alone.
import { NATIONS, SETTING, FORGED_SEALS } from '../data/setting.js';
import { NAMES } from '../data/names.js';
import { PURPOSES } from '../data/documents.js';
import { makeDocument, passportNumber, corvennaNumber } from './documentFactory.js';
import { addDays, ageOn } from './dates.js';
import { REGULATIONS_BY_ID } from '../data/regulations.js';

// the expiry exception: who it covers and for how long, as the regulation states it
const GRACE = REGULATIONS_BY_ID['passport-valid'].params.exception;
const coveredByGrace = (p, date) => p.nationality === GRACE.nationality && ageOn(p.dob, date) >= GRACE.minAge;

const SKIN = ['#f0d0b4', '#e8c0a0', '#e2b896', '#d6a882', '#c99a76', '#a8724e', '#8a5a3c', '#6a4430'];
const HAIR = ['#1e1814', '#2a2420', '#3a2a1e', '#5a3a22', '#7a5530', '#a87a40', '#c9a15a', '#8a8580', '#d8d4cc'];
const COATS = ['#3c4a5a', '#4a4a3a', '#5a4a3a', '#6b5a48', '#2f3f3a', '#7a3b32', '#3b3346', '#4d5550', '#5c4632'];
const COLLARS = ['#e6e0d0', '#d9d2c0', '#cfc8b4', '#efe8d8', '#b9a77a'];
const STYLES = { M: ['short', 'short', 'cap', 'bald'], F: ['long', 'bun', 'scarf', 'short'] };

const titleCase = s => s.charAt(0) + s.slice(1).toLowerCase();
const DOCS_WITH_EXPIRY = { idCard: 'expires', workPermit: 'validUntil', transitPass: 'exitBy' };

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
const remove = type => v => { v.documents = v.documents.filter(d => d.type !== type); };
const others = v => v.documents.filter(d => d.type !== 'passport');

// every flaw a generated entrant can carry, the regulation it concerns and the change it
// makes; applies(visitor, ctx) says whether it suits an entrant. `legal: true` marks a
// special case that looks wrong but is allowed by an exception.
export const FLAWS = [
  {
    id: 'expiredPassport', category: 'expired', rule: 'passport-valid', applies: () => true,
    apply(rng, v, ctx) {
      const p = v.documents.find(d => d.type === 'passport');
      // anyone the expiry exception covers must be past its grace period to be refused
      const lo = coveredByGrace(p, ctx.date) ? GRACE.graceDays + 1 : 1;
      p.expires = addDays(ctx.date, -rng.int(lo, lo + 900));
    },
  },
  {
    id: 'elderGrace', category: 'exception', rule: 'passport-valid', legal: true,
    applies: (v, ctx) => coveredByGrace(v.documents.find(d => d.type === 'passport'), ctx.date),
    apply(rng, v, ctx) { v.documents.find(d => d.type === 'passport').expires = addDays(ctx.date, -rng.int(1, GRACE.graceDays - 1)); },
  },
  {
    id: 'missingPassport', category: 'incomplete', rule: 'passport-required', applies: has('declaration'),
    apply(rng, v) { remove('passport')(v); v.lines.greet = rng.pick(['My passport? I... it was stolen on the train. I have these.', 'I left my passport with my agent. These should be enough.']); },
  },
  {
    id: 'expiredPaper', category: 'expired', rule: 'papers-valid',
    applies: v => v.documents.some(d => DOCS_WITH_EXPIRY[d.type]),
    apply(rng, v, ctx) {
      const d = rng.pick(v.documents.filter(x => DOCS_WITH_EXPIRY[x.type]));
      d[DOCS_WITH_EXPIRY[d.type]] = addDays(ctx.date, -rng.int(1, 400));
    },
  },
  { id: 'missingIdCard', category: 'incomplete', rule: 'citizen-id', applies: has('idCard'), apply: (rng, v) => remove('idCard')(v) },
  { id: 'missingDeclaration', category: 'incomplete', rule: 'foreign-declaration', applies: has('declaration'), apply: (rng, v) => remove('declaration')(v) },
  { id: 'missingWorkPermit', category: 'incomplete', rule: 'work-permit', applies: has('workPermit'), apply: (rng, v) => remove('workPermit')(v) },
  { id: 'missingTransitPass', category: 'incomplete', rule: 'transit-pass', applies: has('transitPass'), apply: (rng, v) => remove('transitPass')(v) },
  {
    id: 'nameMismatch', category: 'contradictory', rule: 'documents-agree', applies: v => others(v).length > 0,
    apply(rng, v) {
      const d = rng.pick(others(v));
      const key = rng.pick(['surname', 'given']);
      d[key] = misspell(rng, d[key]);
    },
  },
  {
    id: 'numberMismatch', category: 'contradictory', rule: 'documents-agree', applies: v => others(v).some(d => d.passportNo),
    apply(rng, v) {
      const d = rng.pick(others(v).filter(x => x.passportNo));
      d.passportNo = tweakDigit(rng, d.passportNo);
    },
  },
  {
    id: 'dobMismatch', category: 'contradictory', rule: 'documents-agree', applies: has('idCard'),
    apply(rng, v) {
      const d = v.documents.find(x => x.type === 'idCard');
      d.dob = addDays(d.dob, rng.pick([-1, 1]) * rng.int(1, 3) * 365 + rng.int(-20, 20));
    },
  },
  {
    id: 'nationalityMismatch', category: 'contradictory', rule: 'documents-agree', applies: has('declaration'),
    apply(rng, v) {
      const d = v.documents.find(x => x.type === 'declaration');
      d.nationality = rng.pick(Object.keys(NATIONS).filter(c => c !== d.nationality && c !== SETTING.country.code));
    },
  },
  {
    id: 'unknownIssuer', category: 'forged', rule: 'passport-issuer', applies: () => true,
    apply(rng, v) { v.documents.find(d => d.type === 'passport').issuedIn = rng.pick(SETTING.unrecognizedCities); },
  },
  {
    id: 'forgedSeal', category: 'forged', rule: 'passport-seal', applies: () => true,
    apply(rng, v) { const p = v.documents.find(d => d.type === 'passport'); p.seal = FORGED_SEALS[NATIONS[p.nationality].emblem]; },
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

function makePerson(rng, ctx) {
  const nationality = rng.chance(0.3) ? SETTING.country.code : rng.pick(Object.keys(NATIONS).filter(c => c !== SETTING.country.code));
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

// `flaw`: null for papers in order, a flaw id, or 'random' to pick one that suits the entrant
// from `allowedFlaws` (default: all)
export function generateVisitor(rng, { id, date, flaw = null, allowedFlaws = null }) {
  const ctx = { date };
  const p = makePerson(rng, ctx);
  const citizen = p.nationality === SETTING.country.code;
  const documents = [makeDocument('passport', p, {
    issuedIn: rng.pick(NATIONS[p.nationality].cities), expires: addDays(date, rng.int(1, 2200)), number: p.passportNo,
  })];
  let purpose = null, fill = {};
  if (citizen) {
    documents.push(makeDocument('idCard', p, { district: rng.pick(SETTING.districts), expires: addDays(date, rng.int(30, 3000)), number: corvennaNumber(rng, 'idCard') }));
  } else {
    purpose = rng.pick(Object.keys(PURPOSES));
    const spec = PURPOSES[purpose];
    const destination = purpose === 'Transit' ? 'In transit' : rng.pick(SETTING.destinations);
    documents.push(makeDocument('declaration', p, { purpose, duration: rng.int(...spec.days), destination }));
    fill.dest = destination;
    if (spec.document === 'workPermit') {
      const employer = rng.pick(SETTING.employers);
      fill.employer = employer;
      documents.push(makeDocument('workPermit', p, { occupation: rng.pick(SETTING.occupations), employer, validUntil: addDays(date, rng.int(60, 700)), number: corvennaNumber(rng, 'workPermit') }));
    }
    if (spec.document === 'transitPass') {
      const route = rng.pick(SETTING.transitRoutes);
      fill.route = route.split('→ ')[1];
      documents.push(makeDocument('transitPass', p, { route, exitBy: addDays(date, rng.int(1, 4)), number: corvennaNumber(rng, 'transitPass') }));
    }
  }
  const greet = rng.pick(GREETINGS[citizen ? 'citizen' : purpose]).replace(/\{(\w+)\}/g, (_, k) => fill[k] || '');
  const visitor = {
    id,
    name: `${titleCase(p.given)} ${titleCase(p.surname)}`,
    look: makeLook(rng, p.sex, ageOn(p.dob, date)),
    lines: { greet, accepted: rng.pick(ACCEPTED), rejected: rng.pick(REJECTED) },
    documents,
    generated: { flaw: null, rule: null, category: 'legitimate' },
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
    visitor.generated = { flaw: f.id, rule: f.rule, category: f.category };
  }
  return visitor;
}
