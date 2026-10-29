// Sound effects, synthesised with the Web Audio API (no audio files to download).

export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; this.volume = 0.6; this.last = {}; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); } catch { this.ctx = null; }
  }

  set(enabled, volume) { this.enabled = enabled; this.volume = volume; }

  tone(freq, dur, { type = 'square', vol = 0.2, at = 0, slide = 0, attack = 0.005 } = {}) {
    const c = this.ctx;
    const t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * this.volume, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, { vol = 0.15, at = 0, hp = 800 } = {}) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol * this.volume;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(c.currentTime + at);
  }

  play(name) {
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < 90) return;   // rapid clicks don't stack into noise
    this.last[name] = now;
    const S = SOUNDS[name];
    if (S) try { S(this); } catch { /* audio is best-effort */ }
  }
}

const SOUNDS = {
  click: s => s.tone(660, 0.05, { type: 'triangle', vol: 0.12 }),
  buy: s => { s.tone(520, 0.07, { type: 'square', vol: 0.1 }); s.tone(780, 0.1, { type: 'square', vol: 0.1, at: 0.06 }); },
  sellWin: s => { // cha-ching
    s.noise(0.08, { vol: 0.12, hp: 3000 });
    [1046, 1318, 1568].forEach((f, i) => s.tone(f, 0.18, { type: 'triangle', vol: 0.14, at: 0.05 + i * 0.06 }));
  },
  sellLoss: s => { s.tone(330, 0.12, { type: 'sawtooth', vol: 0.08 }); s.tone(247, 0.2, { type: 'sawtooth', vol: 0.08, at: 0.1 }); },
  pump: s => [523, 659, 784, 1046, 1318].forEach((f, i) => s.tone(f, 0.12, { type: 'square', vol: 0.07, at: i * 0.05 })),
  crash: s => { // two-tone warning siren, falling
    for (let i = 0; i < 3; i++) { s.tone(880, 0.12, { type: 'sawtooth', vol: 0.09, at: i * 0.24 }); s.tone(587, 0.12, { type: 'sawtooth', vol: 0.09, at: i * 0.24 + 0.12 }); }
  },
  rug: s => { s.tone(600, 0.6, { type: 'sawtooth', vol: 0.12, slide: 0.15 }); s.noise(0.3, { vol: 0.1, at: 0.4, hp: 200 }); },
  liquidated: s => { s.tone(110, 0.5, { type: 'sawtooth', vol: 0.18, slide: 0.5 }); s.tone(55, 0.6, { type: 'square', vol: 0.12, at: 0.1 }); },
  achievement: s => [784, 988, 1175, 1568].forEach((f, i) => s.tone(f, i === 3 ? 0.35 : 0.12, { type: 'triangle', vol: 0.14, at: i * 0.09 })),
  milestone: s => [523, 784, 1046, 1568, 2093].forEach((f, i) => s.tone(f, 0.16, { type: 'square', vol: 0.08, at: i * 0.07 })),
  news: s => s.tone(1200, 0.04, { type: 'sine', vol: 0.06 }),
  error: s => s.tone(180, 0.15, { type: 'square', vol: 0.1 }),
  end: s => [784, 659, 523, 392].forEach((f, i) => s.tone(f, 0.2, { type: 'triangle', vol: 0.12, at: i * 0.12 })),
};
