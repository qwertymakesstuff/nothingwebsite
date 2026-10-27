// Sound: a small Web Audio chiptune player for the tunes in data/music.js and synthesized
// sound effects. Nothing is loaded from files. Audio starts on the first key press or tap
// (browsers require a gesture).

import { TRACKS } from './data/music.js';

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  constructor(settings) {
    this.settings = { ...settings };
    this.ctx = null;
    this.track = null;
    this.want = null;
    this.step = 0;
    this.nextTime = 0;
    this.night = false;
    this.season = 0;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.connect(this.master);
    this.fx = this.ctx.createGain(); this.fx.connect(this.master);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applySettings(this.settings);
    this.timer = setInterval(() => this.schedule(), 30);
    if (this.want) this.setTrack(this.want);
  }

  applySettings(s) {
    this.settings = { ...s };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.volume ?? 0.6, t, 0.05);
    this.music.gain.setTargetAtTime(s.music ? 0.55 : 0, t, 0.1);
    this.fx.gain.setTargetAtTime(s.sfx ? 0.8 : 0, t, 0.02);
  }

  setTrack(name) {
    this.want = name;
    if (!this.ctx || this.track === name) return;
    this.track = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.3;
  }

  setMood({ night, season }) { this.night = night; this.season = season; }

  schedule() {
    if (!this.ctx || !this.track || !this.settings.music) return;
    const tr = TRACKS[this.track] || TRACKS.farm;
    const bpm = tr.bpm * (this.night ? 0.82 : 1);
    const stepDur = 60 / bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(tr, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 128;
    }
  }

  playStep(tr, step, t, dur) {
    const section = Math.floor(step / 32); // A A B A
    const mel = section === 2 ? tr.b : tr.a;
    const i = step % 32;
    const bar = Math.floor(i / 8);
    const deg = mel[i];
    const sc = tr.scale;
    const note = d => tr.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const chord = tr.chords[bar];
    const leadType = this.season === 3 || this.night ? 'triangle' : tr.lead || 'square';
    if (deg != null) {
      let len = 1;
      while (i + len < 32 && mel[i + len] == null && len < 4) len++;
      this.voice(midi(note(deg)), t, dur * len * 0.9, leadType, leadType === 'square' ? 0.045 : 0.09);
    }
    // bass on quarter notes: root, fifth
    if (i % 2 === 0) {
      const b = note(chord) - 24 + (i % 4 === 2 ? 7 : 0);
      this.voice(midi(b), t, dur * 1.7, 'triangle', 0.12);
    }
    // soft chord pad once per bar
    if (i % 8 === 0) for (const k of [0, 2, 4]) this.voice(midi(note(chord + k) - 12), t, dur * 7.5, 'sine', 0.022, 0.25);
    if (tr.hats && !this.night && i % 2 === 1) this.noise(t, 0.03, 7000, 0.025, this.music);
  }

  voice(freq, t, len, type, gain, attack = 0.01) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(gain * 0.5, t + Math.max(attack + 0.01, len * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(this.music);
    o.start(t); o.stop(t + len + 0.05);
  }

  noise(t, len, freq, gain, dest, q = 1, type = 'highpass') {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + len + 0.02);
  }

  tone(freq, len, type = 'square', gain = 0.12, slide = null, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(this.fx);
    o.start(t); o.stop(t + len + 0.02);
  }

  sfx(name) {
    if (!this.ctx || !this.settings.sfx) return;
    const t = this.ctx.currentTime, n = (len, f, gain, q, type) => this.noise(t, len, f, gain, this.fx, q, type);
    switch (name) {
      case 'till': case 'thud': n(0.12, 400, 0.5, 1, 'lowpass'); this.tone(90, 0.1, 'triangle', 0.2, 50); break;
      case 'water': n(0.25, 1200, 0.25, 2, 'bandpass'); break;
      case 'splash': n(0.2, 900, 0.18, 2, 'bandpass'); break;
      case 'refill': for (let i = 0; i < 4; i++) this.tone(400 + i * 90, 0.06, 'sine', 0.1, 700 + i * 90, i * 0.06); break;
      case 'chop': n(0.08, 1800, 0.35, 3, 'bandpass'); this.tone(180, 0.06, 'square', 0.06, 120); break;
      case 'fell': n(0.4, 600, 0.4, 1, 'lowpass'); this.tone(140, 0.3, 'triangle', 0.18, 60); break;
      case 'clink': this.tone(1400, 0.06, 'square', 0.06, 1100); n(0.05, 4000, 0.15, 2, 'bandpass'); break;
      case 'smash': n(0.25, 2500, 0.3, 1, 'bandpass'); this.tone(220, 0.15, 'square', 0.06, 110); break;
      case 'clank': this.tone(300, 0.15, 'square', 0.08, 280); this.tone(330, 0.15, 'square', 0.05, 300); break;
      case 'cut': n(0.08, 3000, 0.2, 2, 'highpass'); break;
      case 'swing': n(0.07, 2000, 0.06, 1, 'bandpass'); break;
      case 'plant': this.tone(500, 0.05, 'triangle', 0.12, 700); break;
      case 'place': this.tone(200, 0.08, 'square', 0.08, 150); n(0.06, 800, 0.2, 1, 'lowpass'); break;
      case 'harvest': [0, 4, 7].forEach((s, i) => this.tone(midi(72 + s), 0.09, 'square', 0.06, null, i * 0.05)); break;
      case 'pop': this.tone(600, 0.06, 'square', 0.07, 900); break;
      case 'ship': case 'coin': this.tone(988, 0.06, 'square', 0.06); this.tone(1319, 0.14, 'square', 0.06, null, 0.06); break;
      case 'deny': this.tone(160, 0.14, 'square', 0.07, 120); break;
      case 'door': n(0.15, 300, 0.25, 1, 'lowpass'); this.tone(120, 0.12, 'triangle', 0.12, 90); break;
      case 'talk': case 'blip': this.tone(700 + Math.random() * 200, 0.03, 'square', 0.03); break;
      case 'menu': this.tone(880, 0.04, 'square', 0.04); break;
      case 'love': [0, 4, 7, 12].forEach((s, i) => this.tone(midi(76 + s), 0.1, 'triangle', 0.12, null, i * 0.07)); break;
      case 'quest': case 'catch': [0, 4, 7, 12, 7, 12].forEach((s, i) => this.tone(midi(67 + s), 0.12, 'square', 0.05, null, i * 0.08)); break;
      case 'craft': [0, 7, 12].forEach((s, i) => this.tone(midi(64 + s), 0.08, 'square', 0.05, null, i * 0.06)); break;
      case 'cast': n(0.25, 1500, 0.12, 1, 'bandpass'); this.tone(300, 0.25, 'sine', 0.05, 900); break;
      case 'bite': this.tone(1200, 0.08, 'square', 0.08); this.tone(1500, 0.08, 'square', 0.08, null, 0.1); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(t + i * 0.09, 0.05, 1800, 0.2, this.fx, 2, 'bandpass'); break;
      case 'day': [0, 2, 4, 7].forEach((s, i) => this.tone(midi(60 + s), 0.25, 'triangle', 0.1, null, i * 0.12)); break;
      default: break;
    }
  }
}
