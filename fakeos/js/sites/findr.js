// Findr (findr.net): the search engine. Home page, autocomplete, results with categories, time and
// site filters, pagination, related searches, "did you mean", trends, search history and about.
import { h, clear } from '../lib/dom.js';
import { patch, save, worldNow } from '../os/state.js';
import { search, didYouMean, tokens, allDocs } from '../net/search.js';
import { thumb } from '../lib/art.js';
import { avatarImg, pager, highlight, q } from './common.js';
import { shortDate, longDate, clock, toMs, compact, fmtNum } from '../lib/time.js';
import { rng } from '../lib/rng.js';
import { USERS } from '../content/index.js';
import { FINDR_TRENDS, FINDR_SUGGEST, FINDR_CATEGORIES, FINDR_RELATED } from '../content/findr-data.js';

const FAV = '<svg viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="4.3" fill="#fff" stroke="#e8502e" stroke-width="2"/><path d="M10 10l4 4" stroke="#e8502e" stroke-width="2.6" stroke-linecap="round"/></svg>';
const PER = 10;
const TYPES = [['all', 'Everything'], ['video', 'Videos'], ['forum', 'Forums'], ['people', 'People'], ['social', 'Social']];
const TIMES = [['any', 'Any time'], ['week', 'Past week'], ['month', 'Past month'], ['year', 'Past year'], ['older', 'Older than a year']];

export const findr = { id: 'findr', host: 'findr.net', name: 'Findr', favicon: FAV, server: 'FWS/2.4', render };

function logo(small) { return h('a', { href: '/', class: 'fd-logo' + (small ? ' small' : ''), 'aria-label': 'Findr home' }, h('span', { class: 'l1' }, 'f'), h('span', { class: 'l2' }, 'i'), h('span', { class: 'l3' }, 'n'), h('span', { class: 'l4' }, 'd'), h('span', { class: 'l5' }, 'r')); }

function render(route, ctx) {
  const p = route.segs[0] || '';
  if (!p) return home(ctx);
  if (p === 'search') return results(route, ctx);
  if (p === 'history') return historyPage(ctx);
  if (p === 'trends') return trends(ctx);
  if (p === 'about') return about();
  if (p === 'privacy') return privacy();
  return { title: '404 Not Found', node: h('div', { class: 'fd' }, header(ctx, ''), h('div', { class: 'fd-404' }, logo(true), h('h1', null, '404. That page isn\'t here.'), h('p', null, 'The page ', h('code', null, route.path), ' was not found on this server.'), h('a', { href: '/' }, 'Go to Findr'))) };
}

// Trending searches change day to day (seeded by the in-world date).
export function trendingToday(n = 10) {
  const day = Math.floor(worldNow() / 86400000);
  const r = rng('trend' + day);
  return FINDR_TRENDS.map(t => ({ ...t, heat: t.base * (0.6 + r() * 0.8) })).sort((a, b) => b.heat - a.heat).slice(0, n);
}

function searchBox(ctx, value = '', big) {
  const input = h('input', { class: 'fd-input', value, autocomplete: 'off', spellcheck: false, 'aria-label': 'Search' });
  const sug = h('div', { class: 'fd-sug' });
  let items = [], sel = -1;
  const go = text => { text = text.trim(); if (text) ctx.go('findr.net/search?q=' + q(text)); };
  const fill = () => {
    const v = input.value.trim().toLowerCase(); clear(sug); items = []; sel = -1;
    if (!v) { sug.classList.remove('on'); return; }
    const hist = save.get().findr.history.map(x => x.q).filter((x, i, a) => a.indexOf(x) === i && x.toLowerCase().startsWith(v));
    const pool = [...hist.map(x => ({ t: x, mine: true })), ...FINDR_SUGGEST.filter(s => s.startsWith(v)).map(t => ({ t })), ...FINDR_SUGGEST.filter(s => !s.startsWith(v) && s.includes(' ' + v)).map(t => ({ t }))];
    const seen = new Set();
    for (const it of pool) { if (seen.has(it.t.toLowerCase()) || items.length >= 8) continue; seen.add(it.t.toLowerCase()); items.push(it); }
    items.forEach((it, i) => sug.append(h('div', { class: 'fd-sg' + (it.mine ? ' mine' : ''), onpointerdown: e => { e.preventDefault(); go(it.t); } }, h('b', null, it.t.slice(0, v.length)), it.t.slice(v.length), it.mine ? h('small', null, 'searched before') : null)));
    sug.classList.toggle('on', items.length > 0);
  };
  input.addEventListener('input', fill);
  input.addEventListener('blur', () => setTimeout(() => sug.classList.remove('on'), 100));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; [...sug.children].forEach((c, i) => c.classList.toggle('sel', i === sel)); input.value = items[sel].t; }
    else if (e.key === 'Enter') { e.preventDefault(); go(input.value); }
    else if (e.key === 'Escape') sug.classList.remove('on');
  });
  const wrap = h('div', { class: 'fd-box' + (big ? ' big' : '') }, input, h('button', { class: 'fd-go', type: 'button', 'aria-label': 'Search', onclick: () => go(input.value), html: FAV }), sug);
  wrap.input = input;
  return wrap;
}

function header(ctx, value) {
  return h('div', { class: 'fd-head' }, logo(true), searchBox(ctx, value), h('div', { class: 'fd-headlinks' }, h('a', { href: '/history' }, 'Search history'), h('a', { href: '/trends' }, 'Trends')));
}
function footer() {
  return h('div', { class: 'fd-foot' }, h('a', { href: '/about' }, 'About Findr'), h('a', { href: '/trends' }, 'Findr Trends'), h('a', { href: '/history' }, 'Search history'), h('a', { href: '/privacy' }, 'Privacy'), h('span', null, '© 2013 Findr Inc.'));
}

function home(ctx) {
  const box = searchBox(ctx, '', true);
  const lucky = () => {
    const v = box.input.value.trim();
    if (!v) { const t = trendingToday(10); const r = t[Math.floor(Math.random() * t.length)]; return ctx.go('findr.net/search?q=' + q(r.q)); }
    const res = search(v); if (res[0]) ctx.go(res[0].url); else ctx.go('findr.net/search?q=' + q(v));
  };
  const d = new Date(worldNow());
  const scribble = d.getUTCMonth() === 9 ? 'Findr turns 14 this month. Thanks for searching with us.' : d.getUTCMonth() === 11 ? 'Happy holidays from everyone at Findr.' : 'Search the web, videos, forums and people.';
  const node = h('div', { class: 'fd fd-home' },
    h('div', { class: 'fd-toplinks' }, h('a', { href: '/trends' }, 'Trends'), h('a', { href: '/history' }, 'History'), h('a', { href: '/about' }, 'About')),
    h('div', { class: 'fd-center' },
      logo(), h('p', { class: 'fd-scribble' }, scribble), box,
      h('div', { class: 'fd-btns' }, h('button', { type: 'button', class: 'fd-btn', onclick: () => box.input.value.trim() && ctx.go('findr.net/search?q=' + q(box.input.value.trim())) }, 'Findr Search'), h('button', { type: 'button', class: 'fd-btn', onclick: lucky }, 'Lucky Dip')),
      h('div', { class: 'fd-cats' }, h('span', null, 'Browse: '), FINDR_CATEGORIES.map(c => h('a', { href: 'findr.net/search?q=' + q(c.q) + (c.type ? '&type=' + c.type : '') }, c.label))),
      h('div', { class: 'fd-trending' }, h('h3', null, 'Trending searches'), h('ol', null, trendingToday(8).map((t, i) => h('li', null, h('a', { href: 'findr.net/search?q=' + q(t.q) }, t.q), h('span', { class: 'fd-heat' }, compact(Math.round(t.heat)) + ' searches')))))),
    footer());
  return { title: 'Findr', node, after: () => setTimeout(() => box.input.focus(), 30) };
}

function results(route, ctx) {
  const query = (route.query.get('q') || '').trim();
  const type = route.query.get('type') || 'all';
  const time = route.query.get('time') || 'any';
  const site = route.query.get('site') || '';
  const page = Math.max(1, parseInt(route.query.get('p') || '1', 10) || 1);
  if (!query) return home(ctx);
  // remember the search (first page only, so paging doesn't flood history)
  if (page === 1) patch('findr', f => ({ history: [{ q: query, t: worldNow() }, ...f.history].slice(0, 300) }));
  const now = worldNow(), Y = 365 * 864e5;
  const range = { week: { after: now - 7 * 864e5 }, month: { after: now - 31 * 864e5 }, year: { after: now - Y }, older: { before: now - Y } }[time] || {};
  const all = search(query, { type, site, ...range });
  const counts = Object.fromEntries(TYPES.map(([k]) => [k, k === 'all' ? search(query, { site, ...range }).length : search(query, { type: k, site, ...range }).length]));
  const shown = all.slice((page - 1) * PER, page * PER);
  const terms = tokens(query);
  const mk = over => { const p = { q: query, type, time, site, p: 1, ...over }; return 'findr.net/search?' + Object.entries(p).filter(([k, v]) => v && !(k === 'type' && v === 'all') && !(k === 'time' && v === 'any') && !(k === 'p' && v === 1)).map(([k, v]) => k + '=' + q(v)).join('&'); };
  // offer a correction when some word isn't recognised and the corrected search finds more
  const fix = didYouMean(query);
  const dym = fix && search(fix, { type, site, ...range }).length > all.length ? fix : null;
  const sitesFound = [...new Set(search(query, { type, ...range }).map(d => d.site))];
  const list = h('div', { class: 'fd-results' });
  if (dym) list.append(h('p', { class: 'fd-dym' }, 'Did you mean: ', h('a', { href: mk({ q: dym }) }, h('b', null, h('i', null, dym))), '?'));
  if (!all.length) list.append(h('div', { class: 'fd-none' }, h('p', null, 'Your search - ', h('b', null, query), ' - did not match any documents.'), h('p', null, 'Suggestions:'), h('ul', null, h('li', null, 'Make sure all words are spelled correctly.'), h('li', null, 'Try different keywords.'), h('li', null, 'Try more general keywords.'), time !== 'any' || type !== 'all' || site ? h('li', null, h('a', { href: mk({ type: 'all', time: 'any', site: '' }) }, 'Search everything instead')) : null)));
  for (const d of shown) list.append(resultCard(d, terms));
  const related = relatedSearches(query, all);
  const node = h('div', { class: 'fd fd-res' }, header(ctx, query),
    h('div', { class: 'fd-tabs' }, TYPES.map(([k, label]) => h('a', { href: mk({ type: k }), class: k === type ? 'on' : '' }, label, counts[k] ? h('small', null, ' ' + counts[k]) : null))),
    h('div', { class: 'fd-body' },
      h('div', { class: 'fd-filters' },
        h('h4', null, 'Time'), TIMES.map(([k, label]) => h('a', { href: mk({ time: k }), class: k === time ? 'on' : '' }, label)),
        h('h4', null, 'Site'), h('a', { href: mk({ site: '' }), class: !site ? 'on' : '' }, 'All sites'), sitesFound.concat(site && !sitesFound.includes(site) ? [site] : []).map(s => h('a', { href: mk({ site: s }), class: s === site ? 'on' : '' }, s))),
      h('div', { class: 'fd-main' },
        h('p', { class: 'fd-stats' }, all.length ? `Results ${(page - 1) * PER + 1}–${Math.min(page * PER, all.length)} of about ${fmtNum(all.length)} for ` : 'No results for ', h('b', null, query), all.length ? ` (0.${String(13 + (query.length * 7) % 60).padStart(2, '0')} seconds)` : ''),
        list,
        related.length ? h('div', { class: 'fd-related' }, h('h4', null, 'Searches related to ', h('b', null, query)), h('div', { class: 'fd-relgrid' }, related.map(r => h('a', { href: mk({ q: r, type: 'all', time: 'any', site: '' }) }, r)))) : null,
        pager(all.length, page, PER, n => mk({ p: n }), 'fd-pager'))),
    footer());
  return { title: query + ' - Findr Search', node };
}

function resultCard(d, terms) {
  const url = 'http://' + d.url;
  const meta = [];
  if (d.date) meta.push(shortDate(d.date));
  if (d.video) meta.push(`${d.video.dur} · ${compact(d.video.views)} views · Uploaded by ${USERS[d.video.ch]?.vidder?.channel}`);
  if (d.thread) meta.push(`${d.thread.replies?.length || 0}+ replies · ${d.thread.score} points`);
  const side = d.video ? h('a', { href: d.url, class: 'fd-thumb' }, h('img', { src: thumb(d.video), alt: '' }), h('span', null, d.video.dur)) : d.user ? h('a', { href: d.url, class: 'fd-avatar' }, avatarImg(d.user, 56)) : null;
  return h('div', { class: 'fd-r' + (side ? ' with-side' : '') }, side,
    h('div', null,
      h('a', { href: d.url, class: 'fd-r-title' }, d.title),
      h('div', { class: 'fd-r-url' }, url.length > 70 ? url.slice(0, 70) + '…' : url),
      meta.length ? h('div', { class: 'fd-r-meta' }, meta.join(' — ')) : null,
      h('div', { class: 'fd-r-snip' }, highlight(d.snippet, terms))));
}

function relatedSearches(query, res) {
  const ql = query.toLowerCase();
  const out = new Set();
  for (const [k, list] of Object.entries(FINDR_RELATED)) if (ql.includes(k)) list.forEach(x => out.add(x));
  for (const d of res.slice(0, 6)) for (const t of d.tags || []) if (!ql.includes(t)) out.add(t);
  for (const t of FINDR_SUGGEST) if (out.size < 8 && t.includes(tokens(query)[0] || '~') && t !== ql) out.add(t);
  out.delete(ql);
  return [...out].slice(0, 8);
}

function historyPage(ctx) {
  const node = h('div', { class: 'fd fd-res' });
  const draw = () => {
    clear(node);
    const hist = save.get().findr.history;
    node.append(header(ctx, ''), h('div', { class: 'fd-page' }, h('h1', null, 'Search history'),
      h('p', { class: 'fd-note' }, 'Searches you make on Findr from this computer.'),
      hist.length ? h('button', { class: 'fd-btn', type: 'button', onclick: () => { patch('findr', () => ({ history: [] })); draw(); } }, 'Clear all search history') : h('p', { class: 'fd-note' }, 'You haven\'t searched for anything yet.'),
      h('table', { class: 'fd-hist' }, hist.slice(0, 200).map((x, i) => h('tr', null, h('td', null, longDate(x.t)), h('td', null, clock(x.t, save.get().settings.clock24)), h('td', null, h('a', { href: 'findr.net/search?q=' + q(x.q) }, x.q)), h('td', null, h('button', { type: 'button', class: 'fd-x', title: 'Remove', onclick: () => { patch('findr', f => ({ history: f.history.filter((_, j) => j !== i) })); draw(); } }, '×')))))), footer());
  };
  draw();
  return { title: 'Search history - Findr', node };
}

function trends(ctx) {
  const t = trendingToday(FINDR_TRENDS.length);
  const byCat = {};
  for (const x of t) (byCat[x.cat] ||= []).push(x);
  const max = t[0]?.heat || 1;
  const node = h('div', { class: 'fd fd-res' }, header(ctx, ''), h('div', { class: 'fd-page' },
    h('h1', null, 'Findr Trends'), h('p', { class: 'fd-note' }, 'What people are searching for today, ' + longDate(worldNow()) + '.'),
    h('div', { class: 'fd-trendgrid' }, Object.entries(byCat).map(([cat, list]) => h('div', { class: 'fd-trendbox' }, h('h3', null, cat), list.map(x => h('div', { class: 'fd-trow' }, h('a', { href: 'findr.net/search?q=' + q(x.q) }, x.q), h('span', { class: 'fd-bar' }, h('span', { style: { width: Math.round(x.heat / max * 100) + '%' } })))))))), footer());
  return { title: 'Findr Trends', node };
}

function about() {
  const node = h('div', { class: 'fd fd-res' }, h('div', { class: 'fd-head' }, logo(true)), h('div', { class: 'fd-page fd-about' },
    h('h1', null, 'About Findr'),
    h('p', null, 'Findr started in 1999 in a rented office above a bicycle shop in Palo Verde, California, where Maren Okafor and Del Hutchins wanted to know why search engines of the time ranked pages by how many times they repeated a word. Their answer, a ranking system they called TrailRank, looked at how pages pointed to each other instead.'),
    h('h2', null, 'Milestones'),
    h('ul', null,
      h('li', null, h('b', null, '1999'), ' — Findr launches with 4 million pages indexed. The homepage has one box and one button.'),
      h('li', null, h('b', null, '2002'), ' — The "Lucky Dip" button is added. Del insists it is a joke. It is used 2 million times a day.'),
      h('li', null, h('b', null, '2004'), ' — Findr Mail launches with what was then an absurd 1 GB of storage.'),
      h('li', null, h('b', null, '2008'), ' — Findr acquires ', h('a', { href: 'vidder.tv' }, 'Vidder'), ', the video site started in 2006 by Teo Halvorsen and two university friends.'),
      h('li', null, h('b', null, '2011'), ' — Findr indexes its 50 billionth page. Our attempt at a social network, Findr Circles, closes after eleven months. We still think it was a good idea.'),
      h('li', null, h('b', null, '2013'), ' — Instant results, smarter suggestions, and 14 years of helping you find things.')),
    h('h2', null, 'Our mission'),
    h('p', null, 'To find everything that has ever been put on the internet, and to make sure it can be found again.'),
    h('p', { class: 'fd-note' }, 'Findr Inc. · 1 Lattice Way, Palo Verde, CA')), footer());
  return { title: 'About Findr', node };
}
function privacy() {
  const node = h('div', { class: 'fd fd-res' }, h('div', { class: 'fd-head' }, logo(true)), h('div', { class: 'fd-page fd-about' },
    h('h1', null, 'Privacy at Findr'),
    h('p', null, 'Findr keeps a history of your searches on your computer so suggestions can include things you\'ve looked for before. You can see and delete it on the ', h('a', { href: '/history' }, 'search history'), ' page at any time.'),
    h('p', null, 'We use anonymous, aggregated search counts to produce ', h('a', { href: '/trends' }, 'Findr Trends'), '. We do not sell your searches. We never have.'),
    h('p', { class: 'fd-note' }, 'Last updated March 2012.')), footer());
  return { title: 'Privacy - Findr', node };
}
