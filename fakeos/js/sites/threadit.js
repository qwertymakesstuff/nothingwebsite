// Threadit (threadit.com): front page, community directory, communities with rules and moderators,
// threads with nested collapsible replies, voting, joining, user profiles, search and the archive.
import { h, clear } from '../lib/dom.js';
import { save, patch, worldNow } from '../os/state.js';
import { THREADS, THREAD, COMMUNITIES, USERS, threadsByCommunity, threadsByUser, threaditComments, countReplies, presence, personRecord } from '../content/index.js';
import { avatarImg, when, q, highlight, pager } from './common.js';
import { paragraphs, inline } from '../lib/rich.js';
import { toMs, fmtNum, longDate, compact } from '../lib/time.js';
import { search, tokens } from '../net/search.js';
import { rng } from '../lib/rng.js';

const FAV = '<svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="10" rx="2" fill="#2d7d5a"/><path d="M4 12l-1 3 4-3" fill="#2d7d5a"/><path d="M4 6h8M4 9h5" stroke="#fff" stroke-width="1.4"/></svg>';
export const threadit = { id: 'threadit', host: 'threadit.com', name: 'Threadit', favicon: FAV, server: 'nginx/1.2.1', render };
const ARCHIVE_AGE = 183 * 864e5;
export const isArchived = t => !!t.archived || (!t.pinned && worldNow() - toMs(t.date) > ARCHIVE_AGE);
const joined = c => !!save.get().threadit.joined[c];
const members = c => COMMUNITIES[c].members + (joined(c) ? 1 : 0);
const myVote = key => save.get().threadit.votes[key] || 0;
const threadScore = t => t.score + myVote('t:' + t.id);
const hotness = t => { const s = threadScore(t); const age = (worldNow() - toMs(t.date)) / 36e5; return Math.sign(s) * Math.log10(Math.abs(s) + 1) - age / 400 + (t.pinned ? 100 : 0); };

function render(route, ctx) {
  const [a, b, c, d] = route.segs;
  if (!a) return front(ctx, route.query.get('sort') || 'hot');
  if (a === 'communities') return directory(ctx);
  if (a === 'c' && b && !c) return community(b, ctx, route.query.get('sort') || 'hot', +route.query.get('p') || 1);
  if (a === 'c' && b && c === 't' && d) return thread(b, d, ctx, route.query.get('sort') || 'best');
  if (a === 'c' && b && c === 'about') return community(b, ctx, 'hot', 1, true);
  if (a === 'u' && b) return profile(b, ctx, route.query.get('tab') || 'overview');
  if (a === 'search') return searchPage(route.query.get('q') || '', route.query.get('c') || '', ctx);
  if (a === 'archive') return archive(ctx, route.query.get('c') || '');
  return notFound(ctx);
}

function shell(ctx, main, side, { c, query = '' } = {}) {
  const input = h('input', { class: 'td-q', value: query, placeholder: c ? 'search c/' + c : 'search threadit', onkeydown: e => { if (e.key === 'Enter' && input.value.trim()) ctx.go('threadit.com/search?q=' + q(input.value.trim()) + (c && !e.shiftKey ? '&c=' + c : '')); } });
  const joinedList = Object.keys(save.get().threadit.joined).filter(x => COMMUNITIES[x]);
  const theme = c && COMMUNITIES[c] ? COMMUNITIES[c].color : '#2d7d5a';
  return h('div', { class: 'td', style: { '--td-c': theme } },
    h('div', { class: 'td-bar' }, h('span', { class: 'td-my' }, 'MY COMMUNITIES ▾'), h('a', { href: '/' }, 'front'), h('a', { href: '/communities' }, 'all'), h('span', null, '|'),
      (joinedList.length ? joinedList : ['askanything', 'lostmedia', 'rigbuilders', 'kitchencrimes', 'vidderdrama', 'portwexley']).map(x => h('a', { href: '/c/' + x }, x)), h('a', { href: '/archive', class: 'td-more' }, 'archive »')),
    h('div', { class: 'td-head' },
      h('a', { href: '/', class: 'td-logo', 'aria-label': 'Threadit' }, h('span', { class: 'td-needle' }, '✂'), 'threadit'),
      c && COMMUNITIES[c] ? h('a', { href: '/c/' + c, class: 'td-ctitle' }, 'c/' + c) : null,
      h('span', { class: 'td-user' }, save.get().settings.userName.toLowerCase().replace(/\s+/g, '_'), ' (1)')),
    h('div', { class: 'td-cols' }, h('div', { class: 'td-main' }, main), h('div', { class: 'td-side' }, h('div', { class: 'td-searchbox' }, input), side)),
    h('div', { class: 'td-foot' }, 'threadit.com · est. 2005 · ', h('a', { href: '/c/meta' }, 'meta'), ' · ', h('a', { href: '/archive' }, 'archive'), ' · ', h('a', { href: '/communities' }, 'communities')));
}

function voteBox(key, base, disabled) {
  const box = h('div', { class: 'td-vote' + (disabled ? ' locked' : '') });
  const paint = () => {
    clear(box);
    const v = myVote(key);
    const set = n => { if (disabled) return; patch('threadit', s => ({ votes: { ...s.votes, [key]: s.votes[key] === n ? 0 : n } })); paint(); };
    box.append(h('button', { type: 'button', class: 'up' + (v === 1 ? ' on' : ''), 'aria-label': 'upvote', title: disabled ? 'archived: voting closed' : 'upvote', onclick: () => set(1) }, '▲'),
      h('span', { class: 'td-score' + (v === 1 ? ' up' : v === -1 ? ' down' : '') }, compact(base + v)),
      h('button', { type: 'button', class: 'down' + (v === -1 ? ' on' : ''), 'aria-label': 'downvote', title: disabled ? 'archived: voting closed' : 'downvote', onclick: () => set(-1) }, '▼'));
  };
  paint();
  return box;
}

function row(t, i, { showC = true } = {}) {
  const arch = isArchived(t);
  return h('div', { class: 'td-row' + (t.pinned ? ' pinned' : '') },
    i != null ? h('span', { class: 'td-rank' }, i) : null,
    voteBox('t:' + t.id, t.score, arch),
    h('div', { class: 'td-rinfo' },
      h('a', { href: `/c/${t.c}/t/${t.id}`, class: 'td-rtitle' }, t.title),
      t.flair ? h('span', { class: 'td-flair' }, t.flair) : null,
      t.pinned ? h('span', { class: 'td-tag pin' }, 'pinned') : null, t.locked ? h('span', { class: 'td-tag lock' }, 'locked') : null, arch ? h('span', { class: 'td-tag arch' }, 'archived') : null,
      h('div', { class: 'td-rmeta' }, 'submitted ', h('span', { title: longDate(t.date) }, when(t.date)), ' by ', h('a', { href: '/u/' + t.u }, t.u), showC ? [' to ', h('a', { href: '/c/' + t.c }, 'c/' + t.c)] : null),
      h('div', { class: 'td-rlinks' }, h('a', { href: `/c/${t.c}/t/${t.id}` }, countReplies(t.replies) + ' comments'))));
}

function sortThreads(list, sort) {
  const l = list.slice();
  if (sort === 'new') l.sort((a, b) => toMs(b.date) - toMs(a.date));
  else if (sort === 'top') l.sort((a, b) => threadScore(b) - threadScore(a));
  else l.sort((a, b) => hotness(b) - hotness(a));
  return l;
}
const sortTabs = (base, sort) => h('div', { class: 'td-tabs' }, ['hot', 'new', 'top'].map(s => h('a', { href: base + (base.includes('?') ? '&' : '?') + 'sort=' + s, class: s === sort ? 'on' : '' }, s)));

function front(ctx, sort) {
  const list = sortThreads(THREADS.filter(t => !isArchived(t) && !(t.pinned && sort !== 'hot') && t.c !== 'meta'), sort).slice(0, 25);
  const main = h('div', null, sortTabs('threadit.com/', sort), h('div', { class: 'td-list' }, list.map((t, i) => row(t, i + 1))));
  const side = h('div', null,
    h('div', { class: 'td-box' }, h('h3', null, 'Welcome to Threadit'), h('p', null, 'A community for every interest, since 2005. Find yours in the ', h('a', { href: '/communities' }, 'directory'), '.')),
    h('div', { class: 'td-box' }, h('h3', null, 'Popular communities'), Object.entries(COMMUNITIES).sort((a, b) => b[1].members - a[1].members).slice(0, 8).map(([id, c]) => h('div', { class: 'td-crow' }, h('span', { class: 'td-cicon', style: { background: c.color } }, c.icon), h('a', { href: '/c/' + id }, 'c/' + id), h('small', null, compact(members(id)))))),
    h('div', { class: 'td-box' }, h('h3', null, 'From the archive'), THREADS.filter(isArchived).sort((a, b) => b.score - a.score).slice(0, 3).map(t => h('p', null, h('a', { href: `/c/${t.c}/t/${t.id}` }, t.title)))));
  return { title: 'threadit: the front page of your interests', node: shell(ctx, main, side) };
}

function joinButton(id, after) {
  const b = h('button', { type: 'button', class: 'td-join' });
  const paint = () => { b.textContent = joined(id) ? 'leave' : 'join'; b.classList.toggle('on', joined(id)); };
  b.addEventListener('click', () => { patch('threadit', s => { const j = { ...s.joined }; if (j[id]) delete j[id]; else j[id] = worldNow(); return { joined: j }; }); paint(); after?.(); });
  paint();
  return b;
}
function communitySide(id, ctx) {
  const c = COMMUNITIES[id];
  const memberCount = h('span');
  const paintCount = () => memberCount.textContent = fmtNum(members(id)) + ' members';
  paintCount();
  const online = 20 + (rng(id + Math.floor(worldNow() / 6e5))() * c.members / 900 | 0);
  return h('div', null,
    h('div', { class: 'td-box td-cbox' }, h('div', { class: 'td-chead' }, h('span', { class: 'td-cicon big', style: { background: c.color } }, c.icon), h('div', null, h('h3', null, c.title), h('small', null, 'c/' + id))),
      joinButton(id, paintCount), h('p', { class: 'td-stat' }, memberCount, ' · ', fmtNum(online) + ' here now'), h('p', null, c.about), h('p', { class: 'td-small' }, 'a community for ' + Math.floor((worldNow() - toMs(c.created)) / 31536e6) + ' years · created ' + longDate(c.created))),
    h('div', { class: 'td-box' }, h('h3', null, 'Rules'), h('ol', { class: 'td-rules' }, c.rules.map(r => h('li', null, r)))),
    h('div', { class: 'td-box' }, h('h3', null, 'Moderators'), c.mods.map(m => h('p', null, h('a', { href: '/u/' + m }, 'u/' + m)))),
    h('div', { class: 'td-box' }, h('a', { href: '/archive?c=' + id }, 'Browse the c/' + id + ' archive »')));
}

function community(id, ctx, sort, page) {
  const c = COMMUNITIES[id];
  if (!c) return { title: 'threadit: community not found', node: shell(ctx, h('div', { class: 'td-empty' }, h('h2', null, 'there doesn\'t seem to be anything here'), h('p', null, `c/${id} isn't a community. `, h('a', { href: '/communities' }, 'Browse communities'), ' or ', h('a', { href: '/search?q=' + q(id) }, `search for "${id}"`), '.')), null) };
  const all = sortThreads((threadsByCommunity[id] || []).filter(t => !isArchived(t) || t.pinned), sort);
  const per = 15, shown = all.slice((page - 1) * per, page * per);
  const archivedCount = (threadsByCommunity[id] || []).filter(t => isArchived(t) && !t.pinned).length;
  const main = h('div', null,
    h('div', { class: 'td-cbanner', style: { background: c.color } }, h('span', { class: 'td-cicon big' }, c.icon), h('div', null, h('h1', null, c.title), h('p', null, c.tagline))),
    sortTabs('threadit.com/c/' + id, sort),
    shown.length ? h('div', { class: 'td-list' }, shown.map(t => row(t, null, { showC: false }))) : h('p', { class: 'td-empty' }, 'No recent threads.'),
    archivedCount ? h('p', { class: 'td-archnote' }, `${archivedCount} older thread${archivedCount > 1 ? 's are' : ' is'} in the `, h('a', { href: '/archive?c=' + id }, 'archive'), '.') : null,
    pager(all.length, page, per, n => `threadit.com/c/${id}?sort=${sort}&p=${n}`, 'td-pager'));
  return { title: c.title + ' (c/' + id + ')', node: shell(ctx, main, communitySide(id, ctx), { c: id }) };
}

function thread(cid, tid, ctx, sort) {
  const t = THREAD[tid];
  if (!t || t.c !== cid) return notFound(ctx, cid);
  const c = COMMUNITIES[t.c];
  const arch = isArchived(t);
  const sortReplies = list => {
    const l = (list || []).map((r, i) => ({ r, i }));
    if (sort === 'new') l.reverse(); else if (sort === 'old') {} else l.sort((a, b) => b.r[2] - a.r[2]);
    return l;
  };
  const renderReply = ([u, text, score, kids], path, depth) => {
    const key = 'c:' + t.id + ':' + path;
    const kidsBox = h('div', { class: 'td-kids' });
    sortReplies(kids).forEach(({ r, i }) => kidsBox.append(renderReply(r, path + '.' + i, depth + 1)));
    const isMod = c.mods.includes(u) && /^(Removed|Locking|Leaving this up|Rule|Locked)/.test(text);
    const el = h('div', { class: 'td-cmt' + (u === t.u ? ' op' : '') + (depth % 2 ? ' odd' : '') },
      voteBox(key, score, arch),
      h('div', { class: 'td-cbody' },
        h('div', { class: 'td-cmeta' }, h('button', { type: 'button', class: 'td-toggle', 'aria-label': 'collapse', onclick: e => { el.classList.toggle('collapsed'); e.target.textContent = el.classList.contains('collapsed') ? `[+${1 + countReplies(kids)}]` : '[–]'; } }, '[–]'),
          h('a', { href: '/u/' + u, class: 'td-cuser' + (u === t.u ? ' op' : '') + (isMod ? ' mod' : '') }, u), u === t.u ? h('span', { class: 'td-optag' }, 'OP') : null, isMod ? h('span', { class: 'td-modtag' }, 'MOD') : null,
          h('span', null, ` ${compact(score + myVote(key))} points`)),
        h('div', { class: 'td-ctext' }, paragraphs(text)),
        kidsBox));
    return el;
  };
  const replies = h('div', { class: 'td-replies' });
  sortReplies(t.replies).forEach(({ r, i }) => replies.append(renderReply(r, String(i), 0)));
  const n = countReplies(t.replies);
  const main = h('div', { class: 'td-thread' },
    h('div', { class: 'td-op' }, voteBox('t:' + t.id, t.score, arch),
      h('div', { class: 'td-opbody' },
        h('h1', null, t.title, t.flair ? h('span', { class: 'td-flair' }, t.flair) : null),
        h('div', { class: 'td-rmeta' }, 'submitted ', h('span', { title: longDate(t.date) }, when(t.date)), ' by ', h('a', { href: '/u/' + t.u }, t.u), ' to ', h('a', { href: '/c/' + t.c }, 'c/' + t.c)),
        t.body ? h('div', { class: 'td-optext' }, paragraphs(t.body)) : null,
        h('div', { class: 'td-rlinks' }, h('span', null, n + ' comments'), h('a', { href: 'findr.net/search?q=' + q(t.title) }, 'search findr')))),
    arch ? h('div', { class: 'td-notice arch' }, 'This is an archived thread. New comments cannot be posted and votes cannot be cast.') : t.locked ? h('div', { class: 'td-notice' }, 'This thread has been locked by the moderators of c/' + t.c + '. New comments cannot be posted.') : h('div', { class: 'td-notice soft' }, 'Your account is new. New accounts can vote and join communities, but can\'t comment yet.'),
    h('div', { class: 'td-csort' }, 'sorted by: ', ['best', 'new', 'old'].map(s => h('a', { href: `threadit.com/c/${t.c}/t/${t.id}?sort=${s}`, class: s === sort ? 'on' : '' }, s))),
    replies.childElementCount ? replies : h('p', { class: 'td-empty' }, 'no comments yet'));
  const more = (threadsByCommunity[t.c] || []).filter(x => x.id !== t.id && !isArchived(x)).slice(0, 5);
  const side = h('div', null, communitySide(t.c, ctx), more.length ? h('div', { class: 'td-box' }, h('h3', null, 'More from c/' + t.c), more.map(x => h('p', null, h('a', { href: `/c/${x.c}/t/${x.id}` }, x.title)))) : null);
  return { title: t.title + ' : ' + t.c, node: shell(ctx, main, side, { c: t.c }) };
}

function directory(ctx) {
  const list = Object.entries(COMMUNITIES).sort((a, b) => b[1].members - a[1].members);
  const main = h('div', null, h('h1', { class: 'td-h1' }, 'Communities'), h('p', { class: 'td-sub' }, 'Every community on Threadit, by size.'),
    h('div', { class: 'td-dir' }, list.map(([id, c]) => h('div', { class: 'td-drow' },
      h('span', { class: 'td-cicon big', style: { background: c.color } }, c.icon),
      h('div', { class: 'td-dinfo' }, h('a', { href: '/c/' + id, class: 'td-dname' }, 'c/' + id), h('span', { class: 'td-dtitle' }, c.title), h('p', null, c.tagline), h('small', null, fmtNum(members(id)) + ' members · ' + (threadsByCommunity[id]?.length || 0) + ' threads')),
      joinButton(id)))));
  return { title: 'threadit: communities', node: shell(ctx, main, h('div', { class: 'td-box' }, h('h3', null, 'Joined'), Object.keys(save.get().threadit.joined).length ? Object.keys(save.get().threadit.joined).map(id => h('p', null, h('a', { href: '/c/' + id }, 'c/' + id))) : h('p', null, 'Communities you join appear in the bar at the top.'))) };
}

function profile(id, ctx, tab) {
  const u = USERS[id];
  const posts = threadsByUser[id] || [];
  const cmts = (threaditComments[id] || []).slice().sort((a, b) => toMs(b.thread.date) - toMs(a.thread.date));
  if (!u && !posts.length && !cmts.length) return { title: 'threadit: user not found', node: shell(ctx, h('div', { class: 'td-empty' }, h('h2', null, 'page not found'), h('p', null, `the user u/${id} could not be found. they may have deleted their account.`)), null) };
  const p = personRecord(id);
  const karma = posts.reduce((n, t) => n + t.score, 0) + cmts.reduce((n, c) => n + c.score, 0);
  const items = tab === 'posts' ? posts.map(t => ({ t })) : tab === 'comments' ? cmts.map(c => ({ c })) : [...posts.map(t => ({ t, d: toMs(t.date) })), ...cmts.map(c => ({ c, d: toMs(c.thread.date) + 1 }))].sort((a, b) => b.d - a.d);
  const main = h('div', null,
    h('div', { class: 'td-tabs' }, ['overview', 'posts', 'comments'].map(x => h('a', { href: `/u/${id}?tab=${x}`, class: x === tab ? 'on' : '' }, x))),
    items.length ? h('div', { class: 'td-list' }, items.slice(0, 60).map(it => it.t ? row(it.t) : h('div', { class: 'td-ucmt' },
      h('div', { class: 'td-rmeta' }, h('a', { href: `/c/${it.c.thread.c}/t/${it.c.thread.id}`, class: 'td-ucthread' }, it.c.thread.title), ' in ', h('a', { href: '/c/' + it.c.thread.c }, 'c/' + it.c.thread.c)),
      h('div', { class: 'td-ctext' }, paragraphs(it.c.text)), h('small', null, compact(it.c.score) + ' points')))) : h('p', { class: 'td-empty' }, 'nothing here yet'));
  const modOf = Object.entries(COMMUNITIES).filter(([, c]) => c.mods.includes(id)).map(([k]) => k);
  const side = h('div', null, h('div', { class: 'td-box td-ubox' }, avatarImg(id, 72), h('h3', null, 'u/' + id), h('p', { class: 'td-karma' }, h('b', null, fmtNum(karma)), ' karma'),
    p.joined ? h('p', { class: 'td-small' }, 'threaditor for ' + Math.max(1, Math.floor((worldNow() - toMs(p.joined)) / 31536e6)) + ' year' + (Math.floor((worldNow() - toMs(p.joined)) / 31536e6) > 1 ? 's' : '') + ' · joined ' + longDate(p.joined)) : h('p', { class: 'td-small' }, 'account age unknown'),
    p.bio ? h('p', null, p.bio) : null,
    presence(id).filter(x => x.site !== 'Threadit').map(x => h('p', { class: 'td-small' }, h('a', { href: x.url }, 'also on ' + x.site)))),
    modOf.length ? h('div', { class: 'td-box' }, h('h3', null, 'Moderator of'), modOf.map(m => h('p', null, h('a', { href: '/c/' + m }, 'c/' + m)))) : null);
  return { title: 'overview for ' + id, node: shell(ctx, main, side) };
}

function searchPage(query, cid, ctx) {
  const res = query ? search(query, { site: 'threadit.com' }).filter(d => d.thread && (!cid || d.thread.c === cid)) : [];
  const comms = query && !cid ? Object.entries(COMMUNITIES).filter(([id, c]) => (id + ' ' + c.title + ' ' + c.tagline).toLowerCase().includes(query.toLowerCase())) : [];
  const terms = tokens(query);
  const main = h('div', null, h('h1', { class: 'td-h1' }, 'search results', cid ? ' in c/' + cid : ''),
    cid ? h('p', { class: 'td-sub' }, h('a', { href: '/search?q=' + q(query) }, 'search all of threadit instead')) : null,
    comms.length ? h('div', { class: 'td-box' }, h('h3', null, 'communities'), comms.map(([id, c]) => h('p', null, h('a', { href: '/c/' + id }, 'c/' + id), ' — ' + c.tagline))) : null,
    res.length ? h('div', { class: 'td-list' }, res.map(d => h('div', { class: 'td-sres' }, row(d.thread), h('p', { class: 'td-snip' }, highlight(d.text, terms, 200))))) : h('p', { class: 'td-empty' }, query ? 'there doesn\'t seem to be anything here.' : 'type something into the search box.'));
  return { title: 'threadit: search results - ' + query, node: shell(ctx, main, cid ? communitySide(cid, ctx) : null, { c: cid, query }) };
}

function archive(ctx, cid) {
  const list = THREADS.filter(t => isArchived(t) && !t.pinned && (!cid || t.c === cid)).sort((a, b) => toMs(b.date) - toMs(a.date));
  let year = '';
  const main = h('div', null, h('h1', { class: 'td-h1' }, 'the archive', cid ? ': c/' + cid : ''), h('p', { class: 'td-sub' }, 'Threads older than six months. Read-only, forever.'),
    h('div', { class: 'td-chips' }, h('a', { href: '/archive', class: !cid ? 'on' : '' }, 'all'), Object.keys(COMMUNITIES).filter(k => THREADS.some(t => t.c === k && isArchived(t) && !t.pinned)).map(k => h('a', { href: '/archive?c=' + k, class: k === cid ? 'on' : '' }, k))),
    list.length ? list.map(t => { const y = new Date(toMs(t.date)).getUTCFullYear(); const head = y !== year ? h('h2', { class: 'td-year' }, (year = y)) : null; return [head, row(t)]; }) : h('p', { class: 'td-empty' }, 'nothing archived here yet.'));
  return { title: 'threadit: archive', node: shell(ctx, main, cid ? communitySide(cid, ctx) : null, { c: cid }) };
}

function notFound(ctx, c) {
  return { title: 'threadit: page not found', node: shell(ctx, h('div', { class: 'td-empty' }, h('div', { class: 'td-404' }, '✂'), h('h2', null, 'page not found'), h('p', null, 'the thread you are looking for has been deleted, or never existed.'), h('a', { href: c ? '/c/' + c : '/' }, c ? 'back to c/' + c : 'back to the front page')), null, { c }) };
}
