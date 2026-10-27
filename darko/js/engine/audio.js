// All sound is synthesised with Web Audio at runtime: no samples and no recordings.
// Two buses under a master gain: "music" carries ambience beds and drones, "sfx" everything else.
// Every method is a safe no-op until unlock() succeeds (browsers need a user gesture first) and
// where there is no AudioContext at all.

const AC = globalThis.AudioContext || globalThis.webkitAudioContext;

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.7, sfx: 0.8 };
    this.amb = null;      // { name, gain, stop() }
    this.wantAmb = null;  // requested before unlock
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
      this.noise = this.makeNoise(3);
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
    this.music.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }

  makeNoise(seconds) {
    const c = this.ctx, len = c.sampleRate * seconds;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = i & 1 ? w : w * 0.6 + b * 3; }
    return buf;
  }

  // ---- building blocks -------------------------------------------------------------------

  env(dest, t0, a, peak, d, sustain = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t0 + a + d);
    g.connect(dest);
    return g;
  }

  tone(type, f0, f1, dur, peak, dest = this.sfxBus, t0 = this.ctx.currentTime) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    o.connect(this.env(dest, t0, 0.005, peak, dur));
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  hiss(dur, peak, filter = 'lowpass', freq = 1200, q = 0.7, dest = this.sfxBus, t0 = this.ctx.currentTime, attack = 0.005) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filter; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    s.connect(f); f.connect(this.env(dest, t0, attack, peak, dur));
    s.start(t0, Math.random() * 2); s.stop(t0 + attack + dur + 0.05);
    return f;
  }

  // ---- one-shots ---------------------------------------------------------------------------

  sfx(name) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'move': this.tone('square', 660, 660, 0.03, 0.04); break;
      case 'select': this.tone('square', 520, 780, 0.07, 0.05); break;
      case 'back': this.tone('square', 520, 330, 0.07, 0.04); break;
      case 'deny': this.tone('square', 140, 110, 0.12, 0.06); break;
      case 'blip': this.tone('triangle', 300 + Math.random() * 40, 300, 0.025, 0.05); break;
      case 'blipLow': this.tone('triangle', 170 + Math.random() * 20, 170, 0.03, 0.06); break;
      case 'step': this.hiss(0.05, 0.05, 'lowpass', 500 + Math.random() * 200); break;
      case 'stepOut': this.hiss(0.06, 0.04, 'bandpass', 1800 + Math.random() * 400, 1.5); break;
      case 'door':
        this.hiss(0.25, 0.08, 'lowpass', 700, 1, this.sfxBus, t, 0.02);
        this.tone('sine', 90, 60, 0.18, 0.18, this.sfxBus, t + 0.18);
        break;
      case 'locked':
        this.tone('square', 220, 200, 0.04, 0.05); this.tone('square', 210, 190, 0.04, 0.05, this.sfxBus, t + 0.07);
        break;
      case 'knock':
        for (let i = 0; i < 3; i++) this.tone('sine', 140, 80, 0.07, 0.25, this.sfxBus, t + i * 0.16);
        break;
      case 'pickup': this.tone('triangle', 440, 440, 0.06, 0.06); this.tone('triangle', 660, 660, 0.1, 0.06, this.sfxBus, t + 0.07); break;
      case 'note': this.tone('sine', 880, 880, 0.08, 0.05); this.tone('sine', 1100, 1100, 0.16, 0.04, this.sfxBus, t + 0.08); break;
      case 'save': this.tone('sine', 392, 392, 0.12, 0.06); this.tone('sine', 523, 523, 0.2, 0.06, this.sfxBus, t + 0.12); break;
      case 'switch': this.tone('square', 1800, 1200, 0.015, 0.05); break;
      case 'pills':
        for (let i = 0; i < 5; i++) this.tone('square', 2400 + Math.random() * 800, 2000, 0.012, 0.03, this.sfxBus, t + i * 0.05 + Math.random() * 0.02);
        break;
      case 'tap': this.hiss(0.6, 0.05, 'bandpass', 2600, 2, this.sfxBus, t, 0.05); break;
      case 'blower': {
        const f = this.hiss(1.6, 0.16, 'bandpass', 900, 1.2, this.sfxBus, t, 0.15);
        f.frequency.linearRampToValueAtTime(1500, t + 0.4);
        this.tone('sawtooth', 70, 95, 1.6, 0.04);
        break;
      }
      case 'static': this.hiss(0.4, 0.07, 'highpass', 3000); break;
      case 'thud': this.tone('sine', 70, 40, 0.3, 0.3); this.hiss(0.15, 0.08, 'lowpass', 300); break;
      case 'sting':
        this.tone('sawtooth', 55, 52, 2.4, 0.08, this.sfxBus);
        this.tone('sine', 1244, 1180, 2.0, 0.025, this.sfxBus);
        break;
      default: break;
    }
  }

  // ---- ambience beds -----------------------------------------------------------------------

  ambience(name) {
    this.wantAmb = name;
    if (!this.ready) return;
    if (this.amb && this.amb.name === name) return;
    if (this.amb) { const old = this.amb; old.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4); setTimeout(() => old.stop(), 2000); }
    this.amb = null;
    if (!name || name === 'none') return;
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.setTargetAtTime(1, c.currentTime, 0.6);
    g.connect(this.music);
    const nodes = [], timers = [];
    const loopNoise = (filter, freq, gain, q = 0.7) => {
      const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
      const v = c.createGain(); v.gain.value = gain;
      s.connect(f); f.connect(v); v.connect(g); s.start();
      nodes.push(s);
      return { f, v };
    };
    const drone = (type, freq, gain) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const v = c.createGain(); v.gain.value = gain;
      o.connect(v); v.connect(g); o.start();
      nodes.push(o);
      return { o, v };
    };
    const lfo = (target, rate, depth) => {
      const o = c.createOscillator(); o.frequency.value = rate;
      const v = c.createGain(); v.gain.value = depth;
      o.connect(v); v.connect(target); o.start();
      nodes.push(o);
    };
    const every = (ms, fn) => { const id = setInterval(() => { if (this.ready) fn(c.currentTime); }, ms); timers.push(id); };

    if (name === 'house') {
      // refrigerator hum, room tone, a clock somewhere
      drone('sine', 60, 0.025); drone('sine', 120, 0.008);
      loopNoise('lowpass', 220, 0.05);
      every(1000, t => this.tone('square', 3200, 3000, 0.008, 0.012, g, t));
    } else if (name === 'night') {
      // wind through the pines, crickets, the odd far-off dog
      const w = loopNoise('bandpass', 400, 0.08, 0.5);
      lfo(w.f.frequency, 0.07, 180);
      lfo(w.v.gain, 0.11, 0.04);
      every(380, t => { if (Math.random() < 0.8) for (let i = 0; i < 3; i++) this.tone('sine', 4300 + Math.random() * 120, 4300, 0.025, 0.01, g, t + i * 0.045); });
      every(9000, t => { if (Math.random() < 0.3) for (let i = 0; i < 2; i++) this.tone('sawtooth', 380, 300, 0.12, 0.006, g, t + i * 0.3); });
    } else if (name === 'dusk') {
      const w = loopNoise('bandpass', 500, 0.06, 0.5);
      lfo(w.f.frequency, 0.05, 200);
      every(2400, t => { if (Math.random() < 0.4) this.tone('sine', 2600 + Math.random() * 800, 2200, 0.09, 0.008, g, t); });
    } else if (name === 'title') {
      const a = drone('sawtooth', 55, 0.03), b = drone('sawtooth', 55.4, 0.03), d = drone('sine', 82.4, 0.03);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      for (const n of [a, b]) { n.v.disconnect(); n.v.connect(f); }
      f.connect(g);
      lfo(f.frequency, 0.05, 160);
      lfo(d.v.gain, 0.09, 0.02);
      loopNoise('bandpass', 300, 0.03, 0.4);
    } else if (name === 'tv') {
      drone('sine', 60, 0.02);
      loopNoise('bandpass', 1400, 0.025, 1.5);
      every(1000, t => this.tone('square', 3200, 3000, 0.008, 0.01, g, t));
    }

    this.amb = {
      name, gain: g,
      stop: () => {
        timers.forEach(clearInterval);
        for (const n of nodes) { try { n.stop(); } catch { /* already stopped */ } }
        g.disconnect();
      },
    };
  }
}
