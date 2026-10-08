import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeEngine } from '../../music/js/player/youtubeEngine.js';

/** A fake of YT.Player: records calls, lets the test drive state changes. */
function fakeYT({ failCreate = false } = {}) {
  const made = { players: [] };
  class Player {
    constructor(container, cfg) {
      if (failCreate) throw new Error('boom');
      this.cfg = cfg; this.container = container; this.calls = []; this.t = 0; this.d = 200; this.vol = null;
      made.players.push(this);
      setTimeout(() => cfg.events.onReady({}), 5);
    }
    loadVideoById(a) { this.calls.push(['load', a]); }
    cueVideoById(a) { this.calls.push(['cue', a]); }
    playVideo() { this.calls.push(['play']); }
    pauseVideo() { this.calls.push(['pause']); }
    stopVideo() { this.calls.push(['stop']); }
    seekTo(t, a) { this.t = t; this.calls.push(['seek', t, a]); }
    setVolume(v) { this.vol = v; this.calls.push(['vol', v]); }
    getCurrentTime() { return this.t; }
    getDuration() { return this.d; }
    destroy() { this.calls.push(['destroy']); }
    state(n) { this.cfg.events.onStateChange({ data: n }); }
    error(n) { this.cfg.events.onError({ data: n }); }
  }
  return { YT: { Player }, made };
}

const engines = [];
afterEach(() => { while (engines.length) engines.pop().stop(); }); // no timers may outlive a test

function setup(opts = {}) {
  const { YT, made } = fakeYT(opts.yt);
  const engine = new YouTubeEngine({ container: {}, loadApi: opts.loadApi ?? (async () => YT), pollMs: 10, blockedAfterMs: 60, firstBlockedAfterMs: opts.first ?? 60, origin: 'https://music.test' });
  engines.push(engine);
  const events = [];
  for (const ev of ['state', 'time', 'ended', 'error', 'blocked']) engine.on(ev, (...a) => events.push([ev, ...a]));
  return { engine, made, events, last: (n) => made.players.at(-1).calls.filter((c) => c[0] === n) };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRACK = { id: 'a', videoId: 'VID1', title: 'T', duration: 200 };

test('creates the official player with the right settings (hidden controls, inline, nocookie host)', async () => {
  const { engine, made } = setup();
  engine.load(TRACK, { autoplay: true });
  await wait(20);
  const cfg = made.players[0].cfg;
  assert.equal(cfg.host, 'https://www.youtube-nocookie.com');
  assert.equal(cfg.playerVars.playsinline, 1); assert.equal(cfg.playerVars.controls, 0); assert.equal(cfg.playerVars.origin, 'https://music.test');
  assert.equal(cfg.width, '100%');
});

test('autoplay load: emits loading, calls loadVideoById, maps YouTube states', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: true, startAt: 12 });
  assert.deepEqual(events[0], ['state', 'loading']);
  await wait(20);
  const p = made.players[0];
  assert.deepEqual(p.calls.find((c) => c[0] === 'load'), ['load', { videoId: 'VID1', startSeconds: 12 }]);
  p.state(3); p.state(1);
  assert.ok(events.some((e) => e[0] === 'state' && e[1] === 'playing'));
  p.t = 33; await wait(30);
  const times = events.filter((e) => e[0] === 'time');
  assert.ok(times.length >= 2 && times.at(-1)[1] === 33 && times.at(-1)[2] === 200, 'time polling reports position and real duration');
  p.state(2); assert.deepEqual(events.at(-1).slice(0, 2), ['state', 'paused']);
  const n = events.length; await wait(40);
  assert.equal(events.length, n, 'polling stops while paused');
  p.state(1); p.state(0);
  assert.ok(events.some((e) => e[0] === 'ended'));
});

test('cue (no autoplay) emits the start position and goes to paused', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: false, startAt: 40 });
  await wait(20);
  assert.deepEqual(made.players[0].calls.find((c) => c[0] === 'cue'), ['cue', { videoId: 'VID1', startSeconds: 40 }]);
  assert.deepEqual(events.find((e) => e[0] === 'time'), ['time', 40, 200]);
  assert.ok(!events.some((e) => e[0] === 'state' && e[1] === 'loading'));
  made.players[0].state(5);
  assert.deepEqual(events.at(-1), ['state', 'paused']);
});

test('play / pause / seek / volume go straight to the player', async () => {
  const { engine, made, events, last } = setup();
  engine.load(TRACK, { autoplay: true }); await wait(20);
  engine.play(); await wait(5);
  assert.equal(last('play').length, 1);
  engine.pause(); assert.equal(last('pause').length, 1); assert.deepEqual(events.at(-1), ['state', 'paused']);
  engine.seek(75); assert.deepEqual(last('seek').at(-1), ['seek', 75, true]);
  assert.deepEqual(events.at(-1), ['time', 75, 200]);
  engine.seek(-5); assert.equal(last('seek').at(-1)[1], 0);
  engine.setVolume(0.37); assert.equal(made.players[0].vol, 37);
  engine.setVolume(5); assert.equal(made.players[0].vol, 100);
  engine.setVolume(-1); assert.equal(made.players[0].vol, 0);
});

test('volume set before the player is ready is applied once it is', async () => {
  const { engine, made } = setup();
  engine.setVolume(0.25);
  engine.load(TRACK, { autoplay: false });
  await wait(20);
  assert.ok(made.players[0].calls.some((c) => c[0] === 'vol' && c[1] === 25));
});

test('a newer load supersedes a slower earlier one (no stale track starts)', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const { YT, made } = fakeYT();
  const engine = new YouTubeEngine({ container: {}, loadApi: async () => { await gate; return YT; }, pollMs: 10 });
  engines.push(engine);
  engine.load({ id: 'a', videoId: 'AAA', title: 'A' }, { autoplay: true });
  engine.load({ id: 'b', videoId: 'BBB', title: 'B' }, { autoplay: true });
  release(); await wait(25);
  const loads = made.players[0].calls.filter((c) => c[0] === 'load');
  assert.equal(loads.length, 1); assert.equal(loads[0][1].videoId, 'BBB');
  engine.stop(); engine.load({ id: 'c', videoId: 'CCC', title: 'C' }, { autoplay: true });
  engine.stop(); await wait(15);
  assert.equal(made.players[0].calls.filter((c) => c[0] === 'load').length, 1);
});

test('YouTube errors become friendly messages', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: true }); await wait(20);
  const cases = { 100: /unavailable/, 101: /owner doesn't allow/, 150: /owner doesn't allow/, 2: /can't be played/, 5: /Playback error/, 999: /Playback failed/ };
  for (const [code, re] of Object.entries(cases)) {
    made.players[0].error(Number(code));
    assert.match(events.at(-1)[1], re, `code ${code}`);
    assert.equal(events.at(-1)[0], 'error');
  }
});

test('a track without a videoId errors immediately', () => {
  const { engine, events } = setup();
  engine.load({ id: 'demo', title: 'x' }, { autoplay: true });
  assert.deepEqual(events[0], ['error', "This track can't be played."]);
});

test('API blocked / failing to create the player reports an error and can retry', async () => {
  let attempts = 0;
  const { YT } = fakeYT();
  const engine = new YouTubeEngine({ container: {}, loadApi: async () => { if (++attempts === 1) throw new Error('blocked'); return YT; }, pollMs: 10 });
  engines.push(engine);
  const events = []; engine.on('error', (m) => events.push(m)); engine.on('state', () => {});
  engine.load(TRACK, { autoplay: true }); await wait(15);
  assert.match(events[0], /Couldn't load the YouTube player/);
  engine.load(TRACK, { autoplay: true }); await wait(25);
  assert.equal(events.length, 1, 'second attempt succeeds');
  const bad = new YouTubeEngine({ container: {}, loadApi: async () => fakeYT({ failCreate: true }).YT });
  engines.push(bad);
  const e2 = []; bad.on('error', (m) => e2.push(m)); bad.on('state', () => {});
  bad.load(TRACK, { autoplay: true }); await wait(15);
  assert.match(e2[0], /Couldn't load/);
});

test('autoplay blocked by the browser: pauses and asks for a tap', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: true }); await wait(20);
  made.players[0].state(-1); // never starts
  await wait(90);
  assert.ok(events.some((e) => e[0] === 'blocked'));
  assert.deepEqual(events.filter((e) => e[0] === 'state').at(-1), ['state', 'paused']);
});
test('watchdog does not fire when playback starts, buffers, or is paused by the user', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: true }); await wait(20);
  made.players[0].state(3); await wait(90);
  assert.ok(!events.some((e) => e[0] === 'blocked'), 'buffering is not blocking');
  made.players[0].state(1); await wait(90);
  assert.ok(!events.some((e) => e[0] === 'blocked'));
  const b = setup();
  b.engine.load(TRACK, { autoplay: true }); await wait(20);
  b.engine.pause(); await wait(90);
  assert.ok(!b.events.some((e) => e[0] === 'blocked'), 'user pause cancels the watchdog');
});

test('stop() halts polling; destroy() tears the player down', async () => {
  const { engine, made, events } = setup();
  engine.load(TRACK, { autoplay: true }); await wait(20);
  made.players[0].state(1); await wait(30);
  engine.stop(); const n = events.length; await wait(40);
  assert.equal(events.length, n);
  assert.ok(made.players[0].calls.some((c) => c[0] === 'stop'));
  engine.destroy(); assert.ok(made.players[0].calls.some((c) => c[0] === 'destroy'));
});

test('first play asks for a tap sooner than later plays (iPhone needs a tap on the video)', async () => {
  const { engine, made, events } = setup({ first: 30 });
  engine.load(TRACK, { autoplay: true }); await wait(20);
  made.players[0].state(-1); await wait(45);
  assert.equal(events.filter((e) => e[0] === 'blocked').length, 1, 'first play: blocked after the short delay');
  // once something has played, the normal (longer) delay applies
  engine.load(TRACK, { autoplay: true }); await wait(10);
  made.players[0].state(1); made.players[0].state(2);
  engine.load(TRACK, { autoplay: true }); await wait(10);
  made.players[0].state(-1); await wait(40);
  assert.equal(events.filter((e) => e[0] === 'blocked').length, 1, 'later play: still within the longer delay, not blocked yet');
  await wait(40);
  assert.equal(events.filter((e) => e[0] === 'blocked').length, 2);
});
