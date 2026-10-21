// Builds documents as data and describes them for display. Everything the desk prints and
// everything the rules engine checks comes from these objects.
import { DOCUMENT_TYPES, NUMBER_PATTERNS } from '../data/documents.js';
import { NATIONS } from '../data/setting.js';
import { formatDoc } from './dates.js';

export function displayValue(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  if (field.format === 'date') return formatDoc(value);
  if (field.format === 'nation') return NATIONS[value]?.name || String(value);
  if (field.format === 'days') return `${value} day${value === 1 ? '' : 's'}`;
  return String(value);
}

// the printed fields of a document, in order, with the text the player reads
export function documentFields(doc) {
  const type = DOCUMENT_TYPES[doc.type];
  if (!type) throw new Error(`unknown document type "${doc.type}"`);
  return type.fields.map(f => ({ ...f, value: doc[f.key], display: displayValue(f, doc[f.key]) }));
}

export const fieldOf = (doc, key) => DOCUMENT_TYPES[doc.type]?.fields.find(f => f.key === key) || null;

// fill a pattern such as 'CR-#####' with digits
export const fillPattern = (rng, pattern) => pattern.replace(/#/g, () => String(rng.int(0, 9)));

export const passportNumber = (rng, nation) => fillPattern(rng, NATIONS[nation].number);
export const corvennaNumber = (rng, type) => fillPattern(rng, NUMBER_PATTERNS[type]);

// a document of `type` from a person record and type-specific details
export function makeDocument(type, person, details = {}) {
  const base = { type, surname: person.surname, given: person.given };
  switch (type) {
    case 'passport':
      return { ...base, dob: person.dob, sex: person.sex, nationality: person.nationality, seal: NATIONS[person.nationality].emblem, ...details };
    case 'idCard':
      return { ...base, dob: person.dob, sex: person.sex, ...details };
    case 'declaration':
    case 'entryPermit':
      return { ...base, nationality: person.nationality, passportNo: person.passportNo, ...details };
    case 'workPermit':
    case 'transitPass':
    case 'healthCert':
      return { ...base, passportNo: person.passportNo, ...details };
    default:
      throw new Error(`unknown document type "${type}"`);
  }
}
