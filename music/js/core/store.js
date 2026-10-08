// Minimal observable store. One instance holds playback state, another holds UI state.
// Subscribers pass a selector and are only called when the selected value changes.

export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.is(a[k], b[k]));
}

export function createStore(initial) {
  let state = initial;
  const subs = new Set();

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    if (!next) return;
    let changed = false;
    for (const k in next) if (!Object.is(state[k], next[k])) { changed = true; break; }
    if (!changed) return;
    state = { ...state, ...next };
    for (const sub of [...subs]) sub(state);
  }

  /**
   * @param {(s: object) => any} selector
   * @param {(value: any, state: object) => void} callback
   * @param {{ equals?: (a: any, b: any) => boolean, immediate?: boolean }} [opts]
   * @returns {() => void} unsubscribe
   */
  function subscribe(selector, callback, { equals = Object.is, immediate = true } = {}) {
    let last = selector(state);
    const sub = (s) => {
      const v = selector(s);
      if (equals(v, last)) return;
      last = v;
      callback(v, s);
    };
    subs.add(sub);
    if (immediate) callback(last, state);
    return () => subs.delete(sub);
  }

  return { getState: () => state, setState, subscribe };
}
