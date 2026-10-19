// LAST EXIT: walks one dialogue scene against the story state (pure). The game's conversation player (conversation.js) and the headless
// campaign test drive the same class, so what the tests play is exactly what the game plays.
import { SCENES, LINES } from './dialogue.js';
import { evalCond, applyEffects } from './state.js';

export class SceneRunner {
  /** state: the story state object (mutated by effects). sceneId or a scene object. */
  constructor(state, scene) {
    this.s = state; this.scene = typeof scene === 'string' ? SCENES[scene] : scene;
    if (!this.scene) throw new Error('unknown scene ' + scene);
    this.stack = [{ steps: this.scene.steps, i: 0 }]; this.pending = null; this.finished = false; this.said = [];
  }
  /** Next thing to present: { type: 'line', line } | { type: 'choice', key, prompt, options } | { type: 'pause', sec } | { type: 'act', act } | { type: 'done' } */
  next() {
    if (this.pending) throw new Error('answer the pending choice first');
    for (;;) {
      const top = this.stack[this.stack.length - 1];
      if (!top) { this.finished = true; return { type: 'done' }; }
      if (top.i >= top.steps.length) { this.stack.pop(); continue; }
      const st = top.steps[top.i++];
      if (st.k === 'line') { const line = LINES[st.id]; if (!evalCond(line.if, this.s)) continue; this.said.push(st.id); return { type: 'line', line }; }
      if (st.k === 'fx') { applyEffects(this.s, st); if (st.ending) this.s.ending = st.ending; if (st.call) this.s.calls[st.call] = true; continue; }
      if (st.k === 'if') { this.stack.push({ steps: evalCond(st.cond, this.s) ? st.then : st.else, i: 0 }); continue; }
      if (st.k === 'pause') return { type: 'pause', sec: st.sec };
      if (st.k === 'act') return { type: 'act', act: st };
      if (st.k === 'choice') {
        const options = st.options.filter(o => evalCond(o.if, this.s));
        if (!options.length) continue;
        this.pending = { key: st.key, options }; return { type: 'choice', key: st.key, prompt: st.prompt, options: options.map((o, n) => ({ index: n, label: o.t, value: o.v })) };
      }
    }
  }
  /** answer the pending choice by index into the options list that was offered */
  choose(index) {
    const p = this.pending; if (!p) throw new Error('no choice pending');
    const o = p.options[index]; if (!o) throw new Error('bad choice ' + index);
    this.pending = null;
    if (p.key && o.v !== undefined) this.s.choices[p.key] = o.v;
    applyEffects(this.s, o); if (o.ending) this.s.ending = o.ending;
    this.stack.push({ steps: o.steps, i: 0 });
    return o;
  }
}
/** Run a scene to the end with no player: choices are picked by `pick(key, options) -> index`. Returns the line ids spoken. */
export function runScene(state, sceneId, pick) {
  const r = new SceneRunner(state, sceneId); let guard = 0;
  for (;;) {
    const e = r.next(); if (e.type === 'done') return r.said;
    if (e.type === 'choice') r.choose(pick ? pick(e.key, e.options) : 0);
    if (++guard > 5000) throw new Error('scene did not finish: ' + sceneId);
  }
}
