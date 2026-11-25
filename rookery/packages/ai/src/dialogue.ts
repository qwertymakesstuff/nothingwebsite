// Chat reactions. Lines come from the persona; this module only decides whether to speak.

import type { DialogueEvent, Persona } from './schema';
import type { Rng } from './select';

/** Events a persona always speaks for (if it has lines); the rest depend on chattiness. */
const ALWAYS: DialogueEvent[] = ['greeting', 'botWins', 'botLoses', 'draw', 'botResigns', 'playerResigns', 'drawAccepted', 'drawDeclined', 'rematch', 'takeback'];

export function pickLine(persona: Persona, event: DialogueEvent, rng: Rng, lastLine?: string): string | null {
  const lines = persona.dialogue[event];
  if (!lines?.length) return null;
  if (!ALWAYS.includes(event) && rng() > persona.personality.chattiness) return null;
  const pool = lines.length > 1 ? lines.filter((l) => l !== lastLine) : lines;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}
