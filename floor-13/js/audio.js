// WebAudio sound: a fluorescent hum ambience that shifts per floor, plus small synthesized
// effects. Nothing is loaded from files. Starts on the first user gesture (browser rule).
let ctx = null, master = null, ambGain = null, ambNodes = [], settings = { sound: true, volume: 0.6, ambience: true };
let currentMood = 'lift';

export function initAudio(s) {
  settings = s;
  if (ctx) return;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
  try {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.sound ? settings.volume : 0; master.connect(ctx.destination);
    ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
    startAmbience();
  } catch { ctx = null; }
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
export function applySettings(s) {
  settings = s;
  if (!ctx) return;
  master.gain.setTargetAtTime(s.sound ? s.volume : 0, ctx.currentTime, 0.05);
  setMood(currentMood);
}

function noiseBuffer(seconds = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown-ish noise
  return b;
}

function startAmbience() {
  const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 60;
  const hum2 = ctx.createOscillator(); hum2.type = 'triangle'; hum2.frequency.value = 120;
  const hg = ctx.createGain(); hg.gain.value = 0.05; const hg2 = ctx.createGain(); hg2.gain.value = 0.012;
  hum.connect(hg).connect(ambGain); hum2.connect(hg2).connect(ambGain);
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
  const ng = ctx.createGain(); ng.gain.value = 0.05;
  n.connect(f).connect(ng).connect(ambGain);
  // a slow wobble so the hum breathes
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 0.015;
  lfo.connect(lg).connect(hg.gain);
  [hum, hum2, n, lfo].forEach(x => x.start());
  ambNodes = { hum, hum2, filter: f, noiseGain: ng };
}

// mood: 'lift' | pattern name of a floor | 'anomaly' | 'thirteen'
export function setMood(mood) {
  currentMood = mood;
  if (!ctx || !ambNodes.hum) return;
  const t = ctx.currentTime;
  const on = settings.ambience && settings.sound;
  const cfg = {
    lift: [60, 300, 0.05], carpet: [60, 420, 0.06], tile: [60, 900, 0.04], concrete: [50, 260, 0.08], wood: [60, 350, 0.04],
    grid: [120, 1400, 0.05], checker: [60, 600, 0.04], plush: [55, 300, 0.035], stars: [72, 1100, 0.04], void: [40, 150, 0.02],
    lines: [66, 2000, 0.03], water: [48, 500, 0.09], grass: [52, 700, 0.07], blueprint: [80, 2400, 0.03], thirteen: [55, 250, 0.03],
  }[mood] || [60, 400, 0.05];
  ambNodes.hum.frequency.setTargetAtTime(cfg[0], t, 0.4);
  ambNodes.hum2.frequency.setTargetAtTime(cfg[0] * 2, t, 0.4);
  ambNodes.filter.frequency.setTargetAtTime(cfg[1], t, 0.4);
  ambNodes.noiseGain.gain.setTargetAtTime(cfg[2], t, 0.4);
  ambGain.gain.setTargetAtTime(on ? 0.6 : 0, t, 0.5);
}

function tone(freq, start, dur, { type = 'sine', vol = 0.2, attack = 0.005, to = null } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + attack); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master); o.start(start); o.stop(start + dur + 0.05);
}
function noiseBurst(start, dur, { vol = 0.2, freq = 800, q = 1, type = 'bandpass', sweep = null } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(Math.max(0.2, dur + 0.1));
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, start); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, start + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(master); s.start(start); s.stop(start + dur + 0.05);
}

export const CHIME_NOTES = [523.25, 659.25, 783.99, 1046.5];

export function sfx(name, arg) {
  if (!ctx || !settings.sound) return;
  resumeAudio();
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'ding': tone(880, t, 1.4, { vol: 0.16 }); tone(659.25, t + 0.32, 1.8, { vol: 0.14 }); break;
    case 'chime': CHIME_NOTES.forEach((f, i) => tone(f, t + i * 0.22, 0.9, { vol: 0.12 })); break;
    case 'note': tone(CHIME_NOTES[arg] || 523, t, 0.7, { vol: 0.16 }); tone((CHIME_NOTES[arg] || 523) * 2, t, 0.4, { vol: 0.03 }); break;
    case 'click': tone(1800, t, 0.04, { type: 'square', vol: 0.04 }); break;
    case 'step': noiseBurst(t, 0.08, { vol: 0.08, freq: 300, q: 0.8 }); noiseBurst(t + 0.22, 0.08, { vol: 0.06, freq: 280, q: 0.8 }); break;
    case 'doors': noiseBurst(t, 0.9, { vol: 0.12, freq: 220, q: 0.6, type: 'lowpass', sweep: 900 }); tone(70, t, 0.9, { type: 'sawtooth', vol: 0.03 }); break;
    case 'ride': noiseBurst(t, 1.6, { vol: 0.14, freq: 120, q: 0.5, type: 'lowpass', sweep: 260 }); tone(48, t, 1.6, { type: 'sine', vol: 0.12, to: 62 }); break;
    case 'search': noiseBurst(t, 0.18, { vol: 0.1, freq: 2000, q: 0.7 }); noiseBurst(t + 0.15, 0.12, { vol: 0.07, freq: 1400, q: 0.7 }); break;
    case 'cash': tone(1318.5, t, 0.12, { type: 'triangle', vol: 0.08 }); tone(1975.5, t + 0.08, 0.25, { type: 'triangle', vol: 0.07 }); break;
    case 'find': [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(f, t + i * 0.07, 0.4, { type: 'triangle', vol: 0.08 })); break;
    case 'bad': tone(110, t, 0.35, { type: 'sawtooth', vol: 0.06, to: 80 }); break;
    case 'beep': tone(1200, t, 0.07, { type: 'square', vol: 0.04 }); break;
    case 'error': tone(220, t, 0.15, { type: 'square', vol: 0.05 }); tone(180, t + 0.15, 0.2, { type: 'square', vol: 0.05 }); break;
    case 'unlock': tone(880, t, 0.08, { type: 'square', vol: 0.04 }); tone(1320, t + 0.09, 0.3, { type: 'triangle', vol: 0.07 }); noiseBurst(t + 0.05, 0.1, { vol: 0.12, freq: 3000 }); break;
    case 'fuse': noiseBurst(t, 0.06, { vol: 0.15, freq: 4000, q: 2 }); tone(90, t, 0.12, { type: 'square', vol: 0.03 }); break;
    case 'phone': for (let i = 0; i < 2; i++) for (let k = 0; k < 10; k++) tone(k % 2 ? 480 : 440, t + i * 0.6 + k * 0.04, 0.05, { type: 'square', vol: 0.03 }); break;
    case 'ach': [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, t + i * 0.06, 0.6, { type: 'triangle', vol: 0.07 })); break;
    case 'page': noiseBurst(t, 0.25, { vol: 0.06, freq: 3500, q: 0.5, sweep: 1500 }); break;
    case 'flicker': tone(120, t, 0.05, { type: 'square', vol: 0.02 }); tone(120, t + 0.09, 0.03, { type: 'square', vol: 0.015 }); break;
  }
}
