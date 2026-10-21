// Regulations as data. Each one names a check (`kind`) the rules engine knows how to run,
// its parameters, the day it takes effect and the text printed in the rulebook. The engine
// applies exactly the regulations active on a day, and the rulebook shows exactly those.
//   kinds: requireDocument, requireForPurpose, notExpired, recognizedIssuer, officialSeal, consistent

export const REGULATIONS = [
  {
    id: 'passport-required', from: 1, kind: 'requireDocument',
    params: { document: 'passport', who: 'all' },
    text: 'Every entrant must present a passport.',
  },
  {
    id: 'passport-valid', from: 1, kind: 'notExpired',
    params: { documents: ['passport'], exception: { nationality: 'COR', minAge: 65, graceDays: 365 } },
    text: 'The passport must not have expired on the date of entry.',
    note: 'Exception: Corvennan citizens aged 65 or over may enter on a passport that expired less than one year ago.',
  },
  {
    id: 'passport-issuer', from: 1, kind: 'recognizedIssuer',
    params: { document: 'passport' },
    text: 'The passport must be issued by a recognised office of its nation. See Nations.',
  },
  {
    id: 'passport-seal', from: 1, kind: 'officialSeal',
    params: { document: 'passport' },
    text: 'The passport cover must bear the official seal of its nation. See Nations.',
  },
  {
    id: 'citizen-id', from: 1, kind: 'requireDocument',
    params: { document: 'idCard', who: 'citizen' },
    text: 'Corvennan citizens must also present a national Identity Card.',
  },
  {
    id: 'foreign-declaration', from: 1, kind: 'requireDocument',
    params: { document: 'declaration', who: 'foreign' },
    text: 'Foreign entrants must present a completed Entry Declaration.',
  },
  {
    id: 'work-permit', from: 1, kind: 'requireForPurpose',
    params: { purpose: 'Work', document: 'workPermit' },
    text: 'Foreign entrants declaring Work must present a Work Permit from the Ministry of Labour.',
  },
  {
    id: 'transit-pass', from: 1, kind: 'requireForPurpose',
    params: { purpose: 'Transit', document: 'transitPass' },
    text: 'Foreign entrants declaring Transit must present a Transit Pass.',
  },
  {
    id: 'documents-agree', from: 1, kind: 'consistent',
    params: { kinds: ['surname', 'given', 'dob', 'sex', 'nationality', 'passportNo'] },
    text: 'Names, dates of birth, sex, nationality and passport numbers must agree on every document.',
  },
  {
    id: 'papers-valid', from: 1, kind: 'notExpired',
    params: { documents: ['idCard', 'workPermit', 'transitPass'] },
    text: 'Identity Cards, Work Permits and Transit Passes must not have expired.',
  },
];

export const REGULATIONS_BY_ID = Object.fromEntries(REGULATIONS.map(r => [r.id, r]));

// the regulations in force on a campaign day, in rulebook order
export const activeRegulations = day => REGULATIONS.filter(r => r.from <= day && (r.until === undefined || day <= r.until));
