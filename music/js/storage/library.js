// The user's library: favorites, recently played and playlists, saved in the browser.
//
// Everything saved is validated on the way back in (it is untrusted data: edited by hand, written by an
// older version, cut off by a full disk), and saving never throws. Tracks are stored in the same small
// shape the queue uses, so a favorite, a playlist song and a queue entry are interchangeable.
//
// Keys: mm:v1:favorites, mm:v1:recent, mm:v1:playlists (an array of { id, name, tracks }; the same
// shape the first playlist code used, so existing playlists keep working).

import { createStore } from '../core/store.js';
import { cleanTrack } from './persistence.js';
import { safeStorage } from './safeStorage.js';

export const LIMITS = { favorites: 1000, recent: 50, playlists: 100, playlistTracks: 500, name: 100 };
const KEYS = { favorites: 'mm:v1:favorites', recent: 'mm:v1:recent', playlists: 'mm:v1:playlists' };

// ---------- pure helpers (exported for tests) ----------

/** Valid, de-duplicated (first one wins) tracks, at most `max`. */
export function cleanTracks(raw, max) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const t of raw) {
    const c = cleanTrack(t);
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.name);
}

export function cleanPlaylists(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = new Set();
  const out = [];
  for (const p of raw) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id)) continue;
    const name = cleanName(p.name);
    if (!name) continue;
    ids.add(p.id);
    out.push({
      id: p.id,
      name,
      tracks: cleanTracks(p.tracks, LIMITS.playlistTracks),
      ...(Number.isFinite(p.createdAt) ? { createdAt: p.createdAt } : {}),
      ...(Number.isFinite(p.updatedAt) ? { updatedAt: p.updatedAt } : {}),
    });
    if (out.length >= LIMITS.playlists) break;
  }
  return out;
}

/** Newest first, no duplicates: playing a song again moves it to the top. */
export function pushRecent(list, track, max = LIMITS.recent) {
  const c = cleanTrack(track);
  if (!c) return list;
  if (list[0]?.id === c.id) return list;
  return [c, ...list.filter((t) => t.id !== c.id)].slice(0, max);
}

export function totalSeconds(tracks) {
  return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
}

function moveIn(list, from, to) {
  const n = list.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= n || to >= n || from === to) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

const defaultUid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

// ---------- the library ----------

/**
 * @param {{ storage?: Storage, uid?: () => string, now?: () => number, notify?: (message: string, kind?: string) => void,
 *           saveDelayMs?: number }} [opts]
 */
export function createLibrary({ storage = safeStorage(), uid = defaultUid, now = () => Date.now(), notify = () => {}, saveDelayMs = 200 } = {}) {
  const read = (key) => { try { const raw = storage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const load = () => ({
    favorites: cleanTracks(read(KEYS.favorites), LIMITS.favorites),
    recent: cleanTracks(read(KEYS.recent), LIMITS.recent),
    playlists: cleanPlaylists(read(KEYS.playlists)),
  });
  const store = createStore(load());

  // ---- saving: debounced, and told to the user once if it fails ----
  const dirty = new Set();
  let timer = null;
  let warned = false;
  function flush() {
    clearTimeout(timer);
    timer = null;
    const s = store.getState();
    for (const k of [...dirty]) {
      try { storage.setItem(KEYS[k], JSON.stringify(s[k])); warned = false; }
      catch {
        if (!warned) { warned = true; notify("Couldn't save your library: browser storage is full or blocked.", 'error'); }
      }
    }
    dirty.clear();
  }
  function commit(patch) {
    store.setState(patch);
    Object.keys(patch).forEach((k) => dirty.add(k));
    if (saveDelayMs <= 0) flush();
    else if (!timer) timer = setTimeout(flush, saveDelayMs);
  }

  const state = () => store.getState();
  const playlistOf = (id) => state().playlists.find((p) => p.id === id) ?? null;
  const touch = (p, patch) => ({ ...p, ...patch, updatedAt: now() });

  /** Undo that only works while nothing else has changed that list (so it can never clobber newer edits). */
  function undoer(key, before, after) {
    return () => {
      if (state()[key] !== after) return false;
      commit({ [key]: before });
      return true;
    };
  }

  // ---- favorites ----
  const isFavorite = (id) => state().favorites.some((t) => t.id === id);

  /** @returns {boolean | null} the new favorite state, or null if nothing changed (bad track / list full) */
  function toggleFavorite(track) {
    const c = cleanTrack(track);
    if (!c) return null;
    const favs = state().favorites;
    if (favs.some((t) => t.id === c.id)) { commit({ favorites: favs.filter((t) => t.id !== c.id) }); return false; }
    if (favs.length >= LIMITS.favorites) { notify(`Favorites hold up to ${LIMITS.favorites} songs.`, 'info'); return null; }
    commit({ favorites: [c, ...favs] });
    return true;
  }

  // ---- recently played ----
  function recordPlayed(track) {
    const next = pushRecent(state().recent, track);
    if (next !== state().recent) commit({ recent: next });
  }
  function clearRecent() {
    const before = state().recent;
    if (!before.length) return () => false;
    commit({ recent: [] });
    return undoer('recent', before, state().recent);
  }

  // ---- playlists ----
  function createPlaylist(name, tracks = []) {
    const n = cleanName(name);
    if (!n) return null;
    if (state().playlists.length >= LIMITS.playlists) { notify(`You can have up to ${LIMITS.playlists} playlists.`, 'info'); return null; }
    const t = now();
    const p = { id: uid(), name: n, tracks: cleanTracks(tracks, LIMITS.playlistTracks), createdAt: t, updatedAt: t };
    commit({ playlists: [...state().playlists, p] });
    return p;
  }

  function renamePlaylist(id, name) {
    const n = cleanName(name);
    const p = playlistOf(id);
    if (!n || !p) return false;
    if (p.name === n) return true;
    commit({ playlists: state().playlists.map((x) => (x.id === id ? touch(x, { name: n }) : x)) });
    return true;
  }

  function deletePlaylist(id) {
    const before = state().playlists;
    const index = before.findIndex((p) => p.id === id);
    if (index < 0) return () => false;
    const removed = before[index];
    commit({ playlists: before.filter((p) => p.id !== id) });
    const after = state().playlists;
    // Put it back where it was, as long as the list has not been edited since.
    return () => {
      if (state().playlists !== after) return false;
      const next = [...after];
      next.splice(Math.min(index, next.length), 0, removed);
      commit({ playlists: next });
      return true;
    };
  }

  /** @returns {{ added: number, duplicates: number, skipped: number } | null} null when the playlist does not exist */
  function addToPlaylist(id, tracks) {
    const p = playlistOf(id);
    if (!p) return null;
    const have = new Set(p.tracks.map((t) => t.id));
    const fresh = cleanTracks(tracks, Infinity).filter((t) => !have.has(t.id));
    const duplicates = (Array.isArray(tracks) ? tracks.length : 0) - fresh.length;
    const room = Math.max(0, LIMITS.playlistTracks - p.tracks.length);
    const add = fresh.slice(0, room);
    if (add.length) commit({ playlists: state().playlists.map((x) => (x.id === id ? touch(x, { tracks: [...x.tracks, ...add] }) : x)) });
    if (add.length < fresh.length) notify(`A playlist holds up to ${LIMITS.playlistTracks} songs.`, 'info');
    return { added: add.length, duplicates, skipped: fresh.length - add.length };
  }

  function removeFromPlaylist(id, index) {
    const p = playlistOf(id);
    if (!p || !Number.isInteger(index) || index < 0 || index >= p.tracks.length) return () => false;
    const before = state().playlists;
    commit({ playlists: before.map((x) => (x.id === id ? touch(x, { tracks: x.tracks.filter((_, i) => i !== index) }) : x)) });
    return undoer('playlists', before, state().playlists);
  }

  function moveInPlaylist(id, from, to) {
    const p = playlistOf(id);
    if (!p) return false;
    const tracks = moveIn(p.tracks, from, to);
    if (tracks === p.tracks) return false;
    commit({ playlists: state().playlists.map((x) => (x.id === id ? touch(x, { tracks }) : x)) });
    return true;
  }

  /** Create a playlist from imported tracks, or refresh the one that came from the same source id. */
  function importPlaylist({ id, title, tracks }) {
    const list = cleanTracks(tracks, LIMITS.playlistTracks);
    const name = cleanName(title) || 'Imported playlist';
    if (!list.length || typeof id !== 'string' || !id) return null;
    const existing = playlistOf(id);
    if (existing) {
      commit({ playlists: state().playlists.map((x) => (x.id === id ? touch(x, { name, tracks: list }) : x)) });
      return playlistOf(id);
    }
    if (state().playlists.length >= LIMITS.playlists) { notify(`You can have up to ${LIMITS.playlists} playlists.`, 'info'); return null; }
    const t = now();
    const p = { id, name, tracks: list, createdAt: t, updatedAt: t };
    commit({ playlists: [...state().playlists, p] });
    return p;
  }

  /** Another tab changed the saved data: take it over. */
  function reload() {
    clearTimeout(timer); timer = null; dirty.clear();
    store.setState(load());
  }

  return {
    store, getState: state, subscribe: store.subscribe,
    isFavorite, toggleFavorite,
    recordPlayed, clearRecent,
    getPlaylist: playlistOf, createPlaylist, renamePlaylist, deletePlaylist,
    addToPlaylist, removeFromPlaylist, moveInPlaylist, importPlaylist,
    flush, reload,
  };
}
