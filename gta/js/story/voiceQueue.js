// LAST EXIT: the dialogue queue (pure). Decides what is spoken when: priorities, interruption, FIFO within a priority, duplicates that
// must not restart, and how long a line stays on screen (the real recording length when there is one, a reading-time estimate when not).
// The browser side (voice.js) plugs real audio and the subtitle bar into the hooks; tests plug in fakes.
import { readSeconds } from './dialogue.js';

export class VoiceQueue {
  /** hooks: { start(item), end(item, reason), now() } ; options: cooldown (seconds a line may not restart), max (queue length) */
  constructor(hooks, opts) { this.h = hooks || {}; this.cur = null; this.q = []; this.recent = new Map(); this.t = 0; this.cooldown = (opts && opts.cooldown) != null ? opts.cooldown : 8; this.max = (opts && opts.max) || 8; this.log = []; }
  /** line: a dialogue-database record; o: { force, audioDuration, tag } */
  play(line, o) {
    o = o || {}; const id = line.id;
    if (!o.force) {
      if ((this.cur && this.cur.id === id) || this.q.some(i => i.id === id)) return false;                       // already speaking or waiting: never restart
      const last = this.recent.get(id); if (last != null && this.t - last < this.cooldown) return false;          // a trigger crossed again: ignore
    }
    const dur = o.audioDuration > 0 ? o.audioDuration + .35 : readSeconds(line.text.en) + .25;
    const item = { id, line, pri: o.pri != null ? o.pri : line.pri != null ? line.pri : 2, dur, t: 0, tag: o.tag || null, o, hasAudio: o.audioDuration > 0, via: line.via, audio: null };
    if (this.cur && o.force && this.cur.id === id) { this.finish('restarted'); this.begin(item); return true; }                // the testing tool replays a line on demand
    if (this.cur && item.pri > this.cur.pri) { this.finish('interrupted'); this.begin(item); return true; }
    if (!this.cur && !this.fin) { this.begin(item); return true; }                                            // (not while a line is being ended: its hook may play again)
    this.q.push(item); this.q.sort((a, b) => b.pri - a.pri);                                                     // stable: same priority keeps arrival order
    while (this.q.length > this.max) this.q.pop();
    return true;
  }
  begin(item) { this.cur = item; this.recent.set(item.id, this.t); this.log.push(['start', item.id]); this.h.start && this.h.start(item); }
  finish(reason) { const c = this.cur; if (!c) return; this.cur = null; this.log.push([reason, c.id]); this.fin = true; try { this.h.end && this.h.end(c, reason); } finally { this.fin = false; } }
  /** advance time. audioDone: has the recording ended (when there is one)? */
  update(dt) {
    this.t += dt;
    if (this.cur) {
      this.cur.t += dt; const a = this.cur.audio, over = a ? a.done() : this.cur.t >= this.cur.dur;
      if (over || this.cur.t >= this.cur.dur + 30) this.finish('done');                                           // never wait more than 30 s past the estimate
    }
    if (!this.cur && this.q.length) this.begin(this.q.shift());
  }
  /** finish the current line now (the player pressed skip) */
  skip() { if (this.cur) this.finish('skipped'); if (!this.cur && this.q.length) this.begin(this.q.shift()); }
  /** drop everything (mission over, scene changed), or just the lines with this tag */
  clear(tag) {
    if (tag == null) { this.q = []; if (this.cur) this.finish('cleared'); return; }
    this.q = this.q.filter(i => i.tag !== tag); if (this.cur && this.cur.tag === tag) this.finish('cleared');
  }
  get busy() { return !!this.cur || this.q.length > 0; }
  /** is this line (by id) speaking or waiting right now */
  has(id) { return (this.cur && this.cur.id === id) || this.q.some(i => i.id === id); }
}
