// All sound is synthesised with Web Audio at runtime: no samples, nothing borrowed.
// Two buses under a master gain: "music" carries ambience and drones, "sfx" everything else.
// Every method is a safe no-op until unlock() succeeds (browsers need a user gesture first),
// and in environments with no AudioContext at all.

const AC = globalThis.AudioContext || globalThis.webkitAudioContext;

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.7, sfx: 0.8 };
    this.amb = null;          // current ambience { name, gain, nodes, timers }
    this.wantAmb = null;      // requested before unlock
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  unlock() {
    if (!AC) return;
    if (!this.ctx) {
      try { this.ctx = new AC(); } catch { this.ctx = null; return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.music = c.createGain();
      this.sfxBus = c.createGain();
      this.music.connect(this.master); this.sfxBus.connect(this.master); this.master.connect(c.destination);
      this.noiseBuf = this.makeNoise(2);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.wantAmb && (!this.amb || this.amb.name !== this.wantAmb)) this.ambience(this.wantAmb);
  }

  setVolumes({ master, music, sfx }) {
    Object.assign(this.vol, { master, music, sfx });
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.vol.music * 0.9, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }

  makeNoise(seconds) {
    const c = this.ctx, len = c.sampleRate * seconds;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- building blocks -------------------------------------------------------------------

  osc(type, freq, dest, t0 = this.ctx.currentTime) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.connect(dest); o.start(t0);
    return o;
  }

  noise(dest, t0 = this.ctx.currentTime, loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = loop;
    s.connect(dest); s.start(t0, Math.random() * 1.5);
    return s;
  }

  filter(type, freq, q = 1, dest) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (dest) f.connect(dest);
    return f;
  }

  gain(v, dest) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }

  // a slow wobble on an AudioParam
  lfo(param, rate, depth, nodes) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param); o.start();
    nodes.push(o, g);
  }

  // one-shot envelope helper
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // ---- ambience --------------------------------------------------------------------------

  ambience(name) {
    this.wantAmb = name;
    if (!this.ctx) return;
    if (this.amb && this.amb.name === name) return;
    this.stopAmbience();
    if (!name) return;
    const c = this.ctx, t = c.currentTime;
    const out = this.gain(0.0001, this.music);
    out.gain.setTargetAtTime(1, t, 1.2);
    const amb = { name, gain: out, nodes: [], timers: [] };
    const recipe = AMBIENCE[name];
    if (recipe) recipe(this, out, amb.nodes, amb);
    this.amb = amb;
  }

  stopAmbience() {
    const a = this.amb;
    if (!a || !this.ctx) { this.amb = null; return; }
    const t = this.ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setTargetAtTime(0.0001, t, 0.4);
    a.timers.forEach(clearTimeout);
    a.stopped = true;
    setTimeout(() => { a.nodes.forEach(n => { try { n.stop?.(); } catch { /* already stopped */ } n.disconnect?.(); }); a.gain.disconnect(); }, 2500);
    this.amb = null;
  }

  // repeat fn at random intervals while this ambience is playing
  every(amb, minS, maxS, fn) {
    const tick = () => {
      if (amb.stopped) return;
      try { fn(); } catch { /* audio graph gone */ }
      amb.timers.push(setTimeout(tick, (minS + Math.random() * (maxS - minS)) * 1000));
    };
    amb.timers.push(setTimeout(tick, (minS + Math.random() * (maxS - minS)) * 1000));
  }

  // ---- effects ---------------------------------------------------------------------------

  sfx(name, opts = {}) {
    if (!this.ready) return;
    const fn = SFX[name];
    if (fn) { try { fn(this, this.ctx.currentTime, opts); } catch { /* ignore */ } }
  }
}

// ---- recipes -----------------------------------------------------------------------------

function wind(a, out, nodes, level = 0.08, centre = 420) {
  const f = a.filter('bandpass', centre, 0.6);
  const g = a.gain(level, out);
  f.connect(g);
  nodes.push(a.noise(f), f, g);
  a.lfo(g.gain, 0.07 + Math.random() * 0.05, level * 0.7, nodes);
  a.lfo(f.frequency, 0.05, centre * 0.4, nodes);
}

function drone(a, out, nodes, freq, level, type = 'sine', cutoff = 400) {
  const f = a.filter('lowpass', cutoff, 0.7, out);
  const g = a.gain(level, f);
  nodes.push(f, g, a.osc(type, freq, g), a.osc(type, freq * 1.006, g));
  a.lfo(g.gain, 0.03, level * 0.5, nodes);
}

function toll(a, out, freq = 98, level = 0.12) {
  const c = a.ctx, t = c.currentTime;
  for (const [ratio, amp, dec] of [[1, 1, 6], [2.4, 0.4, 3.5], [3.01, 0.25, 2.2], [0.5, 0.5, 7]]) {
    const g = a.gain(0.0001, out);
    const o = a.osc('sine', freq * ratio, g, t);
    a.env(g, t, 0.01, level * amp, dec);
    o.stop(t + dec + 0.2);
  }
}

function snap(a, out, level = 0.05) {
  const t = a.ctx.currentTime;
  const f = a.filter('highpass', 1800 + Math.random() * 1500, 1.5, out);
  const g = a.gain(0.0001, f);
  const s = a.noise(g, t, false);
  a.env(g, t, 0.003, level, 0.06);
  s.stop(t + 0.15);
}

function creak(a, out, level = 0.03) {
  const t = a.ctx.currentTime, dur = 0.6 + Math.random() * 0.8;
  const f = a.filter('bandpass', 700, 8, out);
  const g = a.gain(0.0001, f);
  const o = a.osc('sawtooth', 70 + Math.random() * 40, g, t);
  o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(level, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.05);
}

const AMBIENCE = {
  title(a, out, nodes, amb) {
    drone(a, out, nodes, 41.2, 0.10, 'sawtooth', 180);
    drone(a, out, nodes, 61.7, 0.05, 'triangle', 300);
    wind(a, out, nodes, 0.03, 300);
    a.every(amb, 9, 16, () => toll(a, out, 87.3, 0.08));
  },
  forest(a, out, nodes, amb) {
    wind(a, out, nodes, 0.07, 420);
    drone(a, out, nodes, 49, 0.035, 'sine', 200);
    a.every(amb, 12, 35, () => snap(a, out, 0.035));
  },
  shrine(a, out, nodes, amb) {
    wind(a, out, nodes, 0.045, 360);
    drone(a, out, nodes, 55, 0.03, 'sine', 220);
    // two high tones a few hertz apart, beating slowly — barely there
    const g = a.gain(0.006, out);
    nodes.push(g, a.osc('sine', 659, g), a.osc('sine', 662.5, g));
    a.every(amb, 20, 45, () => snap(a, out, 0.02));
  },
  interior(a, out, nodes, amb) {
    drone(a, out, nodes, 50, 0.04, 'triangle', 160);
    const f = a.filter('lowpass', 260, 0.5);
    const g = a.gain(0.025, out);
    f.connect(g);
    nodes.push(a.noise(f), f, g);
    a.every(amb, 8, 22, () => creak(a, out, 0.025));
  },
};

const SFX = {
  ui_move(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 330, g, t);
    a.env(g, t, 0.004, 0.03, 0.05); o.stop(t + 0.08);
  },
  ui_select(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 220, g, t);
    o.frequency.setValueAtTime(330, t + 0.06);
    a.env(g, t, 0.004, 0.04, 0.16); o.stop(t + 0.2);
  },
  ui_back(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 196, g, t);
    o.frequency.setValueAtTime(147, t + 0.05);
    a.env(g, t, 0.004, 0.035, 0.14); o.stop(t + 0.18);
  },
  text(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('triangle', 520 + Math.random() * 40, g, t);
    a.env(g, t, 0.002, 0.012, 0.02); o.stop(t + 0.04);
  },
  step(a, t, { surface = 'dirt' }) {
    const p = { dirt: [260, 0.10, 0.07], grass: [900, 0.05, 0.06], wood: [520, 0.12, 0.05], stone: [1500, 0.07, 0.035], gravel: [1100, 0.08, 0.06] }[surface] || [300, 0.08, 0.06];
    const f = a.filter(surface === 'stone' ? 'bandpass' : 'lowpass', p[0] * (0.9 + Math.random() * 0.2), surface === 'stone' ? 3 : 0.8, a.sfxBus);
    const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    a.env(g, t, 0.004, p[1], p[2]); s.stop(t + p[2] + 0.05);
    if (surface === 'wood') {
      const g2 = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 95 + Math.random() * 15, g2, t);
      a.env(g2, t, 0.003, 0.06, 0.07); o.stop(t + 0.1);
    }
  },
  interact(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('triangle', 392, g, t);
    a.env(g, t, 0.005, 0.035, 0.25); o.stop(t + 0.3);
  },
  locked(a, t) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.07;
      const f = a.filter('bandpass', 2400 + i * 300, 6, a.sfxBus);
      const g = a.gain(0.0001, f); const s = a.noise(g, tt, false);
      a.env(g, tt, 0.002, 0.18, 0.05); s.stop(tt + 0.08);
    }
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 80, g, t);
    a.env(g, t, 0.005, 0.04, 0.12); o.stop(t + 0.15);
  },
  door(a, t) {
    creak(a, a.sfxBus, 0.06);
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 60, g, t + 0.45);
    a.env(g, t + 0.45, 0.005, 0.12, 0.25); o.stop(t + 0.8);
  },
  candle(a, t) {
    const f = a.filter('bandpass', 3000, 1, a.sfxBus);
    const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    a.env(g, t, 0.003, 0.15, 0.12); s.stop(t + 0.2);
    const f2 = a.filter('lowpass', 500, 0.7, a.sfxBus);
    const g2 = a.gain(0.0001, f2); const s2 = a.noise(g2, t + 0.05, false);
    a.env(g2, t + 0.05, 0.1, 0.06, 0.6); s2.stop(t + 0.9);
  },
  save(a, t) {
    toll(a, a.sfxBus, 130.8, 0.05);
  },
  sting(a, t) {
    // a low dissonant swell, used sparingly
    for (const fr of [55, 58.3, 82.4]) {
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sawtooth', fr, g, t);
      const f = a.filter('lowpass', 600, 1); o.disconnect(); o.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5); o.stop(t + 2.6);
    }
  },
  bump(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 70, g, t);
    a.env(g, t, 0.003, 0.05, 0.06); o.stop(t + 0.1);
  },
};

export const SFX_NAMES = Object.keys(SFX);
export const AMBIENCE_NAMES = Object.keys(AMBIENCE);
