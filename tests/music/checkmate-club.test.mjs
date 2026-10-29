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
  assert.deepEqual(parseRoute('#/workshop/assets'), { screen: 'workshop', param: 'assets' });
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

test('checkmate club: the library lists every table and only finished games are playable', () => {
  const ids = GAMES.map(g => g.id);
  assert.deepEqual(ids, ['chess', 'poker', 'blackjack', 'solitaire']);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of GAMES) {
    assert.ok(g.name && g.tagline && g.glyph && g.players && g.rules.length, g.id);
    for (const s of g.rules) assert.ok(s.heading && s.items.length, `${g.id} rules`);
    assert.ok(CATEGORIES.some(([c]) => c === g.category));
  }
  // Only games with a working table may be marked playable.
  assert.deepEqual(GAMES.filter(isPlayable).map(g => g.id), ['chess']);
  for (const g of GAMES.filter(g => !isPlayable(g))) assert.match(statusLabel(g), /^In development · Stage \d+$/);
  assert.equal(statusLabel(getGame('chess')), 'Ready to play');
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

// ---------------------------------------------------------------- chess (stage 3)

const { Chess, perft, START_FEN, parseSquare, squareName } = await load('games/chess/engine.js');
const { ChessGame } = await load('games/chess/game.js');
const AI = await load('games/chess/ai.js');
const { sanitizeSetup } = await load('games/chess/table.js');
const { pieceSvg } = await load('games/chess/pieces.js');

const play = (c, ...sans) => { for (const s of sans) assert.ok(c.move(s), `illegal in test: ${s} at ${c.fen()}`); return c; };
const sq = parseSquare;

test('chess: move generation matches the standard perft counts', () => {
  const cases = [
    [START_FEN, [20, 400, 8902]],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039]],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812]],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486]],
    ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079]],
  ];
  for (const [fen, counts] of cases) {
    const c = new Chess(fen);
    counts.forEach((n, i) => assert.equal(perft(c, i + 1), n, `${fen} depth ${i + 1}`));
    assert.equal(c.fen(), fen, 'perft leaves the position unchanged');
  }
});

test('chess: FEN round-trips and bad FEN is rejected', () => {
  for (const fen of [START_FEN, '8/8/8/8/8/8/8/K6k b - - 12 40', 'r3k2r/8/8/3pP3/8/8/8/R3K2R w Kq d6 0 2']) assert.equal(new Chess(fen).fen(), fen);
  for (const bad of ['', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1', '8/8/8/8/8/8/8/8 w - - 0 1', 'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']) {
    assert.throws(() => new Chess(bad), bad);
  }
  assert.equal(squareName(0), 'a1'); assert.equal(squareName(63), 'h8'); assert.equal(sq('e4'), 28); assert.equal(sq('z9'), -1);
});

test('chess: castling, including every reason it is refused', () => {
  const c = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(c.move('O-O').san, 'O-O');
  assert.equal(c.get(sq('g1')), 6); assert.equal(c.get(sq('f1')), 4); assert.equal(c.get(sq('h1')), 0);
  assert.equal(c.move('O-O-O').san, 'O-O-O');
  assert.equal(c.get(sq('c8')), -6); assert.equal(c.get(sq('d8')), -4);
  c.undo(); c.undo();
  assert.equal(c.fen(), 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const kingside = fen => new Chess(fen).moves({ square: 'e1' }).some(m => m.flags.includes('k'));
  assert.equal(kingside('r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1'), false, 'no right');
  assert.equal(kingside('4k3/8/8/8/8/8/8/R3K1NR w KQ - 0 1'), false, 'blocked');
  assert.equal(kingside('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'), true);
  assert.equal(kingside('4k3/8/8/8/8/8/8/R3K2r w KQ - 0 1'), false, 'rook gone');
  assert.equal(kingside('4r1k1/8/8/8/8/8/8/4K2R w K - 0 1'), false, 'out of check');
  assert.equal(kingside('5rk1/8/8/8/8/8/8/4K2R w K - 0 1'), false, 'through check');
  assert.equal(kingside('6rk/8/8/8/8/8/8/4K2R w K - 0 1'), false, 'into check');
  // moving the king or rook, or losing the rook, removes the right
  const k = play(new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), 'Kf1', 'Ra7', 'Ke1', 'Rb7');
  assert.equal(k.fen().split(' ')[2], 'k');
  const cap = play(new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), 'Rxh8+');
  assert.equal(cap.fen().split(' ')[2], 'Qq');
});

test('chess: en passant only immediately, and never when it exposes the king', () => {
  const c = play(new Chess(), 'e4', 'a6', 'e5', 'd5');
  assert.equal(c.fen().split(' ')[3], 'd6');
  const ep = c.move('exd6');
  assert.equal(ep.san, 'exd6'); assert.ok(ep.flags.includes('e'));
  assert.equal(c.get(sq('d5')), 0, 'captured pawn removed');
  c.undo();
  assert.equal(c.get(sq('d5')), -1, 'undo restores the captured pawn');
  play(c, 'Nf3', 'h6');
  assert.equal(c.moves({ square: 'e5' }).some(m => m.to === sq('d6')), false, 'right expired');
  // a pinned pawn along the rank can't take en passant
  const pin = new Chess('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
  assert.equal(pin.moves({ square: 'e5' }).some(m => m.flags.includes('e')), false);
});

test('chess: promotion to each piece, with captures and check marks', () => {
  for (const [p, letter] of [['q', 'Q'], ['r', 'R'], ['b', 'B'], ['n', 'N']]) {
    const c = new Chess('1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const m = c.move({ from: 'a7', to: 'b8', promotion: p });
    assert.ok(m.san.startsWith(`axb8=${letter}`), m.san);
    assert.equal(Math.abs(c.get(sq('b8'))), ' pnbrqk'.indexOf(p));
  }
  const c = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(c.moves({ square: 'a7' }).length, 4);
  assert.equal(c.move({ from: 'a7', to: 'a8' }).san, 'a8=Q+', 'queen by default, gives check');
});

test('chess: SAN disambiguation and checkmate notation', () => {
  const c = new Chess('4k3/8/8/8/8/8/1N3N2/4K3 w - - 0 1');
  assert.equal(c.san(c.moves().find(m => m.from === sq('b2') && m.to === sq('d3'))), 'Nbd3');
  const r = new Chess('4k3/8/8/R7/8/8/8/R3K3 w - - 0 1');
  assert.equal(r.san(r.moves().find(m => m.from === sq('a1') && m.to === sq('a3'))), 'R1a3');
  assert.equal(play(new Chess(), 'f3', 'e5', 'g4').move('Qh4').san, 'Qh4#');
});

test('chess: every game-ending rule', () => {
  const st = fen => new Chess(fen).status();
  assert.deepEqual([st('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').reason, st('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').result], ['stalemate', '1/2-1/2']);
  assert.deepEqual([st('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1').reason, st('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1').result], ['checkmate', '1-0']);
  assert.equal(st('6Qk/8/6K1/8/8/8/8/8 b - - 0 1').over, false, 'king can take an unprotected queen');
  for (const fen of ['8/8/8/4k3/8/8/8/4K3 w - - 0 1', '8/8/8/4k3/8/8/8/4KN2 w - - 0 1', '8/8/8/4k3/8/8/8/4KB2 w - - 0 1', '8/8/2b5/4k3/8/8/8/4KB2 w - - 0 1']) {
    assert.equal(st(fen).reason, 'insufficient-material', fen);
  }
  for (const fen of ['8/8/3b4/4k3/8/8/8/4KB2 w - - 0 1', '8/8/8/4k3/8/8/8/3NKN2 w - - 0 1', '8/8/8/4k3/8/8/P7/4K3 w - - 0 1', '8/8/8/4k3/8/8/8/4KR2 w - - 0 1']) {
    assert.equal(st(fen).over, false, `mate still possible: ${fen}`);
  }
  // threefold repetition
  const r = new Chess();
  play(r, 'Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1');
  assert.equal(r.status().over, false);
  play(r, 'Ng8');
  assert.deepEqual([r.status().reason, r.repetitions()], ['threefold-repetition', 3]);
  r.undo();
  assert.equal(r.status().over, false, 'undo forgets the repetition');
  // fifty-move rule: the 100th quiet half-move ends it, a pawn move or capture resets the count
  const f = new Chess('8/8/8/4k3/8/8/8/R3K3 w - - 99 80');
  play(f, 'Ra2');
  assert.equal(f.status().reason, 'fifty-move-rule');
  const g = new Chess('8/8/8/4k3/8/8/P7/R3K3 w - - 99 80');
  play(g, 'a3');
  assert.equal(g.halfmove, 0); assert.equal(g.status().over, false);
});

test('chess: the game controller handles modes, undo, resignation, draws and illegal-move messages', () => {
  const g = new ChessGame({ mode: 'local' });
  assert.equal(g.canUndo(), false);
  g.play({ from: 'e2', to: 'e4' });
  assert.equal(g.play({ from: 'e2', to: 'e4' }), null, 'no piece there now');
  assert.match(g.explainIllegal(sq('d2'), sq('d4')), /Black’s turn/);
  assert.match(g.explainIllegal(sq('b8'), sq('b6')), /can’t move from b8 to b6/);
  assert.equal(g.undo(), 1);
  assert.equal(g.chess.fen(), START_FEN);
  const pinned = new ChessGame({ mode: 'local', fen: '4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1' });
  assert.match(pinned.explainIllegal(sq('e2'), sq('d3')), /leave your king in check/);
  const checked = new ChessGame({ mode: 'local', fen: '4r1k1/8/8/8/8/8/3P4/4K3 w - - 0 1' });
  assert.match(checked.explainIllegal(sq('d2'), sq('d3')), /in check/);

  const a = new ChessGame({ mode: 'ai', human: 'w' });
  a.play({ from: 'e2', to: 'e4' });
  assert.equal(a.isComputerTurn(), true); assert.equal(a.isHumanTurn(), false);
  a.play({ from: 'e7', to: 'e5' });
  assert.equal(a.undo(), 2, 'takes back the reply and the move');
  assert.equal(a.moveList.length, 0);
  const b = new ChessGame({ mode: 'ai', human: 'b' });
  b.play({ from: 'e2', to: 'e4' });
  assert.equal(b.canUndo(), false, 'nothing of the person’s to take back');
  b.play({ from: 'e7', to: 'e5' }); b.play({ from: 'g1', to: 'f3' });
  assert.equal(b.undo(), 2); assert.equal(b.turn, 'b');

  const r = new ChessGame({ mode: 'ai', human: 'w' });
  r.play({ from: 'e2', to: 'e4' });
  assert.deepEqual(r.resign('w'), { result: '0-1', reason: 'resignation', winner: 'b', resigned: 'w' });
  assert.equal(r.outcomeFor(), 'loss'); assert.equal(r.canUndo(), false);
  assert.equal(r.play({ from: 'e7', to: 'e5' }), null, 'no moves after the end');
  const d = new ChessGame({ mode: 'local' });
  d.agreeDraw();
  assert.equal(d.outcomeFor('w'), 'draw');
  const m = new ChessGame({ mode: 'ai', human: 'b' });
  for (const [f, t] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) m.play({ from: f, to: t });
  assert.deepEqual([m.ended.reason, m.outcomeFor()], ['checkmate', 'win']);
  assert.deepEqual(m.history(), [{ n: 1, white: 'f3', black: 'e5' }, { n: 2, white: 'g4', black: 'Qh4#' }]);
  assert.deepEqual(new ChessGame({ mode: 'local', fen: '4k3/8/8/8/8/8/8/4K2R b K - 3 20' }).history(), []);
  const cap = new ChessGame({ mode: 'local' });
  for (const [f, t] of [['e2', 'e4'], ['d7', 'd5'], ['e4', 'd5']]) cap.play({ from: f, to: t });
  assert.deepEqual(cap.captured(), { w: [1], b: [] });
});

test('chess: setup choices are validated', () => {
  assert.deepEqual(sanitizeSetup(null), { mode: 'ai', color: 'w', level: 'casual' });
  assert.deepEqual(sanitizeSetup({ mode: 'local', color: 'random', level: 'master' }), { mode: 'local', color: 'random', level: 'master' });
  assert.deepEqual(sanitizeSetup({ mode: 'online', color: 'green', level: 'god' }), { mode: 'ai', color: 'w', level: 'casual' });
});

test('chess: every computer level plays legal moves, takes a mate in one and a free queen', () => {
  assert.deepEqual(AI.LEVELS.map(l => l.id), ['beginner', 'casual', 'club', 'master']);
  const fast = { now: (() => { let t = 0; return () => (t += 1); })() }; // deterministic clock, no time-outs at these depths
  const mate = new Chess('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
  for (const l of AI.LEVELS) {
    const m = AI.chooseMove(mate, l.id, { rng: () => 0.01 });
    assert.deepEqual([squareName(m.from), squareName(m.to)], ['h5', 'f7'], l.id);
  }
  const queen = new Chess('rnb1kbnr/pppp1ppp/8/4p1q1/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3');
  for (const id of ['casual', 'club']) {
    const m = AI.chooseMove(queen, id, { rng: () => 0.5, ...fast });
    assert.equal(squareName(m.to), 'g5', `${id} takes the queen`);
  }
  // random self-play: every move a level picks is legal
  const c = new Chess();
  for (let i = 0; i < 40 && !c.status().over; i++) {
    const m = AI.chooseMove(c, i % 2 ? 'beginner' : 'casual');
    assert.ok(c.move(m), `illegal computer move at ${c.fen()}`);
  }
  assert.equal(AI.chooseMove(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), 'club'), null, 'no move in stalemate');
  assert.equal(AI.acceptsDraw(new Chess('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'), 'b'), true, 'losing side accepts');
  assert.equal(AI.acceptsDraw(new Chess('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'), 'w'), false, 'winning side declines');
  assert.ok(AI.evaluate(new Chess()) === 0, 'start position is level');
});

test('chess: procedural pieces exist for every piece and colour', () => {
  for (const c of 'wb') for (const t of 'kqrbnp') assert.match(pieceSvg(c, t), /^<svg[^>]+viewBox="0 0 100 100"/);
});

// ---------------------------------------------------------------- cards (stage 4)

const D = await load('cards/deck.js');
const { chipBreakdown } = await load('cards/view.js');

test('cards: a standard deck has 52 unique cards, jokers and shoes are configurable', () => {
  const deck = D.createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(c => c.id)).size, 52);
  for (const s of D.SUITS) assert.equal(deck.filter(c => c.suit === s.id).length, 13);
  for (const r of D.RANKS) assert.equal(deck.filter(c => c.rank === r.id).length, 4);
  assert.equal(D.createDeck({ jokers: 2 }).filter(c => c.joker).length, 2);
  const shoe = D.createDeck({ decks: 6 });
  assert.equal(shoe.length, 312); assert.equal(new Set(shoe.map(c => c.id)).size, 312);
  assert.ok(Object.isFrozen(deck[0]));
  assert.equal(D.cardName(D.makeCard('Q', 'h')), 'Queen of hearts');
  assert.equal(D.shortName(D.makeCard('10', 's')), '10♠');
  assert.equal(D.isRed(D.makeCard('A', 'd')), true); assert.equal(D.isRed(D.makeCard('A', 'c')), false);
});

test('cards: the shuffle is a permutation, reproducible when seeded and statistically uniform', () => {
  const deck = D.createDeck();
  const a = D.shuffle(deck, D.seededRandom(42)), b = D.shuffle(deck, D.seededRandom(42)), c = D.shuffle(deck, D.seededRandom(43));
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id));
  assert.notDeepEqual(a.map(x => x.id), c.map(x => x.id));
  assert.deepEqual([...a].sort((x, y) => x.id.localeCompare(y.id)), [...deck].sort((x, y) => x.id.localeCompare(y.id)));
  assert.equal(deck[0].id, 'As', 'input untouched');
  // Each card should land in each position equally often: chi-square on 4 cards x 52 positions.
  const rng = D.seededRandom(2024), N = 20800, watch = ['As', 'Kh', '7d', '2c'];
  for (const id of watch) {
    const counts = new Array(52).fill(0);
    for (let i = 0; i < N / 4; i++) counts[D.shuffle(deck, rng).findIndex(x => x.id === id)]++;
    const e = N / 4 / 52, chi = counts.reduce((s, n) => s + (n - e) ** 2 / e, 0);
    assert.ok(chi < 90, `${id} chi-square ${chi.toFixed(1)} (51 df; p < 0.001 above ~87)`);
  }
  const r = D.cryptoRandom();
  assert.ok(r >= 0 && r < 1);
});

test('cards: the table never duplicates or loses a card across thousands of operations', () => {
  const players = ['a', 'b', 'c'];
  const t = new D.CardTable({ players, jokers: 2, rng: D.seededRandom(9) });
  t.shuffleDeck();
  assert.equal(t.deal(players, 7), true);
  assert.deepEqual(players.map(p => t.hands[p].size), [7, 7, 7]);
  const rng = D.seededRandom(1);
  for (let i = 0; i < 3000; i++) {
    const p = players[i % 3];
    const roll = rng();
    if (roll < 0.45) t.draw(p);
    else if (roll < 0.9 && t.hands[p].size) t.discard(p, t.hands[p].cards[Math.floor(rng() * t.hands[p].size)].id);
    else if (roll < 0.95) t.recycleDiscard();
    else { t.collect(); t.shuffleDeck(); t.deal(players, 3); }
    if (i % 250 === 0) assert.equal(t.audit().ok, true, `step ${i}`);
  }
  assert.deepEqual(t.audit(), { ok: true, total: 54, expected: 54, duplicates: [], missing: [], extra: [] });
  assert.throws(() => t.move('a', 'b', 'nope'));
  assert.throws(() => t.place('table-leg'));
});

test('cards: dealing is round-robin, draws recycle the discard pile but keep its top card', () => {
  const t = new D.CardTable({ players: ['x', 'y'] });
  const order = t.piles.deck.cards.slice().reverse().map(c => c.id); // top of the deck first
  t.deal(['x', 'y'], 2);
  assert.deepEqual(t.hands.x.cards.map(c => c.id), [order[0], order[2]]);
  assert.deepEqual(t.hands.y.cards.map(c => c.id), [order[1], order[3]]);
  while (!t.piles.deck.empty) t.move('deck', 'discard');
  const top = t.piles.discard.top().id;
  const got = t.draw('x', 2);
  assert.equal(got.length, 2);
  assert.equal(t.piles.discard.size, 1); assert.equal(t.piles.discard.top().id, top);
  assert.equal(t.draw('x', 100, { reshuffle: false }).length, 45); // 48 discarded, 1 kept on top, 2 drawn
  assert.equal(t.draw('y', 1, { reshuffle: false }).length, 0);
  assert.equal(t.audit().ok, true);
});

test('cards: a player view hides every other hand and face-down pile', () => {
  const t = new D.CardTable({ players: ['me', 'them'] });
  t.shuffleDeck(); t.deal(['me', 'them'], 5); t.discard('them', t.hands.them.cards[0].id);
  const v = t.view('me');
  assert.equal(v.hands.me.cards.length, 5);
  assert.deepEqual(v.hands.them, { size: 4, cards: null });
  assert.equal(v.piles.deck.cards, null); assert.equal(v.piles.deck.top, null);
  assert.equal(v.piles.discard.top.id, t.piles.discard.top().id, 'face-up discard is public');
  assert.ok(!JSON.stringify(v.hands.them).includes('"id"'));
  v.hands.me.cards.pop();
  assert.equal(t.hands.me.size, 5, 'views are copies');
});

test('cards: turn order, dealer rotation, elimination and match tracking', () => {
  const o = new D.TurnOrder(['n', 'e', 's', 'w'], { dealer: 0 });
  assert.equal(o.current, 'e', 'play starts left of the dealer');
  assert.deepEqual([o.next(), o.next(), o.next(), o.next()], ['s', 'w', 'n', 'e']);
  o.reverse();
  assert.equal(o.next(), 'n');
  o.reverse();
  o.eliminate('s');
  assert.deepEqual([o.next(), o.next(), o.next()], ['e', 'w', 'n']);
  assert.equal(o.rotateDealer(), 'e'); assert.equal(o.current, 'w', 'skips the eliminated seat');
  assert.throws(() => new D.TurnOrder([]));
  const m = new D.MatchTracker(['a', 'b'], { target: 3 });
  m.record({ winner: 'a', scores: { a: 2 } });
  assert.equal(m.over(), false); assert.equal(m.round, 2); assert.equal(m.leader(), 'a');
  m.record({ winner: 'b', scores: { b: 2 } });
  assert.equal(m.leader(), null, 'tied');
  m.record({ winner: 'b', scores: { b: 1, ghost: 5 } });
  assert.equal(m.over(), true); assert.deepEqual(m.totals, { a: 2, b: 3 });
  assert.equal(new D.MatchTracker(['a'], { maxRounds: 1 }).record({}).n, 1);
});

test('cards: chip amounts break into denominations', () => {
  assert.deepEqual(chipBreakdown(186), [100, 25, 25, 25, 10, 1]);
  assert.deepEqual(chipBreakdown(0), []);
  assert.equal(chipBreakdown(10000).length, 12, 'capped for display');
});

// ---------------------------------------------------------------- assets (stage 2)

const { Assets } = await load('core/assets.js');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));

test('assets: the manifest documents every ForgeGUI asset and its sets', () => {
  assert.ok(manifest.assets.length >= 40);
  const ids = manifest.assets.map(a => a.id), files = manifest.assets.map(a => a.file);
  assert.equal(new Set(ids).size, ids.length); assert.equal(new Set(files).size, files.length);
  for (const a of manifest.assets) {
    assert.ok(a.use && /\.webp$/.test(a.file) && a.process, a.id);
    assert.ok(['generated', 'outcome_unknown', 'failed'].includes(a.status), `${a.id} status`);
    assert.match(a.source.job_id, /^[0-9a-f-]{36}$/, `${a.id} job`);
    if (a.status === 'generated') assert.ok(a.source.url && a.source.artifact_ref, `${a.id} url`);
    if (a.downloaded) assert.ok(fs.existsSync(path.join(root, 'assets', a.file)) && a.width && a.height, `${a.id} file`);
  }
  for (const members of Object.values(manifest.sets)) for (const id of members) assert.ok(ids.includes(id), id);
  assert.equal(manifest.style.id.length, 36);
});

test('assets: lookups fall back unless downloaded, and sets are all-or-nothing', async () => {
  const m = { assets: [
    { id: 'a', file: 'x/a.webp', downloaded: true }, { id: 'b', file: 'x/b.webp', downloaded: false }, { id: 'c', file: 'x/c.webp', downloaded: true },
  ], sets: { full: ['a', 'c'], partial: ['a', 'b'] } };
  const a = new Assets(m);
  assert.equal(a.url('a'), 'assets/x/a.webp'); assert.equal(a.url('b'), null); assert.equal(a.url('zzz'), null);
  assert.equal(a.setReady('full'), true); assert.equal(a.setReady('partial'), false); assert.equal(a.setReady('nope'), false);
  assert.equal(a.setUrl('partial', 'a'), null, 'a partial set never mixes in');
  a.markBroken('c');
  assert.equal(a.setReady('full'), false);
  assert.deepEqual(a.summary(), { total: 3, downloaded: 1, generated: 0, pending: 0, failed: 0 });
  const loaded = await new Assets().load(async () => ({ ok: true, json: async () => m }));
  assert.equal(loaded.has('a'), true);
  const offline = await new Assets().load(async () => { throw new Error('offline'); });
  assert.equal(offline.url('a'), null);
  class Img { set src(v) { setTimeout(() => (v.endsWith('a.webp') ? this.onload() : this.onerror())); } }
  const p = new Assets(m);
  await p.preload(['a', 'c'], Img);
  assert.deepEqual([p.has('a'), p.has('c')], [true, false]);
});

test('checkmate club: settings include the chess and card options', () => {
  const s = sanitizeSettings({ chessBoard: 'contrast', chessHints: false, cardBack: 'midnight' });
  assert.deepEqual([s.chessBoard, s.chessHints, s.chessCoordinates, s.cardBack], ['contrast', false, true, 'midnight']);
  assert.equal(sanitizeSettings({ chessBoard: 'plaid', cardBack: 'tartan' }).chessBoard, 'walnut');
});
