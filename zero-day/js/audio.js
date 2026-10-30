// Tiny synth sound effects via WebAudio. No files, no network. Respects the mute setting.
let ctx = null;
let enabled = true;

export function setEnabled(v) { enabled = !!v; }
export function isEnabled() { return enabled; }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'square', gain = 0.06, slideTo = null) {
  if (!enabled) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}

export const sfx = {
  tap: () => tone(520, 0.05, 'square', 0.04),
  key: () => tone(300 + Math.random() * 120, 0.03, 'square', 0.03),
  good: () => { tone(660, 0.08, 'triangle', 0.06); setTimeout(() => tone(880, 0.1, 'triangle', 0.06), 70); },
  bad: () => tone(180, 0.25, 'sawtooth', 0.07, 90),
  reveal: () => tone(440, 0.12, 'sine', 0.05, 760),
  alarm: () => { tone(300, 0.18, 'sawtooth', 0.08); setTimeout(() => tone(260, 0.22, 'sawtooth', 0.08), 180); },
  success: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.07), i * 90)); },
  fail: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.07), i * 110)); },
  cash: () => { [700, 900, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.09, 'square', 0.05), i * 55)); },
  level: () => { [523, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.08), i * 100)); },
  tick: () => tone(1200, 0.02, 'square', 0.02),
};
