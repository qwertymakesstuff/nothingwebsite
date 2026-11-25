// Captured pieces and material balance from a FEN (works for any position, including promotions).

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

export interface Material {
  /** Pieces White has captured (i.e. missing Black pieces), as glyphs, most valuable first. */
  capturedByWhite: string;
  capturedByBlack: string;
  /** Positive = White ahead. */
  balance: number;
}

export function material(fen: string): Material {
  const board = fen.split(' ')[0] ?? '';
  const count = { w: {} as Record<string, number>, b: {} as Record<string, number> };
  let score = 0;
  for (const ch of board) {
    if (!/[pnbrqk]/i.test(ch)) continue;
    const side = ch === ch.toUpperCase() ? 'w' : 'b';
    const t = ch.toLowerCase();
    count[side][t] = (count[side][t] ?? 0) + 1;
    score += (side === 'w' ? 1 : -1) * VALUE[t]!;
  }
  const captured = (side: 'w' | 'b') =>
    ['q', 'r', 'b', 'n', 'p']
      .map((t) => GLYPH[t]!.repeat(Math.max(0, START[t]! - (count[side][t] ?? 0))))
      .join('');
  return { capturedByWhite: captured('b'), capturedByBlack: captured('w'), balance: score };
}
