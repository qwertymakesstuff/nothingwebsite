// Regulations as data. Each one names a check (`kind`) the rules engine knows how to run,
// its parameters, the days it is in force (`from`, optional `until`) and the text printed in
// the rulebook. The engine applies exactly the regulations in force on a day, and the
// rulebook shows exactly those.
//   topic:    what the rule is about; versions of one rule share a topic, and a new version
//             names the one it `replaces`. Generated flaws and scoring refer to topics.
//   kinds:    requireDocument, requireForPurpose, notExpired, recognizedIssuer, officialSeal,
//             consistent, restrictNationality, maxDuration, coversStay, allowedValues
//   who:      'all' | 'citizen' | 'foreign' | a list of nation codes

const IDENTITY = ['surname', 'given', 'dob', 'sex', 'nationality', 'passportNo'];

export const REGULATIONS = [
  // Day 1: the basics
  { id: 'passport-required', topic: 'passport-required', from: 1, kind: 'requireDocument',
    params: { document: 'passport', who: 'all' },
    text: 'Every entrant must present a passport.' },
  { id: 'passport-valid', topic: 'passport-valid', from: 1, until: 3, kind: 'notExpired',
    params: { documents: ['passport'] },
    text: 'The passport must not have expired on the date of entry.' },
  { id: 'citizen-id', topic: 'citizen-id', from: 1, kind: 'requireDocument',
    params: { document: 'idCard', who: 'citizen' },
    text: 'Corvennan citizens must also present a national Identity Card.' },
  { id: 'foreign-declaration', topic: 'foreign-declaration', from: 1, kind: 'requireDocument',
    params: { document: 'declaration', who: 'foreign' },
    text: 'Foreign entrants must present a completed Entry Declaration.' },
  { id: 'documents-agree', topic: 'documents-agree', from: 1, until: 4, kind: 'consistent',
    params: { kinds: IDENTITY },
    text: 'Names, dates of birth, sex, nationality and passport numbers must agree on every document.' },

  // Day 2: forgers and workers
  { id: 'passport-issuer', topic: 'passport-issuer', from: 2, kind: 'recognizedIssuer',
    params: { document: 'passport' },
    text: 'The passport must be issued by a recognised office of its nation. See Nations.' },
  { id: 'work-permit', topic: 'work-permit', from: 2, kind: 'requireForPurpose',
    params: { purpose: 'Work', document: 'workPermit' },
    text: 'Foreign entrants declaring Work must present a Work Permit from the Ministry of Labour.' },

  // Day 3: seals and transit
  { id: 'passport-seal', topic: 'passport-seal', from: 3, kind: 'officialSeal',
    params: { document: 'passport' },
    text: 'The passport cover must bear the official seal of its nation. See Nations.' },
  { id: 'transit-pass', topic: 'transit-pass', from: 3, kind: 'requireForPurpose',
    params: { purpose: 'Transit', document: 'transitPass' },
    text: 'Foreign entrants declaring Transit must present a Transit Pass.' },

  // Day 4: every paper in date; the exception for elderly citizens
  { id: 'passport-valid-2', topic: 'passport-valid', replaces: 'passport-valid', from: 4, kind: 'notExpired',
    params: { documents: ['passport'], exception: { nationality: 'COR', minAge: 65, graceDays: 365 } },
    text: 'The passport must not have expired on the date of entry.',
    note: 'Exception: Corvennan citizens aged 65 or over may enter on a passport that expired less than one year ago.' },
  { id: 'papers-valid', topic: 'papers-valid', from: 4, kind: 'notExpired',
    params: { documents: 'others' },
    text: 'Every other paper presented (identity cards, permits, passes, certificates) must not have expired.' },

  // Day 5: entry permits for every foreigner
  { id: 'entry-permit', topic: 'entry-permit', from: 5, kind: 'requireDocument',
    params: { document: 'entryPermit', who: 'foreign' },
    text: 'Foreign entrants must present an Entry Permit from the Ministry of Passage.' },
  { id: 'documents-agree-2', topic: 'documents-agree', replaces: 'documents-agree', from: 5, kind: 'consistent',
    params: { kinds: [...IDENTITY, 'purpose'] },
    text: 'Names, dates of birth, sex, nationality, passport numbers and purpose of visit must agree on every document.',
    note: 'The purpose on the Entry Permit must match the Entry Declaration.' },

  // Day 6: Oskaria suspended (until Day 8)
  { id: 'oskaria-suspended', topic: 'restricted-nationality', from: 6, until: 8, kind: 'restrictNationality',
    params: { nations: ['OSK'], exceptPurposes: ['Transit'] },
    text: 'Entry of Oskarian nationals is suspended. Oskarians in transit may still pass.' },

  // Day 7: limits on stays
  { id: 'max-stay', topic: 'max-stay', from: 7, kind: 'maxDuration',
    params: { days: 30, exceptPurposes: ['Work', 'Study'] },
    text: 'Stays may not exceed 30 days, except for Work or Study.' },
  { id: 'permit-covers-stay', topic: 'permit-covers-stay', from: 7, kind: 'coversStay',
    params: { document: 'workPermit', field: 'validUntil' },
    text: 'A Work Permit must remain valid for the whole of the declared stay.',
    note: 'Count the duration of stay from today and compare it with the permit\'s Valid until date.' },

  // Day 8: the outbreak in the north
  { id: 'health-cert', topic: 'health-cert', from: 8, kind: 'requireDocument',
    params: { document: 'healthCert', who: ['VEL', 'DRA'] },
    text: 'Velsundi and Dravish nationals must present a Health Certificate for Skeld fever.' },

  // Day 9: Oskaria reopened, Kaltrin restricted
  { id: 'kaltrin-restricted', topic: 'restricted-nationality', from: 9, kind: 'restrictNationality',
    params: { nations: ['KAL'], exceptPurposes: ['Family visit', 'Transit'] },
    text: 'Kaltrini nationals may enter only for a Family visit or in Transit.' },

  // Day 10: Port Kessel closed
  { id: 'transit-routes', topic: 'transit-routes', from: 10, kind: 'allowedValues',
    params: { document: 'transitPass', field: 'route', values: ['Ilvar Pass → Sarn Bridge', 'Ilvar Pass → Westmark Gate'] },
    text: 'Port Kessel is closed. Transit Passes must name the Sarn Bridge or Westmark Gate route.' },
];

export const REGULATIONS_BY_ID = Object.fromEntries(REGULATIONS.map(r => [r.id, r]));

const inForce = (r, day) => r.from <= day && (r.until === undefined || day <= r.until);

// rulebook order: a revised rule keeps the place of the version it replaced
const firstOfTopic = topic => REGULATIONS.findIndex(r => r.topic === topic);

// the regulations in force on a campaign day, in rulebook order
export const activeRegulations = day => REGULATIONS.filter(r => inForce(r, day))
  .sort((a, b) => firstOfTopic(a.topic) - firstOfTopic(b.topic));

// the active version of a topic on a day, or null
export const activeTopic = (day, topic) => activeRegulations(day).find(r => r.topic === topic) || null;

// what the morning briefing announces: new rules, changed rules and withdrawn ones
export function regulationChanges(day) {
  const added = REGULATIONS.filter(r => r.from === day);
  const changed = added.filter(r => r.replaces).map(r => ({ rule: r, previous: REGULATIONS_BY_ID[r.replaces] }));
  const replacedIds = new Set(changed.map(c => c.previous.id));
  return {
    added: added.filter(r => !r.replaces),
    changed,
    withdrawn: REGULATIONS.filter(r => r.until === day - 1 && !replacedIds.has(r.id)),
  };
}

// rules no longer in force on `day`, for the archive
export const archivedRegulations = day => REGULATIONS.filter(r => r.until !== undefined && r.until < day);
