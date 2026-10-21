// The one authoritative game state and the only code allowed to change it.
//   createGame()            → a fresh state at the start of day 1
//   dispatch(state, action) → { state, error }: a new state, or the old one and the reason
// Shift phases: 'waiting' (booth empty) → 'inspecting' → 'departing' (stamped, papers not
// yet returned) → 'waiting' again, or 'shiftEnd' after the last entrant.
import { SETTING } from '../data/setting.js';
import { dayByNumber } from '../data/campaignDays.js';
import { VISITORS } from '../data/visitors.js';

const DECISIONS = ['accept', 'reject'];

export function createGame(dayNumber = 1) {
  const day = dayByNumber(dayNumber);
  if (!day) throw new Error(`no campaign day ${dayNumber}`);
  return {
    day: day.day,
    date: day.date,
    money: SETTING.startingMoney,
    shift: {
      queue: [...day.entrants],
      next: 0,          // index into queue of the next entrant to call
      current: null,    // id of the entrant at the booth
      phase: 'waiting',
      decisions: [],    // { visitorId, decision, pay }, one per processed entrant
      earned: 0,
    },
  };
}

export const currentVisitor = state => (state.shift.current ? VISITORS[state.shift.current] : null);
export const currentDay = state => dayByNumber(state.day);
export const decisionFor = (state, id) => state.shift.decisions.find(d => d.visitorId === id) || null;

function reduce(state, action) {
  const s = state.shift;
  switch (action.type) {
    case 'callNext': {
      if (s.phase !== 'waiting') return 'The booth is not empty.';
      if (s.next >= s.queue.length) return 'No entrants left in the queue.';
      return { ...state, shift: { ...s, current: s.queue[s.next], next: s.next + 1, phase: 'inspecting' } };
    }
    case 'decide': {
      if (s.phase !== 'inspecting' || !s.current) return 'No entrant is being inspected.';
      if (!DECISIONS.includes(action.decision)) return `Unknown decision "${action.decision}".`;
      if (decisionFor(state, s.current)) return 'This entrant has already been processed.';
      const pay = currentDay(state).wagePerEntrant;
      return {
        ...state,
        money: state.money + pay,
        shift: {
          ...s,
          phase: 'departing',
          decisions: [...s.decisions, { visitorId: s.current, decision: action.decision, pay }],
          earned: s.earned + pay,
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
