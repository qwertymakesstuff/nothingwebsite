// Every Chirper account in one registry, keyed for posts and saves:
//   c:<id>      celebrities (celebs-1.js, celebs-2.js)
//   u:<handle>  regular users (users-1.js, users-2.js)
//   s:<id>      system accounts (system.js)
// Filler bots and the player aren't in the registry; posts store them inline.

import { CELEBS_1 } from './celebs-1.js';
import { CELEBS_2 } from './celebs-2.js';
import { USERS_1 } from './users-1.js';
import { USERS_2 } from './users-2.js';
import { SYSTEM } from './system.js';

export const CELEBS = [...CELEBS_1, ...CELEBS_2];
export const USERS = [...USERS_1, ...USERS_2];

export const ACCOUNTS = new Map();
for (const c of CELEBS) ACCOUNTS.set('c:' + c.id, { ...c, key: 'c:' + c.id, kind: 'celeb' });
for (const u of USERS) ACCOUNTS.set('u:' + u.handle, { ...u, id: u.handle, key: 'u:' + u.handle, kind: 'user', verified: null });
for (const s of SYSTEM) ACCOUNTS.set('s:' + s.id, { ...s, key: 's:' + s.id, kind: 'system' });

const BY_HANDLE = new Map([...ACCOUNTS.values()].map(a => [a.handle.toLowerCase(), a]));
export const byHandle = h => BY_HANDLE.get(String(h).replace(/^@/, '').toLowerCase()) || null;
export const account = key => ACCOUNTS.get(key) || null;

// threads.js refers to accounts by celebrity id, user handle or system id
export function threadRef(by) {
  return ACCOUNTS.get('c:' + by) || ACCOUNTS.get('u:' + by) || ACCOUNTS.get('s:' + by) || null;
}

// the account a news headline names (events.js CAST), if it has one
export function castAccount(name) {
  if (!name) return null;
  for (const a of ACCOUNTS.values()) if (a.cast && name.includes(a.cast)) return a;
  return null;
}

// tickers / celebrity keys an account cares about
export const assetsOf = a => (a.kind === 'celeb' ? a.assets : (a.talks || []).filter(x => /^[A-Z]+$/.test(x)));
export const rivalsOf = a => (a.rivals || []).map(id => ACCOUNTS.get('c:' + id)).filter(Boolean);
