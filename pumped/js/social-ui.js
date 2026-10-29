// Squawker view: a Twitter-style feed beside the trading terminal. The market keeps running while
// you scroll, which is rather the point.

import { CELEBS } from './social-data.js';
import { authorInfo, playerPost, toggleLike, toggleRepost, trending, MAX_LEN, SHILL_COOLDOWN, SHILL_HYPE } from './social.js';
import { ASSET_BY_T } from './assets.js';
import { changePct } from './market.js';
import { h, $, $$, setText } from './dom.js';
import * as F from './format.js';

const SHOWN = 60;

export class SocialView {
  // ctx: { run(), meta(), worth(), timeLeft(), onTicker(t), onBack(), toast(), saveMeta(), sfx }
  constructor(ctx) {
    this.ctx = ctx;
    this.tab = 'home';
    this.profile = null;      // account key being viewed: 'c:<id>' | 'b:<handle>' | 'me'
    this.open = new Set();    // post ids with their thread open
    this.pending = 0;
    this.lastTop = 0;
    this.visible = false;
    this.bind();
  }

  get feed() { return this.ctx.run().social; }
  get meta() { return this.ctx.meta(); }
  profileInfo() { return this.meta.profile; }

  bind() {
    $$('.sq-nav button').forEach(b => b.addEventListener('click', () => this.go(b.dataset.sq)));
    $('#sqBack').addEventListener('click', () => this.ctx.onBack());
    const ta = $('#sqText');
    ta.addEventListener('input', () => this.updateCount());
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.submit(ta.value); } });
    $('#sqPost').addEventListener('click', () => this.submit(ta.value));
    $('#sqNew').addEventListener('click', () => { $('#sqFeed').scrollTop = 0; $('.sq-main').scrollTop = 0; this.render(); });
  }

  show() {
    this.visible = true;
    this.feed.unread = 0;
    this.render();
    this.renderSide();
  }

  hide() { this.visible = false; }

  go(tab, profile = null) {
    this.tab = tab;
    this.profile = profile;
    if (tab === 'mentions') this.feed.mentions = 0;
    $$('.sq-nav button').forEach(b => b.classList.toggle('on', b.dataset.sq === tab));
    $('.sq-main').scrollTop = 0;
    this.render();
    this.ctx.sfx.play('click');
  }

  updateCount() {
    const ta = $('#sqText');
    const left = MAX_LEN - ta.value.length;
    const c = $('#sqCount');
    setText(c, String(left));
    c.className = left < 20 ? 'down' : '';
    $('#sqPost').disabled = !ta.value.trim() || left < 0 || this.ctx.run().over;
  }

  submit(text, parent = null, input = null) {
    const run = this.ctx.run();
    if (run.over) { this.ctx.toast('This run is over.', 'bad'); return; }
    const r = playerPost(this.feed, run, text, { parent, profile: this.profileInfo() });
    if (!r.ok) { this.ctx.toast(r.error, 'bad'); this.ctx.sfx.play('error'); return; }
    this.ctx.sfx.play('buy');
    if (input) input.value = ''; else { $('#sqText').value = ''; this.updateCount(); }
    if (r.hyped.length) this.ctx.toast(`📣 You shilled ${r.hyped.map(t => '$' + t).join(' ')}. Hype +${SHILL_HYPE} (once every ${SHILL_COOLDOWN}s per coin).`, 'gold');
    if (parent) this.open.add(parent);
    this.render();
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
  list() {
    const f = this.feed, me = this.meta.follows;
    const top = f.posts.filter(p => !p.parent);
    switch (this.tab) {
      case 'following': return top.filter(p => p.a.p || me.includes(keyOf(p.a)));
      case 'mentions': return f.posts.filter(p => p.toMe);
      case 'me': return f.posts.filter(p => p.a.p);
      case 'profile': return f.posts.filter(p => keyOf(p.a) === this.profile);
      default: return top;
    }
  }

  render() {
    if (!this.visible) return;
    const f = this.feed;
    const list = this.list().slice(0, SHOWN);
    this.lastTop = f.nextId;
    this.pending = 0;
    $('#sqNew').hidden = true;
    $('#sqCompose').hidden = !['home', 'following', 'me'].includes(this.tab);
    this.renderHead();
    const feedEl = $('#sqFeed');
    const empty = { following: 'Follow some accounts (right side) and their squawks show up here.', mentions: 'Nobody has replied to you yet. Squawk something!', me: 'You haven\'t squawked yet.', profile: 'No recent squawks.', home: 'Quiet… too quiet.' }[this.tab];
    feedEl.replaceChildren(...(list.length ? list.map(p => this.postEl(p)) : [h('p', { class: 'sq-empty', text: empty })]));
    setText($('#sqMentions'), f.mentions ? String(f.mentions) : '');
  }

  renderHead() {
    const head = $('#sqHead');
    if (this.tab === 'profile' || this.tab === 'me') {
      const a = this.tab === 'me' ? { p: 1 } : authorFromKey(this.profile, this.feed);
      const info = authorInfo(a, this.profileInfo(), this.feed);
      const following = this.meta.follows.includes(this.profile);
      const kids = [
        h('button', { type: 'button', class: 'sq-backlink', text: '← Back', onclick: () => this.go('home') }),
        h('div', { class: 'sq-banner', style: { background: `linear-gradient(120deg, ${info.color}, #05080a)` } }),
        h('div', { class: 'sq-prof' },
          h('div', { class: 'sq-av big', style: { background: info.color }, text: info.avatar }),
          this.tab === 'me' ? null : h('button', { type: 'button', class: `sq-btn ${following ? 'ghost' : ''}`, text: following ? 'Following' : 'Follow', onclick: () => this.follow(this.profile) })),
        h('h2', {}, info.name, badge(info.verified)),
        h('p', { class: 'sq-handle', text: '@' + info.handle }),
        info.bio ? h('p', { class: 'sq-bio', text: info.bio }) : null,
        h('p', { class: 'sq-handle' }, h('b', { text: F.compactNum(info.followers).replace('.00', '') }), ' followers'),
      ];
      if (this.tab === 'me') kids.push(this.profileEditor());
      head.replaceChildren(...kids.filter(Boolean));
      return;
    }
    const titles = { home: 'Home', following: 'Following', mentions: 'Mentions' };
    head.replaceChildren(h('h2', { text: titles[this.tab] }), h('small', { class: 'muted', text: this.tab === 'home' ? 'Live from the market. Bots lie, celebrities lie more.' : '' }));
  }

  profileEditor() {
    const p = this.profileInfo();
    const name = h('input', { type: 'text', maxlength: '30', value: p.name, 'aria-label': 'Display name' });
    const handle = h('input', { type: 'text', maxlength: '20', value: p.handle, 'aria-label': 'Handle' });
    return h('div', { class: 'sq-edit' },
      h('label', {}, 'Name ', name), h('label', {}, '@', handle),
      h('button', { type: 'button', class: 'sq-btn', text: 'Save', onclick: () => {
        const n = name.value.trim().slice(0, 30), hd = handle.value.trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
        if (!n || !hd) { this.ctx.toast('Name and handle can\'t be empty.', 'bad'); return; }
        this.meta.profile = { name: n, handle: hd };
        this.ctx.saveMeta();
        this.ctx.toast('Profile saved.', 'good');
        this.render();
      } }));
  }

  postEl(p) {
    const info = authorInfo(p.a, this.profileInfo(), this.feed);
    const key = keyOf(p.a);
    const openProfile = e => { e.stopPropagation(); if (p.a.p) this.go('me'); else this.go('profile', key); };
    const el = h('article', { class: `sq-post${p.a.p ? ' mine' : ''}${p.news ? ' news' : ''}`, dataset: { id: String(p.id) } },
      h('button', { type: 'button', class: 'sq-av', style: { background: info.color }, text: info.avatar, 'aria-label': `${info.name} profile`, onclick: openProfile }),
      h('div', { class: 'sq-body' },
        h('header', {},
          h('button', { type: 'button', class: 'sq-name', onclick: openProfile }, info.name, badge(info.verified)),
          h('span', { class: 'sq-handle' }, `@${info.handle} · `, h('time', { dataset: { tick: String(p.tick) }, text: ago(this.ctx.run().market.tick - p.tick) }))),
        p.parent ? h('p', { class: 'sq-replying', text: `Replying to @${this.replyTarget(p)}` }) : null,
        h('p', { class: 'sq-text' }, ...this.richText(p.text)),
        h('footer', { class: 'sq-actions' },
          h('button', { type: 'button', class: 'sq-act reply', 'aria-label': 'Replies', onclick: e => { e.stopPropagation(); this.toggleThread(p.id); } }, '💬 ', h('span', { class: 'n-replies', text: num(p.replies) })),
          h('button', { type: 'button', class: `sq-act repost${p.reposted ? ' on' : ''}`, 'aria-label': 'Repost', onclick: e => { e.stopPropagation(); toggleRepost(this.feed, p.id); this.refreshCounts(); } }, '🔁 ', h('span', { class: 'n-reposts', text: num(p.reposts) })),
          h('button', { type: 'button', class: `sq-act like${p.liked ? ' on' : ''}`, 'aria-label': 'Like', onclick: e => { e.stopPropagation(); const q = toggleLike(this.feed, p.id); if (q && q.liked) this.ctx.sfx.play('click'); this.refreshCounts(); } }, h('i', { text: p.liked ? '♥' : '♡' }), ' ', h('span', { class: 'n-likes', text: num(p.likes) })),
          h('span', { class: 'sq-views', text: `📊 ${num(p.likes * 23 + p.reposts * 90 + 40)}` }))));
    if (!p.parent) {
      el.addEventListener('click', e => { if (!e.target.closest('button, a, input, textarea')) this.toggleThread(p.id); });
      if (this.open.has(p.id)) el.querySelector('.sq-body').append(this.thread(p));
    }
    return el;
  }

  replyTarget(p) {
    const parent = this.feed.posts.find(x => x.id === p.parent);
    return parent ? authorInfo(parent.a, this.profileInfo(), this.feed).handle : 'deleted';
  }

  thread(p) {
    const replies = this.feed.posts.filter(x => x.parent === p.id).reverse();
    const input = h('input', { type: 'text', maxlength: String(MAX_LEN), placeholder: 'Squawk your reply', 'aria-label': 'Reply' });
    const send = () => this.submit(input.value, p.id, input);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    return h('div', { class: 'sq-thread' },
      ...replies.map(r => this.postEl(r)),
      h('div', { class: 'sq-reply-box' }, input, h('button', { type: 'button', class: 'sq-btn', text: 'Reply', onclick: send })));
  }

  toggleThread(id) {
    if (this.open.has(id)) this.open.delete(id); else this.open.add(id);
    const el = $(`#sqFeed .sq-post[data-id="${id}"]`);
    const p = this.feed.posts.find(x => x.id === id);
    if (!el || !p) return;
    const old = el.querySelector(':scope > .sq-body > .sq-thread');
    if (old) old.remove();
    if (this.open.has(id)) { const t = this.thread(p); el.querySelector('.sq-body').append(t); t.querySelector('input').focus({ preventScroll: true }); }
  }

  richText(text) {
    const out = [];
    const re = /(\$[A-Za-z]{2,6}\b|@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const tok = m[0];
      if (tok[0] === '$' && ASSET_BY_T[tok.slice(1).toUpperCase()]) {
        const t = tok.slice(1).toUpperCase();
        const run = this.ctx.run();
        const c = run.market.assets[t] ? changePct(run.market, t) : 0;
        out.push(h('button', { type: 'button', class: `sq-cash ${F.tone(c)}`, title: `${ASSET_BY_T[t].name}: open in the terminal`, onclick: e => { e.stopPropagation(); this.ctx.onTicker(t); } }, tok.toUpperCase(), run.market.assets[t] ? h('small', { text: ` ${F.pct(c, 1)}` }) : null));
      } else if (tok[0] === '@') {
        const c = CELEBS.find(x => x.handle.toLowerCase() === tok.slice(1).toLowerCase());
        out.push(c ? h('button', { type: 'button', class: 'sq-link', text: tok, onclick: e => { e.stopPropagation(); this.go('profile', 'c:' + c.id); } }) : h('span', { class: 'sq-link', text: tok }));
      } else out.push(h('span', { class: 'sq-link', text: tok }));
      last = m.index + tok.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  follow(key) {
    const list = this.meta.follows;
    const i = list.indexOf(key);
    if (i >= 0) list.splice(i, 1); else if (list.length < 100) list.push(key);
    this.ctx.saveMeta();
    this.render();
    this.renderSide();
  }

  // ── Side panels ────────────────────────────────────────────────────────────
  renderSide() {
    if (!this.visible) return;
    const run = this.ctx.run();
    const tr = trending(this.feed, run.market.tick, 8);
    $('#sqTrends').replaceChildren(...tr.map((x, i) => h('button', { type: 'button', class: 'sq-trend', onclick: () => x.t && this.ctx.onTicker(x.t) },
      h('small', { class: 'muted', text: `${i + 1} · Trending in Markets` }),
      h('b', { text: x.tag }, x.t ? h('span', { class: F.tone(changePct(run.market, x.t)), text: ` ${F.pct(changePct(run.market, x.t), 1)}` }) : null),
      h('small', { class: 'muted', text: `${F.compactNum(x.posts).replace('.00', '')} squawks` }))));
    const who = CELEBS.filter(c => !c.news && !this.meta.follows.includes('c:' + c.id));
    const start = Math.floor(run.market.tick / 30) % Math.max(1, who.length);
    const pickList = [...who.slice(start), ...who.slice(0, start)].slice(0, 5);
    $('#sqWho').replaceChildren(...pickList.map(c => h('div', { class: 'sq-who' },
      h('button', { type: 'button', class: 'sq-av', style: { background: c.color }, text: c.avatar, onclick: () => this.go('profile', 'c:' + c.id) }),
      h('button', { type: 'button', class: 'sq-who-name', onclick: () => this.go('profile', 'c:' + c.id) }, h('b', {}, c.name, badge(c.verified)), h('small', { class: 'muted', text: '@' + c.handle })),
      h('button', { type: 'button', class: 'sq-btn small', text: 'Follow', onclick: () => this.follow('c:' + c.id) }))));
  }

  renderWallet() {
    const run = this.ctx.run(), w = this.ctx.worth(), s = run.stats;
    const chg = (w / s.start - 1) * 100;
    const left = this.ctx.timeLeft();
    const pos = Object.values(run.pf.positions).map(p => {
      const px = run.market.assets[p.t].p, eq = Math.max(0, p.qty * px - p.debt), pc = p.cost ? (eq / p.cost - 1) * 100 : 0;
      return h('button', { type: 'button', class: 'sq-hold', onclick: () => this.ctx.onTicker(p.t) }, h('b', { text: p.t }), h('span', { text: F.money(eq) }), h('span', { class: F.tone(pc), text: F.pct(pc, 1) }));
    });
    $('#sqWallet').replaceChildren(
      h('small', { class: 'muted', text: 'YOUR MONEY (LIVE)' }),
      h('b', { class: 'sq-worth', text: F.money(w) }),
      h('span', { class: F.tone(chg), text: `${F.pct(chg)} this run` }),
      h('small', { class: 'muted', text: `Cash ${F.money(run.pf.cash)} · ${Number.isFinite(left) ? F.clock(left) + ' left' : 'endless'}` }),
      ...pos);
  }

  // called every market tick
  tick() {
    const f = this.feed;
    const badgeEl = $('#sqBadge');
    const n = f.unread + f.mentions;
    badgeEl.hidden = this.visible || n === 0;
    setText(badgeEl, n > 99 ? '99+' : String(n));
    if (!this.visible) return;
    f.unread = 0;
    this.renderWallet();
    if (this.ctx.run().market.tick % 5 === 0) this.renderSide();
    const fresh = this.list().filter(p => p.id >= this.lastTop).length;
    const main = $('.sq-main');
    const atTop = (main.scrollTop < 30) && $('#sqFeed').scrollTop < 30;
    const typing = document.activeElement && document.activeElement.closest('.sq-thread, .sq-edit');
    if (fresh && atTop && !this.open.size && !typing) this.render();
    else if (fresh) { this.pending = fresh; const b = $('#sqNew'); b.hidden = false; setText(b, `↑ Show ${fresh} new squawk${fresh > 1 ? 's' : ''}`); }
    this.refreshCounts();
  }

  refreshCounts() {
    const tick = this.ctx.run().market.tick;
    const byId = new Map(this.feed.posts.map(p => [p.id, p]));
    for (const el of $$('#sqFeed .sq-post')) {
      const p = byId.get(Number(el.dataset.id));
      if (!p) continue;
      const q = s => el.querySelector(`:scope > .sq-body > .sq-actions ${s}`);
      setText(q('.n-likes'), num(p.likes));
      setText(q('.n-reposts'), num(p.reposts));
      setText(q('.n-replies'), num(p.replies));
      q('.like').classList.toggle('on', !!p.liked);
      setText(q('.like i'), p.liked ? '♥' : '♡');
      q('.repost').classList.toggle('on', !!p.reposted);
      const t = el.querySelector(':scope > .sq-body time');
      setText(t, ago(tick - p.tick));
    }
  }
}

export const keyOf = a => (a.p ? 'me' : a.c ? 'c:' + a.c : 'b:' + a.b);

function authorFromKey(key, feed) {
  if (!key) return { p: 1 };
  if (key.startsWith('c:')) return { c: key.slice(2) };
  const handle = key.slice(2);
  const post = feed.posts.find(p => p.a.b === handle);
  return post ? post.a : { b: handle, n: handle, e: '👤', k: 200, f: 0 };
}

function badge(v) {
  if (!v) return null;
  const title = { gold: 'Verified celebrity (paid for it)', blue: 'Verified (paid $8)', grey: 'Official account' }[v];
  return h('span', { class: `sq-badge ${v}`, title, text: '✓' });
}

const num = n => (n >= 1000 ? F.compactNum(n).replace(/\.00(?=[KMB])/, '') : String(Math.max(0, n)));
const ago = s => (s < 60 ? `${Math.max(0, s)}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`);
