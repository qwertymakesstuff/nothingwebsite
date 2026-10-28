import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../checkmate-club/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { Store, memoryStorage, KEYS } = await load('core/storage.js');
const { Settings, SCHEMA, DEFAULTS, sanitizeSettings } = await load('core/settings.js');
const { Stats, applyResult, emptyRecord, sanitizeStats } = await load('core/stats.js');
const { parseRoute, routeHash, Router } = await load('core/router.js');
const { GameTimer, formatTime } = await load('core/timer.js');
const { GAMES, getGame, isPlayable, statusLabel, gamesIn, CATEGORIES } = await load('core/registry.js');

const root = new URL('../../checkmate-club/', import.meta.url).pathname;
const jsFiles = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? jsFiles(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);

test('checkmate club: every module parses and the whole import graph resolves', async () => {
  for (const f of jsFiles(path.join(root, 'js'))) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
  const { App } = await load('app.js'); // pulls in every screen and component
  assert.equal(typeof App, 'function');
});

test('checkmate club: settings fall back to defaults and reject bad values', () => {
  assert.deepEqual(sanitizeSettings(null), DEFAULTS);
  const s = sanitizeSettings({ animationSpeed: 'warp', reduceMotion: 'yes', sfxVolume: 7, tableFelt: 'blue', playerName: '   ', confirmLeave: false, bogus: 1 });
  assert.equal(s.animationSpeed, 'normal');
  assert.equal(s.reduceMotion, false);
  assert.equal(s.sfxVolume, 1);
  assert.equal(s.tableFelt, 'blue');
  assert.equal(s.playerName, 'Guest');
  assert.equal(s.confirmLeave, false);
  assert.ok(!('bogus' in s));
  assert.equal(sanitizeSettings({ playerName: '  Ada   Lovelace the first of many  ' }).playerName, 'Ada Lovelace the');
  assert.equal(sanitizeSettings({ sfxVolume: 0.33 }).sfxVolume, 0.3);
  for (const o of SCHEMA) assert.ok(o.section && o.label && o.key in DEFAULTS, o.key);
});

test('checkmate club: settings persist, notify and reset', () => {
  const storage = memoryStorage();
  const a = new Settings(new Store(storage));
  const seen = [];
  a.on((k, v) => seen.push([k, v]));
  assert.equal(a.set('tableFelt', 'red'), true);
  assert.equal(a.set('nope', 1), false);
  a.set('sfxVolume', 0.4);
  a.set('tableFelt', 'red'); // unchanged: no event
  assert.deepEqual(seen, [['tableFelt', 'red'], ['sfxVolume', 0.4]]);
  const b = new Settings(new Store(storage));
  assert.equal(b.get('tableFelt'), 'red');
  assert.equal(b.get('sfxVolume'), 0.4);
  b.reset();
  assert.deepEqual(new Settings(new Store(storage)).all(), DEFAULTS);
});

test('checkmate club: corrupt storage never breaks loading', () => {
  const storage = memoryStorage();
  storage.setItem(KEYS.settings, '{not json');
  storage.setItem(KEYS.stats, '"a string"');
  const store = new Store(storage);
  assert.deepEqual(new Settings(store).all(), DEFAULTS);
  assert.deepEqual(new Stats(store).totals(), { played: 0, wins: 0, losses: 0, draws: 0, bestStreak: 0, totalTime: 0 });
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const s = new Settings(new Store(throwing));
  assert.equal(s.set('reduceMotion', true), true); // keeps working in memory
  assert.equal(s.get('reduceMotion'), true);
});

test('checkmate club: results update records, streaks and bests', () => {
  let r = emptyRecord();
  r = applyResult(r, { result: 'win', time: 300, score: 40, at: 1 });
  r = applyResult(r, { result: 'win', time: 200, score: 10, at: 2 });
  r = applyResult(r, { result: 'win', time: 250, at: 3 });
  assert.equal(r.streak, 3);
  r = applyResult(r, { result: 'draw', time: 100, at: 4 });
  r = applyResult(r, { result: 'loss', at: 5 });
  r = applyResult(r, { result: 'win', time: 999, at: 6 });
  assert.deepEqual(
    { played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, streak: r.streak, bestStreak: r.bestStreak, bestTime: r.bestTime, bestScore: r.bestScore, totalTime: r.totalTime, lastPlayed: r.lastPlayed },
    { played: 6, wins: 4, losses: 1, draws: 1, streak: 1, bestStreak: 3, bestTime: 200, bestScore: 40, totalTime: 1849, lastPlayed: 6 });
  assert.throws(() => applyResult(r, { result: 'forfeit' }));
});

test('checkmate club: statistics persist per game and sanitise bad records', () => {
  const storage = memoryStorage();
  const a = new Stats(new Store(storage));
  a.record('chess', { result: 'win', time: 60 });
  a.record('blackjack', { result: 'loss' });
  const b = new Stats(new Store(storage));
  assert.equal(b.get('chess').wins, 1);
  assert.equal(b.get('blackjack').losses, 1);
  assert.equal(b.get('poker').played, 0);
  assert.deepEqual({ ...b.totals() }, { played: 2, wins: 1, losses: 1, draws: 0, bestStreak: 1, totalTime: 60 });
  b.reset();
  assert.equal(new Stats(new Store(storage)).totals().played, 0);
  const clean = sanitizeStats({ games: { chess: { played: -3, wins: 2.5, streak: 4, bestStreak: 1, bestTime: 'fast' }, 'BAD ID!': {} } });
  assert.deepEqual(Object.keys(clean.games), ['chess']);
  assert.equal(clean.games.chess.played, 0);
  assert.equal(clean.games.chess.wins, 0);
  assert.equal(clean.games.chess.bestStreak, 4);
  assert.equal(clean.games.chess.bestTime, null);
});

test('checkmate club: routes parse, round-trip and fall back safely', () => {
  assert.deepEqual(parseRoute(''), { screen: 'menu', param: null });
  assert.deepEqual(parseRoute('#/library'), { screen: 'library', param: null });
  assert.deepEqual(parseRoute('#/game/chess'), { screen: 'game', param: 'chess' });
  assert.deepEqual(parseRoute('#/game'), { screen: 'library', param: null });
  assert.deepEqual(parseRoute('#/rules'), { screen: 'rules', param: null });
  assert.deepEqual(parseRoute('#/settings/extra'), { screen: 'settings', param: null });
  assert.deepEqual(parseRoute('#/nowhere'), { screen: 'menu', param: null });
  for (const r of [{ screen: 'game', param: 'poker' }, { screen: 'stats', param: null }, { screen: 'rules', param: 'a b' }]) {
    assert.deepEqual(parseRoute(routeHash(r)), r);
  }
  const listeners = {};
  const win = { location: { hash: '' }, addEventListener: (t, f) => { listeners[t] = f; } };
  const router = new Router(win);
  const seen = [];
  router.on(r => seen.push(r.screen));
  router.go('stats');
  assert.equal(win.location.hash, '#/stats');
  listeners.hashchange();
  router.go('stats'); // same hash: still re-shows
  assert.deepEqual(seen, ['stats', 'stats']);
});

test('checkmate club: the game timer pauses, resumes and formats', () => {
  let now = 0;
  const t = new GameTimer(() => now);
  t.start(); now = 5000;
  assert.equal(t.elapsed(), 5);
  t.pause(); now = 60000;
  assert.equal(t.elapsed(), 5);
  t.start(); now = 65500;
  assert.equal(t.elapsed(), 10);
  t.reset();
  assert.equal(t.elapsed(), 0);
  assert.equal(t.running, false);
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3725), '1:02:05');
});

test('checkmate club: the library lists every table and advertises none as playable yet', () => {
  const ids = GAMES.map(g => g.id);
  assert.deepEqual(ids, ['chess', 'poker', 'blackjack', 'solitaire']);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of GAMES) {
    assert.ok(g.name && g.tagline && g.glyph && g.players && g.rules.length, g.id);
    for (const s of g.rules) assert.ok(s.heading && s.items.length, `${g.id} rules`);
    // Stage 1: nothing is playable yet, so nothing may claim to be.
    assert.equal(isPlayable(g), false, g.id);
    assert.match(statusLabel(g), /^In development · Stage \d+$/);
    assert.ok(CATEGORIES.some(([c]) => c === g.category));
  }
  assert.equal(getGame('chess').name, 'Chess');
  assert.equal(getGame('nope'), null);
  assert.deepEqual(gamesIn('board').map(g => g.id), ['chess']);
  assert.equal(gamesIn('all').length, GAMES.length);
});

test('checkmate club: the page loads its stylesheet and entry module', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const ref of [...html.matchAll(/(?:href|src)="([^":#]+)"/g)].map(m => m[1])) {
    assert.ok(fs.existsSync(path.join(root, ref)), ref);
  }
  assert.match(html, /<div id="view">/);
});
