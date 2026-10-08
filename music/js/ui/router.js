// Hash router: #/home, #/search?q=..., #/library, #/queue.
// Hash routing needs no server rewrites, so it works on any static host.

export const ROUTES = ['home', 'search', 'library', 'queue'];

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const name = ROUTES.includes(path) ? path : 'home';
  return { name, params: new URLSearchParams(query) };
}

export function createRouter(onChange) {
  const handle = () => onChange(parseHash());
  return {
    start() { window.addEventListener('hashchange', handle); handle(); },
    navigate(name, params) {
      const search = new URLSearchParams(params || {}).toString();
      const q = search ? `?${search}` : '';
      const target = `#/${name}${q}`;
      if (location.hash === target) handle(); else location.hash = target;
    },
  };
}
