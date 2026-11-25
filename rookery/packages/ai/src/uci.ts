// Parsing of UCI engine output. Pure, so it is shared by the browser worker driver and the
// Node driver used in tests and calibration.

/** Score from the side to move's point of view. Mates are mapped to large centipawn values. */
export interface Score {
  cp: number;
  mate: number | null; // moves to mate (positive = side to move mates)
}

export interface Candidate {
  uci: string;
  score: Score;
  depth: number;
  pv: string[];
}

export const MATE_CP = 100_000;

/** Converts a mate distance into a centipawn value that sorts correctly (faster mates first). */
export function mateToCp(mate: number): number {
  return mate > 0 ? MATE_CP - mate * 100 : -MATE_CP - mate * 100;
}

const INFO = /^info .*\bdepth (\d+)\b.*\bscore (cp|mate) (-?\d+)\b.*?\bpv (.+)$/;

/** Parses one `info` line with a principal variation, or returns null. */
export function parseInfo(line: string): (Candidate & { multipv: number; bound: boolean }) | null {
  const m = INFO.exec(line);
  if (!m) return null;
  const depth = Number(m[1]);
  const kind = m[2];
  const value = Number(m[3]);
  const pv = m[4]!.trim().split(/\s+/);
  const multipv = Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1);
  const bound = /\b(lowerbound|upperbound)\b/.test(line);
  const score: Score = kind === 'mate' ? { cp: mateToCp(value), mate: value } : { cp: value, mate: null };
  return { uci: pv[0]!, score, depth, pv, multipv, bound };
}

/**
 * Collects the final candidate list from a stream of info lines: for each multipv slot, the
 * deepest exact (non-bound) line. Sorted best first.
 */
export class CandidateCollector {
  private slots = new Map<number, Candidate>();

  push(line: string): void {
    const info = parseInfo(line);
    if (!info || info.bound) return;
    const prev = this.slots.get(info.multipv);
    if (!prev || info.depth >= prev.depth) {
      this.slots.set(info.multipv, { uci: info.uci, score: info.score, depth: info.depth, pv: info.pv });
    }
  }

  result(): Candidate[] {
    // Keep only lines from the deepest completed iteration per slot; dedupe moves (a move can
    // briefly appear in two slots while MultiPV reorders).
    const seen = new Set<string>();
    return [...this.slots.values()]
      .sort((a, b) => b.score.cp - a.score.cp)
      .filter((c) => (seen.has(c.uci) ? false : (seen.add(c.uci), true)));
  }
}

export function parseBestMove(line: string): string | null {
  const m = /^bestmove (\S+)/.exec(line);
  return m && m[1] !== '(none)' ? m[1]! : null;
}
