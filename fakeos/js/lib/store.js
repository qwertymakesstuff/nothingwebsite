// A minimal Zustand-style store: one shared state object, shallow-merged updates, subscribers.
// Used instead of the zustand package so the game stays a dependency-free static site.
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    replace(s) { state = s; subs.forEach(fn => fn(state)); },
  };
}
