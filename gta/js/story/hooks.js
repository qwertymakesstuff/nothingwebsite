// LAST EXIT: the few places where the story reaches into older systems. Defaults do nothing, so those systems work with no story at all;
// story/runtime.js replaces them when the campaign is running.
export const hooks = {
  /** multiplier on the garage's repair price (Eddie trusts you / has made peace with Danny) */
  repairFactor: () => 1,
  /** someone in reach who can be talked to: { text, run() } or null */
  talker: () => null,
  /** the action key during a conversation (next line) */
  advance: () => false
};
