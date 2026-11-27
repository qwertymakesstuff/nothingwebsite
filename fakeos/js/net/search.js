// The search index Findr (and each site's own search box) runs on. Every implemented page that
// should be findable is registered here with a title, snippet, type and text.
import { VIDEOS, THREADS, POSTS, USERS, COMMUNITIES, PLAYLISTS, countReplies } from '../content/index.js';
import { toMs } from '../lib/time.js';

let docs = null;
const STOP = new Set('a an and are as at be by for from has have i in is it its me my of on or so that the this to was we were with you your'.split(' '));
export const tokens = s => String(s || '').toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w));

export function buildIndex(extra = []) {
  docs = [];
  const add = d => docs.push({ ...d, _t: tokens(d.title), _x: tokens([d.text, (d.tags || []).join(' '), d.site].join(' ')) });
  for (const v of VIDEOS) add({ url: 'vidder.tv/watch?v=' + v.id, title: v.title, site: 'vidder.tv', type: 'video', date: v.date, snippet: v.desc || v.caps.map(c => c[1]).join(' '), text: [v.desc, v.caps.map(c => c[1]).join(' '), USERS[v.ch]?.vidder?.channel, USERS[v.ch]?.name].join(' '), tags: v.tags, weight: Math.log10(v.views + 10), video: v });
  for (const [id, u] of Object.entries(USERS)) {
    if (u.on.includes('vidder')) add({ url: 'vidder.tv/channel/' + id, title: (u.vidder?.channel || id) + ' - Vidder', site: 'vidder.tv', type: 'channel', snippet: u.bio, text: [u.bio, u.name, id, u.interests.join(' ')].join(' '), weight: Math.log10((u.vidder?.subs || 1) + 10) + .5, user: id });
    if (u.on.includes('blink')) add({ url: 'blink.social/' + id, title: u.name + ' | Blink', site: 'blink.social', type: 'people', snippet: u.bio, text: [u.bio, u.name, id, u.location, u.interests.join(' ')].join(' '), weight: 1.2, user: id });
    if (u.on.includes('threadit')) add({ url: 'threadit.com/u/' + id, title: 'u/' + id + ' - Threadit', site: 'threadit.com', type: 'people', snippet: u.bio || 'Threadit user', text: [u.bio, id, u.interests.join(' ')].join(' '), weight: .6, user: id });
  }
  for (const t of THREADS) add({ url: `threadit.com/c/${t.c}/t/${t.id}`, title: `${t.title} : c/${t.c}`, site: 'threadit.com', type: 'forum', date: t.date, snippet: t.body, text: [t.body, flatReplies(t.replies)].join(' '), weight: Math.log10(Math.abs(t.score) + 10) * .8 + countReplies(t.replies) * .02, thread: t });
  for (const [id, c] of Object.entries(COMMUNITIES)) add({ url: 'threadit.com/c/' + id, title: `${c.title} (c/${id}) - Threadit`, site: 'threadit.com', type: 'forum', snippet: c.tagline + ' ' + c.about, text: [c.about, c.tagline, id].join(' '), weight: Math.log10(c.members) * .5 + 1 });
  for (const p of POSTS) add({ url: 'blink.social/post/' + p.id, title: `${USERS[p.u]?.name || p.u} on Blink: "${p.text.slice(0, 60)}${p.text.length > 60 ? '…' : ''}"`, site: 'blink.social', type: 'social', date: p.date, snippet: p.text, text: [p.text, p.comments.map(c => c[1]).join(' '), USERS[p.u]?.name].join(' '), weight: Math.log10(p.likes + 10) * .5 });
  for (const pl of PLAYLISTS) add({ url: 'vidder.tv/playlist?list=' + pl.id, title: pl.title + ' - Vidder playlist', site: 'vidder.tv', type: 'video', snippet: `A playlist by ${USERS[pl.ch]?.vidder?.channel}. ${pl.videos.length} videos.`, text: pl.title, weight: 1 });
  extra.forEach(add);
  return docs;
}
function flatReplies(list) { return (list || []).map(r => r[1] + ' ' + flatReplies(r[3])).join(' '); }
export const allDocs = () => docs || buildIndex();

// Score: title hits count most, then exact phrase, then body hits. Returns ranked docs.
export function search(q, { type, site, before, after } = {}) {
  const qt = tokens(q); if (!qt.length) return [];
  const phrase = q.toLowerCase().trim();
  const out = [];
  for (const d of allDocs()) {
    if (type && type !== 'all' && d.type !== type && !(type === 'people' && d.type === 'channel')) continue;
    if (site && d.site !== site) continue;
    if (d.date && before && toMs(d.date) >= before) continue;
    if (after && (!d.date || toMs(d.date) < after)) continue;
    let s = 0, hits = 0;
    for (const w of qt) {
      const inT = d._t.some(t => t === w || (w.length > 3 && t.startsWith(w)));
      const inX = d._x.filter(t => t === w || (w.length > 3 && t.startsWith(w))).length;
      if (inT) s += 6; if (inX) s += Math.min(4, 1 + Math.log2(inX));
      if (inT || inX) hits++;
    }
    if (!hits) continue;
    if (hits < qt.length) s *= hits / qt.length * .6;
    if (d.title.toLowerCase().includes(phrase)) s += 8;
    else if ((d.text || '').toLowerCase().includes(phrase)) s += 3;
    s += d.weight || 0;
    out.push({ ...d, score: s });
  }
  return out.sort((a, b) => b.score - a.score);
}

// "Did you mean": nearest known word for each query word, if the query found little.
let vocab = null;
export function didYouMean(q) {
  if (!vocab) { vocab = new Map(); for (const d of allDocs()) for (const w of [...d._t, ...d._x]) if (w.length > 3 && !/\d/.test(w)) vocab.set(w, (vocab.get(w) || 0) + 1); }
  let changed = false;
  const words = q.toLowerCase().split(/\s+/).map(w => {
    if (w.length < 4 || vocab.has(w)) return w;
    let best = null, bd = 3;
    for (const [v, n] of vocab) { if (Math.abs(v.length - w.length) > 2) continue; const d = lev(w, v); if (d < bd || (d === bd && best && n > vocab.get(best))) { bd = d; best = v; } }
    if (best && bd <= 2) { changed = true; return best; }
    return w;
  });
  return changed ? words.join(' ') : null;
}
function lev(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
