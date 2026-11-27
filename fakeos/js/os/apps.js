// Application registry. Apps register themselves; the desktop, start menu and other apps call launch().
const apps = new Map();
export function registerApp(app) { apps.set(app.id, app); }
export const getApp = id => apps.get(id);
export const listApps = () => [...apps.values()].filter(a => !a.hidden);
export function launch(id, args) { const a = apps.get(id); if (!a) return null; return a.launch(args || {}); }
// Open a web address in the browser, used by shortcuts, notifications and links in other apps.
export const openUrl = (url, opts = {}) => launch('browser', { url, ...opts });
