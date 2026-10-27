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

  // ---- loops: sounds that run until stopped (tape hiss) -----------------------------------

  loop(name) {
    if (!this.ready || !LOOPS[name]) return { stop() {} };
    const out = this.gain(0.0001, this.sfxBus);
    out.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
    const nodes = [];
    try { LOOPS[name](this, out, nodes); } catch { /* ignore */ }
    return {
      stop: () => {
        const t = this.ctx.currentTime;
        out.gain.setTargetAtTime(0.0001, t, 0.05);
        setTimeout(() => { nodes.forEach(n => { try { n.stop?.(); } catch { /* done */ } n.disconnect?.(); }); out.disconnect(); }, 400);
      },
    };
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

function drip(a, out, level = 0.04) {
  const t = a.ctx.currentTime, g = a.gain(0.0001, out);
  const o = a.osc('sine', 900 + Math.random() * 700, g, t);
  o.frequency.exponentialRampToValueAtTime(300, t + 0.08);
  a.env(g, t, 0.002, level, 0.09); o.stop(t + 0.12);
}

function bark(a, out, level = 0.03) {
  const t = a.ctx.currentTime;
  for (let i = 0; i < 2; i++) {
    const tt = t + i * 0.28, f = a.filter('bandpass', 700, 2, out), g = a.gain(0.0001, f);
    const o = a.osc('sawtooth', 220, g, tt); o.frequency.exponentialRampToValueAtTime(140, tt + 0.12);
    a.env(g, tt, 0.01, level, 0.14); o.stop(tt + 0.2);
  }
}

Object.assign(AMBIENCE, {
  town(a, out, nodes, amb) {
    wind(a, out, nodes, 0.05, 380);
    const g = a.gain(0.008, out); nodes.push(g, a.osc('sine', 120, g)); // a streetlight's hum
    a.every(amb, 25, 60, () => bark(a, out, 0.02));
  },
  house(a, out, nodes, amb) {
    drone(a, out, nodes, 46, 0.03, 'triangle', 140);
    // a clock somewhere, not quite even
    const tick = () => { if (amb.stopped) return; snap(a, out, 0.012); amb.timers.push(setTimeout(tick, 1000 + Math.random() * 60)); };
    tick();
    a.every(amb, 14, 30, () => creak(a, out, 0.02));
  },
  chapel_out(a, out, nodes, amb) {
    wind(a, out, nodes, 0.06, 300);
    drone(a, out, nodes, 43.6, 0.04, 'sawtooth', 160);
    a.every(amb, 20, 40, () => toll(a, out, 65.4, 0.05));
  },
  chapel(a, out, nodes, amb) {
    drone(a, out, nodes, 32.7, 0.08, 'sawtooth', 120);
    drone(a, out, nodes, 49, 0.03, 'sine', 300);
    const g = a.gain(0.01, out);
    nodes.push(g, a.osc('sine', 523, g), a.osc('sine', 526, g), a.osc('sine', 784, g));
    a.every(amb, 10, 25, () => creak(a, out, 0.02));
  },
  cemetery(a, out, nodes, amb) {
    wind(a, out, nodes, 0.08, 520);
    drone(a, out, nodes, 51.9, 0.03, 'sine', 200);
    a.every(amb, 8, 20, () => snap(a, out, 0.03));
  },
  passages(a, out, nodes, amb) {
    drone(a, out, nodes, 36.7, 0.06, 'triangle', 110);
    const f = a.filter('lowpass', 180, 0.5); const g = a.gain(0.05, out); f.connect(g);
    nodes.push(a.noise(f), f, g);
    a.every(amb, 1.5, 5, () => drip(a, out, 0.03));
  },
});

// a voice somewhere off in the dark: speech-shaped, never words
function murmur(a, out, level = 0.02) {
  const t = a.ctx.currentTime, dur = 0.8 + Math.random() * 1.5;
  const f = a.filter('bandpass', 500 + Math.random() * 300, 4, out), g = a.gain(0.0001, f);
  const o = a.osc('triangle', 110 + Math.random() * 60, g, t);
  let tt = t;
  while (tt < t + dur) {
    const syl = 0.1 + Math.random() * 0.15;
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(level, tt + syl * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, tt + syl);
    tt += syl + Math.random() * 0.08;
  }
  o.stop(t + dur + 0.1);
}

Object.assign(AMBIENCE, {
  crypt(a, out, nodes, amb) {
    drone(a, out, nodes, 30.9, 0.08, 'sawtooth', 100);
    drone(a, out, nodes, 46.2, 0.03, 'sine', 200);
    a.every(amb, 2, 6, () => drip(a, out, 0.025));
    a.every(amb, 10, 24, () => murmur(a, out, 0.015));
  },
  sanctum(a, out, nodes, amb) {
    drone(a, out, nodes, 27.5, 0.1, 'sawtooth', 90);
    // the congregation, holding one note under everything
    const g = a.gain(0.012, out);
    for (const fr of [220, 220.8, 261.6, 330, 331.5]) nodes.push(a.osc('triangle', fr, g));
    nodes.push(g);
    a.lfo(g.gain, 0.08, 0.006, nodes);
    a.every(amb, 6, 14, () => murmur(a, out, 0.02));
  },
});

const LOOPS = {
  hiss(a, out, nodes) {
    const f = a.filter('highpass', 2500, 0.5, out); const g = a.gain(0.025, f);
    nodes.push(a.noise(g), f, g);
    const f2 = a.filter('lowpass', 120, 0.7, out); const g2 = a.gain(0.03, f2);
    nodes.push(a.osc('sine', 50, g2), f2, g2); // motor hum
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
    const p = { dirt: [260, 0.10, 0.07], grass: [900, 0.05, 0.06], wood: [520, 0.12, 0.05], stone: [1500, 0.07, 0.035], gravel: [1100, 0.08, 0.06], cloth: [400, 0.05, 0.05], water: [2200, 0.09, 0.1] }[surface] || [300, 0.08, 0.06];
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
  relic(a, t) {
    for (const [fr, d] of [[659, 0], [988, 0.03], [1319, 0.06]]) {
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('triangle', fr, g, t + d);
      a.env(g, t + d, 0.01, 0.05, 0.6); o.stop(t + d + 0.7);
    }
    const f = a.filter('highpass', 4000, 0.7, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    a.env(g, t, 0.005, 0.05, 0.25); s.stop(t + 0.3);
  },
  hurt(a, t) {
    const f = a.filter('lowpass', 900, 1, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    a.env(g, t, 0.003, 0.25, 0.18); s.stop(t + 0.25);
    const g2 = a.gain(0.0001, a.sfxBus); const o = a.osc('sawtooth', 90, g2, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    a.env(g2, t, 0.005, 0.12, 0.3); o.stop(t + 0.35);
  },
  death(a, t) {
    for (const fr of [41, 43.6, 61.7]) {
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sawtooth', fr, g, t);
      o.frequency.exponentialRampToValueAtTime(fr / 2, t + 3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.stop(t + 3.6);
    }
  },
  hollow_cue(a, t) {
    // wet clicking, close to the ear
    for (let i = 0; i < 5; i++) {
      const tt = t + i * (0.05 + Math.random() * 0.05);
      const f = a.filter('bandpass', 1800 + Math.random() * 1200, 8, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, tt, false);
      a.env(g, tt, 0.001, 0.35, 0.03); s.stop(tt + 0.05);
    }
  },
  hollow_breath(a, t) {
    const f = a.filter('bandpass', 500, 3, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    f.frequency.linearRampToValueAtTime(800, t + 1);
    s.stop(t + 1.2);
  },
  hollow_hurt(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 1200, g, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    const f = a.filter('lowpass', 2000, 1); o.disconnect(); o.connect(f); f.connect(g);
    a.env(g, t, 0.003, 0.06, 0.25); o.stop(t + 0.3);
  },
  hollow_die(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sawtooth', 600, g, t); o.frequency.exponentialRampToValueAtTime(60, t + 1.2);
    a.env(g, t, 0.01, 0.06, 1.2); o.stop(t + 1.3);
    const f = a.filter('lowpass', 600, 0.7, a.sfxBus); const g2 = a.gain(0.0001, f); const s = a.noise(g2, t + 0.3, false);
    a.env(g2, t + 0.3, 0.2, 0.1, 1); s.stop(t + 1.6);
  },
  shade_cue(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 180, g, t); o.frequency.linearRampToValueAtTime(240, t + 2);
    const o2 = a.osc('sine', 183, g, t); o2.frequency.linearRampToValueAtTime(236, t + 2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.stop(t + 2.3); o2.stop(t + 2.3);
  },
  shade_stun(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 2400, g, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    a.env(g, t, 0.002, 0.05, 0.5); o.stop(t + 0.55);
  },
  penitent_rise(a, t) {
    for (const fr of [110, 164.8, 220]) {
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', fr, g, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.stop(t + 3.1);
    }
  },
  pickup(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('triangle', 523, g, t); o.frequency.setValueAtTime(784, t + 0.08);
    a.env(g, t, 0.004, 0.04, 0.3); o.stop(t + 0.35);
  },
  page(a, t) {
    const f = a.filter('bandpass', 3500, 0.8, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    s.stop(t + 0.3);
  },
  unlock(a, t) {
    SFX.locked(a, t);
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 140, g, t + 0.22);
    a.env(g, t + 0.22, 0.003, 0.05, 0.08); o.stop(t + 0.32);
  },
  phone_ring(a, t) {
    for (let i = 0; i < 2; i++) {
      const tt = t + i * 0.45;
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('square', 440, g, tt); const o2 = a.osc('square', 480, g, tt);
      const lfo = a.osc('square', 20, a.gain(0.02, g.gain), tt);
      g.gain.setValueAtTime(0.03, tt); g.gain.setValueAtTime(0.0001, tt + 0.38);
      o.stop(tt + 0.4); o2.stop(tt + 0.4); lfo.stop(tt + 0.4);
    }
  },
  phone_pickup(a, t) { SFX.bump(a, t); SFX.page(a, t + 0.05); },
  kettle(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 1800, g, t); o.frequency.linearRampToValueAtTime(2300, t + 1.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.stop(t + 2.5);
  },
  tape_click(a, t) {
    const f = a.filter('bandpass', 1500, 4, a.sfxBus); const g = a.gain(0.0001, f); const s = a.noise(g, t, false);
    a.env(g, t, 0.001, 0.3, 0.04); s.stop(t + 0.06);
  },
  // a voice heard through tape: you can tell it is speech, never what it says
  voice(a, t, { pitch = 1, dur = 1, rough = false }) {
    const f1 = a.filter('bandpass', 700 * pitch, 5, a.sfxBus), f2 = a.filter('bandpass', 1400 * pitch, 6, a.sfxBus);
    const g = a.gain(0.0001); g.connect(f1); g.connect(f2);
    const o = a.osc(rough ? 'sawtooth' : 'triangle', 140 * pitch, g, t);
    let tt = t;
    while (tt < t + dur) {
      const syl = 0.08 + Math.random() * 0.12;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(rough ? 0.09 : 0.06, tt + syl * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + syl);
      o.frequency.setValueAtTime(140 * pitch * (0.9 + Math.random() * 0.25), tt);
      tt += syl + Math.random() * 0.05;
    }
    o.stop(t + dur + 0.2);
  },
  bell(a, t, { n = 4 } = {}) {
    toll(a, a.sfxBus, [0, 196, 220, 246.9, 261.6, 293.7, 329.6, 349.2, 392][n] || 220, 0.07);
  },
  bell_wrong(a, t) {
    toll(a, a.sfxBus, 207.7, 0.07); toll(a, a.sfxBus, 220, 0.07); toll(a, a.sfxBus, 311.1, 0.05);
  },
  knock(a, t) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.32, g = a.gain(0.0001, a.sfxBus), o = a.osc('sine', 110, g, tt);
      o.frequency.exponentialRampToValueAtTime(70, tt + 0.08);
      a.env(g, tt, 0.002, 0.15, 0.1); o.stop(tt + 0.15);
    }
  },
  whisper(a, t) {
    const f = a.filter('bandpass', 2800, 2, a.sfxBus), g = a.gain(0.0001, f), s = a.noise(g, t, false);
    for (let k = 0; k < 4; k++) { const tt = t + k * 0.18; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.05, tt + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16); }
    s.stop(t + 0.9);
  },
  creak(a, t) { creak(a, a.sfxBus, 0.05); },
  mimic_shriek(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sawtooth', 900, g, t); const o2 = a.osc('sawtooth', 1270, g, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.4); o2.frequency.exponentialRampToValueAtTime(600, t + 0.4);
    a.env(g, t, 0.01, 0.05, 0.5); o.stop(t + 0.55); o2.stop(t + 0.55);
  },
  choir(a, t) {
    for (const fr of [196, 207.7, 261.6, 277.2]) {
      const g = a.gain(0.0001, a.sfxBus); const o = a.osc('triangle', fr, g, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      o.stop(t + 2.6);
    }
  },
  collapse(a, t) {
    const f = a.filter('lowpass', 400, 0.7, a.sfxBus), g = a.gain(0.0001, f), s = a.noise(g, t, false);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    s.stop(t + 2.6);
    for (let i = 0; i < 6; i++) { const tt = t + 0.1 + Math.random() * 1.2; const g2 = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 60 + Math.random() * 40, g2, tt); a.env(g2, tt, 0.003, 0.1, 0.15); o.stop(tt + 0.2); }
  },
  // a few notes, used sparingly: chapter cards and endings
  chapter(a, t) {
    [[146.8, 0], [174.6, 0.5], [164.8, 1.0], [130.8, 1.6]].forEach(([fr, d]) => {
      const g = a.gain(0.0001, a.music); const o = a.osc('triangle', fr, g, t + d); const o2 = a.osc('sine', fr / 2, g, t + d);
      a.env(g, t + d, 0.05, 0.06, 1.6); o.stop(t + d + 1.8); o2.stop(t + d + 1.8);
    });
  },
  ending(a, t) {
    [[220, 0], [261.6, 0.8], [246.9, 1.6], [196, 2.4], [220, 3.4]].forEach(([fr, d]) => {
      const g = a.gain(0.0001, a.music); const o = a.osc('triangle', fr, g, t + d);
      a.env(g, t + d, 0.08, 0.05, 2.2); o.stop(t + d + 2.4);
    });
  },
  bump(a, t) {
    const g = a.gain(0.0001, a.sfxBus); const o = a.osc('sine', 70, g, t);
    a.env(g, t, 0.003, 0.05, 0.06); o.stop(t + 0.1);
  },
};

export const SFX_NAMES = Object.keys(SFX);
export const AMBIENCE_NAMES = Object.keys(AMBIENCE);
