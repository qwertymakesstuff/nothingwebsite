// Subtle synthesised sound effects (WebAudio, no files). Created lazily on the first user gesture.

export function createAudio() {
  let ctx = null, master = null;
  let volume = 0.7, enabled = true;

  function ensure() {
    if (!enabled) return false;
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch { return false; }
    master = ctx.createGain(); master.gain.value = volume * 0.5; master.connect(ctx.destination);
    return true;
  }

  function tone(type, freq, t, dur, peak = 0.3, glide = null) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, peak = 0.2, freq = 1800, type = 'bandpass') {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const SOUNDS = {
    click: t => tone('triangle', 660, t, 0.05, 0.12),
    lever: t => { noise(t, 0.18, 0.18, 900); tone('sawtooth', 110, t, 0.2, 0.06, 70); },
    tick: t => noise(t, 0.025, 0.08, 3200),
    stop: t => { tone('square', 140, t, 0.07, 0.08, 90); noise(t, 0.05, 0.12, 700, 'lowpass'); },
    coin: (t, n = 0) => { const f = 880 * Math.pow(2, Math.min(n, 14) / 12); tone('triangle', f, t, 0.12, 0.13); tone('sine', f * 2, t + 0.02, 0.1, 0.05); },
    loss: t => tone('sine', 300, t, 0.18, 0.12, 180),
    destroy: t => { noise(t, 0.14, 0.16, 500, 'lowpass'); tone('square', 200, t, 0.1, 0.05, 80); },
    total: t => [0, 4, 7, 12].forEach((s, k) => tone('triangle', 523 * Math.pow(2, s / 12), t + k * 0.06, 0.22, 0.12)),
    big: t => [0, 4, 7, 12, 16, 19].forEach((s, k) => tone('triangle', 523 * Math.pow(2, s / 12), t + k * 0.07, 0.3, 0.13)),
    pick: t => { tone('sine', 520, t, 0.08, 0.14); tone('sine', 780, t + 0.06, 0.12, 0.12); },
    buy: t => { tone('triangle', 988, t, 0.08, 0.12); tone('triangle', 1318, t + 0.07, 0.14, 0.12); noise(t, 0.05, 0.05, 5000); },
    error: t => { tone('square', 180, t, 0.09, 0.07); tone('square', 150, t + 0.1, 0.12, 0.07); },
    rent: t => { noise(t, 0.08, 0.12, 2400); [0, 5, 9].forEach((s, k) => tone('sine', 392 * Math.pow(2, s / 12), t + 0.05 + k * 0.09, 0.3, 0.12)); },
    evicted: t => [0, -3, -7, -12].forEach((s, k) => tone('sawtooth', 220 * Math.pow(2, s / 12), t + k * 0.22, 0.4, 0.07)),
    victory: t => [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, k) => tone('triangle', 392 * Math.pow(2, s / 12), t + k * 0.11, 0.35, 0.12)),
    open: t => { tone('sine', 300, t, 0.15, 0.08, 600); },
  };

  return {
    play(name, arg) {
      if (!enabled || !SOUNDS[name] || !ensure()) return;
      try { SOUNDS[name](ctx.currentTime + 0.005, arg); } catch { /* audio is best-effort */ }
    },
    configure({ volume: v, sound }) {
      if (Number.isFinite(v)) volume = v;
      if (typeof sound === 'boolean') enabled = sound;
      if (master) master.gain.value = volume * 0.5;
    },
    unlock: () => ensure(),
  };
}
