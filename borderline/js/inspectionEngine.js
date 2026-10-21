// The player's comparison tool: given two things on the desk, report whether they agree.
// It only states what the two items themselves show; it never consults the entrant's verdict.
//   item: { kind, value, display, label, where }   where = 'Passport', 'Today', 'Rulebook' …
//   compare(a, b, { today }) → { status: 'match' | 'mismatch' | 'info' | 'unrelated', message }
import { formatDoc, ageOn, addDays } from './dates.js';

// kinds that describe the same fact wherever they appear
const IDENTITY = { surname: 'Surname', given: 'Given names', dob: 'Date of birth', sex: 'Sex', nationality: 'Nationality', passportNo: 'Passport number' };

const pairOf = (a, b, x, y) => (a.kind === x && b.kind === y ? [a, b] : a.kind === y && b.kind === x ? [b, a] : null);

export function compare(a, b, ctx = {}) {
  if (!a || !b) return { status: 'unrelated', message: 'Pick two items to compare.' };
  if (IDENTITY[a.kind] && a.kind === b.kind) {
    const same = String(a.value) === String(b.value);
    return same
      ? { status: 'match', message: `${IDENTITY[a.kind]} agrees: ${a.display} on the ${a.where} and the ${b.where}.` }
      : { status: 'mismatch', message: `Discrepancy. ${IDENTITY[a.kind]}: ${a.display} on the ${a.where}, ${b.display} on the ${b.where}.` };
  }
  let p;
  if ((p = pairOf(a, b, 'expiry', 'today'))) {
    const [doc, today] = p;
    return doc.value < today.value
      ? { status: 'mismatch', message: `The ${doc.where} expired on ${formatDoc(doc.value)}. Today is ${formatDoc(today.value)}.` }
      : { status: 'match', message: `The ${doc.where} is valid until ${formatDoc(doc.value)}. Today is ${formatDoc(today.value)}.` };
  }
  if ((p = pairOf(a, b, 'duration', 'expiry')) && ctx.today) {
    const [stay, doc] = p;
    const end = addDays(ctx.today, Number(stay.value));
    return doc.value >= end
      ? { status: 'match', message: `A stay of ${stay.display} from today ends on ${formatDoc(end)}. The ${doc.where} is valid until ${formatDoc(doc.value)}, which covers it.` }
      : { status: 'mismatch', message: `A stay of ${stay.display} from today ends on ${formatDoc(end)}, but the ${doc.where} is only valid until ${formatDoc(doc.value)}.` };
  }
  if ((p = pairOf(a, b, 'duration', 'today'))) {
    const [stay, today] = p;
    return { status: 'info', message: `A stay of ${stay.display} from today ends on ${formatDoc(addDays(today.value, Number(stay.value)))}.` };
  }
  if ((p = pairOf(a, b, 'dob', 'today'))) {
    const [doc, today] = p;
    return { status: 'info', message: `Born ${formatDoc(doc.value)}: the entrant is ${ageOn(doc.value, today.value)} years old today.` };
  }
  if ((p = pairOf(a, b, 'issuer', 'issuerList'))) {
    const [doc, list] = p;
    const listed = list.value.includes(doc.value);
    return listed
      ? { status: 'match', message: `${doc.display} is a recognised issuing office of ${list.label}.` }
      : { status: 'mismatch', message: `${doc.display} is not among the issuing offices of ${list.label} (${list.value.join(', ')}).` };
  }
  if ((p = pairOf(a, b, 'seal', 'sealRef'))) {
    const [doc, ref] = p;
    return doc.value === ref.value
      ? { status: 'match', message: `The seal matches the official seal of ${ref.label}.` }
      : { status: 'mismatch', message: `The seal does not match the official seal of ${ref.label}.` };
  }
  return { status: 'unrelated', message: `The ${a.label.toLowerCase()} and the ${b.label.toLowerCase()} record different things.` };
}
