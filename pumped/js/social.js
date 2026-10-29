// Squawker: the social feed that reacts to the market. Pure logic over a plain object stored on
// the run (run.social). It uses its own random numbers (never the market's), so reading the feed
// doesn't change the market. Bots are noisy and late on purpose: they post about a pump after it
// is already visible on the chart, and they shill coins at random.
//
// The one way back into the market: a post by the player that names a coin ($TICKER) adds a
// little hype to it, once every SHILL_COOLDOWN seconds per coin.

import { CELEBS, CELEB_BY_ID, BOT_HANDLES, BOT_NAMES_A, BOT_NAMES_B, BOT_EMOJI, LINES, TRENDING_FILLER } from './social-data.js';
import { ASSET_BY_T, CATS } from './assets.js';

export const FEED_LEN = 160;          // top-level posts kept
export const MAX_LEN = 280;
export const SHILL_COOLDOWN = 30;
export const SHILL_HYPE = 4;

export function createFeed() {
  return { v: 1, posts: [], nextId: 1, queue: [], shillCd: {}, unread: 0, mentions: 0, followers: 3, follows: [] };
}

// ── Authors ──────────────────────────────────────────────────────────────────
// stored compactly on each post: { c: celebId } | { b: handle, n: name, e: emoji, k: hue, f: followers } | { p: 1 }
export function botAuthor(rnd) {
  let handle;
  if (rnd() < 0.7) handle = BOT_HANDLES[Math.floor(rnd() * BOT_HANDLES.length)];
  else handle = pick(rnd, BOT_NAMES_A) + pick(rnd, BOT_NAMES_B) + (rnd() < 0.6 ? Math.floor(rnd() * 9999) : '');
  const words = handle.replace(/[_\d]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/x X|X x/g, '').trim();
  const name = rnd() < 0.25 ? `${words} ${pick(rnd, BOT_EMOJI)}` : words || handle;
  const f = Math.floor(Math.pow(rnd(), 3) * 60000) + Math.floor(rnd() * 400);
  return { b: handle, n: name.slice(0, 40), e: pick(rnd, BOT_EMOJI), k: Math.floor(rnd() * 360), f };
}

export function authorInfo(a, profile = { name: 'You', handle: 'you' }, feed = null) {
  if (a.p) return { name: profile.name, handle: profile.handle, avatar: '🫵', color: '#2bff88', verified: null, followers: feed ? feed.followers : 0, me: true };
  if (a.c) { const c = CELEB_BY_ID[a.c]; return { name: c.name, handle: c.handle, avatar: c.avatar, color: c.color, verified: c.verified, followers: c.followers, bio: c.bio, celeb: c.id }; }
  return { name: a.n, handle: a.b, avatar: a.e, color: `hsl(${a.k} 55% 45%)`, verified: null, followers: a.f, bot: true };
}

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

// ── Text ─────────────────────────────────────────────────────────────────────
export function cashtags(text) {
  return [...new Set([...String(text).matchAll(/\$([A-Za-z]{2,6})\b/g)].map(m => m[1].toUpperCase()).filter(t => ASSET_BY_T[t]))];
}

function fill(text, run, rnd, vars = {}) {
  const order = run.market.order;
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === 't') return vars.t ? '$' + vars.t : '$' + pick(rnd, order);
    if (k === 'name') return vars.t ? ASSET_BY_T[vars.t].name : 'the market';
    if (k === 'pct') return `${Math.max(3, Math.round(Math.abs(vars.pct ?? (5 + rnd() * 40))))}%`;
    if (k === 'rand') return '$' + pick(rnd, order);
    if (k === 'who') return '@' + pick(rnd, BOT_HANDLES);
    if (k === 'you') return '@' + (vars.you || 'you');
    return vars[k] ?? '';
  });
}

// ── Posting ──────────────────────────────────────────────────────────────────
export function addPost(feed, author, text, tick, extra = {}) {
  const p = { id: feed.nextId++, a: author, text: String(text).slice(0, MAX_LEN), tick, likes: 0, reposts: 0, replies: 0, parent: null, heat: 1, ...extra };
  p.tickers = cashtags(p.text);
  if (p.parent) {
    const parent = feed.posts.find(x => x.id === p.parent);
    if (!parent) return null;
    parent.replies++;
    if (parent.a.p && !author.p) { feed.mentions++; p.toMe = true; }
  } else if (!author.p) feed.unread++;
  feed.posts.unshift(p);
  trim(feed);
  return p;
}

function trim(feed) {
  let top = 0;
  for (const p of feed.posts) if (!p.parent) top++;
  if (top <= FEED_LEN) return;
  // drop the oldest top-level posts and their replies
  const tops = feed.posts.filter(p => !p.parent);
  const drop = new Set(tops.slice(FEED_LEN).map(p => p.id));
  feed.posts = feed.posts.filter(p => !drop.has(p.id) && !drop.has(p.parent));
  if (feed.posts.length > FEED_LEN * 5) feed.posts.length = FEED_LEN * 5;
}

function queueReplies(feed, parent, n, tick, rnd, lines) {
  for (let i = 0; i < n; i++) feed.queue.push({ due: tick + 1 + Math.floor(rnd() * 9), parent: parent.id, lines });
}

const celebPost = (feed, run, rnd, c, kind, tick, vars = {}) => {
  const lines = c[kind] && c[kind].length ? c[kind] : c.idle;
  if (!lines.length) return null;
  const p = addPost(feed, { c: c.id }, fill(pick(rnd, lines), run, rnd, vars), tick, { heat: 2 + rnd() * 2 });
  if (p) queueReplies(feed, p, 2 + Math.floor(rnd() * 5), tick, rnd, rnd() < 0.15 ? 'scam' : 'reply');
  return p;
};

const botPost = (feed, run, rnd, kind, tick, vars = {}) => {
  const list = kind.startsWith('regime:') ? LINES.regime[kind.slice(7)] : LINES[kind];
  const p = addPost(feed, botAuthor(rnd), fill(pick(rnd, list), run, rnd, vars), tick, { heat: 0.5 + rnd() });
  if (p && rnd() < 0.5) queueReplies(feed, p, 1 + Math.floor(rnd() * 3), tick, rnd, rnd() < 0.1 ? 'scam' : 'reply');
  return p;
};

export function castAccount(name) {
  if (!name) return null;
  return CELEBS.find(c => c.cast && name.includes(c.cast)) || null;
}

// A coin to shill: hyped coins come up more often, but plenty of picks are random.
function shillTarget(run, rnd) {
  const m = run.market;
  const hyped = m.order.filter(t => CATS[ASSET_BY_T[t].cat].hypeable && !ASSET_BY_T[t].stable);
  if (rnd() < 0.4) return pick(rnd, m.order.filter(t => !ASSET_BY_T[t].stable));
  const total = hyped.reduce((s, t) => s + 5 + m.assets[t].hype, 0);
  let r = rnd() * total;
  for (const t of hyped) if ((r -= 5 + m.assets[t].hype) < 0) return t;
  return hyped[0];
}

// One market tick's worth of squawking.
export function stepFeed(feed, run, notes, rnd = Math.random, profile = null) {
  const m = run.market, tick = m.tick;
  const wire = CELEB_BY_ID.wire;

  for (const n of notes) {
    if (n.type === 'headline') {
      const h = n.headline;
      if (h.regime) {
        addPost(feed, { c: 'wire' }, `🚨 ${h.text}`, tick, { heat: 4 });
        for (let i = 0, k = 3 + Math.floor(rnd() * 3); i < k; i++) botPost(feed, run, rnd, 'regime:' + h.regime, tick);
        continue;
      }
      const vars = { t: h.tickers[0] };
      const news = addPost(feed, { c: wire.id }, (h.tone > 0 ? '📈 ' : h.tone < 0 ? '📉 ' : '📰 ') + h.text + (h.tickers.length ? ` $${h.tickers[0]}` : ''), tick, { heat: 2.5, news: h.id });
      if (news) queueReplies(feed, news, 2 + Math.floor(rnd() * 4), tick, rnd, h.tone < 0 ? 'news_bad' : 'news_good');
      // the person in the headline posts it themselves
      for (const name of Object.values(h.cast || {})) {
        const c = castAccount(name);
        if (c) celebPost(feed, run, rnd, c, vars.t ? 'shill' : 'idle', tick, vars);
      }
      if (h.kind === 'hype_campaign' && vars.t) for (let i = 0, k = 4 + Math.floor(rnd() * 4); i < k; i++) botPost(feed, run, rnd, 'shill', tick, vars);
      if (h.kind === 'whale' && vars.t) addPost(feed, { c: 'whalebot' }, `🚨🐋 Whale alert: huge $${vars.t} transfer to an exchange`, tick, { heat: 2 });
      if (h.kind.startsWith('rug_watch') && vars.t) addPost(feed, { c: 'rugradar' }, h.kind === 'rug_watch_yes' ? `🧶 Confirmed rug: $${vars.t}. Devs gone.` : `👀 Watching $${vars.t} closely`, tick, { heat: 2 });
    }
  }

  // reactions to visible moves (late and noisy)
  for (const t of m.order) {
    const a = m.assets[t], d = ASSET_BY_T[t];
    const loud = CATS[d.cat].hypeable ? 0.8 : d.cat === 'safe' ? 0.15 : 0.45;
    if (a.pump && (a.pump.ticks === 7 || a.pump.ticks === 13) && rnd() < loud) {
      const pct = (a.p / (a.hist[Math.max(0, a.hist.length - 1 - a.pump.ticks)] || a.p) - 1) * 100;
      botPost(feed, run, rnd, 'pump', tick, { t, pct });
      if (rnd() < 0.15) { const c = pick(rnd, CELEBS.filter(x => !x.news && x.shill.length)); celebPost(feed, run, rnd, c, 'shill', tick, { t }); }
    }
    if (a.crash && a.crash.ticks === 2 && rnd() < loud + 0.1) {
      const pct = (1 - a.p / (a.hist[Math.max(0, a.hist.length - 3)] || a.p)) * 100;
      if (a.crash.cause === 'rug') { botPost(feed, run, rnd, 'rug', tick, { t }); if (rnd() < 0.6) addPost(feed, { c: 'rugradar' }, `🧶 $${t} just got rugged. Stay safe out there.`, tick, { heat: 2 }); }
      else botPost(feed, run, rnd, 'crash', tick, { t, pct });
    }
  }

  // background chatter
  if (rnd() < 0.55) {
    const r = rnd();
    if (r < 0.28) botPost(feed, run, rnd, 'general', tick);
    else if (r < 0.58) botPost(feed, run, rnd, 'shill', tick, { t: shillTarget(run, rnd) });
    else if (r < 0.68) botPost(feed, run, rnd, 'fud', tick, { t: shillTarget(run, rnd) });
    else if (r < 0.86) celebPost(feed, run, rnd, pick(rnd, CELEBS.filter(c => c.idle.length)), 'idle', tick);
    else if (r < 0.96) { const c = pick(rnd, CELEBS.filter(x => x.shill.length)); celebPost(feed, run, rnd, c, 'shill', tick, { t: shillTarget(run, rnd) }); }
    else celebPost(feed, run, rnd, CELEB_BY_ID.whalebot, 'idle', tick);
  }

  // replies that have come due
  const you = profile ? profile.handle : 'you';
  const due = feed.queue.filter(q => q.due <= tick);
  feed.queue = feed.queue.filter(q => q.due > tick);
  for (const q of due) {
    const parent = feed.posts.find(p => p.id === q.parent);
    if (!parent) continue;
    const vars = { t: parent.tickers[0] || null, you };
    addPost(feed, botAuthor(rnd), fill(pick(rnd, LINES[q.lines] || LINES.reply), run, rnd, vars), tick, { parent: parent.id });
  }

  engage(feed, tick, rnd);
}

// likes and reposts trickle in: more for big accounts and fresh posts
function engage(feed, tick, rnd) {
  let seen = 0;
  for (const p of feed.posts) {
    if (p.parent) continue;
    if (++seen > 40) break;
    const age = tick - p.tick;
    if (age > 120) continue;
    const reach = p.a.p ? Math.sqrt(feed.followers) : p.a.c ? Math.sqrt(CELEB_BY_ID[p.a.c].followers) / 3 : Math.sqrt(p.a.f || 10);
    const rate = reach * p.heat * Math.exp(-age / 30) * 0.08;
    const add = Math.floor(rate * (0.5 + rnd()));
    if (add > 0) {
      p.likes += add;
      p.reposts += Math.floor(add * (0.05 + rnd() * 0.15));
      if (p.a.p) feed.followers += Math.floor(add / 8 + (rnd() < 0.2 ? 1 : 0));
    }
  }
}

// The player squawks. Returns { ok, post, hyped: [tickers that got a hype bump] }.
export function playerPost(feed, run, text, { parent = null, rnd = Math.random, profile = { handle: 'you' } } = {}) {
  text = String(text || '').trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, error: 'Write something first.' };
  if (text.length > MAX_LEN) return { ok: false, error: `Squawks are ${MAX_LEN} characters max.` };
  const tick = run.market.tick;
  const post = addPost(feed, { p: 1 }, text, tick, { parent, mine: true, heat: 1 + rnd() });
  if (!post) return { ok: false, error: 'That post is gone.' };
  const hyped = [];
  for (const t of post.tickers) {
    const a = run.market.assets[t], d = ASSET_BY_T[t];
    if (!a || !CATS[d.cat].hypeable || d.stable) continue;
    if ((feed.shillCd[t] || 0) > tick) continue;
    a.hype = Math.min(100, a.hype + SHILL_HYPE);
    feed.shillCd[t] = tick + SHILL_COOLDOWN;
    hyped.push(t);
  }
  const n = 1 + Math.floor(rnd() * (2 + Math.min(4, Math.log10(feed.followers + 1))));
  for (let i = 0; i < n; i++) feed.queue.push({ due: tick + 1 + Math.floor(rnd() * 6), parent: post.id, lines: rnd() < 0.12 ? 'scam' : rnd() < 0.6 ? 'toPlayer' : 'reply' });
  void profile;
  return { ok: true, post, hyped };
}

export function toggleLike(feed, id) {
  const p = feed.posts.find(x => x.id === id);
  if (!p) return null;
  p.liked = !p.liked;
  p.likes += p.liked ? 1 : -1;
  return p;
}

export function toggleRepost(feed, id) {
  const p = feed.posts.find(x => x.id === id);
  if (!p) return null;
  p.reposted = !p.reposted;
  p.reposts += p.reposted ? 1 : -1;
  return p;
}

// What's trending: cashtags mentioned most in the last few minutes, then filler hashtags.
export function trending(feed, tick, n = 8) {
  const count = {};
  for (const p of feed.posts) {
    if (tick - p.tick > 180) continue;
    for (const t of p.tickers) count[t] = (count[t] || 0) + 1 + p.likes / 500;
  }
  const tags = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, n).map(([t, c]) => ({ tag: '$' + t, t, posts: Math.round(c * 37 + 50) }));
  for (const f of TRENDING_FILLER) { if (tags.length >= n) break; tags.push({ tag: f, t: null, posts: 1000 + (f.length * 7919) % 20000 }); }
  return tags;
}

export function validFeed(f) {
  return !!f && f.v === 1 && Array.isArray(f.posts) && Array.isArray(f.queue) && Number.isInteger(f.nextId);
}
