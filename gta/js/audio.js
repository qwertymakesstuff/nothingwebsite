// Procedural sound: all effects are synthesised, nothing is downloaded.
export let ac = null;
let master = null, noiseBuf = null, engOsc = null, engGain = null, sirenOsc = null, sirenGain = null;
export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; engOsc = ac.createOscillator(); engOsc.type = 'sawtooth'; engGain = ac.createGain(); engGain.gain.value = 0;
    engOsc.connect(lp); lp.connect(engGain); engGain.connect(master); engOsc.start();
    sirenOsc = ac.createOscillator(); sirenOsc.type = 'square'; sirenGain = ac.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  } catch (e) { ac = null; }
}
export function tone(f, d, type, v, slide) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05); }
export function noise(d, v, cut) { if (!ac) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime; s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = cut || 1000; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5, d + .05); }
export const sfx = {
  shot: () => { noise(.12, .3, 4000); tone(160, .12, 'square', .1, 60); },
  crash: v => { noise(.25, Math.min(.5, v), 700); tone(80, .2, 'sine', Math.min(.4, v), 40); },
  boom: () => { noise(1.1, .6, 500); tone(60, .9, 'sine', .5, 25); },
  cash: () => { tone(988, .1, 'sine', .12); setTimeout(() => tone(1319, .18, 'sine', .12), 90); },
  horn: () => { tone(330, .35, 'sawtooth', .08); tone(415, .35, 'sawtooth', .08); },
  door: () => { noise(.1, .15, 900); },
  scream: () => tone(900, .35, 'sawtooth', .05, 500)
};

/** Engine hum for the driven car (speed in m/s, or null when on foot) and the siren while police are close. */
export function setEngine(speed) { if (!ac || !engGain) return; engGain.gain.value = speed == null ? 0 : .04 + Math.min(.05, Math.abs(speed) * .0012); engOsc.frequency.value = 45 + Math.abs(speed || 0) * 3.2; }
export function setSiren(on, t) { if (!ac || !sirenGain) return; sirenGain.gain.value = on ? .018 : 0; sirenOsc.frequency.value = 650 + Math.sin(t * 6) * 220; }
export function resumeAudio() { if (ac && ac.state === 'suspended') ac.resume(); }
