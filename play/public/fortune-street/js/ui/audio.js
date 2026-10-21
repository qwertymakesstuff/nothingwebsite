// Small synthesized sound cues (no audio files). Created lazily on the first user gesture.
let ctx = null;
let enabled = true;
let volume = 0.6;

export function configureAudio(settings) {
  enabled = !!settings.sound;
  volume = Math.max(0, Math.min(1, settings.volume ?? 0.6));
}

function ac() {
  if (!enabled) return null;
  try {
    ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * volume, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const CUES = {
  dice: () => { for (let i = 0; i < 6; i++) tone(180 + i * 37, i * 0.05, 0.05, { type: 'square', gain: 0.05 }); },
  step: () => tone(520, 0, 0.05, { type: 'triangle', gain: 0.05 }),
  coin: () => { tone(988, 0, 0.09, { type: 'triangle' }); tone(1319, 0.07, 0.16, { type: 'triangle' }); },
  pay: () => { tone(392, 0, 0.1, { type: 'triangle', gain: 0.12 }); tone(311, 0.08, 0.16, { type: 'triangle', gain: 0.12 }); },
  buy: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.16, { type: 'triangle' })),
  build: () => { tone(140, 0, 0.12, { type: 'square', gain: 0.08 }); tone(660, 0.1, 0.14, { type: 'triangle' }); },
  trade: () => { tone(587, 0, 0.1); tone(880, 0.09, 0.18); },
  card: () => { tone(740, 0, 0.08, { type: 'sine', gain: 0.1 }); tone(990, 0.06, 0.12, { type: 'sine', gain: 0.1 }); },
  turn: () => tone(660, 0, 0.12, { type: 'sine', gain: 0.09 }),
  error: () => tone(200, 0, 0.18, { type: 'sawtooth', gain: 0.06, slide: -60 }),
  bankrupt: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.12, 0.2, { type: 'triangle' })),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, { type: 'triangle' })),
};

export function play(name) {
  if (!enabled) return;
  CUES[name]?.();
}
