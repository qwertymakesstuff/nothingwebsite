// Blink (blink.social): sign-up, your profile and its customisation, status updates with photos,
// likes, comments, following, friends and followers, activity feed, trending, notifications and people search.
import { h, clear } from '../lib/dom.js';
import { save, patch, worldNow } from '../os/state.js';
import { USERS, POSTS, POST, postsByUser, BLINK_FRIENDS, blinkFollowers, presence, personRecord } from '../content/index.js';
import { avatar, photo } from '../lib/art.js';
import { avatarImg, when, q } from './common.js';
import { inline } from '../lib/rich.js';
import { toMs, fmtNum, longDate, compact } from '../lib/time.js';
import { rng, hash } from '../lib/rng.js';
import { confirmBox } from '../os/dialog.js';

const FAV = '<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="4" fill="#7a4fd1"/><path d="M3.5 8.5c1.6-3 7.4-3 9 0-1.6 3-7.4 3-9 0z" fill="#fff"/><circle cx="8" cy="8.5" r="1.6" fill="#7a4fd1"/></svg>';
export const blink = { id: 'blink', host: 'blink.social', name: 'Blink', favicon: FAV, server: 'BlinkServer', render };

const PHOTO_KINDS = [['', 'No photo'], ['landscape', 'Outdoors'], ['beach', 'Beach'], ['food', 'Food'], ['cat', 'Cat'], ['dog', 'Dog'], ['selfie', 'Selfie'], ['night', 'City at night'], ['room', 'My room'], ['pcbuild', 'Computer']];
const AV_KINDS = [['face', 'Me'], ['cat', 'Cat'], ['dog', 'Dog'], ['initial', 'Initial'], ['photo', 'Scenery'], ['logo', 'Shape']];
const THEMES = ['#7a4fd1', '#3b7fd4', '#2fa66a', '#d14f3b', '#d19a2f', '#d14f9a', '#3a3a3a', '#1f8a8a'];
const CELEBS = new Set(['maxplaysstuff', 'kaylakreates', 'glittergrrl', 'dougtheunbothered', 'corwinvance', 'vidder', 'wexleynews9', 'sadkeyboard', 'dannycookspoorly', 'rigdoctor']);
const blinkUsers = () => Object.keys(USERS).filter(id => USERS[id].on.includes('blink'));
const B = () => save.get().blink;
const me = () => B().profile;
const following = id => !!B().following[id];
const isMe = id => id === 'me';
const nameOf = id => isMe(id) ? me()?.name || 'You' : personRecord(id).name;
function meAvatarUrl(p = me()) { return p ? avatar('me:' + p.avSeed, { kind: p.avKind, bg: p.avBg, text: (p.name || '?')[0] }) : ''; }
const av = (id, size, cls = '') => isMe(id) ? h('img', { class: 'av ' + cls, src: meAvatarUrl(), width: size, height: size, alt: '' }) : avatarImg(id, size, cls);
const profileUrl = id => isMe(id) ? '/me' : '/' + id;
const likeCount = p => p.likes + (B().likes[p.id] ? 1 : 0) + (p.mine ? myPostLikes(p).length : 0);
const followerCount = id => blinkFollowers(id).length + (following(id) ? 1 : 0) + (CELEBS.has(id) ? Math.round((USERS[id]?.vidder?.subs || 400000) * 0.6) : 0);

// People who follow you back, deterministic and spread over in-world time.
function followBacks() {
  const out = [];
  for (const [id, t] of Object.entries(B().following)) {
    if (CELEBS.has(id) || !USERS[id]) continue;
    const r = rng('fb:' + id + ':' + t)();
    if (r < 0.15) continue;
    out.push({ id, at: t + 30e3 + Math.floor(r * 7 * 60e3) });
  }
  return out;
}
const myFollowers = () => followBacks().filter(f => f.at <= worldNow()).map(f => f.id);
function myPostLikes(p) {
  return followBacks().filter(f => { const r = rng('lk:' + f.id + p.id)(); return r < .55 && Math.max(f.at, toMs(p.date)) + r * 3600e3 <= worldNow(); }).map(f => f.id);
}
function notifications() {
  const out = [];
  if (!me()) return out;
  out.push({ at: B().joinedAt, text: ['Welcome to Blink, ', h('b', null, me().name), '! Find people you know to fill up your feed.'], href: '/find', icon: 'logo' });
  for (const f of followBacks()) if (f.at <= worldNow()) out.push({ at: f.at, who: f.id, text: [h('b', null, nameOf(f.id)), ' followed you back.'], href: '/' + f.id });
  for (const p of B().posts) for (const id of myPostLikes(p)) out.push({ at: toMs(p.date) + (hash(id + p.id) % 3600e3), who: id, text: [h('b', null, nameOf(id)), ' liked your post: "' + p.text.slice(0, 40) + (p.text.length > 40 ? '…' : '') + '"'], href: '/post/' + p.id });
  const suggest = blinkUsers().filter(id => !following(id) && !CELEBS.has(id)).slice(0, 1)[0];
  if (suggest) out.push({ at: B().joinedAt + 1000, who: suggest, text: ['You might know ', h('b', null, nameOf(suggest)), '.'], href: '/' + suggest });
  return out.filter(n => n.at <= worldNow()).sort((a, b) => b.at - a.at);
}
const unread = () => notifications().filter(n => n.at > B().notifRead).length;
const allPosts = () => [...POSTS, ...B().posts.map(p => ({ ...p, u: 'me', mine: true, comments: [] }))];

function render(route, ctx) {
  const [a, b] = route.segs;
  if (!me() && (!a || a === 'me' || a === 'settings' || a === 'notifications')) return signup(ctx);
  if (!a) return feed(ctx);
  if (a === 'trending') return trending(ctx);
  if (a === 'notifications') return notifPage(ctx);
  if (a === 'settings') return settings(ctx);
  if (a === 'find') return find(ctx, route.query.get('q') || '');
  if (a === 'post' && b) return postPage(b, ctx);
  if (a === 'me') return profile('me', b || 'posts', ctx);
  if (USERS[a]?.on.includes('blink')) return profile(a, b || 'posts', ctx);
  return notFound(ctx);
}

function shell(ctx, main, side) {
  const s = h('input', { class: 'bk-q', placeholder: 'Search for people', 'aria-label': 'Search Blink', onkeydown: e => { if (e.key === 'Enter') ctx.go('blink.social/find?q=' + q(s.value.trim())); } });
  const n = me() ? unread() : 0;
  return h('div', { class: 'bk' },
    h('div', { class: 'bk-top' }, h('div', { class: 'bk-topin' },
      h('a', { href: '/', class: 'bk-logo' }, h('span', { class: 'bk-eye' }), 'blink'),
      s,
      h('nav', { class: 'bk-nav' },
        h('a', { href: '/' }, 'Home'), h('a', { href: '/trending' }, 'Trending'), h('a', { href: '/find' }, 'Find people'),
        me() ? h('a', { href: '/notifications', class: 'bk-bell' }, 'Notifications', n ? h('span', { class: 'bk-badge' }, n) : null) : null,
        me() ? h('a', { href: '/me', class: 'bk-mechip' }, av('me', 22, 'round'), me().name.split(' ')[0]) : h('a', { href: '/' }, 'Sign up')))),
    h('div', { class: 'bk-cols' + (side ? '' : ' single') }, h('div', { class: 'bk-main' }, main), side ? h('div', { class: 'bk-side' }, side) : null),
    h('div', { class: 'bk-foot' }, 'Blink © 2013 · Connecting everyone, one blink at a time · ', h('a', { href: '/corwinvance' }, 'Corwin Vance'), ' · ', h('a', { href: '/find' }, 'People')));
}

// ---- sign-up --------------------------------------------------------------------------------------
function signup(ctx) {
  const name = h('input', { class: 'bk-in', value: save.get().settings.userName, maxlength: 40, placeholder: 'Your name' });
  const bio = h('input', { class: 'bk-in', maxlength: 120, placeholder: 'A little about you (optional)' });
  const loc = h('input', { class: 'bk-in', maxlength: 40, placeholder: 'Where do you live? (optional)', value: 'Port Wexley' });
  const node = h('div', { class: 'bk bk-landing' },
    h('div', { class: 'bk-hero' },
      h('div', { class: 'bk-pitch' }, h('div', { class: 'bk-logo big' }, h('span', { class: 'bk-eye' }), 'blink'), h('h1', null, 'See what everyone\'s up to.'), h('p', null, 'Blink helps you keep up with friends, family and the people you love to watch, in one place.'),
        h('div', { class: 'bk-faces' }, blinkUsers().slice(0, 12).map(id => avatarImg(id, 44, 'round')))),
      h('div', { class: 'bk-form' }, h('h2', null, 'Sign up'), h('p', null, 'It\'s free and always will be.'), name, loc, bio,
        h('button', { type: 'button', class: 'bk-big', onclick: () => {
          if (!name.value.trim()) { name.focus(); return; }
          const t = worldNow();
          patch('blink', () => ({ profile: { name: name.value.trim(), bio: bio.value.trim(), location: loc.value.trim(), avKind: 'face', avSeed: String(Date.now() % 100000), avBg: '#7fa8d1', theme: '#7a4fd1' }, joinedAt: t, notifRead: 0 }));
          ctx.replace('blink.social/find?welcome=1');
        } }, 'Create my profile'),
        h('p', { class: 'bk-fine' }, 'By signing up you agree to the Blink Terms, which nobody has ever read.'))));
  return { title: 'Welcome to Blink', node };
}

// ---- posts ----------------------------------------------------------------------------------------
function postCard(p, ctx, { full } = {}) {
  const liked = !!B().likes[p.id];
  const likeBtn = h('button', { type: 'button', class: 'bk-like' + (liked ? ' on' : '') });
  const count = h('span', { class: 'bk-lcount' });
  const paint = () => { const on = !!B().likes[p.id]; likeBtn.textContent = on ? '♥ Liked' : '♡ Like'; likeBtn.classList.toggle('on', on); const n = likeCount(p); count.textContent = n ? '♥ ' + fmtNum(n) : ''; };
  likeBtn.addEventListener('click', () => { if (p.mine) return; patch('blink', s => { const likes = { ...s.likes }; if (likes[p.id]) delete likes[p.id]; else likes[p.id] = worldNow(); return { likes }; }); paint(); });
  paint();
  const cmts = p.comments || [];
  const shown = full ? cmts : cmts.slice(-2);
  const theirLikes = p.mine ? myPostLikes(p) : [];
  return h('div', { class: 'bk-post' },
    h('div', { class: 'bk-phead' }, h('a', { href: profileUrl(p.u) }, av(p.u, 44, 'round')), h('div', null, h('a', { href: profileUrl(p.u), class: 'bk-pname' }, nameOf(p.u)), h('a', { href: '/post/' + p.id, class: 'bk-ptime' }, when(p.date))),
      p.mine ? h('button', { type: 'button', class: 'bk-del', title: 'Delete post', onclick: async () => { if (await confirmBox('Delete this post?', 'Blink', 'Delete')) { patch('blink', s => ({ posts: s.posts.filter(x => x.id !== p.id) })); ctx.reload(); } } }, '×') : null),
    h('div', { class: 'bk-ptext' }, inline(p.text)),
    p.photo?.kind ? h('a', { href: '/post/' + p.id, class: 'bk-photo' }, h('img', { src: photo(p.id, p.photo.kind, p.photo.caption), alt: p.photo.caption || 'photo' })) : null,
    h('div', { class: 'bk-pbar' }, p.mine ? h('span', { class: 'bk-lnames' }, theirLikes.length ? theirLikes.map(nameOf).slice(0, 3).join(', ') + (theirLikes.length > 3 ? ' and others' : '') + ' liked this' : 'No likes yet') : likeBtn, h('a', { href: '/post/' + p.id }, '💬 Comment'), count),
    cmts.length ? h('div', { class: 'bk-cmts' },
      !full && cmts.length > 2 ? h('a', { href: '/post/' + p.id, class: 'bk-allc' }, `View all ${cmts.length} comments`) : null,
      shown.map(([u, t]) => h('div', { class: 'bk-cmt' }, h('a', { href: USERS[u]?.on.includes('blink') ? '/' + u : '/find?q=' + q(u) }, avatarImg(u, 30, 'round')), h('div', null, h('a', { href: USERS[u]?.on.includes('blink') ? '/' + u : '/find?q=' + q(u), class: 'bk-cname' }, nameOf(u)), ' ', inline(t))))) : null);
}

function composer(ctx) {
  const ta = h('textarea', { class: 'bk-compose', maxlength: 500, placeholder: `What's on your mind, ${me().name.split(' ')[0]}?` });
  const kind = h('select', { class: 'bk-sel', 'aria-label': 'Add a photo' }, PHOTO_KINDS.map(([k, l]) => h('option', { value: k }, k ? '📷 ' + l : l)));
  const cap = h('input', { class: 'bk-in small', placeholder: 'Photo caption (optional)', maxlength: 30, hidden: true });
  kind.addEventListener('change', () => { cap.hidden = !kind.value; });
  const post = () => {
    const text = ta.value.trim(); if (!text && !kind.value) return;
    const id = 'me' + Date.now().toString(36);
    patch('blink', s => ({ posts: [{ id, text, date: new Date(worldNow()).toISOString(), likes: 0, photo: kind.value ? { kind: kind.value, caption: cap.value.trim() || undefined } : null }, ...s.posts] }));
    ctx.reload();
  };
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post(); });
  return h('div', { class: 'bk-composer' }, h('div', { class: 'bk-crow' }, av('me', 40, 'round'), ta), h('div', { class: 'bk-crow end' }, kind, cap, h('button', { type: 'button', class: 'bk-btn primary', onclick: post }, 'Blink it')));
}

function suggestions(ctx, n = 4) {
  const mine = Object.keys(B().following);
  const fof = {};
  for (const id of mine) for (const f of BLINK_FRIENDS[id] || []) if (!following(f)) fof[f] = (fof[f] || 0) + 1;
  const ranked = blinkUsers().filter(id => !following(id)).sort((a, b) => (fof[b] || 0) - (fof[a] || 0) || (hash(a) % 7) - (hash(b) % 7)).slice(0, n);
  return h('div', { class: 'bk-box' }, h('h3', null, 'People you may know'), ranked.map(id => h('div', { class: 'bk-sug' }, h('a', { href: '/' + id }, avatarImg(id, 40, 'round')), h('div', null, h('a', { href: '/' + id, class: 'bk-pname' }, nameOf(id)), h('small', null, fof[id] ? `${fof[id]} mutual connection${fof[id] > 1 ? 's' : ''}` : USERS[id].location || '')), followBtn(id, ctx, true))), h('a', { href: '/find', class: 'bk-more' }, 'See more people'));
}
function followBtn(id, ctx, small, after) {
  const b = h('button', { type: 'button', class: 'bk-btn' + (small ? ' small' : '') });
  const paint = () => { const on = following(id); b.textContent = on ? '✓ Following' : '+ Follow'; b.classList.toggle('on', on); };
  b.addEventListener('click', () => { patch('blink', s => { const f = { ...s.following }; if (f[id]) delete f[id]; else f[id] = worldNow(); return { following: f }; }); paint(); after?.(); });
  paint();
  return b;
}
function meBox() {
  const p = me();
  return h('div', { class: 'bk-box bk-mebox', style: { '--bk-t': p.theme } }, h('div', { class: 'bk-mecover' }), h('a', { href: '/me' }, av('me', 64, 'round ring')), h('a', { href: '/me', class: 'bk-pname' }, p.name), h('small', null, p.bio || p.location || ''),
    h('div', { class: 'bk-mestats' }, h('a', { href: '/me/following' }, h('b', null, Object.keys(B().following).length), ' following'), h('a', { href: '/me/followers' }, h('b', null, myFollowers().length), ' followers'), h('span', null, h('b', null, B().posts.length), ' posts')));
}

function feed(ctx) {
  const f = Object.keys(B().following);
  const items = allPosts().filter(p => p.u === 'me' || f.includes(p.u)).sort((a, b) => toMs(b.date) - toMs(a.date));
  const main = h('div', null, composer(ctx),
    items.length ? items.slice(0, 40).map(p => postCard(p, ctx)) : h('div', { class: 'bk-box bk-emptyfeed' }, h('h3', null, 'Your feed is quiet.'), h('p', null, 'Follow some people and their posts will show up here. Here\'s what\'s popular on Blink right now:')),
    items.length < 6 ? [h('h3', { class: 'bk-h' }, 'Trending on Blink'), trendingList().slice(0, 6).map(p => postCard(p, ctx))] : null);
  return { title: 'Blink', node: shell(ctx, main, h('div', null, meBox(), suggestions(ctx), trendBox())) };
}
const trendScore = p => p.likes / Math.pow((worldNow() - toMs(p.date)) / 864e5 + 2, 1.2);
const trendingList = () => POSTS.slice().sort((a, b) => trendScore(b) - trendScore(a));
function trendBox() {
  const tags = ['#GiveUsBackTheWall', 'Doug', 'it\'s for later', 'Fawn Field', 'Port Wexley', 'Island Vows'];
  return h('div', { class: 'bk-box' }, h('h3', null, 'Trending topics'), tags.map(t => h('p', null, h('a', { href: 'findr.net/search?q=' + q(t.replace('#', '')) }, t))));
}
function trending(ctx) {
  const main = h('div', null, h('h2', { class: 'bk-h' }, 'Trending on Blink'), trendingList().slice(0, 25).map(p => postCard(p, ctx)));
  return { title: 'Trending | Blink', node: shell(ctx, main, h('div', null, me() ? meBox() : null, trendBox())) };
}
function postPage(id, ctx) {
  const p = POST[id] || allPosts().find(x => x.id === id);
  if (!p) return notFound(ctx);
  return { title: `${nameOf(p.u)} on Blink`, node: shell(ctx, h('div', null, postCard(p, ctx, { full: true })), h('div', null, isMe(p.u) ? meBox() : profileMini(p.u, ctx))) };
}
function profileMini(id, ctx) {
  const u = USERS[id];
  return h('div', { class: 'bk-box' }, h('a', { href: '/' + id }, avatarImg(id, 64, 'round')), h('a', { href: '/' + id, class: 'bk-pname' }, u.name), h('p', null, u.bio), me() ? followBtn(id, ctx) : null);
}

// ---- profiles -------------------------------------------------------------------------------------
function profile(id, tab, ctx) {
  const mineP = isMe(id);
  const u = mineP ? { name: me().name, bio: me().bio, location: me().location, joined: new Date(B().joinedAt).toISOString(), interests: [] } : USERS[id];
  const theme = mineP ? me().theme : USERS[id].vidder?.banner || '#7a4fd1';
  const posts = mineP ? allPosts().filter(p => p.u === 'me').sort((a, b) => toMs(b.date) - toMs(a.date)) : postsByUser[id] || [];
  const friends = mineP ? Object.keys(B().following) : BLINK_FRIENDS[id] || [];
  const followers = mineP ? myFollowers() : blinkFollowers(id);
  const photos = posts.filter(p => p.photo?.kind);
  const tabs = [['posts', 'Posts'], ['about', 'About'], ['following', 'Following'], ['followers', 'Followers'], ['photos', 'Photos']];
  let body;
  const personGrid = list => list.length ? h('div', { class: 'bk-people' }, list.map(f => h('div', { class: 'bk-person' }, h('a', { href: profileUrl(f) }, av(f, 72)), h('a', { href: profileUrl(f), class: 'bk-pname' }, nameOf(f))))) : h('p', { class: 'bk-empty' }, 'Nobody here yet.');
  if (tab === 'about') body = h('div', { class: 'bk-box bk-about' },
    h('h3', null, 'About'), u.bio ? h('p', null, u.bio) : null,
    u.location ? h('p', null, h('b', null, 'Lives in '), u.location) : null,
    u.joined ? h('p', null, h('b', null, 'Joined Blink '), longDate(u.joined)) : null,
    u.interests?.length ? h('p', null, h('b', null, 'Likes '), u.interests.join(', ')) : null,
    !mineP && presence(id).filter(x => x.site !== 'Blink').length ? [h('h3', null, 'Elsewhere'), presence(id).filter(x => x.site !== 'Blink').map(x => h('p', null, h('a', { href: x.url }, x.site + ' — ' + x.label)))] : null,
    mineP ? h('a', { href: '/settings', class: 'bk-btn' }, 'Edit profile') : null);
  else if (tab === 'following') body = personGrid(friends);
  else if (tab === 'followers') body = personGrid(followers);
  else if (tab === 'photos') body = photos.length ? h('div', { class: 'bk-photos' }, photos.map(p => h('a', { href: '/post/' + p.id }, h('img', { src: photo(p.id, p.photo.kind, p.photo.caption), alt: '' })))) : h('p', { class: 'bk-empty' }, 'No photos yet.');
  else body = h('div', null, mineP ? composer(ctx) : null, posts.length ? posts.map(p => postCard(p, ctx)) : h('p', { class: 'bk-empty' }, mineP ? 'You haven\'t posted anything yet. Say hello!' : 'No posts yet.'));
  const fCount = mineP ? followers.length : followerCount(id);
  const main = h('div', { class: 'bk-profile', style: { '--bk-t': theme } },
    h('div', { class: 'bk-cover' }),
    h('div', { class: 'bk-phero' }, av(id, 128, 'round ring big'), h('div', { class: 'bk-pinfo' }, h('h1', null, u.name), h('p', null, [u.location, u.joined ? 'Joined ' + new Date(toMs(u.joined)).getUTCFullYear() : ''].filter(Boolean).join(' · ')), h('p', { class: 'bk-counts' }, h('b', null, fmtNum(friends.length)), ' following · ', h('b', null, compact(fCount)), ' followers')),
      mineP ? h('a', { href: '/settings', class: 'bk-btn' }, 'Edit profile') : me() ? followBtn(id, ctx, false, () => ctx.reload()) : h('a', { href: '/', class: 'bk-btn' }, 'Sign up to follow')),
    h('div', { class: 'bk-tabs' }, tabs.map(([k, l]) => h('a', { href: profileUrl(id) + (k === 'posts' ? '' : '/' + k), class: k === tab ? 'on' : '' }, l))),
    body);
  const side = h('div', null,
    h('div', { class: 'bk-box' }, h('h3', null, 'Intro'), h('p', null, u.bio || 'No bio yet.'), !mineP && presence(id).filter(x => x.site !== 'Blink').map(x => h('p', { class: 'bk-small' }, h('a', { href: x.url }, 'Also on ' + x.site)))),
    photos.length ? h('div', { class: 'bk-box' }, h('h3', null, 'Photos'), h('div', { class: 'bk-mini' }, photos.slice(0, 6).map(p => h('a', { href: '/post/' + p.id }, h('img', { src: photo(p.id, p.photo.kind, p.photo.caption), alt: '' }))))) : null,
    friends.length ? h('div', { class: 'bk-box' }, h('h3', null, 'Following'), h('div', { class: 'bk-mini' }, friends.slice(0, 6).map(f => h('a', { href: profileUrl(f), title: nameOf(f) }, av(f, 64))))) : null);
  return { title: u.name + ' | Blink', node: shell(ctx, main, side) };
}

function settings(ctx) {
  const p = { ...me() };
  const preview = h('img', { class: 'av round ring big', width: 128, height: 128, alt: '' });
  const paintPrev = () => { preview.src = meAvatarUrl(p); };
  const name = h('input', { class: 'bk-in', value: p.name, maxlength: 40 });
  const bio = h('textarea', { class: 'bk-in', maxlength: 160 }, p.bio || '');
  const loc = h('input', { class: 'bk-in', value: p.location || '', maxlength: 40 });
  const kinds = h('div', { class: 'bk-chips' });
  const drawKinds = () => { clear(kinds); AV_KINDS.forEach(([k, l]) => kinds.append(h('button', { type: 'button', class: k === p.avKind ? 'on' : '', onclick: () => { p.avKind = k; drawKinds(); paintPrev(); } }, l))); };
  const bgs = h('div', { class: 'bk-swatches' }, ['#7fa8d1', '#b9d17f', '#d18f7f', '#c7a3d6', '#f2d16b', '#7fd1c1', '#9aa0a6', '#e8a0bf'].map(c => h('button', { type: 'button', style: { background: c }, 'aria-label': c, onclick: () => { p.avBg = c; paintPrev(); } })));
  const themes = h('div', { class: 'bk-swatches' }, THEMES.map(c => h('button', { type: 'button', style: { background: c }, 'aria-label': c, onclick: e => { p.theme = c; themes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } })));
  drawKinds(); paintPrev();
  const saved = h('span', { class: 'bk-saved' });
  const main = h('div', { class: 'bk-box bk-settings' }, h('h2', null, 'Edit your profile'),
    h('div', { class: 'bk-setgrid' },
      h('div', null, preview, h('p', null, h('b', null, 'Profile picture')), kinds, h('button', { type: 'button', class: 'bk-btn small', onclick: () => { p.avSeed = String(Math.floor(Math.random() * 1e6)); paintPrev(); } }, '🎲 Shuffle'), h('p', null, 'Background'), bgs),
      h('div', null, h('label', null, 'Name'), name, h('label', null, 'Bio'), bio, h('label', null, 'Location'), loc, h('label', null, 'Profile colour'), themes,
        h('div', { class: 'bk-crow end' }, saved, h('a', { href: '/me', class: 'bk-btn' }, 'Cancel'), h('button', { type: 'button', class: 'bk-btn primary', onclick: () => { if (!name.value.trim()) return name.focus(); patch('blink', () => ({ profile: { ...p, name: name.value.trim(), bio: bio.value.trim(), location: loc.value.trim() } })); saved.textContent = 'Saved ✓'; setTimeout(() => ctx.go('blink.social/me'), 400); } }, 'Save changes')))));
  return { title: 'Edit profile | Blink', node: shell(ctx, main, null) };
}

function notifPage(ctx) {
  const list = notifications();
  const lastRead = B().notifRead;
  setTimeout(() => patch('blink', () => ({ notifRead: worldNow() })), 0);
  const main = h('div', { class: 'bk-box' }, h('h2', null, 'Notifications'),
    list.length ? list.map(n => h('a', { href: n.href, class: 'bk-notif' + (n.at > lastRead ? ' new' : '') }, n.who ? avatarImg(n.who, 40, 'round') : h('span', { class: 'bk-nicon', html: FAV }), h('div', null, n.text, h('small', null, when(n.at))))) : h('p', { class: 'bk-empty' }, 'No notifications yet.'));
  return { title: 'Notifications | Blink', node: shell(ctx, main, h('div', null, meBox(), suggestions(ctx))) };
}

function find(ctx, query) {
  const welcome = ctx.route.query.get('welcome');
  const ql = query.toLowerCase();
  const list = blinkUsers().filter(id => !ql || (USERS[id].name + ' ' + id + ' ' + (USERS[id].location || '') + ' ' + USERS[id].bio).toLowerCase().includes(ql));
  const input = h('input', { class: 'bk-in', value: query, placeholder: 'Search by name, place or interest', onkeydown: e => { if (e.key === 'Enter') ctx.go('blink.social/find?q=' + q(input.value.trim())); } });
  const main = h('div', null,
    welcome ? h('div', { class: 'bk-box bk-welcome' }, h('h2', null, `Welcome to Blink, ${me()?.name.split(' ')[0] || ''}!`), h('p', null, 'Follow a few people to get your feed started. When you\'re done, head to your ', h('a', { href: '/' }, 'home feed'), '.')) : null,
    h('div', { class: 'bk-box' }, h('h2', null, query ? `People matching "${query}"` : 'Find people'), input),
    list.length ? h('div', { class: 'bk-findlist' }, list.map(id => h('div', { class: 'bk-box bk-findrow' }, h('a', { href: '/' + id }, avatarImg(id, 56, 'round')), h('div', null, h('a', { href: '/' + id, class: 'bk-pname' }, USERS[id].name), h('small', null, [USERS[id].location, USERS[id].bio].filter(Boolean).join(' · '))), me() ? followBtn(id, ctx) : null))) : h('p', { class: 'bk-empty' }, 'Nobody found. Try a different name.'));
  return { title: 'Find people | Blink', node: shell(ctx, main, me() ? meBox() : null) };
}

function notFound(ctx) {
  return { title: 'Page not found | Blink', node: shell(ctx, h('div', { class: 'bk-box bk-404' }, h('h2', null, 'This page isn\'t available'), h('p', null, 'The link may be broken, or the profile may have been removed.'), h('a', { href: '/', class: 'bk-btn' }, 'Go to Blink home')), null) };
}
