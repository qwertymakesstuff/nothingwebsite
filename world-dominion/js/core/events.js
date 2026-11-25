// Event definitions. Two severities drive the UI:
//   major — pauses the game and opens the event window with choices
//   minor — a dismissible notification, the game keeps running
// This checkpoint ships one sample major event; the event engine (triggers, chains, civil wars,
// separatism, crises) is a later checkpoint and will produce objects of this same shape.
import { nation, budget } from './state.js';

export const SAMPLE_EVENT_DAY = 18;

export function protestEvent(state) {
  const n = nation(state.player);
  const cost = Math.max(0.1, Math.round(Math.abs(budget(state).income) * 0.6 * 10) / 10);
  return {
    id: 'sample-protests',
    severity: 'major',
    tone: 'warn',
    icon: 'megaphone',
    kicker: 'Domestic unrest',
    title: `Protests in ${n.capital}`,
    body: `Thousands have gathered in the streets of ${n.capital}, angry about rising living costs. Ministers want a decision before the crowds grow.`,
    choices: [
      { label: 'Meet their demands', effects: { treasury: -cost, stability: +6 }, outcome: 'The crowds disperse, satisfied for now.' },
      { label: 'Promise reforms later', effects: { stability: -2 }, outcome: 'The protesters go home, but remain unconvinced.' },
      { label: 'Send in the police', effects: { stability: -7 }, outcome: 'The square is cleared. Resentment is spreading.' },
    ],
  };
}

// Human-readable effect chips for a choice, e.g. [{text:'−$4.5B treasury', dir:'down'}]
export function describeEffects(fx, money) {
  const out = [];
  if (fx.treasury) out.push({ text: `${money(fx.treasury, { sign: true })} treasury`, dir: fx.treasury > 0 ? 'up' : 'down' });
  if (fx.stability) out.push({ text: `${fx.stability > 0 ? '+' : '−'}${Math.abs(fx.stability)} stability`, dir: fx.stability > 0 ? 'up' : 'down' });
  if (fx.army) out.push({ text: `${fx.army > 0 ? '+' : '−'}${Math.abs(fx.army)}K troops`, dir: fx.army > 0 ? 'up' : 'down' });
  if (!out.length) out.push({ text: 'No immediate effect', dir: 'neutral' });
  return out;
}
