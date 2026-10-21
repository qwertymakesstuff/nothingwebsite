// Sound effects, synthesised with Web Audio (no audio files). Everything works with sound off.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = !!on; }

function audio() {
  if (!enabled) return null;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ||= new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function blip(freq, dur, { type = 'square', gain = 0.03, at = 0, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sound = {
  tick() { blip(1500, 0.03, { gain: 0.018 }); },
  open() { blip(220, 0.18, { type: 'sawtooth', gain: 0.025, slide: 2 }); },
  reveal(rank = 0) {
    const notes = [523, 659, 784, 1047, 1319];
    const n = Math.min(notes.length, 2 + Math.floor(rank / 2));
    notes.slice(0, n).forEach((f, i) => blip(f, 0.22, { type: 'triangle', gain: 0.05, at: i * 0.08 }));
  },
  sell() { blip(880, 0.08, { type: 'triangle', gain: 0.04 }); blip(1320, 0.12, { type: 'triangle', gain: 0.04, at: 0.07 }); },
  error() { blip(180, 0.15, { type: 'square', gain: 0.03 }); },
};
