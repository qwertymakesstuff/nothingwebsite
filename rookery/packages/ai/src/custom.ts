// "Custom" opponent: plain engine at a strength the player picks, with a neutral personality.
// Built through the same schema as the roster, so it plays through exactly the same code path.

import { PersonaSchema, type Persona } from './schema';

export const CUSTOM_ID = 'custom';
export const CUSTOM_MIN_ELO = 250;
export const CUSTOM_MAX_ELO = 3190;

export function customPersona(elo: number | 'max'): Persona {
  return PersonaSchema.parse({
    id: CUSTOM_ID,
    name: elo === 'max' ? 'Stockfish (full strength)' : `Stockfish ${elo}`,
    tier: elo === 'max' || elo >= 2300 ? 'master' : elo >= 1800 ? 'expert' : elo >= 1300 ? 'club' : elo >= 800 ? 'casual' : 'newcomer',
    tagline: 'Plain engine, no personality',
    bio: 'Stockfish at exactly the strength you choose, with no opening preferences, no chat and no style bias.',
    style: ['Engine'],
    portrait: { bg: ['#3d3a34', '#22201c'], skin: '#9a9488', hair: '#5a564e', hairStyle: 'bald', shirt: '#c19a52', raven: false },
    strength: { elo: elo === 'max' ? 'max' : Math.round(Math.min(CUSTOM_MAX_ELO, Math.max(CUSTOM_MIN_ELO, elo))) },
    personality: {
      aggression: 0.5,
      risk: 0.5,
      chattiness: 0,
      resign: elo === 'max' || elo >= 1500 ? { belowCp: -700, moves: 3 } : null,
      acceptDrawWithinCp: 40,
      thinking: { minMs: 200, maxMs: 900 },
    },
    openings: { white: [], black: [], fidelity: 0 },
    dialogue: { greeting: ['Ready.'] },
  });
}
