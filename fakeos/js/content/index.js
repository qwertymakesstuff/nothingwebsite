// Content engine: loads the raw content files and builds lookups and cross-references so sites
// can ask "every video by this channel" or "everything this person has written" without custom code.
import { USERS } from './users.js';
import { VIDEOS, PLAYLISTS } from './videos.js';
import { THREADS } from './threads.js';
import { COMMUNITIES } from './communities.js';
import { POSTS, BLINK_FRIENDS } from './posts.js';
import { parseDur, toMs } from '../lib/time.js';

export { USERS, VIDEOS, PLAYLISTS, THREADS, COMMUNITIES, POSTS, BLINK_FRIENDS };

export const VIDEO = Object.fromEntries(VIDEOS.map(v => [v.id, v]));
export const THREAD = Object.fromEntries(THREADS.map(t => [t.id, t]));
export const POST = Object.fromEntries(POSTS.map(p => [p.id, p]));
export const PLAYLIST = Object.fromEntries(PLAYLISTS.map(p => [p.id, p]));
for (const v of VIDEOS) v.seconds = parseDur(v.dur);

const group = (list, key) => { const m = {}; for (const x of list) (m[key(x)] ||= []).push(x); return m; };
const byDateDesc = (a, b) => toMs(b.date) - toMs(a.date);
export const videosByChannel = group(VIDEOS.slice().sort(byDateDesc), v => v.ch);
export const threadsByCommunity = group(THREADS.slice().sort(byDateDesc), t => t.c);
export const threadsByUser = group(THREADS.slice().sort(byDateDesc), t => t.u);
export const postsByUser = group(POSTS.slice().sort(byDateDesc), p => p.u);
export const playlistsByChannel = group(PLAYLISTS, p => p.ch);

// Comments people left anywhere on Threadit, flattened with a path back to their thread.
export const threaditComments = {};
for (const t of THREADS) {
  (function walk(list, depth) {
    list.forEach((r, i) => {
      const [u, text, score, kids] = r;
      (threaditComments[u] ||= []).push({ thread: t, text, score, depth });
      if (kids) walk(kids, depth + 1);
    });
  })(t.replies || [], 0);
}
export const countReplies = list => (list || []).reduce((n, r) => n + 1 + countReplies(r[3]), 0);

// Everyone who appears anywhere, including passers-by who only ever left comments.
export function personRecord(id) {
  return USERS[id] || { name: id, on: [], bio: '', joined: null, passerby: true, av: {} };
}

export function blinkFollowers(id) { return Object.keys(BLINK_FRIENDS).filter(k => BLINK_FRIENDS[k].includes(id)); }
export const onSite = (id, site) => !!USERS[id]?.on.includes(site);

// Where else a person can be found, for cross-site profile links.
export function presence(id) {
  const u = USERS[id]; if (!u) return [];
  const out = [];
  if (u.on.includes('vidder')) out.push({ site: 'Vidder', url: 'vidder.tv/channel/' + id, label: u.vidder?.channel || id });
  if (u.on.includes('blink')) out.push({ site: 'Blink', url: 'blink.social/' + id, label: u.name });
  if (u.on.includes('threadit')) out.push({ site: 'Threadit', url: 'threadit.com/u/' + id, label: 'u/' + id });
  return out;
}

// Gentle popularity growth so counts creep up over in-world time instead of being frozen.
export function grow(base, date, now) {
  const ageDays = Math.max(1, (now - toMs(date)) / 86400000);
  const since = Math.max(0, (now - Date.UTC(2013, 9, 14)) / 86400000);
  return Math.round(base * (1 + Math.min(0.3, since * 0.002 / Math.sqrt(ageDays / 30 + 1))));
}
