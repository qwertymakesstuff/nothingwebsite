// Versioned save data. Everything that must survive a reload lives in `data`; call persist() after changing it.
const KEY = 'gta:save', VERSION = 1;
const fresh = () => ({ v: VERSION, money: 0, bestRace: null, quality: null, outfit: 0, stats: { kills: 0, copsKilled: 0, jobs: 0, deaths: 0, busts: 0 } });
export let data = fresh();
function read(k) { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
export function load() {
  const saved = read(KEY);
  if (saved && typeof saved === 'object') {
    data = Object.assign(fresh(), saved);
    data.stats = Object.assign(fresh().stats, saved.stats || {});
  } else { // first run on the new format: pick up the values older versions stored separately
    data = fresh();
    const m = read('gta:money'), r = read('gta:bestRace');
    if (typeof m === 'number' && m >= 0) data.money = m;
    if (typeof r === 'number' && r > 0) data.bestRace = r;
    try { localStorage.removeItem('gta:money'); localStorage.removeItem('gta:bestRace'); } catch (e) { /* ignore */ }
    persist();
  }
  if (!Number.isFinite(data.money) || data.money < 0) data.money = 0;
  return data;
}
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode: play on without saving */ } }
export function resetSave() { data = fresh(); persist(); return data; }
load();
