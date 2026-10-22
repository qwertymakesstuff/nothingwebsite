// Builds a shift's queue: hand-written roster guests plus generated filler guests, each with
// documents that pass every rule active when they arrive, then the planned flaws applied on top.
// Lists that depend on who shows up (reservations, VIPs, sponsored guests, banned faces) are
// collected here and merged into the shift's rule parameters.

import { seededRandom, pick, int, chance, shuffle, weighted } from './rng.js';
import { addDays, addYears, ageOn, dobFor, toClock } from './dates.js';
import { ISSUERS, EMBLEMS, FAKE_EMBLEMS, CARD_LIFE, MIN_ISSUE_AGE } from './issuers.js';
import { SKIN, FACE_SHAPES, NOSES, BROWS, EYES, HAIR, OUTFIT, faceKey } from './appearance.js';
import { PROFILE_BY_ID, FIRST_NAMES, LAST_NAMES, REASONS, LINES, DRUNK_LINES, DRUNK_CUES, SOBER_FLAVOUR } from './customers.js';
import { rulesAt, ruleParams } from './rules.js';
import { clockAt, arrivalTimes } from './timeline.js';
import { VENUES } from './venues.js';
import { PATIENCE } from './config.js';
import { testCondition } from './conditions.js';

const others = (arr, v) => arr.filter(x => x !== v);
const round15 = m => Math.round(m / 15) * 15;

// ── Faces and outfits ────────────────────────────────────────────────────────
export function randomFace(rng) {
  const hair = pick(rng, HAIR);
  return {
    skin: pick(rng, Object.keys(SKIN)), faceShape: pick(rng, FACE_SHAPES), nose: pick(rng, NOSES), brows: pick(rng, BROWS),
    eyes: pick(rng, EYES), hair, hairColor: weighted(rng, [['black', 5], ['brown', 5], ['blonde', 3], ['red', 2], ['grey', 1], ['white', 0.5], ['pink', 0.6], ['blue', 0.6]]),
    facial: weighted(rng, [['none', 6], ['stubble', 2], ['beard', 2], ['mustache', 0.6]]),
    glasses: chance(rng, 0.2), earrings: chance(rng, 0.35), tattoo: chance(rng, 0.15), freckles: chance(rng, 0.15),
  };
}

// A different person: face shape, nose and eyebrows all change (skin tone kept, so a photo swap is
// never about skin tone alone).
export function otherFace(face, rng) {
  const f = { ...face, faceShape: pick(rng, others(FACE_SHAPES, face.faceShape)), nose: pick(rng, others(NOSES, face.nose)), brows: pick(rng, others(BROWS, face.brows)) };
  if (chance(rng, 0.5)) f.hair = pick(rng, HAIR);
  return f;
}

const POOLS = {
  casual: { top: ['tshirt-plain', 'tshirt-graphic', 'tshirt-band', 'sweater', 'hoodie', 'denim-jacket', 'leather-jacket', 'collared-shirt', 'raincoat', 'turtleneck'], bottom: ['jeans', 'trousers', 'skirt', 'joggers', 'ripped-jeans'], shoes: ['sneakers-white', 'combat-boots', 'chelsea-boots', 'loafers'], hat: 0.15 },
  club: { top: ['tshirt-band', 'tshirt-graphic', 'leather-jacket', 'tanktop', 'hoodie', 'denim-jacket', 'track-jacket'], bottom: ['ripped-jeans', 'jeans', 'leather-trousers', 'shorts', 'skirt', 'joggers'], shoes: ['combat-boots', 'platform-boots', 'sneakers-white', 'running-shoes'], hat: 0.15 },
  smart: { top: ['blazer', 'suit', 'dress-cocktail', 'dress-sequin', 'collared-shirt', 'silk-blouse', 'turtleneck', 'leather-jacket'], bottom: ['tailored', 'trousers', 'skirt', 'jeans', 'leather-trousers'], shoes: ['heels', 'loafers', 'oxfords', 'chelsea-boots'], hat: 0.04 },
  formal: { top: ['suit', 'blazer', 'dress-cocktail', 'dress-sequin', 'silk-blouse', 'collared-shirt'], bottom: ['tailored', 'skirt', 'trousers'], shoes: ['oxfords', 'heels', 'loafers'], hat: 0 },
};

const okItem = (id, banned) => !OUTFIT[id].tags.some(t => banned.includes(t));

export function randomOutfit(rng, style, banned = []) {
  const pool = POOLS[style];
  const choose = slot => pick(rng, pool[slot].filter(i => okItem(i, banned)).concat([]).filter(Boolean)) ?? pick(rng, pool[slot]);
  const top = choose('top');
  const items = [top];
  if (!OUTFIT[top].tags.includes('dress')) items.push(choose('bottom'));
  items.push(choose('shoes'));
  if (!banned.includes('hat') && chance(rng, pool.hat)) items.unshift(pick(rng, ['cap', 'beanie', 'fedora']));
  return items;
}

// ── Documents ────────────────────────────────────────────────────────────────
// Issue and expiry dates for a card that is valid on `date`.
export function issueDates(dob, date, kind, rng) {
  const life = CARD_LIFE[kind];
  const lo = [addYears(dob, MIN_ISSUE_AGE), addDays(addYears(date, -life), 30)].sort().pop();
  const hi = addDays(date, -7);
  const span = Math.max(0, Math.round((Date.parse(hi) - Date.parse(lo)) / 86400000));
  const issued = lo > hi ? hi : addDays(lo, int(rng, 0, span));
  return { issued, expires: addYears(issued, life) };
}

const STREETS = ['Wharf Lane', 'Copper St', 'Gannet Row', 'Mill Rd', 'Larch Ave', 'Orchard Hill', 'Tannery Yard', 'Kestrel Way', 'Station Pde', 'Beacon St'];

export function makeId(c, date, rng, opts = {}) {
  const iss = ISSUERS[opts.issuer ?? 'calder'];
  const idAge = opts.idAge ?? c.age;
  const dob = dobFor(date, idAge, opts.bday ?? -int(rng, 15, 340));
  const { issued, expires } = issueDates(dob, date, iss.kind, rng);
  // A genuine photo is an exact likeness of its holder.
  const photo = { ...c.face, ...(opts.photo ?? {}) };
  const id = {
    issuer: iss.id, header: iss.full, idType: iss.kind, number: iss.number(rng),
    name: opts.idName ?? c.name, dob, issued, expires,
    heightCm: c.heightCm + int(rng, -2, 2), eyes: c.face.eyes, photo,
    hologram: iss.emblem, color: iss.hex,
    address: `${int(rng, 2, 180)} ${pick(rng, STREETS)}, ${iss.short === 'Passport' ? 'Federation' : iss.short}`,
  };
  if (opts.expiresIn != null) setExpiry(id, addDays(date, opts.expiresIn), rng);
  return id;
}

function setExpiry(id, expires, rng) {
  id.expires = expires;
  id.issued = addYears(expires, -CARD_LIFE[id.idType]);
  const sixteen = addYears(id.dob, MIN_ISSUE_AGE);
  if (id.issued < sixteen) id.issued = addDays(sixteen, int(rng, 3, 60));
  if (id.issued > id.expires) id.issued = addDays(id.expires, -int(rng, 200, 400));
}

const digits = (rng, n) => Array.from({ length: n }, () => int(rng, 0, 9)).join('');

function nameVariant(name, rng) {
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  for (let k = 0; k < 20; k++) {
    const v = chance(rng, 0.5) && last.length > 3
      ? `${first} ${last.slice(0, -2)}${last.slice(-1)}`
      : `${pick(rng, FIRST_NAMES)} ${last}`;
    if (v.toLowerCase() !== name.toLowerCase()) return v;
  }
  return `${first}e ${last}`;
}

// ── Flaws ────────────────────────────────────────────────────────────────────
// Each flaw breaks exactly one rule. Order matters: age changes re-issue the card, so they go first.
export const FLAW_ORDER = ['underage', 'noid', 'expired', 'photo', 'height', 'eyes', 'header', 'number', 'hologram', 'nohologram', 'color', 'dates',
  'noticket', 'ticketdate', 'ticketevent', 'ticketname', 'ticketcode', 'oldband', 'noreservation', 'early', 'lapsed',
  'nomember', 'memberexpired', 'membername', 'membernumber', 'dress', 'drunk', 'banned'];

export const FLAWS_BY_RULE = {
  age: ['underage', 'underage', 'noid'],
  expiry: ['expired'],
  photo: ['photo'],
  identity: ['height', 'eyes'],
  forgery: ['header', 'number', 'hologram', 'nohologram', 'color', 'dates'],
  pass: ['noticket', 'ticketdate', 'ticketevent', 'ticketname', 'ticketcode', 'oldband'],
  booking: ['noreservation', 'early', 'lapsed'],
  membership: ['nomember', 'memberexpired', 'membername', 'membernumber'],
  dress: ['dress'],
  sober: ['drunk'],
  banned: ['banned'],
  capacity: [],
};

function ensureTicket(c, s, rng) {
  if (c.docs.ticket) return;
  const p = ruleParams(s.rules, 'pass');
  delete c.wristband; delete c.guest;
  c.docs.ticket = { event: p.event, date: s.date, code: `${p.codePrefix}${digits(rng, 5)}`, holder: c.docs.id?.name ?? c.name, tier: 'GENERAL ADMISSION' };
}

function ensureMember(c, s, rng) {
  if (c.docs.member || !c.docs.id) return;
  c.sponsored = false;
  c.docs.member = { number: `OR-${digits(rng, 4)}`, name: c.docs.id.name, validThru: addDays(s.date, int(rng, 20, 700)), tier: 'FULL' };
}

const BAN_REASONS = ['fighting', 'theft from the bar', 'harassing staff', 'dealing', 'smashed a window', 'repeated fake IDs'];

export const FLAWS = {
  underage(c, s, rng) {
    const min = ruleParams(s.rules, 'age').min;
    const a = Math.max(17, min - int(rng, 1, 3));
    const off = chance(rng, 0.3) ? int(rng, 1, 20) : -int(rng, 40, 300);
    c.age = a;
    const id = c.docs.id;
    id.dob = dobFor(s.date, a, off);
    Object.assign(id, issueDates(id.dob, s.date, id.idType, rng));
  },
  noid(c) { c.docs.id = null; c.lines = { ...c.lines, greet: pick(seededRandom(c.uid), ['ID? Oh — it\'s in my other jacket. You know me though, right?', 'Left my wallet at home. I\'m definitely old enough, look at me!', 'My phone has a photo of my licence. Does that count?']) }; },
  expired(c, s, rng) { setExpiry(c.docs.id, addDays(s.date, -weighted(rng, [[int(rng, 1, 14), 3], [int(rng, 15, 120), 3], [int(rng, 121, 900), 2]])), rng); },
  photo(c, s, rng) { c.docs.id.photo = otherFace(c.face, rng); },
  height(c, s, rng) { c.docs.id.heightCm = c.heightCm + (c.heightCm > 175 ? -1 : 1) * int(rng, 13, 21); },
  eyes(c, s, rng) { c.docs.id.eyes = pick(rng, others(EYES, c.face.eyes)); },
  header(c) { c.docs.id.header = ISSUERS[c.docs.id.issuer].misspelled; },
  number(c, s, rng) { c.docs.id.number = ISSUERS[c.docs.id.issuer].badNumber(rng); },
  hologram(c, s, rng) { const e = ISSUERS[c.docs.id.issuer].emblem; c.docs.id.hologram = pick(rng, [...FAKE_EMBLEMS, ...others(EMBLEMS, e)]); },
  nohologram(c) { c.docs.id.hologram = null; },
  color(c, s, rng) { const hex = ISSUERS[c.docs.id.issuer].hex; c.docs.id.color = pick(rng, Object.values(ISSUERS).map(i => i.hex).filter(h => h !== hex)); },
  dates(c, s, rng) {
    const id = c.docs.id;
    // Issued when the holder was 14 or 15, which is impossible — with an otherwise valid expiry.
    id.issued = addDays(addYears(id.dob, int(rng, 14, 15)), int(rng, 10, 300));
    if (id.issued >= s.date) id.issued = addDays(s.date, -int(rng, 30, 200));
    if (ageOn(id.dob, id.issued) >= MIN_ISSUE_AGE) id.issued = addDays(id.expires, int(rng, 20, 200)); // fall back: issued after expiry
  },
  noticket(c) { delete c.docs.ticket; delete c.wristband; },
  ticketdate(c, s, rng) { ensureTicket(c, s, rng); c.docs.ticket.date = addDays(s.date, c.mods?.ticketShift ?? pick(rng, [-7, 7, -1, 1, 14])); },
  ticketevent(c, s, rng) { ensureTicket(c, s, rng); c.docs.ticket.event = pick(rng, ruleParams(s.rules, 'pass').decoyEvents ?? ['NIGHT FERRY']); },
  ticketname(c, s, rng) { ensureTicket(c, s, rng); c.docs.ticket.holder = c.mods?.ticketHolder ?? nameVariant(c.docs.id?.name ?? c.name, rng); },
  ticketcode(c, s, rng) { ensureTicket(c, s, rng); const p = ruleParams(s.rules, 'pass').codePrefix; c.docs.ticket.code = `${p[0]}${String.fromCharCode(p.charCodeAt(1) === 90 ? 65 : p.charCodeAt(1) + 1)}-${digits(rng, 5)}`; },
  oldband(c, s, rng) {
    const p = ruleParams(s.rules, 'pass');
    delete c.docs.ticket;
    c.wristband = { ...pick(rng, p.oldBands ?? [{ color: 'white', pattern: 'dots' }]) };
  },
  noreservation(c, s, rng) {
    c.reservation = null; c.vipName = null;
    if (chance(rng, 0.4)) c.decoyReservation = { name: nameVariant(c.docs.id?.name ?? c.name, rng), time: toClock(round15(c.arriveClock + int(rng, -30, 30))) };
  },
  early(c, s, rng) { c.vipName = null; c.reservation = { name: c.docs.id.name, time: toClock(round15(c.arriveClock + int(rng, 170, 220))) }; },
  lapsed(c, s, rng) { c.vipName = null; c.reservation = { name: c.docs.id.name, time: toClock(round15(c.arriveClock - int(rng, 115, 160))) }; },
  nomember(c) { delete c.docs.member; c.sponsored = false; },
  memberexpired(c, s, rng) { ensureMember(c, s, rng); if (c.docs.member) c.docs.member.validThru = addDays(s.date, -int(rng, 3, 200)); },
  membername(c, s, rng) { ensureMember(c, s, rng); if (c.docs.member) c.docs.member.name = nameVariant(c.docs.id.name, rng); },
  membernumber(c, s, rng) { ensureMember(c, s, rng); if (c.docs.member) c.docs.member.number = pick(rng, [`OR-${digits(rng, 5)}`, `QR-${digits(rng, 4)}`, `OR${digits(rng, 4)}`]); },
  dress(c, s, rng) {
    const banned = ruleParams(s.rules, 'dress').banned;
    const candidates = Object.keys(OUTFIT).filter(i => OUTFIT[i].tags.some(t => banned.includes(t)));
    const item = pick(rng, candidates);
    const slot = OUTFIT[item].slot;
    let outfit = c.outfit.filter(i => OUTFIT[i].slot !== slot);
    if (slot === 'top' && !OUTFIT[item].tags.includes('dress') && !outfit.some(i => OUTFIT[i].slot === 'bottom')) outfit.push('trousers');
    if (slot === 'top' && OUTFIT[item].tags.includes('dress')) outfit = outfit.filter(i => OUTFIT[i].slot !== 'bottom');
    if (slot === 'bottom' && c.outfit.some(i => OUTFIT[i].tags.includes('dress'))) { outfit = outfit.filter(i => OUTFIT[i].slot !== 'top'); outfit.push('collared-shirt'); }
    c.outfit = [...outfit, item];
  },
  drunk(c, s, rng) {
    c.intoxicated = true;
    c.intoxCues = pick(rng, DRUNK_CUES);
    c.lines = { greet: pick(rng, DRUNK_LINES.greet), admit: pick(rng, DRUNK_LINES.admit), reject: pick(rng, DRUNK_LINES.reject) };
  },
  banned(c, s, rng) { c.bannedEntry = { name: c.docs.id?.name ?? c.name, face: { ...c.face }, faceKey: faceKey(c.face), reason: pick(rng, BAN_REASONS) }; },
};

// ── Customers ────────────────────────────────────────────────────────────────
function fillerSource(rng, s, venue, used) {
  let name;
  do name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`; while (used.has(name));
  used.add(name);
  const min = ruleParams(s.rules, 'age')?.min ?? 21;
  const age = weighted(rng, [[int(rng, min, min + 3), 3], [int(rng, min + 4, 35), 4.5], [int(rng, 36, 70), 2.5]]);
  const personality = weighted(rng, [['calm', 3], ['cheerful', 3], ['chatty', 2], ['shy', 1.5], ['nervous', 1.5], ['grumpy', 1.5], ['arrogant', 1], ['confused', 0.8], ['impatient', 1], ['rowdy', venue.style === 'club' ? 1.2 : 0.2]]);
  const pl = LINES[personality];
  return {
    id: null, name, age, height: int(rng, 152, 196), face: randomFace(rng),
    outfit: randomOutfit(rng, venue.style, ruleParams(s.rules, 'dress')?.banned ?? []),
    personality, type: 'ordinary',
    issuer: weighted(rng, [['calder', 4], ['marrow', 2], ['vesten', 1.5], ['northfold', 1.5], ['federal', 1]]),
    reason: pick(rng, REASONS[venue.crowd]),
    desc: '', flavour: pick(rng, SOBER_FLAVOUR),
    lines: { greet: pick(rng, pl.greet), admit: pick(rng, pl.admit), reject: pick(rng, pl.reject) },
    tip: int(rng, 1, 4),
  };
}

export function describeFace(c) {
  const h = c.heightCm >= 186 ? 'Very tall' : c.heightCm >= 178 ? 'Tall' : c.heightCm >= 166 ? 'Medium height' : 'Short';
  const f = c.face;
  const hair = f.hair === 'bald' ? 'shaved head' : f.hair === 'buzz' ? `buzzed ${f.hairColor} hair` : `${f.hairColor} ${({ short: 'short', long: 'long', bob: 'bobbed', bun: 'hair in a bun', curly: 'curly', afro: 'afro', mohawk: 'mohawk', ponytail: 'ponytail', sidepart: 'side-parted', braids: 'braids' })[f.hair]}${['bun', 'afro', 'mohawk', 'ponytail', 'braids'].includes(f.hair) ? '' : ' hair'}`;
  const bits = [h, hair];
  if (f.facial === 'beard') bits.push('full beard');
  if (f.facial === 'stubble') bits.push('stubble');
  if (f.facial === 'mustache') bits.push('moustache');
  if (f.glasses) bits.push('glasses');
  return bits.join(', ') + '.';
}

function buildCustomer(src, entry, s, venue, rng, uid) {
  const mods = entry?.mods ?? {};
  const c = {
    uid, profileId: src.id, name: src.name, age: mods.age ?? src.age, face: { ...src.face }, heightCm: src.height,
    outfit: [...(mods.outfit ?? src.outfit)], personality: src.personality, type: src.type,
    reason: src.reason, lines: { ...src.lines, ...(mods.lines ?? {}) },
    desc: src.desc || describeFace({ heightCm: src.height, face: src.face }), flavour: src.flavour ?? '',
    intoxicated: false, intoxCues: null, docs: {}, story: entry?.story ?? null, vip: !!mods.vip || src.type === 'vip',
    tipBase: Math.round((src.tip ?? 2) * venue.tipMult), mods,
    patience: Math.round((PATIENCE[src.personality] ?? 110) * (s.def.patience ?? 1)),
    arriveAt: s.t, arriveClock: s.clock, flaws: [...(entry?.flaws ?? [])], expect: entry?.expect ?? null, expectAt: entry?.expectAt ?? null,
  };
  if (mods.bribe) c.bribe = { amount: mods.bribe };
  if (!entry || !entry.flaws?.includes('noid')) {
    c.docs.id = makeId(c, s.date, rng, { issuer: mods.issuer ?? src.issuer, idAge: mods.idAge, idName: mods.idName, bday: mods.bday, expiresIn: mods.expiresIn, photo: mods.photo });
  }
  const idName = c.docs.id?.name ?? c.name;
  const pass = ruleParams(s.rules, 'pass');
  if (pass) {
    const useBand = (pass.wristband && (mods.wristband === 'valid' || mods.wristband === 'old')) || (!entry && pass.accept.includes('wristband') && chance(rng, s.def.wristbandRate ?? 0));
    const useGuest = mods.guest || (!entry && pass.accept.includes('guestlist') && !pass.accept.includes('ticket'));
    if (useGuest) c.guest = idName;
    else if (useBand) c.wristband = { ...pass.wristband };
    else if (pass.accept.includes('ticket') && mods.ticket !== false) {
      c.docs.ticket = { event: pass.event, date: s.date, code: `${pass.codePrefix}${digits(rng, 5)}`, holder: idName, tier: pick(rng, ['GENERAL ADMISSION', 'GENERAL ADMISSION', 'EARLY BIRD', 'FRONT ROOM']) };
    }
  }
  const booking = ruleParams(s.rules, 'booking');
  if (booking) {
    const isVip = c.vip || (!entry && (s.def.guestListOnly || chance(rng, s.def.vipRate ?? 0.12)));
    if (isVip && !booking.vip.some(n => n === idName)) c.vipName = idName;
    else if (!isVip && mods.reservation !== 'none') c.reservation = { name: idName, time: toClock(round15(c.arriveClock + 20)) };
  }
  const membership = ruleParams(s.rules, 'membership');
  if (membership) {
    if (mods.sponsored || (!entry && !mods.member && chance(rng, s.def.sponsoredRate ?? 0.3))) c.sponsored = true;
    else c.docs.member = { number: mods.memberNumber ?? `OR-${digits(rng, 4)}`, name: idName, validThru: addDays(s.date, int(rng, 20, 700)), tier: pick(rng, ['FULL', 'FULL', 'FOUNDING', 'ASSOCIATE']) };
  }
  if (mods.intoxicated && !c.flaws.includes('drunk')) c.flaws.push('drunk');
  for (const f of FLAW_ORDER) if (c.flaws.includes(f)) FLAWS[f](c, s, rng);
  return c;
}

function pickFlaw(rng, rules, def) {
  const entries = [];
  for (const { id, params } of rules) {
    let flaws = FLAWS_BY_RULE[id];
    if (id === 'booking' && def.guestListOnly) flaws = ['noreservation'];
    if (id === 'pass') flaws = flaws.filter(f => (f === 'oldband' ? params.accept.includes('wristband') : params.accept.includes('ticket')));
    const w = (def.focus ?? []).includes(id) ? 3 : 1;
    for (const f of flaws) entries.push([f, w / flaws.length]);
  }
  return entries.length ? weighted(rng, entries) : null;
}

// Where a list entry belongs: the start rule or the latest change (up to time t) that set it.
function listTarget(def, ruleId, key, t) {
  let target = def.rules.find(r => r.id === ruleId);
  for (const ch of def.changes ?? []) if (ch.at <= t && ch.rules[ruleId]?.[key]) target = { params: ch.rules[ruleId] };
  if (!target) return null;
  target.params ??= {};
  target.params[key] ??= [];
  return target.params[key];
}

// Prepare a shift for play. Change times in the definition are fractions of the duration; the
// returned definition has them in seconds, with every list filled in.
export function prepareShift(baseDef, flags = {}, seedExtra = '') {
  const def = structuredClone(baseDef);
  for (const ch of def.changes ?? []) ch.at = ch.at <= 1 ? ch.at * def.duration : ch.at;
  def.incidents = (def.incidents ?? []).filter(i => testCondition(i.if, flags)).map(i => ({ ...i, at: i.at <= 1 ? i.at * def.duration : i.at }));
  const venue = VENUES[def.venue];
  const rng = seededRandom(`${def.id}|${seedExtra}`);
  const roster = def.roster.filter(e => testCondition(e.if, flags));
  const n = roster.length + def.fillers;
  const times = arrivalTimes(def, n, rng);
  // Seat roster guests at their positions; fillers take the remaining slots.
  const slots = new Array(n).fill(null);
  for (const e of [...roster].sort((a, b) => a.pos - b.pos)) {
    let i = Math.min(n - 1, Math.round(e.pos * (n - 1)));
    while (slots[i]) i = (i + 1) % n;
    slots[i] = e;
  }
  const used = new Set(roster.map(e => PROFILE_BY_ID[e.p].name));
  const usedKeys = new Set(roster.map(e => faceKey(PROFILE_BY_ID[e.p].face)));
  const bannedDecoys = [];
  if (def.rules.some(r => r.id === 'banned')) {
    for (let k = 0; k < (def.bannedDecoys ?? 2); k++) {
      let face; do face = randomFace(rng); while (usedKeys.has(faceKey(face)));
      usedKeys.add(faceKey(face));
      let name; do name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`; while (used.has(name));
      used.add(name);
      bannedDecoys.push({ name, face, faceKey: faceKey(face), reason: pick(rng, BAN_REASONS) });
    }
  }
  const customers = slots.map((entry, i) => {
    const t = times[i];
    const s = { def, date: def.date, t, clock: clockAt(def, t), rules: rulesAt(def, t) };
    if (entry) return buildCustomer(PROFILE_BY_ID[entry.p], entry, s, venue, rng, `${def.id}-${i}`);
    const src = fillerSource(rng, s, venue, used);
    while (usedKeys.has(faceKey(src.face))) src.face = randomFace(rng);
    usedKeys.add(faceKey(src.face));
    const fake = { flaws: [] };
    if (chance(rng, def.flawRate)) { const f = pickFlaw(rng, s.rules, def); if (f) fake.flaws.push(f); }
    const c = buildCustomer(src, null, s, venue, rng, `${def.id}-${i}`);
    c.flaws = fake.flaws;
    for (const f of FLAW_ORDER) if (c.flaws.includes(f)) FLAWS[f](c, s, rng);
    if (!c.intoxicated && c.flavour) c.desc = `${c.desc} ${c.flavour}`;
    return c;
  });
  // Lists.
  for (const c of customers) {
    const at = c.arriveAt;
    if (c.reservation) listTarget(def, 'booking', 'reservations', at)?.push(c.reservation);
    if (c.decoyReservation) listTarget(def, 'booking', 'reservations', at)?.push(c.decoyReservation);
    if (c.vipName) listTarget(def, 'booking', 'vip', at)?.push(c.vipName);
    if (c.guest && !c.mods?.guest) listTarget(def, 'pass', 'guests', at)?.push(c.guest);
    if (c.sponsored && !c.mods?.sponsored) listTarget(def, 'membership', 'sponsored', at)?.push(c.docs.id?.name ?? c.name);
    if (c.sponsored && c.mods?.sponsored) { const l = listTarget(def, 'membership', 'sponsored', at); const nm = c.docs.id?.name ?? c.name; if (l && !l.includes(nm)) l.push(nm); }
    if (c.bannedEntry) listTarget(def, 'banned', 'entries', at)?.push(c.bannedEntry);
  }
  const ban = def.rules.find(r => r.id === 'banned');
  if (ban) ban.params.entries.push(...bannedDecoys);
  // Decoy names so lists aren't just tonight's arrivals; then a stable shuffle / time order.
  const res = def.rules.find(r => r.id === 'booking')?.params;
  if (res) {
    const [a, b] = [clockAt(def, 0), clockAt(def, def.duration)];
    for (let k = 0; k < 3; k++) res.reservations.push({ name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`, time: toClock(round15(a + rng() * (b - a))) });
    res.reservations.sort((x, y) => x.time.localeCompare(y.time) || x.name.localeCompare(y.name));
    res.reservations.sort((x, y) => toMin(x.time) - toMin(y.time));
  }
  for (const r of def.rules) for (const key of ['guests', 'vip', 'sponsored']) if (Array.isArray(r.params?.[key])) r.params[key] = [...new Set(r.params[key])].sort();
  if (ban) ban.params.entries = shuffle(rng, ban.params.entries);
  return { def, customers };
}

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return (h < 12 ? h + 24 : h) * 60 + m; };
