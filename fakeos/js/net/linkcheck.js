// Link and reference checking for content. Given an internal address, says whether a real page
// exists for it. Used by the automated content tests to catch broken links and missing people.
import { parse } from './router.js';
import { USERS, VIDEO, THREAD, POST, PLAYLIST, COMMUNITIES, VIDEOS, THREADS, POSTS, PLAYLISTS, BLINK_FRIENDS } from '../content/index.js';

export function pageExists(url) {
  const r = parse(url);
  const [a, b, c, d] = r.segs;
  switch (r.host) {
    case 'findr.net': return !a || ['search', 'history', 'trends', 'about', 'privacy'].includes(a);
    case 'vidder.tv':
      if (!a || ['trending', 'results', 'subscriptions', 'history'].includes(a)) return true;
      if (a === 'watch') return !!VIDEO[r.query.get('v')];
      if (a === 'channel') return !!USERS[b]?.on.includes('vidder') && (!c || ['videos', 'playlists', 'about'].includes(c));
      if (a === 'playlist') return !!PLAYLIST[r.query.get('list')] || ['WL', 'FAV'].includes(r.query.get('list'));
      return false;
    case 'threadit.com':
      if (!a || ['communities', 'search', 'archive'].includes(a)) return true;
      if (a === 'c') return !!COMMUNITIES[b] && (!c || (c === 't' && THREAD[d]?.c === b));
      if (a === 'u') return !!USERS[b] || THREADS.some(t => t.u === b);
      return false;
    case 'blink.social':
      if (!a || ['trending', 'find', 'notifications', 'settings', 'me'].includes(a)) return true;
      if (a === 'post') return !!POST[b];
      return !!USERS[a]?.on.includes('blink') && (!b || ['about', 'following', 'followers', 'photos'].includes(b));
    default: return false;
  }
}

const LINK_RE = /\[[^\]]+\]\(([^)\s]+)\)|((?:findr\.net|vidder\.tv|threadit\.com|blink\.social)(?:\/[^\s)]*)?)/g;
export function linksIn(text) { return [...String(text || '').matchAll(LINK_RE)].map(m => (m[1] || m[2]).replace(/[.,!?;:'"]+$/, '')); }

const PASSERBY = /^[a-z0-9_.]{3,24}$/i;
// Collect every problem in the content set.
export function validateContent() {
  const problems = [];
  const ids = new Map();
  const uniq = (kind, id) => { const k = kind + ':' + id; if (ids.has(k)) problems.push(`duplicate ${kind} id ${id}`); ids.set(k, 1); };
  const person = (id, where) => { if (!USERS[id] && !PASSERBY.test(id)) problems.push(`bad user reference "${id}" in ${where}`); };
  const known = (id, where) => { if (!USERS[id]) problems.push(`unknown author "${id}" in ${where}`); };
  const links = (text, where) => { for (const l of linksIn(text)) if (!pageExists(l)) problems.push(`broken link ${l} in ${where}`); };
  const walk = (list, where) => (list || []).forEach(r => { person(r[0], where); if (typeof r[1] !== 'string' || typeof r[2] !== 'number') problems.push(`malformed reply in ${where}`); links(r[1], where); walk(r[3], where); });

  for (const v of VIDEOS) {
    uniq('video', v.id);
    known(v.ch, 'video ' + v.id);
    if (!USERS[v.ch]?.on.includes('vidder')) problems.push(`video ${v.id} channel ${v.ch} is not on vidder`);
    if (!/^\d+:\d\d$/.test(v.dur)) problems.push(`video ${v.id} has bad duration`);
    if (isNaN(Date.parse(v.date))) problems.push(`video ${v.id} has bad date`);
    links(v.desc, 'video ' + v.id);
    walk(v.comments, 'video ' + v.id);
  }
  for (const t of THREADS) {
    uniq('thread', t.id);
    person(t.u, 'thread ' + t.id);
    if (!COMMUNITIES[t.c]) problems.push(`thread ${t.id} in missing community ${t.c}`);
    if (isNaN(Date.parse(t.date))) problems.push(`thread ${t.id} has bad date`);
    links(t.body, 'thread ' + t.id);
    walk(t.replies, 'thread ' + t.id);
  }
  for (const p of POSTS) {
    uniq('post', p.id);
    known(p.u, 'post ' + p.id);
    if (!USERS[p.u]?.on.includes('blink')) problems.push(`post ${p.id} author ${p.u} is not on blink`);
    links(p.text, 'post ' + p.id);
    for (const [u, text] of p.comments) { person(u, 'post ' + p.id); links(text, 'post ' + p.id); }
  }
  for (const pl of PLAYLISTS) { uniq('playlist', pl.id); known(pl.ch, 'playlist ' + pl.id); for (const v of pl.videos) if (!VIDEO[v]) problems.push(`playlist ${pl.id} references missing video ${v}`); }
  for (const [id, c] of Object.entries(COMMUNITIES)) for (const m of c.mods) known(m, 'mods of c/' + id);
  for (const [id, list] of Object.entries(BLINK_FRIENDS)) { if (!USERS[id]?.on.includes('blink')) problems.push(`BLINK_FRIENDS key ${id} is not on blink`); for (const f of list) if (!USERS[f]?.on.includes('blink')) problems.push(`${id} follows ${f}, who is not on blink`); }
  return problems;
}
