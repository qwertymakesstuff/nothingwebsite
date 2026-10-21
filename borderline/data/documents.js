// Document types as data: the fields each paper carries, how each one is displayed and
// what it records (`kind`). Fields of the same kind on different documents describe the
// same fact about the entrant, so they must agree.
//   format: 'date' (ISO string), 'nation' (nation code), 'days' (number of days), or plain text

const F = (key, label, kind, format) => ({ key, label, kind, format });
const NAME = [F('surname', 'Surname', 'surname'), F('given', 'Given names', 'given')];

export const DOCUMENT_TYPES = {
  passport: {
    label: 'Passport',
    fields: [...NAME, F('dob', 'Date of birth', 'dob', 'date'), F('sex', 'Sex', 'sex'), F('nationality', 'Nationality', 'nationality', 'nation'),
      F('issuedIn', 'Issued in', 'issuer'), F('expires', 'Expires', 'expiry', 'date'), F('number', 'Passport no.', 'passportNo')],
    extra: ['seal'], // printed on the cover, not a text field
  },
  idCard: {
    label: 'Identity Card',
    fields: [...NAME, F('dob', 'Date of birth', 'dob', 'date'), F('sex', 'Sex', 'sex'), F('district', 'District', 'district'),
      F('expires', 'Expires', 'expiry', 'date'), F('number', 'Card no.', 'idNo')],
  },
  declaration: {
    label: 'Entry Declaration',
    fields: [...NAME, F('nationality', 'Nationality', 'nationality', 'nation'), F('passportNo', 'Passport no.', 'passportNo'),
      F('purpose', 'Purpose of visit', 'purpose'), F('duration', 'Duration of stay', 'duration', 'days'), F('destination', 'Destination', 'destination')],
  },
  workPermit: {
    label: 'Work Permit',
    fields: [...NAME, F('passportNo', 'Passport no.', 'passportNo'), F('occupation', 'Occupation', 'occupation'),
      F('employer', 'Employer', 'employer'), F('validUntil', 'Valid until', 'expiry', 'date'), F('number', 'Permit no.', 'permitNo')],
  },
  transitPass: {
    label: 'Transit Pass',
    fields: [...NAME, F('passportNo', 'Passport no.', 'passportNo'), F('route', 'Route', 'route'),
      F('exitBy', 'Exit by', 'expiry', 'date'), F('number', 'Pass no.', 'passNo')],
  },
  entryPermit: {
    label: 'Entry Permit',
    fields: [...NAME, F('nationality', 'Nationality', 'nationality', 'nation'), F('passportNo', 'Passport no.', 'passportNo'),
      F('purpose', 'Purpose', 'purpose'), F('validUntil', 'Valid until', 'expiry', 'date'), F('number', 'Permit no.', 'entryNo')],
  },
  healthCert: {
    label: 'Health Certificate',
    fields: [...NAME, F('passportNo', 'Passport no.', 'passportNo'), F('vaccine', 'Vaccination', 'vaccine'),
      F('vaccinatedOn', 'Vaccinated on', 'vaccinatedOn', 'date'), F('expires', 'Expires', 'expiry', 'date'), F('number', 'Certificate no.', 'certNo')],
  },
};

// number patterns for documents Corvenna issues (# = digit)
export const NUMBER_PATTERNS = { idCard: 'ID ###-###', workPermit: 'WP-####', transitPass: 'TP-#####', entryPermit: 'EP-######', healthCert: 'HC/##/####' };

// purposes an entry declaration may state, with the stay length range (days) a generated
// entrant asks for, and the extra document a purpose brings with it
export const PURPOSES = {
  Visit: { days: [3, 30] },
  Business: { days: [2, 21] },
  'Family visit': { days: [7, 45] },
  Study: { days: [120, 300] },
  Work: { days: [90, 365], document: 'workPermit' },
  Transit: { days: [1, 3], document: 'transitPass' },
};
