// The configuration format for a computer opponent. An opponent is pure data: adding one means
// adding a JSON file to src/personas/ and listing it in src/personas/index.ts. Nothing else in
// the application changes. Engine behaviour is derived from `strength`; everything else here is
// personality, which only chooses *between* moves the strength model allows.

import { z } from 'zod';

export const TIERS = ['newcomer', 'casual', 'club', 'expert', 'master'] as const;
export type Tier = (typeof TIERS)[number];

export const DIALOGUE_EVENTS = [
  'greeting', // game starts
  'botCapture', // the opponent captures something
  'botCheck', // the opponent gives check
  'playerCapture', // you capture something
  'playerBlunder', // your move dropped a lot of evaluation
  'playerGoodMove', // you found the engine's top move in a sharp spot
  'botWinning', // first time its evaluation passes +4
  'botLosing', // first time its evaluation drops below −4
  'botResigns',
  'playerResigns',
  'drawOffered', // it offers... (reserved)
  'drawAccepted',
  'drawDeclined',
  'takeback',
  'botWins',
  'botLoses',
  'draw',
  'rematch',
] as const;
export type DialogueEvent = (typeof DIALOGUE_EVENTS)[number];

const unit = z.number().min(0).max(1);

export const PortraitSchema = z.object({
  bg: z.tuple([z.string(), z.string()]),
  skin: z.string(),
  hair: z.string(),
  hairStyle: z.enum(['short', 'long', 'bun', 'curly', 'bald', 'mohawk', 'bob']),
  accessory: z.enum(['glasses', 'beret', 'headphones', 'monocle', 'scarf', 'cap']).optional(),
  shirt: z.string(),
  /** Draw a raven instead of a person. */
  raven: z.boolean().optional(),
});

const BookLine = z.object({ opening: z.string(), weight: z.number().positive().default(1) });

export const PersonaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  tier: z.enum(TIERS),
  country: z.string().length(2).optional(),
  tagline: z.string(),
  bio: z.string(),
  /** Short labels shown as tags, e.g. "Aggressive". */
  style: z.array(z.string()).max(4),
  portrait: PortraitSchema,

  /** Playing strength. `elo` is a target on the calibrated scale (see strength.ts). */
  strength: z.object({
    elo: z.union([z.number().int().min(200).max(3190), z.literal('max')]),
    /** Optional override of the per-move search time for engine-limited levels. */
    movetimeMs: z.number().int().min(100).max(5000).optional(),
  }),

  personality: z.object({
    /** Prefers checks, captures and moves toward the enemy king among acceptable moves. */
    aggression: unit,
    /** Willingness to pick sharper/riskier moves; low = simplifies and trades when ahead. */
    risk: unit,
    /** How often it talks (0 = silent). */
    chattiness: unit,
    /** Where its mistakes cluster (relative weights; overall rate comes from strength). */
    mistakePhases: z
      .object({ opening: z.number().min(0), middlegame: z.number().min(0), endgame: z.number().min(0) })
      .default({ opening: 1, middlegame: 1, endgame: 1 }),
    /** Resigns when its evaluation stays below `belowCp` for `moves` of its own moves. null = never. */
    resign: z.object({ belowCp: z.number().max(-200), moves: z.number().int().min(1) }).nullable(),
    /** Accepts a draw offer when |eval| ≤ this many centipawns (and the game is past move 20). null = never. */
    acceptDrawWithinCp: z.number().min(0).nullable(),
    /** Human-like delay before moving, in addition to search time. */
    thinking: z.object({ minMs: z.number().min(0), maxMs: z.number().min(0) }),
  }),

  openings: z.object({
    white: z.array(BookLine).default([]),
    black: z.array(BookLine).default([]),
    /** Probability of following its book when a line matches. */
    fidelity: unit.default(0.9),
  }),

  /** Lines per game event; unknown event names are rejected, every event except greeting is optional. */
  dialogue: z
    .partialRecord(z.enum(DIALOGUE_EVENTS), z.array(z.string().min(1)))
    .refine((d) => (d.greeting?.length ?? 0) > 0, 'dialogue.greeting needs at least one line'),
});

export type Persona = z.infer<typeof PersonaSchema>;
export type PersonaInput = z.input<typeof PersonaSchema>;

/** Display rating: the target strength, or "3000+" for unrestricted engine play. */
export function displayRating(p: Persona): string {
  return p.strength.elo === 'max' ? '3000+' : String(p.strength.elo);
}

export function numericRating(p: Persona): number {
  return p.strength.elo === 'max' ? 3200 : p.strength.elo;
}
