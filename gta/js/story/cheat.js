// LAST EXIT: typed codes (pure). Feed it each typed character; it tells you when a code has just been completed.
export const CODES = ['kaidin'];
/** returns { buf, code }: the new buffer and the code that was just completed (or null) */
export function feed(buf, ch) {
  if (typeof ch !== 'string' || ch.length !== 1) return { buf, code: null };
  const b = ((buf || '') + ch.toLowerCase()).slice(-16);
  for (const c of CODES) if (b.endsWith(c)) return { buf: '', code: c };
  return { buf: b, code: null };
}
