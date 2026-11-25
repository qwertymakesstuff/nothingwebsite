// Opening preferences: while the game follows one of the persona's favourite lines, it plays the
// next book move instead of searching.

import { getOpening } from './openings';
import type { Persona } from './schema';
import type { Rng } from './select';

/**
 * Next book move (SAN) for the persona, or null when out of book.
 * `history` is the SAN move list from the standard starting position.
 */
export function bookMove(persona: Persona, botColor: 'white' | 'black', history: string[], rng: Rng): string | null {
  const lines = persona.openings[botColor];
  if (!lines.length) return null;
  if (rng() > persona.openings.fidelity) return null;
  const options: { san: string; weight: number }[] = [];
  for (const { opening, weight } of lines) {
    const moves = getOpening(opening)?.moves.split(' ');
    if (!moves || moves.length <= history.length) continue;
    if (history.every((san, i) => moves[i] === san)) options.push({ san: moves[history.length]!, weight });
  }
  if (!options.length) return null;
  const total = options.reduce((a, o) => a + o.weight, 0);
  let x = rng() * total;
  for (const o of options) {
    x -= o.weight;
    if (x <= 0) return o.san;
  }
  return options[options.length - 1]!.san;
}

/** Names of the persona's book lines the current game still matches (for the UI). */
export function matchingOpenings(persona: Persona, botColor: 'white' | 'black', history: string[]): string[] {
  return persona.openings[botColor]
    .map((l) => getOpening(l.opening))
    .filter((o): o is NonNullable<typeof o> => !!o && history.every((san, i) => o.moves.split(' ')[i] === san))
    .map((o) => o.name);
}
