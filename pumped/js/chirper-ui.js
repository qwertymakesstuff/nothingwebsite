// Chirper view: the Twitter-style social site beside the trading terminal. The market keeps running
// while you scroll, which is rather the point. Content and logic live in chirper/.

import { CELEBS, USERS, account, byHandle, assetsOf, rivalsOf } from './chirper/accounts.js';
import { authorInfo, keyOf, playerPost, toggleLike, toggleRepost, trending, MAX_LEN, SHILL_COOLDOWN, SHILL_HYPE } from './chirper/feed.js';
import { ASSET_BY_T } from './assets.js';
import { changePct } from './market.js';
import { h, $, $$, setText } from './dom.js';
import * as F from './format.js';

const SHOWN = 60;
const TABS = { home: 'Home', following: 'Following', mentions: 'Mentions', me: 'Profile', profile: 'Profile', tag: 'Trending' };

export class ChirperView {
  // ctx: { run(), meta(), worth(), timeLeft(), onTicker(t), onBack(), toast(), saveMeta(), sfx }
  constructor(ctx) {
    this.ctx = ctx;
    this.tab = 'home';
    this.profile = null;      // account key on a profile page
    this.tag = null;          // hashtag / cashtag being browsed
    this.open = new Set();    // post ids with their thread open
    this.lastTop = 0;
    this.visible = false;
    this.bind();
  }

  get feed() { return this.ctx.run().social; }
  get meta() { return this.ctx.meta(); }
  get prefs() { return this.meta.chirper; }
  profileInfo() { return this.meta.profile; }

  bind() {
    $$('.ch-nav button').forEach(b => b.addEventListener('click', () => this.go(b.dataset.ch)));
    $('#chBack').addEventListener('click', () => this.ctx.onBack());
    const ta = $('#chText');
    ta.addEventListener('input', () => this.updateCount());
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.submit(ta.value); } });
    $('#chPost').addEventListener('click', () => this.submit(ta.value));
    $('#chNew').addEventListener('click', () => this.refresh());
  }

  show() { this.visible = true; this.feed.unread = 0; this.render(); this.renderSide(); this.renderWallet(); }
  hide() { this.visible = false; }

  refresh() {
    $('.ch-main').scrollTop = 0;
    this.render();
    this.ctx.sfx.play('click');
  }

  go(tab, arg = null) {
    this.tab = tab;
    this.profile = tab === 'profile' ? arg : null;
    this.tag = tab === 'tag' ? arg : null;
    if (tab === 'mentions') this.feed.mentions = 0;
    $$('.ch-nav button').forEach(b => b.classList.toggle('on', b.dataset.ch === tab));
    $('.ch-main').scrollTop = 0;
    this.render();
    this.ctx.sfx.play('click');
  }

  updateCount() {
    const ta = $('#chText');
    const left = MAX_LEN - ta.value.length;
    const c = $('#chCount');
    setText(c, String(left));
    c.className = left < 20 ? 'down' : '';
    $('#chPost').disabled = !ta.value.trim() || left < 0 || this.ctx.run().over;
  }

  submit(text, parent = null, input = null) {
    const run = this.ctx.run();
    if (run.over) { this.ctx.toast('This run is over.', 'bad'); return; }
    const r = playerPost(this.feed, run, text, { parent });
    if (!r.ok) { this.ctx.toast(r.error, 'bad'); this.ctx.sfx.play('error'); return; }
    this.ctx.sfx.play('buy');
    if (input) input.value = ''; else { $('#chText').value = ''; this.updateCount(); }
    if (r.hyped.length) this.ctx.toast(`📣 You hyped ${r.hyped.map(t => '$' + t).join(' ')}: hype +${SHILL_HYPE} (once every ${SHILL_COOLDOWN}s per coin).`, 'gold');
    if (parent) this.open.add(parent);
    this.render();
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
  list() {
    const f = this.feed, follows = this.meta.follows;
    const top = f.posts.filter(p => !p.parent);
    switch (this.tab) {
      case 'following': return top.filter(p => p.a.p || follows.includes(keyOf(p.a)));
      case 'mentions': return f.posts.filter(p => p.toMe);
      case 'me': return f.posts.filter(p => p.a.p);
      case 'profile': return f.posts.filter(p => keyOf(p.a) === this.profile);
      case 'tag': return f.posts.filter(p => p.text.toLowerCase().includes(this.tag.toLowerCase()));
      default: return top;
    }
  }

  render() {
    if (!this.visible) return;
    const f = this.feed;
    const list = this.list().slice(0, SHOWN);
    this.lastTop = f.nextId;
    $('#chNew').hidden = true;
    $('#chCompose').hidden = !['home', 'following', 'me'].includes(this.tab);
    this.renderHead();
    const empty = { following: 'Follow some accounts (right side) and their chirps show up here.', mentions: 'Nobody has replied to you yet. Chirp something!', me: 'You haven\'t chirped yet.', profile: 'No recent chirps.', tag: 'Nothing recent with this tag.', home: 'Quiet… too quiet.' }[this.tab];
    $('#chFeed').replaceChildren(...(list.length ? list.map(p => this.postEl(p)) : [h('p', { class: 'ch-empty', text: empty })]));
    setText($('#chMentions'), f.mentions ? String(f.mentions) : '');
  }

  renderHead() {
    const head = $('#chHead');
    if (this.tab === 'profile' || this.tab === 'me') { head.replaceChildren(...this.profileHead()); return; }
    const title = this.tab === 'tag' ? this.tag : TABS[this.tab];
    const sub = { home: 'Live from the market. Bots lie, celebrities lie louder.', following: 'Only the accounts you follow.', mentions: 'Replies to your chirps.', tag: 'Recent chirps with this tag.' }[this.tab];
    head.replaceChildren(
      h('div', { class: 'ch-headrow' },
        this.tab === 'tag' ? h('button', { type: 'button', class: 'ch-backlink', text: '←', 'aria-label': 'Back', onclick: () => this.go('home') }) : null,
        h('h2', { text: title }),
        h('button', { type: 'button', class: 'ch-btn ghost small', text: '↻ Refresh', title: 'Show the newest chirps', onclick: () => this.refresh() }),
        h('button', { type: 'button', class: 'ch-btn ghost small', text: '⚙', title: 'Feed settings', 'aria-label': 'Feed settings', onclick: () => this.toggleSettings() })),
      h('small', { class: 'muted', text: sub }),
      this.settingsBox());
  }

  settingsBox() {
    const p = this.prefs;
    const row = (key, label, note) => h('label', { class: 'ch-set' },
      h('input', { type: 'checkbox', checked: p[key], onchange: e => { p[key] = e.target.checked; this.ctx.saveMeta(); this.render(); } }),
      h('span', {}, h('b', { text: label }), h('small', { class: 'muted', text: note })));
    return h('div', { class: 'ch-settings', id: 'chSettings', hidden: !this.settingsOpen },
      row('autoRefresh', 'Auto-refresh', 'New chirps appear on their own when you\'re at the top of the feed.'),
      row('showEffects', 'Show market-moving labels', 'Mark chirps that moved a price (after the fact, never in advance).'));
  }

  toggleSettings() { this.settingsOpen = !this.settingsOpen; const b = $('#chSettings'); if (b) b.hidden = !this.settingsOpen; }

  profileHead() {
    const me = this.tab === 'me';
    const a = me ? { p: 1 } : authorFromKey(this.profile, this.feed);
    const info = authorInfo(a, this.profileInfo(), this.feed);
    const acct = info.acct;
    const following = this.meta.follows.includes(this.profile);
    const kids = [
      h('button', { type: 'button', class: 'ch-backlink', text: '← Back', onclick: () => this.go('home') }),
      h('div', { class: 'ch-banner', style: { background: `linear-gradient(120deg, ${info.color}, #05080a)` } }),
      h('div', { class: 'ch-prof' },
        h('div', { class: 'ch-av big', style: { background: info.color }, text: info.avatar }),
        me ? null : h('button', { type: 'button', class: `ch-btn ${following ? 'ghost' : ''}`, text: following ? 'Following' : 'Follow', onclick: () => this.follow(this.profile) })),
      h('h2', {}, info.name, badge(info.verified)),
      h('p', { class: 'ch-handle', text: '@' + info.handle + (info.bot ? ' · bot' : '') }),
      info.bio ? h('p', { class: 'ch-bio', text: info.bio }) : null,
      h('p', { class: 'ch-handle' }, h('b', { text: F.compactNum(info.followers).replace('.00', '') }), ' followers'),
    ];
    if (acct) {
      const assets = assetsOf(acct).filter(t => this.ctx.run().market.assets[t]);
      const facts = [];
      if (acct.style) facts.push(['Style', acct.style]);
      if (acct.topics) facts.push(['Talks about', acct.topics.join(', ')]);
      if (acct.interests) facts.push(['Into', acct.interests.join(', ')]);
      if (acct.jokes) facts.push(['Known for', acct.jokes.join(' · ')]);
      kids.push(h('div', { class: 'ch-facts' }, facts.map(([k, v]) => h('p', {}, h('b', { text: k + ': ' }), v))));
      if (assets.length) kids.push(h('div', { class: 'ch-chips' }, h('b', { text: 'Assets: ' }), ...assets.map(t => this.cashChip(t))));
      const rivals = rivalsOf(acct);
      if (rivals.length) kids.push(h('div', { class: 'ch-chips' }, h('b', { text: 'Rivals: ' }), ...rivals.map(r => h('button', { type: 'button', class: 'ch-link', text: '@' + r.handle, onclick: () => this.go('profile', r.key) }))));
    }
    if (me) kids.push(this.profileEditor());
    return kids.filter(Boolean);
  }

  profileEditor() {
    const p = this.profileInfo();
    const name = h('input', { type: 'text', maxlength: '30', value: p.name, 'aria-label': 'Display name' });
    const handle = h('input', { type: 'text', maxlength: '20', value: p.handle, 'aria-label': 'Handle' });
    return h('div', { class: 'ch-edit' },
      h('label', {}, 'Name ', name), h('label', {}, '@', handle),
      h('button', { type: 'button', class: 'ch-btn', text: 'Save', onclick: () => {
        const n = name.value.trim().slice(0, 30), hd = handle.value.trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
        if (!n || !hd) { this.ctx.toast('Name and handle can\'t be empty.', 'bad'); return; }
        if (byHandle(hd)) { this.ctx.toast(`@${hd} is taken.`, 'bad'); return; }
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
    const el = h('article', { class: `ch-post${p.a.p ? ' mine' : ''}${p.news ? ' news' : ''}${p.effect && this.prefs.showEffects ? ' moved' : ''}`, dataset: { id: String(p.id) } },
      h('button', { type: 'button', class: 'ch-av', style: { background: info.color }, text: info.avatar, 'aria-label': `${info.name} profile`, onclick: openProfile }),
      h('div', { class: 'ch-body' },
        h('header', {},
          h('button', { type: 'button', class: 'ch-name', onclick: openProfile }, info.name, badge(info.verified)),
          h('span', { class: 'ch-handle' }, `@${info.handle} · `, h('time', { text: ago(this.ctx.run().market.tick - p.tick) }))),
        p.parent ? h('p', { class: 'ch-replying', text: `Replying to @${this.replyTarget(p)}` }) : null,
        h('p', { class: 'ch-text' }, ...this.richText(p.text)),
        p.effect && this.prefs.showEffects ? h('p', { class: `ch-moved tone-${p.effect.tone}` }, `${p.effect.tone > 0 ? '📈' : p.effect.tone < 0 ? '📉' : '🌀'} ${p.effect.label} · moved `, this.cashChip(p.effect.t)) : null,
        h('footer', { class: 'ch-actions' },
          h('button', { type: 'button', class: 'ch-act reply', 'aria-label': 'Replies', onclick: e => { e.stopPropagation(); this.toggleThread(p.id); } }, '💬 ', h('span', { class: 'n-replies', text: num(p.replies) })),
          h('button', { type: 'button', class: `ch-act repost${p.reposted ? ' on' : ''}`, 'aria-label': 'Repost', onclick: e => { e.stopPropagation(); toggleRepost(this.feed, p.id); this.refreshCounts(); } }, '🔁 ', h('span', { class: 'n-reposts', text: num(p.reposts) })),
          h('button', { type: 'button', class: `ch-act like${p.liked ? ' on' : ''}`, 'aria-label': 'Like', onclick: e => { e.stopPropagation(); const q = toggleLike(this.feed, p.id); if (q && q.liked) this.ctx.sfx.play('click'); this.refreshCounts(); } }, h('i', { text: p.liked ? '♥' : '♡' }), ' ', h('span', { class: 'n-likes', text: num(p.likes) })),
          h('span', { class: 'ch-views', text: `📊 ${num(p.likes * 23 + p.reposts * 90 + 40)}` }))));
    if (!p.parent) {
      el.addEventListener('click', e => { if (!e.target.closest('button, a, input, textarea')) this.toggleThread(p.id); });
      if (this.open.has(p.id)) el.querySelector('.ch-body').append(this.thread(p));
    }
    return el;
  }

  replyTarget(p) {
    const parent = this.feed.posts.find(x => x.id === p.parent);
    return parent ? authorInfo(parent.a, this.profileInfo(), this.feed).handle : 'deleted';
  }

  thread(p) {
    const replies = this.feed.posts.filter(x => x.parent === p.id).reverse();
    const input = h('input', { type: 'text', maxlength: String(MAX_LEN), placeholder: 'Chirp your reply', 'aria-label': 'Reply' });
    const send = () => this.submit(input.value, p.id, input);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    return h('div', { class: 'ch-thread' },
      replies.length ? null : h('p', { class: 'muted ch-noreplies', text: 'No replies yet. They usually show up within a few seconds.' }),
      ...replies.map(r => this.postEl(r)),
      h('div', { class: 'ch-reply-box' }, input, h('button', { type: 'button', class: 'ch-btn', text: 'Reply', onclick: send })));
  }

  toggleThread(id) {
    if (this.open.has(id)) this.open.delete(id); else this.open.add(id);
    const el = $(`#chFeed .ch-post[data-id="${id}"]`);
    const p = this.feed.posts.find(x => x.id === id);
    if (!el || !p) return;
    const old = el.querySelector(':scope > .ch-body > .ch-thread');
    if (old) old.remove();
    if (this.open.has(id)) { const t = this.thread(p); el.querySelector('.ch-body').append(t); t.querySelector('input').focus({ preventScroll: true }); }
  }

  cashChip(t) {
    const run = this.ctx.run();
    const c = run.market.assets[t] ? changePct(run.market, t, 60) : 0;    // last minute: what people are chirping about
    return h('button', { type: 'button', class: `ch-cash ${F.tone(c)}`, title: `${ASSET_BY_T[t].name}: ${F.pct(c, 1)} in the last minute. Open in the terminal`, onclick: e => { e.stopPropagation(); this.ctx.onTicker(t); } },
      '$' + t, run.market.assets[t] ? h('small', { text: ` ${F.pct(c, 1)}` }) : null);
  }

  richText(text) {
    const out = [];
    const re = /(\$[A-Za-z]{2,8}\b|@[A-Za-z0-9_]+|#[A-Za-z][A-Za-z0-9_]+)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const tok = m[0];
      const t = tok.slice(1).toUpperCase();
      if (tok[0] === '$' && ASSET_BY_T[t] && this.ctx.run().market.assets[t]) out.push(this.cashChip(t));
      else if (tok[0] === '@' && byHandle(tok)) { const a = byHandle(tok); out.push(h('button', { type: 'button', class: 'ch-link', text: tok, onclick: e => { e.stopPropagation(); this.go('profile', a.key); } })); }
      else if (tok[0] === '#') out.push(h('button', { type: 'button', class: 'ch-link', text: tok, onclick: e => { e.stopPropagation(); this.go('tag', tok); } }));
      else out.push(h('span', { class: 'ch-link', text: tok }));
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
    $('#chTrends').replaceChildren(...tr.map((x, i) => h('button', { type: 'button', class: 'ch-trend', onclick: () => this.go('tag', x.tag) },
      h('small', { class: 'muted', text: `${i + 1} · Trending${x.t ? ' in Markets' : ''}` }),
      h('b', { text: x.tag }, x.t && run.market.assets[x.t] ? h('span', { class: F.tone(changePct(run.market, x.t, 60)), text: ` ${F.pct(changePct(run.market, x.t, 60), 1)} 1m` }) : null),
      h('small', { class: 'muted', text: `${F.compactNum(x.posts).replace('.00', '')} chirps` }))));
    const follows = this.meta.follows;
    const pool = [...CELEBS.map(c => account('c:' + c.id)), ...USERS.filter(u => !u.scam).map(u => account('u:' + u.handle))].filter(a => !follows.includes(a.key));
    const start = Math.floor(run.market.tick / 30) % Math.max(1, pool.length);
    const pickList = [...pool.slice(start), ...pool.slice(0, start)].slice(0, 5);
    $('#chWho').replaceChildren(...pickList.map(a => h('div', { class: 'ch-who' },
      h('button', { type: 'button', class: 'ch-av', style: { background: a.color }, text: a.avatar, onclick: () => this.go('profile', a.key) }),
      h('button', { type: 'button', class: 'ch-who-name', onclick: () => this.go('profile', a.key) }, h('b', {}, a.name, badge(a.verified)), h('small', { class: 'muted', text: '@' + a.handle })),
      h('button', { type: 'button', class: 'ch-btn small', text: 'Follow', onclick: () => this.follow(a.key) }))));
  }

  renderWallet() {
    const run = this.ctx.run(), w = this.ctx.worth(), s = run.stats;
    const chg = (w / s.start - 1) * 100;
    const left = this.ctx.timeLeft();
    const pos = Object.values(run.pf.positions).map(p => {
      const px = run.market.assets[p.t].p, eq = Math.max(0, p.qty * px - p.debt), pc = p.cost ? (eq / p.cost - 1) * 100 : 0;
      return h('button', { type: 'button', class: 'ch-hold', onclick: () => this.ctx.onTicker(p.t) }, h('b', { text: p.t }), h('span', { text: F.money(eq) }), h('span', { class: F.tone(pc), text: F.pct(pc, 1) }));
    });
    $('#chWallet').replaceChildren(
      h('small', { class: 'muted', text: 'YOUR MONEY (LIVE)' }),
      h('b', { class: 'ch-worth', text: F.money(w) }),
      h('span', { class: F.tone(chg), text: `${F.pct(chg)} this run` }),
      h('small', { class: 'muted', text: `Cash ${F.money(run.pf.cash)} · ${Number.isFinite(left) ? F.clock(left) + ' left' : 'endless'}` }),
      ...pos);
  }

  // called every market tick
  tick() {
    const f = this.feed;
    const badgeEl = $('#chBadge');
    const n = f.unread + f.mentions;
    badgeEl.hidden = this.visible || n === 0;
    setText(badgeEl, n > 99 ? '99+' : String(n));
    if (!this.visible) return;
    f.unread = 0;
    this.renderWallet();
    if (this.ctx.run().market.tick % 5 === 0) this.renderSide();
    const fresh = this.list().filter(p => p.id >= this.lastTop).length;
    const atTop = $('.ch-main').scrollTop < 30;
    const busy = this.open.size || (document.activeElement && document.activeElement.closest('.ch-thread, .ch-edit, .ch-compose'));
    if (fresh && this.prefs.autoRefresh && atTop && !busy) this.render();
    else if (fresh) { const b = $('#chNew'); b.hidden = false; setText(b, `↑ Show ${fresh} new chirp${fresh > 1 ? 's' : ''}`); }
    this.refreshCounts();
  }

  refreshCounts() {
    const tick = this.ctx.run().market.tick;
    const byId = new Map(this.feed.posts.map(p => [p.id, p]));
    for (const el of $$('#chFeed .ch-post')) {
      const p = byId.get(Number(el.dataset.id));
      if (!p) continue;
      const q = s => el.querySelector(`:scope > .ch-body > .ch-actions ${s}`);
      setText(q('.n-likes'), num(p.likes));
      setText(q('.n-reposts'), num(p.reposts));
      setText(q('.n-replies'), num(p.replies));
      q('.like').classList.toggle('on', !!p.liked);
      setText(q('.like i'), p.liked ? '♥' : '♡');
      q('.repost').classList.toggle('on', !!p.reposted);
      setText(el.querySelector(':scope > .ch-body time'), ago(tick - p.tick));
    }
  }
}

function authorFromKey(key, feed) {
  if (key && (key.startsWith('c:') || key.startsWith('u:') || key.startsWith('s:'))) return { k: key };
  const handle = (key || '').slice(2);
  const post = feed.posts.find(p => p.a.b === handle);
  return post ? post.a : { b: handle, n: handle, e: '👤', h: 200, f: 0 };
}

function badge(v) {
  if (!v) return null;
  const title = { gold: 'Verified celebrity (paid for it)', blue: 'Verified (paid $8)', grey: 'Official account' }[v];
  return h('span', { class: `ch-badge ${v}`, title, text: '✓' });
}

const num = n => (n >= 1000 ? F.compactNum(n).replace(/\.00(?=[KMB])/, '') : String(Math.max(0, n)));
const ago = s => (s < 60 ? `${Math.max(0, s)}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`);
