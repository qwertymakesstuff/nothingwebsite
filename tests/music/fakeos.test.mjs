import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../fakeos/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { normalize, parse, resolveHref, looksLikeUrl } = await load('net/router.js');
const { validateContent, pageExists } = await load('net/linkcheck.js');
const { search, buildIndex, didYouMean } = await load('net/search.js');
const { VIDEOS, THREADS, POSTS, USERS } = await load('content/index.js');
const { migrate, freshSave } = await load('os/state.js');

test('every fakeos module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 25, `expected many modules, got ${files.length}`);
  for (const f of files) assert.equal(spawnSync(process.execPath, ['--check', f]).status, 0, f);
});

test('addresses normalise the way a browser would', () => {
  assert.equal(normalize('HTTP://WWW.Vidder.TV/'), 'vidder.tv');
  assert.equal(normalize('https://threadit.com/c/lostmedia/'), 'threadit.com/c/lostmedia');
  assert.equal(normalize('vidder.tv/watch?v=abc'), 'vidder.tv/watch?v=abc');
  assert.equal(normalize('skylark:history'), 'skylark://history');
  const r = parse('vidder.tv/watch?v=mXq7Rt2Lk9a&list=PLdoug#c');
  assert.equal(r.host, 'vidder.tv'); assert.deepEqual(r.segs, ['watch']);
  assert.equal(r.query.get('v'), 'mXq7Rt2Lk9a'); assert.equal(r.query.get('list'), 'PLdoug'); assert.equal(r.hash, 'c');
});

test('relative links resolve against the page they are on', () => {
  assert.equal(resolveHref('/watch?v=x', 'vidder.tv/channel/y'), 'vidder.tv/watch?v=x');
  assert.equal(resolveHref('?sort=new', 'threadit.com/c/meta'), 'threadit.com/c/meta?sort=new');
  assert.equal(resolveHref('blink.social/maxplaysstuff', 'findr.net'), 'blink.social/maxplaysstuff');
  assert.equal(resolveHref('#', 'findr.net'), null);
});

test('the address bar tells searches from addresses', () => {
  assert.ok(looksLikeUrl('vidder.tv')); assert.ok(looksLikeUrl('threadit.com/c/meta')); assert.ok(looksLikeUrl('http://foo.bar'));
  assert.ok(!looksLikeUrl('toaster review')); assert.ok(!looksLikeUrl('doug')); assert.ok(!looksLikeUrl('it\'s for later'));
});

test('content has no broken links, missing people, duplicate ids or bad relationships', () => {
  assert.deepEqual(validateContent(), []);
});

test('content meets the first-build targets', () => {
  assert.ok(VIDEOS.length >= 30, 'videos ' + VIDEOS.length);
  assert.ok(THREADS.length >= 40, 'threads ' + THREADS.length);
  assert.ok(POSTS.length >= 40, 'posts ' + POSTS.length);
  const docs = buildIndex();
  assert.ok(docs.length >= 100, 'searchable pages ' + docs.length);
  for (const d of docs) assert.ok(pageExists(d.url), 'search result points at a missing page: ' + d.url);
});

test('people appear across several sites', () => {
  const multi = Object.values(USERS).filter(u => u.on.length >= 2);
  assert.ok(multi.length >= 15, 'cross-site people ' + multi.length);
});

test('search ranks relevant pages and suggests spellings', () => {
  assert.match(search('toaster')[0].url, /pruitt|prT0|prB|prC|prR|r5sm/);
  assert.equal(search('lantern tape')[0].url, 'threadit.com/c/lostmedia/t/l1an');
  assert.ok(search('doug', { type: 'video' }).every(d => d.type === 'video'));
  assert.ok(['toast', 'toaster'].includes(didYouMean('toastr')));
  assert.equal(didYouMean('lantren tape'), 'lantern tape');
});

test('pages that should not exist are reported missing', () => {
  assert.ok(!pageExists('vidder.tv/watch?v=nope'));
  assert.ok(!pageExists('threadit.com/c/lostmedia/t/r1bp'));
  assert.ok(!pageExists('blink.social/hollowfrequency'));
  assert.ok(!pageExists('example.com'));
});

test('old saves gain new fields without losing data', () => {
  const old = { firstBoot: 5, settings: { wallpaper: 'dusk' }, browser: { bookmarks: [{ id: 'x', title: 'X', url: 'vidder.tv' }] } };
  const m = migrate(old);
  assert.equal(m.firstBoot, 5); assert.equal(m.settings.wallpaper, 'dusk'); assert.equal(m.settings.accent, freshSave().settings.accent);
  assert.equal(m.browser.bookmarks.length, 1); assert.deepEqual(m.vidder.subs, {}); assert.deepEqual(m.blink.posts, []);
  assert.deepEqual(migrate(null).settings, freshSave().settings);
});

test('the media catalogue covers the game and only names things that exist', async () => {
  const A = await import(new URL('../../tools/fakeos-media/assets.mjs', import.meta.url));
  const { imageJobs } = await import(new URL('../../tools/fakeos-media/lib.mjs', import.meta.url));
  const { VIDEO, POST, THREADS, USERS: U } = await load('content/index.js');
  const authors = new Set([...THREADS.map(t => t.u), ...Object.keys(U)]);
  const skip = new Set(['hollowfrequency', 'q_mardell', 'vidder']);
  for (const id of Object.keys(U)) if (!skip.has(id)) assert.ok(A.PEOPLE[id], `no avatar prompt for ${id}`);
  for (const id of Object.keys(A.PEOPLE)) assert.ok(authors.has(id), `avatar prompt for unknown person ${id}`);
  for (const p of POSTS) if (p.photo?.kind) assert.ok(A.PHOTOS[p.id], `no photo prompt for post ${p.id}`);
  for (const id of Object.keys(A.PHOTOS)) assert.ok(POST[id]?.photo, `photo prompt for post without a photo: ${id}`);
  for (const v of VIDEOS) assert.ok(A.THUMBS[v.id], `no thumbnail prompt for ${v.id}`);
  for (const id of [...Object.keys(A.THUMBS), ...Object.keys(A.VIDEO_JOBS)]) assert.ok(VIDEO[id], `media for unknown video ${id}`);
  for (const [id, j] of Object.entries(A.VIDEO_JOBS)) { assert.ok(['full', 'loop'].includes(j.mode), id); if (j.who) assert.ok(A.PEOPLE[j.who], `${id} features unknown ${j.who}`); }
  for (const id of Object.keys(A.BANNERS)) assert.ok(U[id]?.on.includes('vidder'), `banner for non-channel ${id}`);
  const files = imageJobs().map(j => j.file);
  assert.equal(new Set(files).size, files.length, 'duplicate image file names');
  for (const j of imageJobs()) assert.match(j.prompt, /--ar \d+:\d+/, j.file);
});

test('the media list the game reads is valid', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../../fakeos/media/manifest.json', import.meta.url), 'utf8'));
  for (const k of ['avatars', 'photos', 'thumbs', 'banners', 'wallpapers', 'videos']) assert.equal(typeof m[k], 'object', k);
  for (const [kind, list] of Object.entries(m)) if (typeof list === 'object') for (const v of Object.values(list)) {
    const f = typeof v === 'string' ? v : v.file;
    assert.ok(fs.existsSync(new URL('../../fakeos/media/' + f, import.meta.url)), `manifest lists missing ${kind} file ${f}`);
  }
});
