// Rule definitions. Each rule is data (parameters set per shift) plus one deterministic check that
// reads only what the player can see: the documents, the person, tonight's lists and the clock.
// No rule looks at how a customer was generated.

import { ageOn, fmtDoc, daysBetween, isBirthday, addYears, fmtTime, fmtHHMM, fromClock } from './dates.js';
import { ISSUERS, MIN_ISSUE_AGE, MEMBER_PATTERN } from './issuers.js';
import { PHOTO_TRAITS, TRAIT_LABELS, faceKey, OUTFIT, DRESS_TAGS } from './appearance.js';
import { HEIGHT_TOLERANCE } from './config.js';

export const sameName = (a, b) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
const onList = (list, name) => (list ?? []).some(n => sameName(typeof n === 'string' ? n : n.name, name));
const ok = detail => ({ pass: true, detail });
const bad = detail => ({ pass: false, detail });
const na = detail => ({ pass: true, detail, na: true });

export const RULE_ORDER = ['age', 'expiry', 'photo', 'identity', 'forgery', 'pass', 'booking', 'membership', 'dress', 'sober', 'banned', 'capacity'];

export function photoProblems(id, c) {
  const diff = PHOTO_TRAITS.filter(k => id.photo[k] !== c.face[k]);
  return diff.length ? [`The ID photo doesn't match them (${diff.map(k => TRAIT_LABELS[k]).join(', ')}).`] : [];
}

export function identityProblems(id, c) {
  const out = [];
  if (Math.abs(id.heightCm - c.heightCm) > HEIGHT_TOLERANCE) out.push(`The ID says ${id.heightCm} cm; they stand about ${c.heightCm} cm.`);
  if (id.eyes !== c.face.eyes) out.push(`The ID lists ${id.eyes} eyes; theirs are ${c.face.eyes}.`);
  return out;
}

export function forgeryProblems(id) {
  const iss = ISSUERS[id.issuer];
  const out = [];
  if (!iss) return ['Issuer is not on the reference sheet.'];
  if (id.header !== iss.full) out.push(`Header reads "${id.header}" — a genuine card says "${iss.full}".`);
  if (!iss.pattern.test(id.number)) out.push(`Number ${id.number} doesn't fit the ${iss.short} format ${iss.patternText}.`);
  if (id.hologram == null) out.push(`No hologram; ${iss.short} cards carry a ${iss.emblem} hologram.`);
  else if (id.hologram !== iss.emblem) out.push(`Hologram shows a ${id.hologram}; ${iss.short} uses a ${iss.emblem}.`);
  if (id.color !== iss.hex) out.push(`Card colour is wrong; ${iss.short} cards are ${iss.color}.`);
  if (id.issued > id.expires) out.push(`Issued ${fmtDoc(id.issued)}, after its own expiry date.`);
  else if (ageOn(id.dob, id.issued) < MIN_ISSUE_AGE) out.push(`Issued ${fmtDoc(id.issued)}, when the holder was ${Math.max(0, ageOn(id.dob, id.issued))} — cards are never issued under ${MIN_ISSUE_AGE}.`);
  return out;
}

export function ticketProblems(t, p, ctx, idName) {
  const out = [];
  if (t.event !== p.event) out.push(`Ticket is for "${t.event}", tonight is "${p.event}".`);
  if (t.date !== ctx.date) out.push(`Ticket is dated ${fmtDoc(t.date)}, tonight is ${fmtDoc(ctx.date)}.`);
  if (!t.code.startsWith(p.codePrefix)) out.push(`Ticket code ${t.code} isn't a ${p.codePrefix} code.`);
  if (idName && !sameName(t.holder, idName)) out.push(`Ticket is in the name "${t.holder}", the ID says "${idName}".`);
  return out;
}

export const RULES = {
  age: {
    title: 'Minimum age', cite: 'Underage / no ID',
    short: p => `${p.min}+ only. No ID, no entry.`,
    explain: p => [`Every guest shows a photo ID with a date of birth.`, `They must be ${p.min} or older tonight. Someone whose birthday is today has turned that age; tomorrow doesn't count.`],
    check(c, ctx, p) {
      const id = c.docs.id;
      if (!id) return bad('No ID presented.');
      const a = ageOn(id.dob, ctx.date);
      const bday = isBirthday(id.dob, ctx.date) ? ' (birthday today)' : '';
      return a >= p.min ? ok(`Born ${fmtDoc(id.dob)}: ${a}${bday}, minimum ${p.min}.`) : bad(`Born ${fmtDoc(id.dob)}: only ${a}${bday}, minimum ${p.min}.`);
    },
  },
  expiry: {
    title: 'Valid ID', cite: 'Expired ID',
    short: () => 'ID must not be expired.',
    explain: () => ['Check the expiry date. A card that expires today is still valid tonight; one that expired yesterday is not.', 'Regulars too — no exceptions for familiar faces.'],
    check(c, ctx) {
      const id = c.docs.id;
      if (!id) return na('No ID.');
      const d = daysBetween(ctx.date, id.expires);
      if (d >= 0) return ok(`Expires ${fmtDoc(id.expires)}${d === 0 ? ' (today — still valid)' : ''}.`);
      return bad(`Expired ${fmtDoc(id.expires)}, ${-d} day${d === -1 ? '' : 's'} ago.`);
    },
  },
  photo: {
    title: 'Photo matches', cite: 'Photo mismatch',
    short: () => 'ID photo must match the person exactly. If not, deny.',
    explain: () => ['Compare the ID photo with the person in front of you: face shape, nose, eyebrows, skin tone, eyes, hair, facial hair and glasses.', 'If anything about the photo doesn\'t match, refuse them. This rule applies at every venue, every night.'],
    check(c) {
      const id = c.docs.id;
      if (!id) return na('No ID.');
      const p = photoProblems(id, c);
      return p.length ? bad(p[0]) : ok('Photo matches.');
    },
  },
  identity: {
    title: 'Height and eyes', cite: 'Not their ID',
    short: () => 'Height and eye colour on the ID must match.',
    explain: () => ['Borrowed cards often come from a lookalike sibling, so the photo can pass. Check the details too.', `Height on the card should be within ${HEIGHT_TOLERANCE} cm of the door-frame marks. Listed eye colour must match their eyes.`],
    check(c) {
      const id = c.docs.id;
      if (!id) return na('No ID.');
      const p = identityProblems(id, c);
      return p.length ? bad(p[0]) : ok('Height and eye colour match.');
    },
  },
  forgery: {
    title: 'Genuine document', cite: 'Fake ID',
    short: () => 'Card must match the ID reference sheet.',
    explain: () => ['Check the card against the ID reference: exact header wording, number format, hologram emblem and card colour.', `Dates must make sense: issued before it expires, and never issued before the holder turned ${MIN_ISSUE_AGE}.`],
    check(c) {
      const id = c.docs.id;
      if (!id) return na('No ID.');
      const p = forgeryProblems(id);
      return p.length ? bad(p[0]) : ok(`Genuine ${ISSUERS[id.issuer].short} ${ISSUERS[id.issuer].kind.toLowerCase()}.`);
    },
  },
  pass: {
    title: 'Entry pass', cite: 'No valid pass',
    short: p => {
      const parts = [];
      if (p.accept.includes('ticket')) parts.push(`ticket for "${p.event}"`);
      if (p.accept.includes('wristband')) parts.push(`tonight's wristband`);
      if (p.accept.includes('guestlist')) parts.push('guest list');
      return `Needs: ${parts.join(' or ')}.`;
    },
    explain: p => {
      const out = [];
      if (p.accept.includes('ticket')) out.push(`Tickets must be for "${p.event}", dated tonight, carry a code starting ${p.codePrefix}, and be in the same name as the ID.`);
      if (p.wristband) out.push(p.accept.includes('wristband') ? `Re-entry: tonight's wristband is ${p.wristband.color} with ${p.wristband.pattern}. Anything else is an old band.` : 'Re-entry is closed: wristbands no longer get anyone back in.');
      if (p.accept.includes('guestlist')) out.push(`Names on the guest list get in without a ticket (name must match the ID exactly).`);
      return out;
    },
    check(c, ctx, p) {
      const name = c.docs.id?.name;
      if (p.accept.includes('guestlist') && onList(p.guests, name)) return ok('Name is on the guest list.');
      const reasons = [];
      if (c.docs.ticket) {
        if (!p.accept.includes('ticket')) reasons.push('Tickets are not accepted tonight.');
        else {
          const tp = ticketProblems(c.docs.ticket, p, ctx, name);
          if (!tp.length) return ok(`Valid ticket ${c.docs.ticket.code}.`);
          reasons.push(tp[0]);
        }
      }
      if (c.wristband) {
        const w = p.wristband;
        if (!p.accept.includes('wristband')) reasons.push('Re-entry is closed; wristbands no longer count.');
        else if (w && c.wristband.color === w.color && c.wristband.pattern === w.pattern) return ok(`Tonight's wristband (${w.color}, ${w.pattern}).`);
        else reasons.push(`Wristband is ${c.wristband.color} with ${c.wristband.pattern}; tonight's is ${w.color} with ${w.pattern}.`);
      }
      if (reasons.length) return bad(reasons[0]);
      return bad(p.accept.includes('guestlist') ? 'No ticket and not on the guest list.' : 'No ticket.');
    },
  },
  booking: {
    title: 'Reservations', cite: 'No reservation',
    short: p => `Reservation (−${p.before}/+${p.after} min) or VIP list.`,
    explain: p => [`Guests need a reservation under the name on their ID, and must arrive from ${p.before} minutes before to ${p.after} minutes after the booked time.`, 'Names on the VIP list need no reservation. VIPs still follow every other rule.'],
    check(c, ctx, p) {
      const name = c.docs.id?.name;
      if (onList(p.vip, name)) return ok('On the VIP list.');
      const r = (p.reservations ?? []).find(x => sameName(x.name, name));
      if (!r) return bad('No reservation under that name.');
      const t = fromClock(r.time);
      if (ctx.clockMin < t - p.before) return bad(`Booked for ${fmtHHMM(r.time)}; it's ${fmtTime(ctx.clockMin)} — too early (window opens ${fmtTime(t - p.before)}).`);
      if (ctx.clockMin > t + p.after) return bad(`Booked for ${fmtHHMM(r.time)}; it's ${fmtTime(ctx.clockMin)} — the booking lapsed at ${fmtTime(t + p.after)}.`);
      return ok(`Reservation at ${fmtHHMM(r.time)}, arrived ${fmtTime(ctx.clockMin)}.`);
    },
  },
  membership: {
    title: 'Members only', cite: 'Not a member',
    short: () => 'Valid member card, or sponsored guest.',
    explain: p => ['Members show a card: number OR-0000, the same name as their ID, and a valid-thru date not passed.', 'Sponsored guests are on the sponsor list and need no card.', ...(p.suspended?.length ? [`Suspended tonight: ${p.suspended.join(', ')}.`] : [])],
    check(c, ctx, p) {
      const name = c.docs.id?.name;
      if (onList(p.sponsored, name)) return ok('Sponsored guest on the list.');
      const m = c.docs.member;
      if (!m) return bad('No member card and not a sponsored guest.');
      if (!MEMBER_PATTERN.test(m.number)) return bad(`Member number ${m.number} isn't a real Orchid number (OR-0000).`);
      if (!sameName(m.name, name)) return bad(`Member card is in the name "${m.name}", the ID says "${name}".`);
      if (m.validThru < ctx.date) return bad(`Membership lapsed ${fmtDoc(m.validThru)}.`);
      if ((p.suspended ?? []).includes(m.number)) return bad(`Membership ${m.number} is suspended tonight.`);
      return ok(`Member ${m.number}, valid thru ${fmtDoc(m.validThru)}.`);
    },
  },
  dress: {
    title: 'Dress code', cite: 'Dress code',
    short: p => `No ${p.banned.map(t => DRESS_TAGS[t].split(' (')[0].toLowerCase()).join(', ')}.`,
    explain: p => ['Not allowed tonight:', ...p.banned.map(t => `• ${DRESS_TAGS[t]}`), 'VIPs and regulars follow the dress code too.'],
    check(c, ctx, p) {
      const hit = c.outfit.find(i => OUTFIT[i]?.tags.some(t => p.banned.includes(t)));
      if (!hit) return ok('Outfit is within the dress code.');
      const tag = OUTFIT[hit].tags.find(t => p.banned.includes(t));
      return bad(`Wearing ${OUTFIT[hit].label} (${DRESS_TAGS[tag].split(' (')[0].toLowerCase()} not allowed).`);
    },
  },
  sober: {
    title: 'No intoxicated guests', cite: 'Intoxicated',
    short: () => 'Refuse anyone visibly drunk.',
    explain: () => ['Watch for slurred speech, swaying, glassy half-closed eyes and flushed cheeks.', 'Being loud, cheerful or scruffy is not the same as being drunk. Judge the signs, not the type.'],
    check(c) {
      return c.intoxicated ? bad(`Visibly intoxicated: ${c.intoxCues ?? 'slurring and unsteady'}.`) : ok('Sober.');
    },
  },
  banned: {
    title: 'Banned list', cite: 'Banned patron',
    short: p => `${p.entries.length} banned face${p.entries.length === 1 ? '' : 's'} — check photos.`,
    explain: () => ['Compare faces with the banned list photos. Banned patrons sometimes bring someone else\'s ID, so match the face, not just the name.'],
    check(c, ctx, p) {
      const e = p.entries.find(x => x.faceKey === faceKey(c.face));
      return e ? bad(`Face matches banned patron ${e.name} (${e.reason}).`) : ok('Not on the banned list.');
    },
  },
  capacity: {
    title: 'Capacity', cite: 'At capacity',
    short: p => `Max ${p.max} inside. VIP list exempt.`,
    explain: p => [`The fire certificate allows ${p.max} people inside. When the counter reaches ${p.max}, refuse everyone else.`, 'Names on the VIP list may still enter.'],
    check(c, ctx, p) {
      const name = c.docs.id?.name;
      if (onList(p.exempt, name)) return ok('VIP: exempt from capacity.');
      return ctx.inside < p.max ? ok(`${ctx.inside}/${p.max} inside.`) : bad(`Venue is full: ${ctx.inside}/${p.max}.`);
    },
  },
};

// Rules active at time t: the shift's starting rules with every change up to t applied in order.
export function rulesAt(def, t) {
  const map = new Map(def.rules.map(r => [r.id, structuredClone(r.params ?? {})]));
  for (const ch of def.changes ?? []) {
    if (ch.at > t) continue;
    for (const [id, params] of Object.entries(ch.rules)) {
      if (params === null) map.delete(id);
      else map.set(id, { ...(map.get(id) ?? {}), ...structuredClone(params) });
    }
  }
  return RULE_ORDER.filter(id => map.has(id)).map(id => ({ id, params: map.get(id) }));
}

export const ruleParams = (rules, id) => rules.find(r => r.id === id)?.params ?? null;

export const cutoffFor = (date, min) => addYears(date, -min);
