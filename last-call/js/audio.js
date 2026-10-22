// Synthesised sound: a muffled "through the door" club loop per venue and short UI effects.
// Everything is generated with WebAudio — no audio files. Starts on the first user gesture.

const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);
const PATTERNS = {
  pub: { kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], bass: [0, 0, 7, 5], swing: 0.08 },
  punk: { kick: [0, 3, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 0, 3, 5], swing: 0 },
  lounge: { kick: [0, 10], snare: [], hat: [4, 12], bass: [0, 4, 7, 9], swing: 0.12 },
  techno: { kick: [0, 4, 8, 12], snare: [], hat: [2, 6, 10, 14], bass: [0, 0, 0, 3], swing: 0 },
  jazz: { kick: [0], snare: [], hat: [4, 10, 12], bass: [0, 3, 5, 7], swing: 0.16 },
};

export function createAudio() {
  let ctx = null, master, musicBus, sfxBus, filter, timer = null, step = 0, nextTime = 0, venue = null;
  const vol = { master: 0.8, music: 0.5, sfx: 0.8 };

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 520; filter.Q.value = 0.7;
    musicBus.connect(filter); filter.connect(master); sfxBus.connect(master);
    apply();
    return true;
  }
  function apply() {
    if (!ctx) return;
    master.gain.value = vol.master;
    musicBus.gain.value = vol.music * 0.55;
    sfxBus.gain.value = vol.sfx;
  }

  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, freq, t, dur, peak, bus, glide) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    env(g, t, 0.005, dur, peak); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, peak, bus, hp = 6000) {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); env(g, t, 0.002, dur, peak);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t);
  }

  function schedule() {
    if (!venue) return;
    const pat = PATTERNS[venue.mode];
    const spb = 60 / venue.bpm / 4;
    while (nextTime < ctx.currentTime + 0.2) {
      const s = step % 16;
      const t = nextTime + (s % 2 ? pat.swing * spb : 0);
      if (pat.kick.includes(s)) osc('sine', 120, t, 0.18, 0.9, musicBus, 42);
      if (pat.snare.includes(s)) noise(t, 0.12, 0.35, musicBus, 1200);
      if (pat.hat.includes(s)) noise(t, 0.04, 0.12, musicBus, 7000);
      if (s % 4 === 0) {
        const bar = Math.floor(step / 16) % 4;
        osc(venue.mode === 'techno' ? 'sawtooth' : 'triangle', NOTE(venue.root + pat.bass[bar]), t, spb * 3.2, 0.32, musicBus);
      }
      step++; nextTime += spb;
    }
  }

  const api = {
    unlock() { ensure(); },
    setVolumes(v) { Object.assign(vol, v); apply(); },
    music(v) {
      venue = v;
      if (!ensure()) return;
      if (timer) clearInterval(timer);
      if (!v) { timer = null; return; }
      step = 0; nextTime = ctx.currentTime + 0.05;
      timer = setInterval(schedule, 50);
    },
    // Door open: the filter opens up for a moment.
    door() { if (!ctx) return; const t = ctx.currentTime; filter.frequency.cancelScheduledValues(t); filter.frequency.setValueAtTime(2400, t); filter.frequency.exponentialRampToValueAtTime(520, t + 1.2); },
    sfx(name) {
      if (!ensure()) return;
      const t = ctx.currentTime;
      switch (name) {
        case 'click': osc('square', 880, t, 0.03, 0.08, sfxBus); break;
        case 'stamp': noise(t, 0.08, 0.5, sfxBus, 300); osc('sine', 90, t, 0.12, 0.6, sfxBus, 50); break;
        case 'admit': osc('triangle', NOTE(72), t, 0.12, 0.25, sfxBus); osc('triangle', NOTE(79), t + 0.09, 0.18, 0.25, sfxBus); break;
        case 'refuse': osc('triangle', NOTE(67), t, 0.12, 0.25, sfxBus); osc('triangle', NOTE(60), t + 0.09, 0.2, 0.25, sfxBus); break;
        case 'right': osc('sine', NOTE(84), t, 0.1, 0.2, sfxBus); osc('sine', NOTE(88), t + 0.07, 0.16, 0.2, sfxBus); break;
        case 'wrong': osc('sawtooth', 160, t, 0.32, 0.22, sfxBus, 110); break;
        case 'walkout': osc('sine', 440, t, 0.4, 0.15, sfxBus, 220); break;
        case 'alert': for (let i = 0; i < 3; i++) osc('square', 740, t + i * 0.16, 0.08, 0.12, sfxBus); break;
        case 'cash': noise(t, 0.05, 0.3, sfxBus, 3000); osc('sine', NOTE(91), t + 0.05, 0.3, 0.2, sfxBus); break;
        case 'buy': osc('triangle', NOTE(76), t, 0.08, 0.2, sfxBus); osc('triangle', NOTE(83), t + 0.06, 0.14, 0.2, sfxBus); break;
        case 'type': osc('square', 1400 + Math.random() * 300, t, 0.012, 0.03, sfxBus); break;
        default: break;
      }
    },
  };
  return api;
}
