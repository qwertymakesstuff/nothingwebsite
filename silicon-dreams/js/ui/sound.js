// Synthesised sound effects (Web Audio, no files). Every sound respects the mute setting.

let ctx = null;
let enabled = true;
let volume = 0.6;

export function configureSound(on, vol) { enabled = on; volume = vol / 100; }

function ac() {
  if (!ctx && typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', gain = 0.2, at = 0, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { gain = 0.15, at = 0, filter = 1200 } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.value = gain * volume;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

const SOUNDS = {
  click: () => tone(1800, 0.04, { type: 'square', gain: 0.05 }),
  snap: () => { noise(0.05, { gain: 0.3, filter: 3000 }); tone(900, 0.05, { type: 'triangle', gain: 0.12, at: 0.02 }); },
  screw: () => { for (let i = 0; i < 4; i++) noise(0.04, { gain: 0.12, at: i * 0.07, filter: 5000 }); },
  cable: () => { noise(0.03, { gain: 0.25, filter: 2500 }); tone(1300, 0.03, { type: 'square', gain: 0.05, at: 0.03 }); },
  error: () => { tone(220, 0.15, { type: 'sawtooth', gain: 0.08 }); tone(180, 0.2, { type: 'sawtooth', gain: 0.08, at: 0.12 }); },
  good: () => { tone(660, 0.1, { type: 'triangle', gain: 0.12 }); tone(990, 0.14, { type: 'triangle', gain: 0.12, at: 0.09 }); },
  cash: () => { tone(1320, 0.08, { type: 'square', gain: 0.06 }); tone(1760, 0.18, { type: 'square', gain: 0.06, at: 0.08 }); noise(0.15, { gain: 0.06, at: 0.05, filter: 6000 }); },
  beep: () => tone(1000, 0.18, { type: 'square', gain: 0.07 }),
  beeps: pattern => { let at = 0; for (const p of pattern) { tone(1000, p === 'l' ? 0.45 : 0.12, { type: 'square', gain: 0.07, at }); at += p === 'l' ? 0.6 : 0.25; } },
  fan: () => { noise(1.2, { gain: 0.08, filter: 400 }); tone(70, 1.2, { type: 'sine', gain: 0.05, slide: 60 }); },
  air: () => noise(0.7, { gain: 0.25, filter: 2500 }),
  paste: () => noise(0.25, { gain: 0.1, filter: 600 }),
  page: () => noise(0.08, { gain: 0.1, filter: 4000 }),
  level: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: 'triangle', gain: 0.12, at: i * 0.1 })); },
  power: () => { tone(120, 0.4, { type: 'sine', gain: 0.1, slide: 200 }); },
};

export function play(name, arg) {
  if (!enabled || !SOUNDS[name]) return;
  try { SOUNDS[name](arg); } catch { /* audio unavailable */ }
}
