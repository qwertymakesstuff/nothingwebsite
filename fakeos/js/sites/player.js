// The Vidder video player: canvas-drawn video, captions, seek bar, volume, theatre/fullscreen,
// keyboard controls, and a small synthesizer that performs the music videos.
import { h } from '../lib/dom.js';
import { drawScene } from '../lib/art.js';
import { dur } from '../lib/time.js';
import { rng } from '../lib/rng.js';
import { audioCtx } from '../os/sound.js';
import { mediaVideo } from '../lib/media.js';

let volumeMemory = 0.7, mutedMemory = false, ccMemory = true;

export function createPlayer(video, { autoplay = true, isVisible = () => true, onEnded, onPlay } = {}) {
  // A generated clip replaces the drawn picture. 'full' clips are the whole video (own length and
  // sound); 'loop' clips repeat silently under the original runtime and captions.
  const real = mediaVideo(video.id);
  const vid = real ? h('video', { class: 'vp-canvas', src: real.url, preload: 'auto', playsinline: true, loop: real.mode === 'loop', muted: real.mode === 'loop' }) : null;
  if (vid) vid.muted = real.mode === 'loop';
  const full = real?.mode === 'full';
  const canvas = vid || h('canvas', { class: 'vp-canvas', width: 640, height: 360 });
  const g = vid ? null : canvas.getContext('2d');
  const cap = h('div', { class: 'vp-cap' });
  const big = h('button', { class: 'vp-big', type: 'button', 'aria-label': 'Play' }, '▶');
  const fill = h('div', { class: 'vp-fill' }), buf = h('div', { class: 'vp-buf' }), knob = h('div', { class: 'vp-knob' });
  const seek = h('div', { class: 'vp-seek', role: 'slider', 'aria-label': 'Seek' }, buf, fill, knob);
  const playBtn = h('button', { class: 'vp-btn', type: 'button', 'aria-label': 'Play' }, '▶');
  const time = h('span', { class: 'vp-time' }, '0:00 / ' + video.dur);
  const vol = h('input', { class: 'vp-vol', type: 'range', min: 0, max: 1, step: .05, value: mutedMemory ? 0 : volumeMemory, 'aria-label': 'Volume' });
  const muteBtn = h('button', { class: 'vp-btn', type: 'button', 'aria-label': 'Mute' });
  const ccBtn = h('button', { class: 'vp-btn vp-cc' + (ccMemory ? ' on' : ''), type: 'button', title: 'Captions' }, 'CC');
  const wideBtn = h('button', { class: 'vp-btn', type: 'button', title: 'Theatre mode' }, '▭');
  const fsBtn = h('button', { class: 'vp-btn', type: 'button', title: 'Full screen' }, '⛶');
  const end = h('div', { class: 'vp-end' });
  const controls = h('div', { class: 'vp-controls' }, seek, h('div', { class: 'vp-row' }, playBtn, muteBtn, vol, time, h('span', { class: 'vp-spacer' }), ccBtn, wideBtn, fsBtn));
  const el = h('div', { class: 'vp', tabindex: 0 }, canvas, cap, big, end, controls);

  const total = (full && real.duration) || video.seconds || 60;
  let t = 0, playing = false, last = 0, raf = 0, buffered = 0.05, ended = false, alive = true;
  const synth = video.music ? makeSynth(video.music) : null;

  const capAt = s => { let line = ''; for (const [at, text] of video.caps || []) if (at <= s) line = text; else break; return line; };
  function frame(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!isVisible()) { if (playing) pause(true); return; }
    if (playing && full) {
      t = Math.min(total, vid.currentTime);
      if (vid.buffered.length) buffered = vid.buffered.end(vid.buffered.length - 1) / total;
    } else if (playing) {
      const dt = Math.min(.25, (ts - (last || ts)) / 1000); last = ts;
      t = Math.min(total, t + dt);
      buffered = Math.min(1, buffered + dt / total * 3 + .0005);
      synth?.tick(t);
      if (t >= total) { finish(); }
    }
    draw();
  }
  function draw() {
    const line = capAt(t);
    if (!vid) {
      const w = canvas.clientWidth || 640, hh = canvas.clientHeight || 360;
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
      drawScene(g, canvas.width, canvas.height, video, total ? t / total : 0, 'play', playing && line && !line.startsWith('['));
    }
    cap.textContent = ccMemory ? line : '';
    cap.classList.toggle('on', ccMemory && !!line);
    const p = total ? t / total : 0;
    fill.style.width = p * 100 + '%'; knob.style.left = p * 100 + '%'; buf.style.width = Math.max(p, buffered) * 100 + '%';
    time.textContent = dur(t) + ' / ' + video.dur;
  }
  function play() {
    if (ended) { t = 0; ended = false; end.classList.remove('on'); if (vid) vid.currentTime = 0; }
    playing = true; last = 0; el.classList.add('playing'); el.classList.remove('paused');
    playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pause'); big.classList.add('gone');
    synth?.start(t, mutedMemory ? 0 : volumeMemory);
    if (vid) { if (full) { vid.volume = volumeMemory; vid.muted = mutedMemory; } vid.play().catch(() => {}); }
    onPlay?.();
  }
  function pause(silent) {
    playing = false; el.classList.remove('playing'); if (!silent) el.classList.add('paused');
    playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play');
    synth?.stop();
    vid?.pause();
  }
  function finish() {
    pause(true); ended = true; t = total; draw();
    end.classList.add('on');
    onEnded?.(end);
  }
  const toggle = () => (playing ? pause() : play());
  function seekTo(s) { t = Math.max(0, Math.min(total - .01, s)); if (vid) { if (full) vid.currentTime = t; else if (vid.duration) vid.currentTime = t % vid.duration; } if (ended) { ended = false; end.classList.remove('on'); } buffered = Math.max(buffered, t / total); synth?.seek(t); draw(); }
  const paintMute = () => { const m = mutedMemory || volumeMemory === 0; muteBtn.textContent = m ? '🔇' : volumeMemory < .4 ? '🔈' : '🔊'; };

  canvas.addEventListener('click', toggle);
  big.addEventListener('click', toggle);
  playBtn.addEventListener('click', toggle);
  canvas.addEventListener('dblclick', () => fs());
  seek.addEventListener('pointerdown', e => {
    const r = seek.getBoundingClientRect();
    const at = ev => seekTo((Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))) * total);
    at(e); seek.setPointerCapture(e.pointerId);
    const mv = ev => at(ev), up = () => { seek.removeEventListener('pointermove', mv); seek.removeEventListener('pointerup', up); };
    seek.addEventListener('pointermove', mv); seek.addEventListener('pointerup', up);
  });
  seek.addEventListener('mousemove', e => { const r = seek.getBoundingClientRect(); seek.title = dur(Math.max(0, (e.clientX - r.left) / r.width) * total); });
  vol.addEventListener('input', () => { volumeMemory = +vol.value; mutedMemory = volumeMemory === 0; synth?.volume(volumeMemory); if (full) { vid.volume = volumeMemory; vid.muted = mutedMemory; } paintMute(); });
  muteBtn.addEventListener('click', () => { mutedMemory = !mutedMemory; vol.value = mutedMemory ? 0 : volumeMemory || .7; if (!mutedMemory && !volumeMemory) volumeMemory = .7; synth?.volume(mutedMemory ? 0 : volumeMemory); if (full) vid.muted = mutedMemory; paintMute(); });
  ccBtn.addEventListener('click', () => { ccMemory = !ccMemory; ccBtn.classList.toggle('on', ccMemory); draw(); });
  wideBtn.addEventListener('click', () => el.dispatchEvent(new CustomEvent('theatre', { bubbles: true })));
  const fs = () => { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.().catch(() => {}); };
  fsBtn.addEventListener('click', fs);
  el.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); seekTo(t + (e.key === 'l' ? 10 : 5)); }
    else if (e.key === 'ArrowLeft' || e.key === 'j') { e.preventDefault(); seekTo(t - (e.key === 'j' ? 10 : 5)); }
    else if (e.key === 'm') muteBtn.click();
    else if (e.key === 'c') ccBtn.click();
    else if (e.key === 'f') fs();
    else if (/^[0-9]$/.test(e.key)) seekTo(total * +e.key / 10);
  });
  paintMute();
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => { draw(); if (autoplay) play(); });

  if (full) vid.addEventListener('ended', () => { if (playing) finish(); });

  return { el, play, pause, seek: seekTo, destroy() { alive = false; cancelAnimationFrame(raf); synth?.stop(); if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); } }, get time() { return t; } };
}

// A deterministic little band: pad chords, bass, a soft melody and brushed drums.
function makeSynth({ seed, bpm = 76, mood = 'minor' }) {
  const ctx = audioCtx(); if (!ctx) return null;
  const scale = mood === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const root = 45 + (seed % 7);
  const r = rng('song' + seed);
  const prog = Array.from({ length: 4 }, () => Math.floor(r() * 6));
  if (mood === 'major') prog[0] = 0;
  const beat = 60 / bpm;
  let master = null, timer = 0, next = 0, base = 0, startAt = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const note = (deg, oct) => root + 12 * oct + scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
  function tone(freq, at, len, type, gain) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    gn.gain.setValueAtTime(0, at); gn.gain.linearRampToValueAtTime(gain, at + Math.min(.08, len / 3)); gn.gain.exponentialRampToValueAtTime(.0001, at + len);
    o.connect(gn).connect(master); o.start(at); o.stop(at + len + .05);
  }
  function noise(at, len, gain) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(), gn = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000; s.buffer = b; gn.gain.value = gain;
    s.connect(f).connect(gn).connect(master); s.start(at);
  }
  function schedule(i, at) {
    const bar = Math.floor(i / 8), step = i % 8, chord = prog[bar % 4];
    if (step === 0) { for (const d of [0, 2, 4]) tone(midi(note(chord + d, 1)), at, beat * 4, 'triangle', .035); tone(midi(note(chord, 0)), at, beat * 1.8, 'sine', .09); }
    if (step === 4) tone(midi(note(chord, 0)), at, beat * 1.6, 'sine', .07);
    if (step === 0 || step === 5) tone(55, at, .25, 'sine', .14);
    if (step % 2 === 1) noise(at, .05, .025);
    const mr = rng('m' + seed + ':' + i)();
    if (mr < .38) tone(midi(note(chord + [0, 2, 4, 6, 7][Math.floor(mr * 13) % 5], 2)), at, beat * .9, 'sine', .04);
  }
  function loop() {
    const ahead = ctx.currentTime + .25;
    while (base + next * beat / 2 < ahead) { schedule(startAt + next, base + next * beat / 2); next++; }
  }
  return {
    start(t, vol) {
      if (ctx.state === 'suspended') ctx.resume();
      master = ctx.createGain(); master.gain.value = vol * 1.2; master.connect(ctx.destination);
      startAt = Math.floor(t / (beat / 2)); next = 0; base = ctx.currentTime + .05;
      clearInterval(timer); timer = setInterval(loop, 80); loop();
    },
    stop() { clearInterval(timer); if (master) { const m = master; m.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(() => m.disconnect(), 300); master = null; } },
    seek(t) { if (master) { const v = master.gain.value / 1.2; this.stop(); this.start(t, v); } },
    volume(v) { if (master) master.gain.setTargetAtTime(v * 1.2, ctx.currentTime, .05); },
    tick() {},
  };
}
