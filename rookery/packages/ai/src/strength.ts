// Strength model: maps an opponent's target rating to concrete engine behaviour.
//
//  • 1320–3190: Stockfish's own strength limiter (UCI_LimitStrength + UCI_Elo). Stockfish
//    calibrates this scale against CCRL 40/4 at roughly one second per move, so engine-limited
//    opponents search for a comparable time.
//  • "max": unrestricted Stockfish.
//  • Below 1320 (Stockfish's floor): our own weakening, built on a shallow multi-line search.
//    Candidate moves are sampled by how much they lose (softmax "temperature"), with occasional
//    deliberate mistakes and random moves. A single skill value 0..1 drives all of it, and the
//    rating→skill table below comes from measured matches (scripts/calibrate.test.ts; results
//    in docs/AI_CALIBRATION.md). Re-run calibration after changing anything in this file.

export interface EngineProfile {
  kind: 'engine';
  /** Stockfish UCI_Elo, or undefined for full strength. */
  uciElo?: number;
  movetimeMs: number;
  multiPv: number;
  /** Personality may swap the engine's choice for a move at most this much worse. */
  styleWindowCp: number;
}

export interface SampleProfile {
  kind: 'sample';
  skill: number;
  depth: number;
  multiPv: number;
  /** Softmax temperature over centipawn loss: higher = more random. */
  temperatureCp: number;
  /** Chance per move of a uniformly random legal move. */
  randomRate: number;
  /** Chance per move of deliberately picking a clearly worse candidate. */
  mistakeRate: number;
  /** A "mistake" loses at least this much. */
  mistakeMinLossCp: number;
  styleWindowCp: number;
}

export type StrengthProfile = EngineProfile | SampleProfile;

export const ENGINE_FLOOR_ELO = 1320;
export const DEFAULT_ENGINE_MOVETIME_MS = 700;
export const FULL_STRENGTH_MOVETIME_MS = 1500;

/** Parameters of the sampled model for a skill in [0, 1]. */
export function sampleProfile(skill: number): SampleProfile {
  const s = Math.min(1, Math.max(0, skill));
  const weak = 1 - s;
  return {
    kind: 'sample',
    skill: s,
    depth: 1 + Math.round(9 * s),
    multiPv: 24,
    temperatureCp: 25 + 425 * weak * weak,
    randomRate: 0.3 * weak * weak,
    mistakeRate: 0.02 + 0.16 * weak,
    mistakeMinLossCp: 150,
    styleWindowCp: 40 + 80 * weak,
  };
}

/**
 * Measured rating of the sampled model at several skill values, anchored to Stockfish's
 * UCI_Elo 1320. Sorted by rating. Filled in from calibration (docs/AI_CALIBRATION.md).
 */
export const SAMPLE_CALIBRATION: readonly { elo: number; skill: number }[] = [
  { elo: 250, skill: 0 },
  { elo: 600, skill: 0.3 },
  { elo: 900, skill: 0.55 },
  { elo: 1150, skill: 0.8 },
  { elo: 1320, skill: 1 },
];

export function skillForElo(elo: number): number {
  const t = SAMPLE_CALIBRATION;
  if (elo <= t[0]!.elo) return t[0]!.skill;
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1]!;
    const b = t[i]!;
    if (elo <= b.elo) return a.skill + ((elo - a.elo) / (b.elo - a.elo)) * (b.skill - a.skill);
  }
  return t[t.length - 1]!.skill;
}

export function strengthProfile(elo: number | 'max', movetimeMs?: number): StrengthProfile {
  if (elo === 'max') {
    return { kind: 'engine', movetimeMs: movetimeMs ?? FULL_STRENGTH_MOVETIME_MS, multiPv: 3, styleWindowCp: 5 };
  }
  if (elo >= ENGINE_FLOOR_ELO) {
    return {
      kind: 'engine',
      uciElo: elo,
      movetimeMs: movetimeMs ?? DEFAULT_ENGINE_MOVETIME_MS,
      multiPv: 4,
      styleWindowCp: elo >= 2300 ? 10 : elo >= 1800 ? 20 : 30,
    };
  }
  return sampleProfile(skillForElo(elo));
}

/** Plain-language summary for the UI ("Plays at depth 4, makes a clear mistake about 1 in 8 moves"). */
export function describeStrength(p: StrengthProfile): string {
  if (p.kind === 'engine') {
    return p.uciElo
      ? `Stockfish limited to ${p.uciElo} Elo, ${(p.movetimeMs / 1000).toFixed(1)}s per move`
      : `Stockfish at full strength, ${(p.movetimeMs / 1000).toFixed(1)}s per move`;
  }
  const errors = p.randomRate + p.mistakeRate;
  const oneIn = errors > 0 ? Math.max(2, Math.round(1 / errors)) : 0;
  return `Looks ${p.depth} ply ahead${oneIn ? `, makes a clear mistake about 1 move in ${oneIn}` : ''}`;
}
