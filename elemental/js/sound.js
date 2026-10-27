// Tiny synthesised sound effects (WebAudio, no files). Silent until the first user gesture.
let ctx = null;

const SOUNDS = {
  place: [[520, 0.06, 'triangle', 0.12]],
  remove: [[300, 0.07, 'triangle', 0.1]],
  fail: [[180, 0.12, 'square', 0.06], [140, 0.14, 'square', 0.05, 0.08]],
  combine: [[440, 0.08, 'sine', 0.14], [660, 0.1, 'sine', 0.12, 0.07]],
  discover: [[523, 0.1, 'triangle', 0.16], [659, 0.1, 'triangle', 0.16, 0.09], [784, 0.12, 'triangle', 0.16, 0.18], [1047, 0.22, 'sine', 0.14, 0.27]],
};

export const sound = {
  enabled: true,
  play(name) {
    if (!this.enabled || !SOUNDS[name]) return;
    try {
      ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      for (const [freq, dur, type, vol, delay = 0] of SOUNDS[name]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + delay);
        g.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        o.connect(g).connect(ctx.destination);
        o.start(now + delay);
        o.stop(now + delay + dur + 0.02);
      }
    } catch { /* no audio available */ }
  },
};
