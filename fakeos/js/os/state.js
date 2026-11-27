// The whole save file lives in one store. Anything that should survive a restart goes here and
// is written to IndexedDB (debounced) whenever it changes.
import { createStore } from '../lib/store.js';
import * as db from '../lib/db.js';

export const SAVE_VERSION = 1;
// The computer's calendar starts on this date the first time it is switched on, then runs in real time.
export const WORLD_START = Date.UTC(2013, 9, 14, 8, 40); // Monday 14 October 2013

export function freshSave(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    firstBoot: now,
    settings: { wallpaper: 'aurora', accent: '#3b7fd4', clock24: false, iconSize: 'medium', sounds: true, autoArrange: false, userName: 'User' },
    desktop: { positions: {} },
    browser: { bookmarks: defaultBookmarks(), history: [], lastSession: null, typed: [] },
    findr: { history: [] },
    vidder: { subs: {}, votes: {}, watched: {}, playlists: { later: [], favs: [] } },
    threadit: { joined: {}, votes: {} },
    blink: { following: {}, likes: {}, profile: null, notifRead: 0, joinedAt: null, posts: [] },
    files: { notes: [{ id: 'n_readme', name: 'things to do.txt', text: 'things to do\n\n- set up the internet (done??)\n- find that cooking video mum was talking about\n- change the wallpaper, this one is giving me a headache\n', modified: now }] },
  };
}
function defaultBookmarks() {
  return [
    { id: 'b1', title: 'Findr', url: 'findr.net' },
    { id: 'b2', title: 'Vidder', url: 'vidder.tv' },
    { id: 'b3', title: 'Threadit', url: 'threadit.com' },
    { id: 'b4', title: 'Blink', url: 'blink.social' },
  ];
}

export const save = createStore(freshSave());
export const worldNow = () => WORLD_START + (Date.now() - save.get().firstBoot);

// Merge a loaded save over a fresh one so saves from older builds pick up new fields.
export function migrate(loaded) {
  const base = freshSave(loaded?.firstBoot || Date.now());
  if (!loaded || typeof loaded !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(base)) {
    if (loaded[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = { ...base[k], ...loaded[k] };
    else if (loaded[k] !== undefined) out[k] = loaded[k];
  }
  out.version = SAVE_VERSION;
  return out;
}

let timer = null, ready = false;
export async function loadSave() {
  const loaded = await db.get('save');
  save.replace(migrate(loaded));
  ready = true;
  save.subscribe(() => { clearTimeout(timer); timer = setTimeout(flush, 400); });
  addEventListener('beforeunload', flush);
  addEventListener('pagehide', flush);
  return !loaded;
}
export function flush() { if (ready) db.set('save', save.get()); }
export async function wipeSave() { await db.del('save'); }

// Update one section of the save: patch('vidder', v => ({ subs: {...v.subs, x: 1} }))
export function patch(section, fn) {
  save.set(s => ({ [section]: { ...s[section], ...fn(s[section]) } }));
}
