// The rules engine: decides from an entrant's papers alone whether they may enter under the
// regulations in force. It never looks at how an entrant was generated.
//   evaluate(visitor, regulations, { date }) → {
//     verdict: 'accept' | 'reject',
//     violations: [{ rule, message, evidence: [{ doc, field }] }],
//     checks: [{ rule, passed, note }]     // every rule that was applied, for reports
//   }
import { NATIONS, SETTING } from '../data/setting.js';
import { DOCUMENT_TYPES } from '../data/documents.js';
import { documentFields } from './documentFactory.js';
import { ageOn, daysBetween, formatDoc } from './dates.js';

const LABEL = type => DOCUMENT_TYPES[type]?.label || type;
const indexOf = (docs, type) => docs.findIndex(d => d.type === type);
const expiryKey = type => DOCUMENT_TYPES[type].fields.find(f => f.kind === 'expiry')?.key;

// the entrant's nationality as their papers state it
export function nationalityOf(docs) {
  const p = docs.find(d => d.type === 'passport');
  if (p) return p.nationality;
  const decl = docs.find(d => d.type === 'declaration');
  if (decl) return decl.nationality;
  return docs.some(d => d.type === 'idCard') ? SETTING.country.code : null;
}

const CHECKS = {
  requireDocument({ document, who }, docs) {
    const nat = nationalityOf(docs);
    const citizen = nat === SETTING.country.code;
    if (who === 'citizen' && !citizen) return { skip: 'not a citizen' };
    if (who === 'foreign' && (citizen || nat === null)) return { skip: 'not a foreign entrant' };
    return indexOf(docs, document) >= 0 ? [] : [{ message: `No ${LABEL(document)} was presented.`, evidence: [] }];
  },

  requireForPurpose({ purpose, document }, docs) {
    const decl = docs.find(d => d.type === 'declaration');
    if (!decl || decl.purpose !== purpose) return { skip: `purpose is not ${purpose}` };
    return indexOf(docs, document) >= 0 ? []
      : [{ message: `Declared purpose is ${purpose}, but no ${LABEL(document)} was presented.`, evidence: [{ doc: indexOf(docs, 'declaration'), field: 'purpose' }] }];
  },

  notExpired({ documents, exception }, docs, ctx) {
    const out = [];
    let note;
    docs.forEach((d, i) => {
      if (!documents.includes(d.type)) return;
      const key = expiryKey(d.type);
      if (!(d[key] < ctx.date)) return;
      if (exception && d.type === 'passport' && d.nationality === exception.nationality
        && ageOn(d.dob, ctx.date) >= exception.minAge && daysBetween(d[key], ctx.date) < exception.graceDays) {
        note = `Expired ${formatDoc(d[key])}, admitted under the exception for citizens aged ${exception.minAge} or over.`;
        return;
      }
      out.push({ message: `The ${LABEL(d.type)} expired on ${formatDoc(d[key])}.`, evidence: [{ doc: i, field: key }] });
    });
    return note ? { violations: out, note } : out;
  },

  recognizedIssuer({ document }, docs) {
    const i = indexOf(docs, document);
    if (i < 0) return { skip: `no ${LABEL(document)}` };
    const d = docs[i], nation = NATIONS[d.nationality];
    if (!nation) return [{ message: `The ${LABEL(document)} names an unrecognised nation.`, evidence: [{ doc: i, field: 'nationality' }] }];
    return nation.cities.includes(d.issuedIn) ? []
      : [{ message: `${d.issuedIn} is not a recognised issuing office of ${nation.name}.`, evidence: [{ doc: i, field: 'issuedIn' }] }];
  },

  officialSeal({ document }, docs) {
    const i = indexOf(docs, document);
    if (i < 0) return { skip: `no ${LABEL(document)}` };
    const nation = NATIONS[docs[i].nationality];
    return nation && docs[i].seal === nation.emblem ? []
      : [{ message: `The seal on the ${LABEL(document)} is not the official seal of ${nation?.name || 'its nation'}.`, evidence: [{ doc: i, field: 'seal' }] }];
  },

  // every field of a listed kind must hold the same value as its first appearance,
  // with the passport (when present) as the reference
  consistent({ kinds }, docs) {
    const order = docs.map((d, i) => i).sort((a, b) => (docs[b].type === 'passport') - (docs[a].type === 'passport'));
    const reference = {};
    const out = [];
    for (const i of order) {
      for (const f of documentFields(docs[i])) {
        if (!kinds.includes(f.kind) || f.value === undefined) continue;
        const ref = reference[f.kind];
        if (!ref) { reference[f.kind] = { doc: i, field: f.key, value: f.value, display: f.display }; continue; }
        if (String(ref.value) !== String(f.value)) {
          out.push({
            message: `${f.label} reads ${f.display} on the ${LABEL(docs[i].type)} but ${ref.display} on the ${LABEL(docs[ref.doc].type)}.`,
            evidence: [{ doc: ref.doc, field: ref.field }, { doc: i, field: f.key }],
          });
        }
      }
    }
    return out;
  },
};

export function evaluate(visitor, regulations, ctx) {
  const docs = visitor.documents;
  const violations = [], checks = [];
  for (const rule of regulations) {
    const check = CHECKS[rule.kind];
    if (!check) throw new Error(`no check for regulation kind "${rule.kind}" (${rule.id})`);
    const r = check(rule.params || {}, docs, ctx);
    if (r && r.skip) { checks.push({ rule: rule.id, passed: true, note: `Not applicable: ${r.skip}.` }); continue; }
    const found = Array.isArray(r) ? r : r.violations;
    for (const v of found) violations.push({ rule: rule.id, ...v });
    checks.push({ rule: rule.id, passed: found.length === 0, note: Array.isArray(r) ? undefined : r.note });
  }
  return { verdict: violations.length ? 'reject' : 'accept', violations, checks };
}
