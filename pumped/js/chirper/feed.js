// Chirper feed engine. Pure logic over a plain object saved on the run (run.social), driven once
// per market tick. It has its own seeded random stream, so the same run seed and the same market
// events always produce the same feed, and the market's own random numbers are never touched.
//
// Each tick:
//   1. market notes -> breaking news, the people named in it post, relevant accounts react
//   2. visible pumps / crashes / rug pulls -> reaction posts and trending tags (late on purpose)
//   3. endorsements that aged badly (or well) -> apologies, brags and "this aged like milk" replies
//   4. now and then a market-moving celebrity post (effects.js), within cooldowns
//   5. background posts: celebrities, users, system accounts and scripted threads
//   6. queued replies come due; likes and reposts trickle in
//
// Lines are picked so the same account doesn't repeat itself within RESURFACE seconds; old posts
// come back after that.

import { createRng, hashSeed } from '../rng.js';
import { ASSET_BY_T, CATS } from '../assets.js';
import { ACCOUNTS, CELEBS, USERS, account, threadRef, castAccount, byHandle, assetsOf, rivalsOf } from './accounts.js';
import { THREADS } from './threads.js';
import { BOT_HANDLES, BOT_NAMES_A, BOT_NAMES_B, BOT_EMOJI, BOT_LINES, HINDSIGHT, EVENT_TAGS, TRENDING_FILLER } from './system.js';
import { MOVES, applyMove, canMove } from './effects.js';

export const FEED_V = 2;
export const FEED_LEN = 160;          // top-level posts kept
export const MAX_LEN = 280;
export const RESURFACE = 1800;        // seconds before an account may repeat a line
export const THREAD_GAP = 1500;       // seconds before a thread can play again
export const SHILL_COOLDOWN = 30;
export const SHILL_HYPE = 4;
const MOVE_GAP = [25, 55];
const RUG_ALERTS = ['🧶 {t} just got rugged. Stay safe out there.', '🧶 Rug alert: {t} liquidity pulled. Devs typing…', '🧶 {t} rug confirmed. Wallets draining as we speak.', '🧶 Another one: {t}. If you held, we\'re sorry.', '🧶 {t} chart just went vertical. The wrong way.'];

export function createFeed(seed = 'CHIRPER') {
  return {
    v: FEED_V, rng: hashSeed('chirper:' + seed), posts: [], nextId: 1, queue: [],
    used: {}, threads: {}, cd: { asset: {}, pair: {} }, endorse: [], trend: {}, lastCatch: {}, lastPost: {},
    nextMove: 20, unread: 0, mentions: 0, followers: 3, shillCd: {},
  };
}

export function validFeed(f) {
  return !!f && f.v === FEED_V && Array.isArray(f.posts) && Array.isArray(f.queue) && Number.isInteger(f.nextId)
    && f.posts.every(p => !p.a.k || ACCOUNTS.has(p.a.k));
}

// ── Authors ──────────────────────────────────────────────────────────────────
// Stored on posts as { k: key } (registry account), { b, n, e, h, f } (filler bot) or { p: 1 } (player).
export function botAuthor(rng) {
  let handle;
  if (rng.next() < 0.75) handle = rng.pick(BOT_HANDLES);
  else handle = rng.pick(BOT_NAMES_A) + rng.pick(BOT_NAMES_B) + (rng.next() < 0.6 ? rng.int(1, 9999) : '');
  const name = handle.replace(/[_\d]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || handle;
  return { b: handle, n: name.slice(0, 40), e: rng.pick(BOT_EMOJI), h: rng.int(0, 359), f: Math.floor(Math.pow(rng.next(), 3) * 40000) + rng.int(10, 400) };
}

export function authorInfo(a, profile = { name: 'You', handle: 'you' }, feed = null) {
  if (a.p) return { key: 'me', name: profile.name, handle: profile.handle, avatar: '🫵', color: '#2bff88', verified: null, followers: feed ? feed.followers : 0, me: true };
  if (a.k) { const x = account(a.k); return { key: a.k, kind: x.kind, name: x.name, handle: x.handle, avatar: x.avatar, color: x.color, verified: x.verified, followers: x.followers, bio: x.bio, acct: x }; }
  return { key: 'b:' + a.b, kind: 'bot', name: a.n, handle: a.b, avatar: a.e, color: `hsl(${a.h} 55% 45%)`, verified: null, followers: a.f, bot: true };
}

export const keyOf = a => (a.p ? 'me' : a.k ? a.k : 'b:' + a.b);

// ── Text ─────────────────────────────────────────────────────────────────────
export function cashtags(text) {
  return [...new Set([...String(text).matchAll(/\$([A-Za-z]{2,8})\b/g)].map(m => m[1].toUpperCase()).filter(t => ASSET_BY_T[t]))];
}

export function hashtags(text) {
  return [...new Set([...String(text).matchAll(/#([A-Za-z][A-Za-z0-9_]{1,30})/g)].map(m => '#' + m[1]))];
}

function fill(text, v) {
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === 't' || k === 'asset') return v.t ? '$' + v.t : 'the market';
    if (k === 'pct') return `${Math.max(1, Math.round(Math.abs(v.pct ?? 10)))}%`;
    if (k === 'rival') return v.rival ? '@' + v.rival : 'everyone';
    if (k === 'you') return '@' + (v.you || 'you');
    return v[k] ?? '';
  });
}

const inMarket = (run, list) => (list || []).filter(t => run.market.assets[t]);

function pickAsset(run, rng, acct) {
  const mine = acct ? inMarket(run, assetsOf(acct)) : [];
  if (mine.length && rng.next() < 0.85) return rng.pick(mine);
  return rng.pick(run.market.order.filter(t => !ASSET_BY_T[t].stable));
}

// A line from `list` this key hasn't used in RESURFACE seconds (else the one used longest ago).
function pickLine(feed, rng, key, list, tick, strict = false, window = RESURFACE) {
  if (!list || !list.length) return null;
  const fresh = [];
  let oldest = 0, oldestAt = Infinity;
  for (let i = 0; i < list.length; i++) {
    const at = feed.used[key + '#' + i];
    if (at == null || tick - at >= window) fresh.push(i);
    if ((at ?? -Infinity) < oldestAt) { oldestAt = at ?? -Infinity; oldest = i; }
  }
  if (!fresh.length && strict) return null;
  const i = fresh.length ? rng.pick(fresh) : oldest;
  feed.used[key + '#' + i] = tick;
  return list[i];
}

// ── Posting ──────────────────────────────────────────────────────────────────
export function addPost(feed, author, text, tick, extra = {}) {
  const p = { id: feed.nextId++, a: author, text: String(text).slice(0, MAX_LEN), tick, likes: 0, reposts: 0, replies: 0, parent: null, heat: 1, ...extra };
  p.tickers = cashtags(p.text);
  if (p.parent) {
    const parent = feed.posts.find(x => x.id === p.parent);
    if (!parent) return null;
    parent.replies++;
    (parent.by || (parent.by = [])).push(keyOf(author));
    if (parent.a.p && !author.p) { feed.mentions++; p.toMe = true; }
  } else if (!author.p) feed.unread++;
  if (author.k) feed.lastPost[author.k] = tick;
  feed.posts.unshift(p);
  trim(feed);
  return p;
}

function trim(feed) {
  let top = 0;
  for (const p of feed.posts) if (!p.parent) top++;
  if (top <= FEED_LEN && feed.posts.length <= FEED_LEN * 5) return;
  const tops = feed.posts.filter(p => !p.parent);
  const drop = new Set(tops.slice(FEED_LEN).map(p => p.id));
  feed.posts = feed.posts.filter(p => !drop.has(p.id) && !drop.has(p.parent));
  if (feed.posts.length > FEED_LEN * 5) feed.posts.length = FEED_LEN * 5;
  const live = new Set(feed.posts.map(p => p.id));
  feed.queue = feed.queue.filter(q => !q.parent || live.has(q.parent));
}

const moodOf = tone => (tone > 0 ? 'up' : tone < 0 ? 'down' : null);

// an account posts something original
function accountPost(feed, rng, run, acct, tick) {
  const key = acct.key;
  const t = pickAsset(run, rng, acct);
  const rival = rivalsOf(acct).length ? rng.pick(rivalsOf(acct)).handle : null;
  let text = pickLine(feed, rng, key + ':p', acct.posts, tick, true);   // nothing fresh: stay quiet
  if (!text) return null;
  text = fill(text, { t, rival });
  // a catchphrase now and then, never twice close together
  if (acct.catchphrases && rng.next() < 0.12 && (feed.lastCatch[key] ?? -1e9) + 400 < tick && text.length < 200) {
    text += ' ' + pickLine(feed, rng, key + ':c', acct.catchphrases, tick);
    feed.lastCatch[key] = tick;
  }
  const p = addPost(feed, { k: key }, text, tick, { heat: acct.kind === 'celeb' ? 2 + rng.next() * 2 : 0.6 + rng.next() });
  if (p) queueReplies(feed, rng, p, acct.kind === 'celeb' ? rng.int(2, 5) : acct.kind === 'system' ? rng.int(1, 3) : rng.int(0, 3), tick);
  return p;
}

// a reaction post about a move on t: kind is pump | crash | rug | bull | bear | news
function reactPost(feed, rng, run, kind, t, pct, tick, acct = null) {
  let line = null;
  for (let tries = 0; tries < 5 && !line; tries++) {
    const who = acct || reactor(rng, run, t);
    const k = who.kind === 'celeb' ? kind : kind === 'rug' ? 'crash' : ['pump', 'crash'].includes(kind) ? kind : 'any';
    const list = who.react[k] || who.react.any || who.react.news;
    line = pickLine(feed, rng, who.key + ':x:' + k, list, tick, true);
    if (line) acct = who; else if (acct) return null;
  }
  if (!line) return null;
  const tone = ['pump', 'bull'].includes(kind) ? 1 : ['crash', 'rug', 'bear'].includes(kind) ? -1 : 0;
  const p = addPost(feed, { k: acct.key }, fill(line, { t, pct }), tick, { heat: acct.kind === 'celeb' ? 2.5 : 1, mood: moodOf(tone), kind: 'react' });
  if (p) queueReplies(feed, rng, p, rng.int(1, acct.kind === 'celeb' ? 4 : 2), tick);
  return p;
}

// someone relevant to t: celebs and users who talk about it are preferred
function reactor(rng, run, t, celebShare = 0.5) {
  const celeb = rng.next() < celebShare;
  const pool = celeb ? CELEBS : USERS.filter(u => !u.scam);
  const fans = pool.filter(a => (a.assets || a.talks || []).includes(t));
  const src = fans.length && rng.next() < 0.7 ? fans : pool;
  const pick = rng.pick(src);
  return account(celeb ? 'c:' + pick.id : 'u:' + pick.handle);
}

// ── Replies ──────────────────────────────────────────────────────────────────
function queueReplies(feed, rng, post, n, tick) {
  for (let i = 0; i < n; i++) feed.queue.push({ due: tick + rng.int(1, 9), parent: post.id });
}

function replier(feed, rng, post, run) {
  const taken = new Set([keyOf(post.a), ...(post.by || [])]);
  const author = post.a.k ? account(post.a.k) : null;
  const ok = a => a && !taken.has(a.key);
  const r = rng.next();
  if (author && author.kind === 'celeb' && r < 0.3) {
    const rv = rivalsOf(author).filter(ok);
    if (rv.length) return rng.pick(rv);
  }
  if (r < 0.45) {
    const fans = CELEBS.map(c => account('c:' + c.id)).filter(a => ok(a) && post.tickers.some(t => a.assets.includes(t)));
    const pick = fans.length && rng.next() < 0.6 ? rng.pick(fans) : account('c:' + rng.pick(CELEBS).id);
    if (ok(pick)) return pick;
  }
  if (r < 0.88) {
    const users = USERS.map(u => account('u:' + u.handle)).filter(a => ok(a) && (!a.scam || rng.next() < 0.25));
    const fans = users.filter(a => a.talks.some(x => post.tickers.includes(x) || (author && x === author.id)));
    if (users.length) return fans.length && rng.next() < 0.6 ? rng.pick(fans) : rng.pick(users);
  }
  return null;   // a filler bot
}

function postReply(feed, rng, run, q, tick, profile) {
  const parent = feed.posts.find(p => p.id === q.parent);
  if (!parent) return;
  if (q.by) {   // scripted (threads) or a fixed account
    const acct = account(q.by);
    if (acct) addPost(feed, { k: acct.key }, q.text, tick, { parent: parent.id });
    return;
  }
  const t = parent.tickers[0] || pickAsset(run, rng, null);
  const acct = replier(feed, rng, parent, run);
  if (!acct) {
    const scam = rng.next() < 0.12;
    addPost(feed, botAuthor(rng), fill(rng.pick(scam ? BOT_LINES.scam : BOT_LINES.reply), { t }), tick, { parent: parent.id });
    return;
  }
  const mood = parent.mood && rng.next() < 0.6 && acct.replies[parent.mood] ? parent.mood : 'any';
  const line = pickLine(feed, rng, acct.key + ':r:' + mood, acct.replies[mood], tick);
  if (!line) return;
  const rival = rivalsOf(acct).length ? rng.pick(rivalsOf(acct)).handle : null;
  addPost(feed, { k: acct.key }, fill(line, { t, rival, you: profile && profile.handle }), tick, { parent: parent.id });
}

// ── Threads ──────────────────────────────────────────────────────────────────
function playThread(feed, rng, run, tick) {
  const ready = THREADS.filter(th => (feed.threads[th.id] ?? -1e9) + THREAD_GAP <= tick && threadRef(th.post.by));
  if (!ready.length) return null;
  const th = rng.pick(ready);
  feed.threads[th.id] = tick;
  const options = inMarket(run, th.assets);
  const t = options.length ? rng.pick(options) : pickAsset(run, rng, null);
  const author = threadRef(th.post.by);
  let effect = null;
  if (th.effect && canMove(feed, author.key, t, tick, run.market)) effect = applyMove(feed, run.market, th.effect.type, t, author.key, rng, tick);
  const tone = th.effect ? MOVES[th.effect.type].tone : 0;
  const p = addPost(feed, { k: author.key }, fill(th.post.text, { t }), tick, { heat: author.kind === 'celeb' ? 3 : 1.5, thread: th.id, effect, mood: moodOf(tone) });
  if (!p) return null;
  if (effect && ['endorse', 'moon', 'rumor', 'meme', 'product'].includes(effect.type)) trackEndorsement(feed, run, p, author.key, t, tick);
  // replies keep their order but arrive at varied times; long threads sometimes drop one
  const drop = th.replies.length > 4 && rng.next() < 0.4 ? rng.int(1, th.replies.length - 2) : -1;
  let due = tick;
  th.replies.forEach((r, i) => {
    if (i === drop) return;
    const acct = threadRef(r.by);
    if (!acct) return;
    due += rng.int(1, 4);
    feed.queue.push({ due, parent: p.id, by: acct.key, text: fill(r.text, { t }) });
  });
  return p;
}

// ── Market-moving posts ──────────────────────────────────────────────────────
function marketMove(feed, rng, run, tick) {
  const order = [...CELEBS].sort(() => rng.next() - 0.5);
  for (const c of order) {
    const acct = account('c:' + c.id);
    const move = pickLine(feed, rng, acct.key + ':m', acct.moves, tick, true, 900);
    if (!move) continue;
    const t = move.asset && run.market.assets[move.asset] ? move.asset : pickAsset(run, rng, acct);
    if (!canMove(feed, acct.key, t, tick, run.market)) continue;
    const rival = rivalsOf(acct).length ? rng.pick(rivalsOf(acct)).handle : null;
    const effect = applyMove(feed, run.market, move.type, t, acct.key, rng, tick);
    if (!effect) continue;
    const p = addPost(feed, { k: acct.key }, fill(move.text, { t, rival }), tick, { heat: 4 + rng.next() * 3, effect, mood: moodOf(MOVES[move.type].tone) });
    if (!p) return null;
    queueReplies(feed, rng, p, rng.int(3, 6), tick);
    if (['endorse', 'moon', 'rumor', 'meme', 'product'].includes(move.type)) trackEndorsement(feed, run, p, acct.key, t, tick);
    boostTrend(feed, '$' + t, 6, tick);
    return p;
  }
  return null;
}

function trackEndorsement(feed, run, p, key, t, tick) {
  feed.endorse.push({ post: p.id, key, t, price: run.market.assets[t].p, tick });
  if (feed.endorse.length > 20) feed.endorse.shift();
}

// endorsements that aged badly get an apology and "aged like milk" replies; good ones a victory lap
function hindsight(feed, rng, run, tick) {
  feed.endorse = feed.endorse.filter(e => {
    const a = run.market.assets[e.t];
    const age = tick - e.tick;
    if (!a || age > 300) return false;
    if (age < 15) return true;
    const r = a.p / e.price - 1;
    const acct = account(e.key);
    if (r <= -0.2) {
      const apology = acct.moves && acct.moves.find(m => m.type === 'apology');
      if (apology && canMove(feed, acct.key, e.t, tick, run.market)) {
        const effect = applyMove(feed, run.market, 'apology', e.t, acct.key, rng, tick);
        const p = addPost(feed, { k: acct.key }, fill(apology.text, { t: e.t }), tick, { heat: 3, effect, mood: 'down', kind: 'apology' });
        if (p) queueReplies(feed, rng, p, rng.int(2, 4), tick);
      } else if (acct.react && acct.react.crash) reactPost(feed, rng, run, 'crash', e.t, r * 100, tick, acct);
      for (let i = 0, n = rng.int(1, 3); i < n; i++) hindsightReply(feed, rng, e.post, 'bad', tick);
      return false;
    }
    if (r >= 0.25) {
      if (acct.react && acct.react.pump) reactPost(feed, rng, run, 'pump', e.t, r * 100, tick, acct);
      hindsightReply(feed, rng, e.post, 'good', tick);
      return false;
    }
    return true;
  });
}

function hindsightReply(feed, rng, postId, which, tick) {
  if (!feed.posts.some(p => p.id === postId)) return;
  const users = USERS.filter(u => !u.scam);
  const u = account('u:' + rng.pick(users).handle);
  addPost(feed, { k: u.key }, pickLine(feed, rng, 'hindsight:' + which, HINDSIGHT[which], tick), tick, { parent: postId, hindsight: which });
}

// ── Trends ───────────────────────────────────────────────────────────────────
function boostTrend(feed, tag, score, tick) {
  const cur = feed.trend[tag];
  feed.trend[tag] = { s: (cur && cur.until > tick ? cur.s : 0) + score, until: tick + 240 };
}

export function trending(feed, tick, n = 8) {
  const score = {};
  for (const p of feed.posts) {
    if (tick - p.tick > 240) continue;
    const w = 1 + Math.min(5, p.likes / 400);
    for (const t of p.tickers) score['$' + t] = (score['$' + t] || 0) + w;
    for (const h of hashtags(p.text)) score[h] = (score[h] || 0) + w;
  }
  for (const [tag, b] of Object.entries(feed.trend)) {
    if (b.until <= tick) { delete feed.trend[tag]; continue; }
    score[tag] = (score[tag] || 0) + b.s;
  }
  const tags = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([tag, s]) => ({ tag, t: tag[0] === '$' ? tag.slice(1) : null, posts: Math.round(s * 41 + 60) }));
  for (const f of TRENDING_FILLER) { if (tags.length >= n) break; if (!score[f]) tags.push({ tag: f, t: null, posts: 900 + (f.length * 7919) % 20000 }); }
  return tags;
}

// ── One tick ─────────────────────────────────────────────────────────────────
export function stepFeed(feed, run, notes, profile = null) {
  const rng = createRng(feed.rng);
  const m = run.market, tick = m.tick;

  for (const n of notes) {
    if (n.type === 'headline') newsPosts(feed, rng, run, n.headline, tick);
    else if (n.type === 'jump') reactPost(feed, rng, run, n.size > 0 ? 'pump' : 'crash', n.t, (Math.exp(n.size) - 1) * 100, tick);
  }

  // visible moves (the chart already shows them)
  for (const t of m.order) {
    const a = m.assets[t], d = ASSET_BY_T[t];
    const loud = CATS[d.cat].hypeable ? 0.75 : d.cat === 'safe' ? 0.12 : 0.4;
    if (a.pump && a.pump.ticks === 6 && rng.next() < loud * 0.7) {
      const pct = (a.p / (a.hist[Math.max(0, a.hist.length - 7)] || a.p) - 1) * 100;
      if (pct < 4) continue;
      reactPost(feed, rng, run, 'pump', t, pct, tick);
      if (pct > 12 && rng.next() < 0.5) feed.queue.push({ due: tick + rng.int(2, 6), react: 'pump', t, pct });
      boostTrend(feed, '$' + t, 4, tick); boostTrend(feed, EVENT_TAGS.pump, 1, tick);
    }
    if (a.crash && a.crash.ticks === 2 && (a.crash.cause === 'rug' || rng.next() < loud * 0.6)) {
      const pct = (1 - a.p / (a.hist[Math.max(0, a.hist.length - 3)] || a.p)) * 100;
      const kind = a.crash.cause === 'rug' ? 'rug' : 'crash';
      if (kind === 'crash' && pct < 4) continue;
      reactPost(feed, rng, run, kind, t, pct, tick);
      const alert = kind === 'rug' && pickLine(feed, rng, 's:rugradar:rug', RUG_ALERTS, tick, true, 900);
      if (alert) addPost(feed, { k: 's:rugradar' }, fill(alert, { t }), tick, { heat: 2, mood: 'down' });
      if (kind === 'rug' || pct > 12) feed.queue.push({ due: tick + rng.int(2, 6), react: kind, t, pct });
      boostTrend(feed, '$' + t, 4, tick); boostTrend(feed, EVENT_TAGS[kind], 2, tick);
    }
  }

  hindsight(feed, rng, run, tick);

  if (tick >= feed.nextMove) {
    marketMove(feed, rng, run, tick);
    feed.nextMove = tick + rng.int(...MOVE_GAP);
  }

  if (rng.next() < 0.5) {
    const r = rng.next();
    let done = null;
    if (r < 0.88 && r >= 0.78) done = playThread(feed, rng, run, tick);
    else if (r >= 0.88) done = accountPost(feed, rng, run, account('s:' + rng.pick(['news', 'whale', 'rugradar', 'fed', 'sfc', 'beige', 'vibes', 'chirper'])), tick);
    // celebrities and users (also the fallback when a thread or system account has nothing fresh)
    for (let tries = 0; !done && tries < 4; tries++) {
      if (r < 0.4 || (r >= 0.78 && rng.next() < 0.5)) {
        const quiet = CELEBS.filter(c => (feed.lastPost['c:' + c.id] ?? -1e9) + 30 < tick);
        if (quiet.length) done = accountPost(feed, rng, run, account('c:' + rng.pick(quiet).id), tick);
      } else {
        const u = rng.pick(USERS.filter(x => !x.scam || rng.next() < 0.2));
        done = accountPost(feed, rng, run, account('u:' + u.handle), tick);
      }
    }
  }

  const due = feed.queue.filter(q => q.due <= tick);
  feed.queue = feed.queue.filter(q => q.due > tick);
  for (const q of due) {
    if (q.react) reactPost(feed, rng, run, q.react, q.t, q.pct, tick);
    else postReply(feed, rng, run, q, tick, profile);
  }

  engage(feed, rng, tick);
  feed.rng = rng.state;
}

function newsPosts(feed, rng, run, h, tick) {
  if (h.regime) {
    addPost(feed, { k: 's:news' }, `🚨 ${h.text}`, tick, { heat: 5, news: h.id, mood: moodOf(h.tone) });
    boostTrend(feed, EVENT_TAGS[h.regime] || '#Markets', 12, tick);
    const kind = h.regime === 'flash' ? 'crash' : h.tone > 0 ? 'bull' : h.tone < 0 ? 'bear' : 'news';
    for (let i = 0, n = rng.int(3, 5); i < n; i++) {
      const acct = rng.next() < 0.6 ? account('c:' + rng.pick(CELEBS).id) : account('u:' + rng.pick(USERS.filter(u => !u.scam)).handle);
      const k = acct.kind === 'celeb' ? (kind === 'crash' ? 'bear' : kind) : 'any';
      const line = pickLine(feed, rng, acct.key + ':x:' + k, acct.react[k] || acct.react.any, tick);
      if (line) feed.queue.push({ due: tick + rng.int(1, 8), react: kind === 'crash' ? 'bear' : kind, t: pickAsset(run, rng, acct) });
    }
    return;
  }
  const t = h.tickers[0] || null;
  const p = addPost(feed, { k: 's:news' }, (h.tone > 0 ? '📈 ' : h.tone < 0 ? '📉 ' : '📰 ') + h.text + (t ? ` $${t}` : ''), tick, { heat: 3, news: h.id, mood: moodOf(h.tone) });
  if (p) queueReplies(feed, rng, p, rng.int(2, 4), tick);
  if (t) boostTrend(feed, '$' + t, 3, tick);
  // the people the headline names post about it themselves (the news already moved the price)
  for (const name of Object.values(h.cast || {})) {
    const acct = castAccount(name);
    if (!acct) continue;
    if (acct.kind === 'celeb' && t) {
      const echo = acct.moves.filter(mv => mv.type === 'endorse' || mv.type === 'moon');
      const line = echo.length ? rng.pick(echo).text : rng.pick(acct.react.news);
      const q = addPost(feed, { k: acct.key }, fill(line, { t }), tick, { heat: 4, mood: moodOf(h.tone) });
      if (q) queueReplies(feed, rng, q, rng.int(2, 5), tick);
    } else accountPost(feed, rng, run, acct, tick);
  }
  if (h.kind === 'hype_campaign' && t) for (let i = 0, n = rng.int(2, 4); i < n; i++) feed.queue.push({ due: tick + rng.int(1, 6), react: 'pump', t, pct: 5 + rng.next() * 20 });
  if (h.kind === 'whale' && t) addPost(feed, { k: 's:whale' }, `🚨🐋 Whale alert: huge $${t} transfer to an exchange`, tick, { heat: 2, news: h.id });
  if (t && rng.next() < 0.5) feed.queue.push({ due: tick + rng.int(2, 8), react: h.tone >= 0 ? 'news' : 'crash', t, pct: 5 });
}

// likes and reposts trickle in: more for big accounts, market-moving posts and fresh posts
function engage(feed, rng, tick) {
  let seen = 0;
  for (const p of feed.posts) {
    if (p.parent) continue;
    if (++seen > 40) break;
    const age = tick - p.tick;
    if (age > 150) continue;
    const info = p.a.k ? account(p.a.k) : null;
    const reach = p.a.p ? Math.sqrt(feed.followers) : info ? Math.sqrt(info.followers) / (info.kind === 'celeb' ? 3 : 1) : Math.sqrt(p.a.f || 10);
    const rate = reach * p.heat * Math.exp(-age / 30) * 0.08;
    const add = Math.floor(rate * (0.5 + rng.next()));
    if (add > 0) {
      p.likes += add;
      p.reposts += Math.floor(add * (0.05 + rng.next() * 0.15));
      if (p.a.p) feed.followers += Math.floor(add / 8 + (rng.next() < 0.2 ? 1 : 0));
    }
  }
}

// ── The player ───────────────────────────────────────────────────────────────
// Returns { ok, post, hyped: [tickers that got a hype bump] }.
export function playerPost(feed, run, text, { parent = null } = {}) {
  text = String(text || '').trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, error: 'Write something first.' };
  if (text.length > MAX_LEN) return { ok: false, error: `Chirps are ${MAX_LEN} characters max.` };
  const rng = createRng(feed.rng);
  const tick = run.market.tick;
  const post = addPost(feed, { p: 1 }, text, tick, { parent, mine: true, heat: 1 + rng.next() });
  if (!post) { feed.rng = rng.state; return { ok: false, error: 'That post is gone.' }; }
  const hyped = [];
  for (const t of post.tickers) {
    const a = run.market.assets[t], d = ASSET_BY_T[t];
    if (!a || !CATS[d.cat].hypeable || d.stable) continue;
    if ((feed.shillCd[t] || 0) > tick) continue;
    a.hype = Math.min(100, a.hype + SHILL_HYPE);
    feed.shillCd[t] = tick + SHILL_COOLDOWN;
    hyped.push(t);
  }
  queueReplies(feed, rng, post, 1 + rng.int(0, 2 + Math.min(3, Math.floor(Math.log10(feed.followers + 1)))), tick);
  feed.rng = rng.state;
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

// for profiles: an account's recent posts
export const postsBy = (feed, key) => feed.posts.filter(p => keyOf(p.a) === key);
export { byHandle };
