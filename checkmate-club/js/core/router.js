// Hash-based navigation: #/menu, #/library, #/game/<id>, #/stats, #/settings, #/rules,
// #/rules/<id>. The hash keeps the browser back button and reloads working with no server.

export const SCREENS = ['menu', 'library', 'game', 'stats', 'settings', 'rules', 'workshop'];
const NEEDS_PARAM = new Set(['game']);
const ALLOWS_PARAM = new Set(['game', 'rules', 'workshop']);

export function parseRoute(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [screen, param = null] = parts;
  if (!SCREENS.includes(screen)) return { screen: 'menu', param: null };
  if (NEEDS_PARAM.has(screen) && !param) return { screen: 'library', param: null };
  return { screen, param: ALLOWS_PARAM.has(screen) ? param : null };
}

export function routeHash({ screen, param = null }) {
  return '#/' + screen + (param ? '/' + encodeURIComponent(param) : '');
}

export class Router {
  constructor(win = globalThis.window) {
    this.win = win;
    this.listeners = new Set();
    this.current = parseRoute(win?.location?.hash);
    this.onHash = () => {
      const next = parseRoute(this.win.location.hash);
      const prev = this.current;
      this.current = next;
      for (const fn of this.listeners) fn(next, prev);
    };
    win?.addEventListener?.('hashchange', this.onHash);
  }

  go(screen, param = null) {
    const hash = routeHash({ screen, param });
    if (this.win.location.hash === hash) this.onHash();
    else this.win.location.hash = hash;
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}
