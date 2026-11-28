// Short synthesized interface sounds. Quiet, rare, and switched off in Personalize > Sounds.
import { save } from './state.js';
let ctx = null;
const SOUNDS = {
  startup: [[523, 0, .18], [659, .14, .18], [784, .28, .22], [1047, .44, .5]],
  notify: [[880, 0, .09], [1175, .08, .14]],
  close: [[300, 0, .05]],
  minimize: [[420, 0, .04], [300, .03, .05]],
  error: [[220, 0, .12], [196, .12, .2]],
  click: [[1200, 0, .015]],
  shutdown: [[784, 0, .2], [659, .16, .2], [523, .32, .4]],
};
export function sound(name) {
  if (!save.get().settings.sounds) return;
  try {
    ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    for (const [f, at, len] of SOUNDS[name] || []) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = name === 'error' ? 'square' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(name === 'click' ? .03 : .06, t0 + at + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + at + len);
      o.connect(g).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + len + .05);
    }
  } catch {}
}
export function audioCtx() { try { ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)(); return ctx; } catch { return null; } }
