// The one authoritative game state and the only code allowed to change it.
//   createGame(day, seed)   → a fresh campaign starting on `day`; the seed fixes every entrant
//   dispatch(state, action) → { state, error }: a new state, or the old one and the reason
// Shift phases: 'briefing' (the morning directive) → 'waiting' (booth empty) → 'inspecting'
// → 'departing' (stamped, papers not yet returned) → 'waiting' again, or 'shiftEnd' after
// the last entrant. From 'shiftEnd', 'nextDay' files the day in `history` and opens the next.
import { SETTING } from '../data/setting.js';
import { dayByNumber, LAST_DAY } from '../data/campaignDays.js';
import { VISITORS } from '../data/visitors.js';
import { generateVisitor, FLAWS } from './visitorGenerator.js';
import { activeRegulations } from '../data/regulations.js';
import { assess, shiftReport } from './decisionSystem.js';
import { createRng } from './rng.js';

const DECISIONS = ['accept', 'reject'];

// the day's entrants in arrival order: authored ones copied from data, the rest generated.
// Generated flaws only break regulations in force that day, so every case is fair.
export function buildEntrants(day, seed) {
  const rng = createRng(seed);
  const rules = activeRegulations(day.day);
  const topics = new Set(rules.map(r => r.topic));
  const allowedFlaws = FLAWS.filter(f => topics.has(f.topic)).map(f => f.id);
  return day.entrants.map((slot, i) => {
    if (slot !== 'gen') return structuredClone(VISITORS[slot]);
    return generateVisitor(rng, {
      id: `g${day.day}_${i}`, date: day.date, rules, nations: day.nations, purposes: day.purposes,
      flaw: rng.chance(day.flawRate) ? 'random' : null, allowedFlaws,
    });
  });
}

export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

// each day draws its entrants from its own seed, derived from the campaign seed
export const daySeed = (seed, day) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) + Math.imul(day, 40503)) >>> 0;

function newShift(day, seed) {
  const entrants = buildEntrants(day, daySeed(seed, day.day));
  return {
    entrants,         // full visitor records for this shift, in arrival order
    queue: entrants.map(v => v.id),
    next: 0,          // index into queue of the next entrant to call
    current: null,    // id of the entrant at the booth
    phase: 'briefing',
    decisions: [],    // decision records from decisionSystem.assess, one per processed entrant
    earned: 0,        // wages paid this shift
    fines: 0,         // fines charged this shift
  };
}

export function createGame(dayNumber = 1, seed = newSeed()) {
  const day = dayByNumber(dayNumber);
  if (!day) throw new Error(`no campaign day ${dayNumber}`);
  return {
    seed,
    day: day.day,
    date: day.date,
    money: SETTING.startingMoney,
    history: [],        // one entry per finished day: { day, date, report, decisions }
    shift: newShift(day, seed),
  };
}

export const isLastDay = state => state.day >= LAST_DAY;

export const visitorById = (state, id) => state.shift.entrants.find(v => v.id === id) || null;
export const currentVisitor = state => (state.shift.current ? visitorById(state, state.shift.current) : null);
export const currentDay = state => dayByNumber(state.day);
export const decisionFor = (state, id) => state.shift.decisions.find(d => d.visitorId === id) || null;

function reduce(state, action) {
  const s = state.shift;
  switch (action.type) {
    case 'openCheckpoint': {
      if (s.phase !== 'briefing') return 'The checkpoint is already open.';
      return { ...state, shift: { ...s, phase: 'waiting' } };
    }
    case 'nextDay': {
      if (s.phase !== 'shiftEnd') return 'The shift is not over.';
      const next = dayByNumber(state.day + 1);
      if (!next) return 'There are no more days in the campaign.';
      const filed = { day: state.day, date: state.date, report: shiftReport(s.decisions), decisions: s.decisions };
      return { ...state, day: next.day, date: next.date, history: [...state.history, filed], shift: newShift(next, state.seed) };
    }
    case 'callNext': {
      if (s.phase !== 'waiting') return 'The booth is not empty.';
      if (s.next >= s.queue.length) return 'No entrants left in the queue.';
      return { ...state, shift: { ...s, current: s.queue[s.next], next: s.next + 1, phase: 'inspecting' } };
    }
    case 'decide': {
      if (s.phase !== 'inspecting' || !s.current) return 'No entrant is being inspected.';
      if (!DECISIONS.includes(action.decision)) return `Unknown decision "${action.decision}".`;
      if (decisionFor(state, s.current)) return 'This entrant has already been processed.';
      // judged by the regulations in force today, never by later or earlier ones
      const record = { ...assess(currentVisitor(state), action.decision, { regulations: activeRegulations(state.day), date: state.date }, s.decisions), day: state.day };
      return {
        ...state,
        money: state.money + record.pay - record.fine,
        shift: {
          ...s,
          phase: 'departing',
          decisions: [...s.decisions, record],
          earned: s.earned + record.pay,
          fines: s.fines + record.fine,
        },
      };
    }
    case 'returnPapers': {
      if (s.phase !== 'departing') return 'There are no stamped papers to return.';
      return { ...state, shift: { ...s, current: null, phase: s.next >= s.queue.length ? 'shiftEnd' : 'waiting' } };
    }
    default:
      return `Unknown action "${action.type}".`;
  }
}

export function dispatch(state, action) {
  const result = reduce(state, action || {});
  return typeof result === 'string' ? { state, error: result } : { state: result, error: null };
}
