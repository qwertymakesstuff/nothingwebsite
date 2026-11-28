// Vidder (vidder.tv): home, trending, search, watch pages with the player, channels, playlists,
// subscriptions, likes/dislikes, Watch Later and Favourites, watch history, comments and related videos.
import { h, clear } from '../lib/dom.js';
import { save, patch, worldNow } from '../os/state.js';
import { VIDEOS, VIDEO, USERS, PLAYLIST, PLAYLISTS, videosByChannel, playlistsByChannel, presence, grow, personRecord } from '../content/index.js';
import { thumb } from '../lib/art.js';
import { avatarImg, when, q, highlight } from './common.js';
import { paragraphs, inline } from '../lib/rich.js';
import { compact, fmtNum, longDate, toMs, shortDate } from '../lib/time.js';
import { search, tokens } from '../net/search.js';
import { rng } from '../lib/rng.js';
import { createPlayer } from './player.js';

const FAV = '<svg viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="10" rx="3" fill="#d1252a"/><path d="M6.5 5.5l4 2.5-4 2.5z" fill="#fff"/></svg>';
export const vidder = { id: 'vidder', host: 'vidder.tv', name: 'Vidder', favicon: FAV, server: 'vidder-frontend', render };

const CATEGORY = { maxplaysstuff: 'Gaming', retrorandy: 'Gaming', sadkeyboard: 'Music', beatsbynobody: 'Music', pruittreviews: 'Reviews', rigdoctor: 'Technology', kaylakreates: 'Style', glittergrrl: 'Style', dannycookspoorly: 'Food', dougtheunbothered: 'Animals', w_haskins: 'Comedy', pedalpush: 'Sports', wexleynews9: 'News', vidder: 'Vidder', tylerdoesvlogs: 'People & Blogs', hollowfrequency: 'People & Blogs' };
const chName = id => USERS[id]?.vidder?.channel || id;
const views = v => grow(v.views, v.date, worldNow()) + (save.get().vidder.watched[v.id]?.n || 0);
const subsOf = id => (USERS[id]?.vidder?.subs || 0) + (save.get().vidder.subs[id] ? 1 : 0);
const isSub = id => !!save.get().vidder.subs[id];

function render(route, ctx) {
  const [a, b, c] = route.segs;
  if (!a) return home(ctx);
  if (a === 'watch') return watch(route.query.get('v'), route.query.get('list'), ctx, +route.query.get('t') || 0);
  if (a === 'results') return results(route.query.get('search_query') || route.query.get('q') || '', ctx, route.query.get('sort'));
  if (a === 'trending') return trending(ctx, route.query.get('cat'));
  if (a === 'channel') return channel(b, c || 'videos', ctx, route.query.get('sort'));
  if (a === 'playlist') return playlist(route.query.get('list'), ctx);
  if (a === 'subscriptions') return subscriptions(ctx);
  if (a === 'history') return watchHistory(ctx);
  return notFound(ctx);
}

// ---- layout ---------------------------------------------------------------------------------
function shell(ctx, main, { query = '', active = '', wide = false } = {}) {
  const input = h('input', { class: 'vd-q', value: query, placeholder: 'Search', 'aria-label': 'Search Vidder', onkeydown: e => { if (e.key === 'Enter' && input.value.trim()) ctx.go('vidder.tv/results?search_query=' + q(input.value.trim())); } });
  const subs = Object.keys(save.get().vidder.subs).filter(id => USERS[id]);
  const nav = (href, label, key) => h('a', { href, class: 'vd-nav' + (active === key ? ' on' : '') }, label);
  return h('div', { class: 'vd' + (wide ? ' wide' : '') },
    h('div', { class: 'vd-top' },
      h('a', { href: '/', class: 'vd-logo', 'aria-label': 'Vidder home' }, h('span', { class: 'vd-play' }, '▶'), 'Vidder'),
      h('div', { class: 'vd-search' }, input, h('button', { type: 'button', class: 'vd-sbtn', onclick: () => input.value.trim() && ctx.go('vidder.tv/results?search_query=' + q(input.value.trim())) }, 'Search')),
      h('div', { class: 'vd-topr' }, h('a', { href: '/playlist?list=WL', class: 'vd-toplink' }, 'Watch Later'), h('span', { class: 'vd-me' }, save.get().settings.userName))),
    h('div', { class: 'vd-cols' },
      h('aside', { class: 'vd-side' },
        nav('/', 'Home', 'home'), nav('/trending', 'Trending', 'trending'), nav('/subscriptions', 'Subscriptions', 'subs'), nav('/history', 'History', 'history'),
        nav('/playlist?list=WL', 'Watch Later', 'WL'), nav('/playlist?list=FAV', 'Favourites', 'FAV'),
        h('h4', null, 'Subscriptions'),
        subs.length ? subs.map(id => h('a', { href: '/channel/' + id, class: 'vd-subrow' }, avatarImg(id, 20), chName(id))) : h('p', { class: 'vd-hint' }, 'Channels you subscribe to appear here.'),
        h('h4', null, 'Browse'),
        ['Gaming', 'Music', 'Food', 'Animals', 'Technology', 'Style'].map(cat => h('a', { href: '/trending?cat=' + q(cat), class: 'vd-nav small' }, cat))),
      h('main', { class: 'vd-main' }, main)),
    h('div', { class: 'vd-foot' }, '© 2013 Vidder, a Findr company · ', h('a', { href: '/channel/vidder' }, 'Vidder Blog'), ' · Broadcast yourself.'));
}

function card(v, opts = {}) {
  const w = save.get().vidder.watched[v.id];
  return h('div', { class: 'vd-card' + (opts.row ? ' row' : '') },
    h('a', { href: '/watch?v=' + v.id + (opts.list ? '&list=' + opts.list : ''), class: 'vd-thumb' }, h('img', { src: thumb(v), alt: '' }), h('span', { class: 'vd-dur' }, v.dur), w ? h('span', { class: 'vd-watched' }, 'WATCHED') : null),
    h('div', { class: 'vd-cinfo' },
      h('a', { href: '/watch?v=' + v.id + (opts.list ? '&list=' + opts.list : ''), class: 'vd-ctitle', title: v.title }, v.title),
      opts.noCh ? null : h('a', { href: '/channel/' + v.ch, class: 'vd-cch' }, chName(v.ch)),
      h('span', { class: 'vd-cmeta' }, compact(views(v)) + ' views · ' + when(v.date)),
      opts.desc ? h('p', { class: 'vd-cdesc' }, (v.desc || '').slice(0, 140)) : null));
}
const grid = (list, opts) => h('div', { class: 'vd-grid' }, list.map(v => card(v, opts)));
const hot = v => views(v) / Math.pow((worldNow() - toMs(v.date)) / 864e5 + 2, 0.9);

function home(ctx) {
  const s = save.get().vidder;
  const subbed = Object.keys(s.subs);
  const fromSubs = VIDEOS.filter(v => subbed.includes(v.ch)).sort((a, b) => toMs(b.date) - toMs(a.date)).slice(0, 8);
  // recommendations lean towards channels you've watched, then popular videos
  const watchedCh = Object.keys(s.watched).map(id => VIDEO[id]?.ch).filter(Boolean);
  const r = rng('rec' + Math.floor(worldNow() / 864e5) + watchedCh.length);
  const rec = VIDEOS.filter(v => v.ch !== 'hollowfrequency' && !s.watched[v.id]).map(v => ({ v, s: Math.log10(views(v)) + (watchedCh.includes(v.ch) ? 2 : 0) + r() * 2 })).sort((a, b) => b.s - a.s).slice(0, 12).map(x => x.v);
  const trend = VIDEOS.filter(v => v.ch !== 'hollowfrequency').sort((a, b) => hot(b) - hot(a)).slice(0, 4);
  const main = h('div', null,
    h('div', { class: 'vd-banner' }, h('b', null, 'The new Vidder is here.'), ' Watch Later, smarter recommendations and a cleaner home. ', h('a', { href: '/watch?v=vDnew2013ab' }, 'Watch the video')),
    fromSubs.length ? [h('h2', { class: 'vd-h' }, 'From your subscriptions'), grid(fromSubs)] : null,
    h('h2', { class: 'vd-h' }, 'Trending', h('a', { href: '/trending', class: 'vd-more' }, 'See all')), grid(trend),
    h('h2', { class: 'vd-h' }, 'Recommended for you'), grid(rec),
    ['Music', 'Food', 'Animals'].map(cat => [h('h2', { class: 'vd-h' }, 'Popular in ' + cat, h('a', { href: '/trending?cat=' + cat, class: 'vd-more' }, 'More')), grid(VIDEOS.filter(v => CATEGORY[v.ch] === cat).sort((a, b) => views(b) - views(a)).slice(0, 4))]));
  return { title: 'Vidder', node: shell(ctx, main, { active: 'home' }) };
}

function trending(ctx, cat) {
  const list = VIDEOS.filter(v => v.ch !== 'hollowfrequency' && (!cat || CATEGORY[v.ch] === cat || (cat === 'Food' && CATEGORY[v.ch] === 'Food'))).sort((a, b) => hot(b) - hot(a));
  const cats = ['Gaming', 'Music', 'Food', 'Animals', 'Technology', 'Style', 'Reviews', 'News', 'Comedy', 'Sports'];
  const main = h('div', null, h('h1', { class: 'vd-h1' }, cat ? cat : 'Trending'),
    h('div', { class: 'vd-chips' }, h('a', { href: '/trending', class: !cat ? 'on' : '' }, 'All'), cats.map(c => h('a', { href: '/trending?cat=' + c, class: c === cat ? 'on' : '' }, c))),
    list.length ? h('div', { class: 'vd-list' }, list.map((v, i) => h('div', { class: 'vd-rank' }, h('span', { class: 'vd-num' }, i + 1), card(v, { row: true, desc: true })))) : h('p', { class: 'vd-empty' }, 'Nothing trending here right now.'));
  return { title: (cat ? cat + ' - ' : 'Trending - ') + 'Vidder', node: shell(ctx, main, { active: cat ? '' : 'trending' }) };
}

function results(query, ctx, sort) {
  const res = search(query, { site: 'vidder.tv' });
  let vids = res.filter(d => d.video).map(d => d.video);
  if (sort === 'date') vids.sort((a, b) => toMs(b.date) - toMs(a.date));
  if (sort === 'views') vids.sort((a, b) => views(b) - views(a));
  const chans = res.filter(d => d.type === 'channel').slice(0, 2);
  const pls = res.filter(d => d.url.includes('playlist')).slice(0, 2);
  const terms = tokens(query);
  const base = 'vidder.tv/results?search_query=' + q(query);
  const main = h('div', null,
    h('div', { class: 'vd-resbar' }, h('span', null, `About ${fmtNum(vids.length + chans.length)} results`), h('span', { class: 'vd-sort' }, 'Sort by: ', h('a', { href: base, class: !sort ? 'on' : '' }, 'Relevance'), h('a', { href: base + '&sort=date', class: sort === 'date' ? 'on' : '' }, 'Upload date'), h('a', { href: base + '&sort=views', class: sort === 'views' ? 'on' : '' }, 'View count'))),
    chans.map(d => h('div', { class: 'vd-chres' }, h('a', { href: '/channel/' + d.user }, avatarImg(d.user, 90, 'round')), h('div', null, h('a', { href: '/channel/' + d.user, class: 'vd-ctitle' }, chName(d.user)), h('span', { class: 'vd-cmeta' }, compact(subsOf(d.user)) + ' subscribers · ' + (videosByChannel[d.user]?.length || 0) + ' videos'), h('p', { class: 'vd-cdesc' }, USERS[d.user].bio)), subButton(d.user, ctx))),
    pls.map(d => { const pl = PLAYLIST[d.url.split('list=')[1]]; return h('div', { class: 'vd-card row' }, h('a', { href: '/playlist?list=' + pl.id, class: 'vd-thumb pl' }, h('img', { src: thumb(VIDEO[pl.videos[0]]), alt: '' }), h('span', { class: 'vd-plcount' }, pl.videos.length, h('small', null, 'VIDEOS'))), h('div', { class: 'vd-cinfo' }, h('a', { href: '/playlist?list=' + pl.id, class: 'vd-ctitle' }, pl.title), h('span', { class: 'vd-cmeta' }, 'Playlist by ' + chName(pl.ch)))); }),
    vids.length ? h('div', { class: 'vd-list' }, vids.map(v => h('div', { class: 'vd-card row' },
      h('a', { href: '/watch?v=' + v.id, class: 'vd-thumb' }, h('img', { src: thumb(v), alt: '' }), h('span', { class: 'vd-dur' }, v.dur)),
      h('div', { class: 'vd-cinfo' }, h('a', { href: '/watch?v=' + v.id, class: 'vd-ctitle' }, v.title), h('span', { class: 'vd-cmeta' }, 'by ', h('a', { href: '/channel/' + v.ch }, chName(v.ch)), ' · ' + when(v.date) + ' · ' + compact(views(v)) + ' views'), h('p', { class: 'vd-cdesc' }, highlight(v.desc || v.caps.map(c => c[1]).join(' '), terms, 160)))))) : h('div', { class: 'vd-empty' }, h('p', null, `No videos found for "${query}".`), h('p', null, 'Try different keywords, or ', h('a', { href: 'findr.net/search?q=' + q(query) }, 'search the whole web with Findr'), '.')));
  return { title: query + ' - Vidder', node: shell(ctx, main, { query }) };
}

function subButton(id, ctx, onChange) {
  const btn = h('button', { type: 'button', class: 'vd-sub' });
  const paint = () => { const on = isSub(id); btn.className = 'vd-sub' + (on ? ' on' : ''); btn.innerHTML = ''; btn.append(on ? 'Subscribed' : 'Subscribe', h('span', { class: 'vd-subn' }, compact(subsOf(id)))); };
  btn.addEventListener('click', () => { patch('vidder', s => { const subs = { ...s.subs }; if (subs[id]) delete subs[id]; else subs[id] = worldNow(); return { subs }; }); paint(); onChange?.(); });
  paint();
  return btn;
}

function watch(id, listId, ctx, startAt) {
  const v = VIDEO[id];
  if (!v) return { title: 'Vidder', node: shell(ctx, h('div', { class: 'vd-gone' }, h('div', { class: 'vd-gone-box' }, h('b', null, 'This video is unavailable.'), h('p', null, id ? 'This video has been removed by the user.' : 'Sorry about that.')), h('a', { href: '/' }, 'Go to the Vidder home page'))) };
  const pl = listId === 'WL' || listId === 'FAV' ? { id: listId, title: listId === 'WL' ? 'Watch Later' : 'Favourites', videos: save.get().vidder.playlists[listId === 'WL' ? 'later' : 'favs'], ch: null } : PLAYLIST[listId];
  const idx = pl ? pl.videos.indexOf(v.id) : -1;
  const nextId = pl && idx >= 0 ? pl.videos[idx + 1] : null;
  const player = createPlayer(v, {
    isVisible: ctx.isVisible,
    onPlay: () => patch('vidder', s => { const prev = s.watched[v.id]; if (prev && worldNow() - prev.t < 60000) return {}; return { watched: { ...s.watched, [v.id]: { t: worldNow(), n: (prev?.n || 0) + 1 } } }; }),
    onEnded: endEl => {
      clear(endEl);
      if (nextId) {
        let n = 5; const nv = VIDEO[nextId];
        const label = h('b', null, `Up next in ${n}`);
        const tmr = setInterval(() => { n--; label.textContent = `Up next in ${n}`; if (n <= 0) { clearInterval(tmr); ctx.go('vidder.tv/watch?v=' + nextId + '&list=' + pl.id); } }, 1000);
        ctx.onLeave(() => clearInterval(tmr));
        endEl.append(h('div', { class: 'vp-next' }, label, h('img', { src: thumb(nv), alt: '' }), h('span', null, nv.title), h('button', { type: 'button', class: 'vd-btn', onclick: () => { clearInterval(tmr); label.textContent = 'Autoplay cancelled'; } }, 'Cancel')));
      } else {
        endEl.append(h('div', { class: 'vp-endgrid' }, related(v).slice(0, 6).map(r => h('a', { href: '/watch?v=' + r.id }, h('img', { src: thumb(r), alt: '' }), h('span', null, r.title)))), h('button', { type: 'button', class: 'vp-replay', onclick: () => player.play() }, '↻ Replay'));
      }
    },
  });
  if (startAt) player.seek(startAt);
  ctx.onLeave(() => player.destroy());

  const votes = h('div', { class: 'vd-votes' });
  const paintVotes = () => {
    clear(votes);
    const my = save.get().vidder.votes[v.id] || 0;
    const L = v.likes + (my === 1 ? 1 : 0), D = v.dislikes + (my === -1 ? 1 : 0);
    const vote = n => patch('vidder', s => ({ votes: { ...s.votes, [v.id]: (s.votes[v.id] === n ? 0 : n) } }));
    votes.append(
      h('button', { type: 'button', class: 'vd-like' + (my === 1 ? ' on' : ''), title: 'I like this', onclick: () => { vote(1); paintVotes(); } }, '👍 ', fmtNum(L)),
      h('button', { type: 'button', class: 'vd-dislike' + (my === -1 ? ' on' : ''), title: 'I dislike this', onclick: () => { vote(-1); paintVotes(); } }, '👎 ', fmtNum(D)),
      h('div', { class: 'vd-ratio' }, h('span', { style: { width: (L / Math.max(1, L + D) * 100).toFixed(1) + '%' } })));
  };
  paintVotes();
  const listBtn = (key, label) => {
    const b = h('button', { type: 'button', class: 'vd-btn' });
    const paint = () => { const on = save.get().vidder.playlists[key].includes(v.id); b.textContent = (on ? '✓ ' : '+ ') + label; b.classList.toggle('on', on); };
    b.addEventListener('click', () => { patch('vidder', s => { const l = s.playlists[key]; return { playlists: { ...s.playlists, [key]: l.includes(v.id) ? l.filter(x => x !== v.id) : [...l, v.id] } }; }); paint(); });
    paint(); return b;
  };
  const shareBox = h('div', { class: 'vd-share', hidden: true }, h('input', { class: 'vd-shareurl', readonly: true, value: 'http://vidder.tv/watch?v=' + v.id, onclick: e => e.target.select() }), h('label', null, h('input', { type: 'checkbox', onchange: e => { e.target.closest('.vd-share').querySelector('input').value = 'http://vidder.tv/watch?v=' + v.id + (e.target.checked ? '&t=' + Math.floor(player.time) : ''); } }), ' Start at current time'));
  const desc = h('div', { class: 'vd-desc collapsed' }, h('p', { class: 'vd-pub' }, 'Published on ' + longDate(v.date)), paragraphs(v.desc || ''), v.tags?.length ? h('p', { class: 'vd-tags' }, 'Tags: ', v.tags.map(t => h('a', { href: '/results?search_query=' + q(t) }, t))) : null, h('p', { class: 'vd-tags' }, 'Category: ', h('a', { href: '/trending?cat=' + q(CATEGORY[v.ch] || '') }, CATEGORY[v.ch] || 'People & Blogs')));
  const more = h('button', { type: 'button', class: 'vd-more-btn', onclick: () => { desc.classList.toggle('collapsed'); more.textContent = desc.classList.contains('collapsed') ? 'Show more' : 'Show less'; } }, 'Show more');

  const plBox = pl ? h('div', { class: 'vd-plbox' }, h('div', { class: 'vd-plhead' }, h('a', { href: '/playlist?list=' + pl.id }, h('b', null, pl.title)), h('span', null, `${pl.ch ? chName(pl.ch) + ' · ' : ''}${idx + 1} / ${pl.videos.length}`)),
    h('div', { class: 'vd-pllist' }, pl.videos.map((pid, i) => { const pv = VIDEO[pid]; return pv ? h('a', { href: '/watch?v=' + pid + '&list=' + pl.id, class: 'vd-plitem' + (pid === v.id ? ' cur' : '') }, h('span', { class: 'vd-pli' }, pid === v.id ? '▶' : i + 1), h('img', { src: thumb(pv), alt: '' }), h('span', null, pv.title)) : null; }))) : null;

  const main = h('div', { class: 'vd-watch' },
    h('div', { class: 'vd-wl' },
      h('div', { class: 'vd-playerwrap' }, player.el),
      h('h1', { class: 'vd-wtitle' }, v.title),
      h('div', { class: 'vd-wbar' },
        h('div', { class: 'vd-owner' }, h('a', { href: '/channel/' + v.ch }, avatarImg(v.ch, 48, 'round')), h('div', null, h('a', { href: '/channel/' + v.ch, class: 'vd-oname' }, chName(v.ch)), h('a', { href: '/channel/' + v.ch + '/videos', class: 'vd-ocount' }, (videosByChannel[v.ch]?.length || 0) + ' videos')), subButton(v.ch, ctx)),
        h('div', { class: 'vd-viewcount' }, h('b', null, fmtNum(views(v))), ' views', votes)),
      h('div', { class: 'vd-actions' }, listBtn('later', 'Watch Later'), listBtn('favs', 'Favourite'), h('button', { type: 'button', class: 'vd-btn', onclick: () => { shareBox.hidden = !shareBox.hidden; } }, 'Share'), h('a', { class: 'vd-btn', href: 'findr.net/search?q=' + q(v.title) }, 'Search Findr')),
      shareBox,
      h('div', { class: 'vd-descbox' }, desc, (v.desc || '').length > 160 || v.tags?.length ? more : null),
      comments(v, ctx)),
    h('aside', { class: 'vd-wr' }, plBox, h('h3', { class: 'vd-uphead' }, 'Up next'), related(v).map(r => card(r, { row: true }))));
  const node = shell(ctx, main, { wide: true });
  node.addEventListener('theatre', () => node.classList.toggle('theatre'));
  return { title: v.title + ' - Vidder', node, after: () => player.el.focus({ preventScroll: true }) };
}

function related(v) {
  const tags = new Set(v.tags);
  return VIDEOS.filter(x => x.id !== v.id && (x.ch !== 'hollowfrequency' || v.ch === 'hollowfrequency'))
    .map(x => ({ x, s: (x.ch === v.ch ? 3 : 0) + x.tags.filter(t => tags.has(t)).length * 2 + (CATEGORY[x.ch] === CATEGORY[v.ch] ? 1 : 0) + Math.log10(x.views) / 4 }))
    .sort((a, b) => b.s - a.s).slice(0, 12).map(o => o.x);
}

function comments(v, ctx) {
  const box = h('div', { class: 'vd-comments' });
  if (!v.comments.length) { box.append(h('h3', null, 'Comments'), h('p', { class: 'vd-off' }, 'Comments are disabled for this video.')); return box; }
  const r = rng(v.id + 'c');
  const span = worldNow() - toMs(v.date);
  const withDates = v.comments.map((c, i) => ({ c, d: toMs(v.date) + span * Math.pow(r(), 2.2) + i }));
  let sort = 'top';
  const list = h('div');
  const total = v.comments.reduce((n, c) => n + 1 + (c[3]?.length || 0), 0);
  const draw = () => {
    clear(list);
    const ordered = withDates.slice().sort((a, b) => sort === 'top' ? b.c[2] - a.c[2] : b.d - a.d);
    for (const { c, d } of ordered) list.append(comment(c, d, v));
  };
  const sel = h('select', { class: 'vd-csort', onchange: e => { sort = e.target.value; draw(); } }, h('option', { value: 'top' }, 'Top comments'), h('option', { value: 'new' }, 'Newest first'));
  box.append(h('div', { class: 'vd-chead' }, h('h3', null, `All Comments (${fmtNum(total)})`), sel), list);
  draw();
  return box;
}
function comment([u, text, likes, replies], date, v, isReply) {
  const isOwner = u === v.ch;
  const repBox = h('div', { class: 'vd-replies', hidden: true });
  const el = h('div', { class: 'vd-cmt' + (isReply ? ' reply' : '') },
    h('a', { href: '/channel/' + u }, avatarImg(u, isReply ? 28 : 40)),
    h('div', { class: 'vd-cbody' },
      h('div', { class: 'vd-cby' }, h('a', { href: '/channel/' + u, class: isOwner ? 'owner' : '' }, USERS[u]?.vidder?.channel || u), h('span', null, when(date))),
      h('p', null, inline(text)),
      h('div', { class: 'vd-cact' }, h('span', null, '👍 ' + fmtNum(likes))),
      replies?.length ? h('button', { type: 'button', class: 'vd-showrep', onclick: e => { repBox.hidden = !repBox.hidden; e.target.textContent = repBox.hidden ? `View all ${replies.length} replies ▾` : 'Hide replies ▴'; } }, `View all ${replies.length} replies ▾`) : null,
      repBox));
  replies?.forEach((rp, i) => repBox.append(comment(rp, date + (i + 1) * 3600e3 * 5, v, true)));
  return el;
}

function channel(id, tab, ctx, sort) {
  const u = USERS[id];
  if (!u || !u.on.includes('vidder')) {
    const p = personRecord(id);
    if (id && /^[a-z0-9_.]+$/i.test(id)) return { title: id + ' - Vidder', node: shell(ctx, h('div', { class: 'vd-chan' }, h('div', { class: 'vd-chhead plain' }, avatarImg(id, 80, 'round'), h('div', null, h('h1', null, p.name), h('p', null, 'This channel doesn\'t have any content.'))))) };
    return notFound(ctx);
  }
  let vids = (videosByChannel[id] || []).slice();
  if (sort === 'popular') vids.sort((a, b) => views(b) - views(a));
  const total = vids.reduce((n, v) => n + views(v), 0);
  const tabs = ['videos', 'playlists', 'about'];
  let body;
  if (tab === 'playlists') { const pls = playlistsByChannel[id] || []; body = pls.length ? h('div', { class: 'vd-grid' }, pls.map(pl => h('div', { class: 'vd-card' }, h('a', { href: '/playlist?list=' + pl.id, class: 'vd-thumb pl' }, h('img', { src: thumb(VIDEO[pl.videos[0]]), alt: '' }), h('span', { class: 'vd-plcount' }, pl.videos.length, h('small', null, 'VIDEOS'))), h('div', { class: 'vd-cinfo' }, h('a', { href: '/playlist?list=' + pl.id, class: 'vd-ctitle' }, pl.title))))) : h('p', { class: 'vd-empty' }, 'This channel has no playlists.'); }
  else if (tab === 'about') {
    body = h('div', { class: 'vd-about' }, h('div', null, h('h3', null, 'Description'), paragraphs(u.bio || 'No description.'), u.location ? h('p', null, h('b', null, 'Location: '), u.location) : null,
      presence(id).filter(p => p.site !== 'Vidder').length ? [h('h3', null, 'Links'), presence(id).filter(p => p.site !== 'Vidder').map(p => h('p', null, h('a', { href: p.url }, p.site + ': ' + p.label)))] : null),
      h('div', { class: 'vd-stats' }, h('h3', null, 'Stats'), h('p', null, 'Joined ' + longDate(u.joined)), h('p', null, fmtNum(total) + ' views'), h('p', null, fmtNum(subsOf(id)) + ' subscribers')));
  } else body = vids.length ? [h('div', { class: 'vd-chips' }, h('a', { href: '/channel/' + id + '/videos', class: sort !== 'popular' ? 'on' : '' }, 'Newest'), h('a', { href: '/channel/' + id + '/videos?sort=popular', class: sort === 'popular' ? 'on' : '' }, 'Most popular')), grid(vids, { noCh: true })] : h('p', { class: 'vd-empty' }, 'This channel has no videos.');
  const featured = vids[0] && tab === 'videos' && sort !== 'popular' && id !== 'hollowfrequency' ? h('div', { class: 'vd-feat' }, card(vids.slice().sort((a, b) => views(b) - views(a))[0], { row: true, desc: true, noCh: true })) : null;
  const main = h('div', { class: 'vd-chan' },
    h('div', { class: 'vd-chbanner', style: { background: `linear-gradient(120deg, ${u.vidder.banner}, #111)` } }, h('span', null, u.vidder.channel)),
    h('div', { class: 'vd-chhead' }, avatarImg(id, 80, 'round'), h('div', null, h('h1', null, u.vidder.channel), h('span', { class: 'vd-cmeta' }, fmtNum(subsOf(id)) + ' subscribers · ' + vids.length + ' videos')), subButton(id, ctx)),
    h('div', { class: 'vd-tabs' }, tabs.map(t => h('a', { href: '/channel/' + id + '/' + t, class: t === tab ? 'on' : '' }, t[0].toUpperCase() + t.slice(1)))),
    featured, body);
  return { title: u.vidder.channel + ' - Vidder', node: shell(ctx, main) };
}

function playlist(id, ctx) {
  const own = id === 'WL' || id === 'FAV';
  const pl = own ? { id, title: id === 'WL' ? 'Watch Later' : 'Favourites', videos: save.get().vidder.playlists[id === 'WL' ? 'later' : 'favs'] } : PLAYLIST[id];
  if (!pl) return notFound(ctx);
  const vids = pl.videos.map(x => VIDEO[x]).filter(Boolean);
  const main = h('div', { class: 'vd-pl' },
    h('div', { class: 'vd-plinfo' }, vids[0] ? h('img', { src: thumb(vids[0]), alt: '' }) : h('div', { class: 'vd-plblank' }), h('div', null, h('h1', null, pl.title), h('p', { class: 'vd-cmeta' }, (pl.ch ? 'by ' + chName(pl.ch) + ' · ' : 'Private · ') + vids.length + ' videos'), vids[0] ? h('a', { href: '/watch?v=' + vids[0].id + '&list=' + pl.id, class: 'vd-sub' }, '▶ Play all') : null)),
    vids.length ? h('div', { class: 'vd-list' }, vids.map((v, i) => h('div', { class: 'vd-rank' }, h('span', { class: 'vd-num' }, i + 1), card(v, { row: true, list: pl.id }),
      own ? h('button', { type: 'button', class: 'vd-x', title: 'Remove', onclick: () => { patch('vidder', s => ({ playlists: { ...s.playlists, [id === 'WL' ? 'later' : 'favs']: s.playlists[id === 'WL' ? 'later' : 'favs'].filter(x => x !== v.id) } })); ctx.reload(); } }, '×') : null))) : h('p', { class: 'vd-empty' }, own ? `Videos you add to ${pl.title} will show up here. Look for the "+ ${id === 'WL' ? 'Watch Later' : 'Favourite'}" button under any video.` : 'This playlist is empty.'));
  return { title: pl.title + ' - Vidder', node: shell(ctx, main, { active: own ? id : '' }) };
}

function subscriptions(ctx) {
  const subbed = Object.keys(save.get().vidder.subs).filter(id => USERS[id]);
  const vids = VIDEOS.filter(v => subbed.includes(v.ch)).sort((a, b) => toMs(b.date) - toMs(a.date));
  const main = h('div', null, h('h1', { class: 'vd-h1' }, 'Subscriptions'),
    subbed.length ? [h('div', { class: 'vd-subchans' }, subbed.map(id => h('a', { href: '/channel/' + id }, avatarImg(id, 56, 'round'), h('span', null, chName(id))))), grid(vids)]
      : [h('p', { class: 'vd-empty' }, 'You haven\'t subscribed to any channels yet. Here are some popular ones:'), h('div', { class: 'vd-subchans' }, ['dougtheunbothered', 'pruittreviews', 'dannycookspoorly', 'beatsbynobody', 'rigdoctor', 'maxplaysstuff'].map(id => h('div', { class: 'vd-subsug' }, h('a', { href: '/channel/' + id }, avatarImg(id, 56, 'round'), h('span', null, chName(id))), subButton(id, ctx, () => ctx.reload()))))]);
  return { title: 'Subscriptions - Vidder', node: shell(ctx, main, { active: 'subs' }) };
}

function watchHistory(ctx) {
  const w = save.get().vidder.watched;
  const vids = Object.entries(w).sort((a, b) => b[1].t - a[1].t).map(([id]) => VIDEO[id]).filter(Boolean);
  const main = h('div', null, h('div', { class: 'vd-h1row' }, h('h1', { class: 'vd-h1' }, 'Watch History'), vids.length ? h('button', { type: 'button', class: 'vd-btn', onclick: () => { patch('vidder', () => ({ watched: {} })); ctx.reload(); } }, 'Clear all watch history') : null),
    vids.length ? h('div', { class: 'vd-list' }, vids.map(v => card(v, { row: true }))) : h('p', { class: 'vd-empty' }, 'Videos you watch will show up here.'));
  return { title: 'History - Vidder', node: shell(ctx, main, { active: 'history' }) };
}

function notFound(ctx) {
  return { title: '404 Not Found - Vidder', node: shell(ctx, h('div', { class: 'vd-gone' }, h('div', { class: 'vd-404' }, '404'), h('p', null, 'We\'re sorry, the page you requested could not be found.'), h('p', null, 'It may have been moved, or the link you followed may be broken.'), h('a', { href: '/' }, 'Go to the Vidder home page'))) };
}
