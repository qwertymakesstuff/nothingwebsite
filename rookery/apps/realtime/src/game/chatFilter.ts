// Basic chat moderation for in-game chat: normalise, mask profanity, block threats and slurs.
// Deliberately simple and conservative; every flagged message is stored for staff review, and
// players can turn chat off or limit it to preset phrases in their settings.

/** Phrases a "presets only" player can receive (and anyone can send with one click). */
export const PRESETS = ['Hello!', 'Good luck!', 'Have fun!', 'You too!', 'Good game!', 'Well played!', 'Thank you!', 'Rematch?', 'Sorry, I have to go.'] as const;

// Never delivered: harassment and slurs (matched loosely, ignoring spacing and l33t spelling).
const BLOCKED = [/\bk+\s*y+\s*s+\b/, /kill\s*(your|ur|you)\s*self/, /\bn+[i1!|]+g+(?:[e3]+r+|a+h?|g+[e3]+r+)\b/, /\bf+[a@4]+g+(?:[o0]+t+)?s?\b/, /\btr[a@4]nn(?:y|ie)s?\b/, /\br[e3]t[a@4]rd(?:ed|s)?\b/];
// Masked (delivered as ***): common profanity.
const MASKED = /\b(f+u+c+k+\w*|s+h+[i1!]+t+\w*|b+[i1!]+t+c+h+\w*|c+u+n+t+s?|a+s+s+h+o+l+e+s?|d+[i1!]+c+k+s?|b+a+s+t+a+r+d+s?|w+h+o+r+e+s?|s+l+u+t+s?|p+r+[i1!]+c+k+s?)\b/gi;

// Control, zero-width and bidirectional-override characters (escaped: some are line breaks).
const INVISIBLE = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]', 'g');

export interface Filtered {
  text: string;
  /** Not delivered to the opponent. */
  blocked: boolean;
  /** Kept for moderators (blocked or masked). */
  flagged: boolean;
}

export function filterChat(raw: string): Filtered | null {
  // Strip control and zero-width characters, collapse whitespace.
  const text = raw.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (!text) return null;
  const loose = text.toLowerCase().replace(/[0]/g, 'o').replace(/[3]/g, 'e').replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/[$5]/g, 's');
  if (BLOCKED.some((re) => re.test(loose))) return { text, blocked: true, flagged: true };
  const masked = text.replace(MASKED, (w) => '*'.repeat(w.length));
  return { text: masked, blocked: false, flagged: masked !== text };
}

export function isPreset(text: string): boolean {
  return (PRESETS as readonly string[]).includes(text);
}
