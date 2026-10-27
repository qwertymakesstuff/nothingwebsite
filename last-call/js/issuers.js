// The ID reference sheet: who issues cards in this world and what a genuine one looks like.
// The forgery rule checks a card against exactly this data, and the rulebook prints it.

import { int } from './rng.js';

const digits = (rng, n) => Array.from({ length: n }, () => int(rng, 0, 9)).join('');
const letter = rng => 'ABCDEFGHJKLMNPRSTUVWXYZ'[int(rng, 0, 22)];

export const ISSUERS = {
  calder: {
    id: 'calder', short: 'Calder', full: 'STATE OF CALDER', kind: 'Driver Licence',
    color: 'teal', hex: '#2f8f8a', emblem: 'heron',
    pattern: /^CA-\d{4}-\d{4}$/, patternText: 'CA-0000-0000',
    number: rng => `CA-${digits(rng, 4)}-${digits(rng, 4)}`,
    badNumber: rng => `CA-${digits(rng, 3)}-${digits(rng, 5)}`,
    misspelled: 'STATE OF CALDAR',
  },
  marrow: {
    id: 'marrow', short: 'Marrow Bay', full: 'MARROW BAY TERRITORY', kind: 'Identity Card',
    color: 'amber', hex: '#c98d2a', emblem: 'lighthouse',
    pattern: /^MB\d{7}$/, patternText: 'MB0000000',
    number: rng => `MB${digits(rng, 7)}`,
    badNumber: rng => `MD${digits(rng, 7)}`,
    misspelled: 'MARROW BEY TERRITORY',
  },
  vesten: {
    id: 'vesten', short: 'Vesten', full: 'VESTEN PROVINCE', kind: 'Driver Licence',
    color: 'plum', hex: '#7d4a8c', emblem: 'oak',
    pattern: /^V\d{3}-\d{3}-\d{3}$/, patternText: 'V000-000-000',
    number: rng => `V${digits(rng, 3)}-${digits(rng, 3)}-${digits(rng, 3)}`,
    badNumber: rng => `V${digits(rng, 3)}-${digits(rng, 6)}`,
    misspelled: 'VESTAN PROVINCE',
  },
  northfold: {
    id: 'northfold', short: 'Northfold', full: 'NORTHFOLD', kind: 'Identity Card',
    color: 'slate', hex: '#4c6aa6', emblem: 'star',
    pattern: /^NF\d{2}[A-Z]\d{4}$/, patternText: 'NF00X0000',
    number: rng => `NF${digits(rng, 2)}${letter(rng)}${digits(rng, 4)}`,
    badNumber: rng => `NF${digits(rng, 3)}${digits(rng, 4)}`,
    misspelled: 'NORTHFELD',
  },
  federal: {
    id: 'federal', short: 'Passport', full: 'FEDERATION PASSPORT', kind: 'Passport',
    color: 'maroon', hex: '#8a2c3b', emblem: 'compass',
    pattern: /^P\d{8}$/, patternText: 'P00000000',
    number: rng => `P${digits(rng, 8)}`,
    badNumber: rng => `P${digits(rng, 6)}`,
    misspelled: 'FEDERACY PASSPORT',
  },
};

export const ISSUER_IDS = Object.keys(ISSUERS);
export const EMBLEMS = ['heron', 'lighthouse', 'oak', 'star', 'compass'];
// Emblems that no genuine issuer uses: forgers' guesses.
export const FAKE_EMBLEMS = ['crown', 'wave'];
// Card lifetime by issuer kind (years) and the youngest age a card can be issued at.
export const CARD_LIFE = { 'Driver Licence': 5, 'Identity Card': 8, Passport: 10 };
export const MIN_ISSUE_AGE = 16;

export const MEMBER_PATTERN = /^OR-\d{4}$/;
