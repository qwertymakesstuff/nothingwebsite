// The scene runner. A script is a list of steps like ['say', 'rose', 'There you are.'] that run
// one after another. Control flow ('if', 'run') is handled here; every other step is handed to
// the host (the play scene), which may return a blocker: something with update(dt, input) that
// returns true once it is finished (a dialogue box, a fade, a walk). The runner waits on it.
//
// Steps:
//   ['say', who|null, text]          dialogue (who null = narration)
//   ['choice', [[label, steps|id], ...]]
//   ['if', condition, steps, elseSteps]
//   ['run', scriptId]
//   ['set'|'unset', flag]   ['give'|'take', item]   ['note', journalId]   ['obj', text]
//   ['go', room, spawn]     ['place', 'player', x, y, facing]   ['walk', who, x, y]   ['face', who, dir]
//   ['time', 'HH:MM']       ['wait', seconds]   ['fadeOut']   ['fadeIn']   ['card', lines, seconds]
//   ['sfx', name]           ['shake', amount, seconds]   ['save']   ['call', fn(state, host)]   ['end']

import { SCRIPTS } from './scripts.js';
import { cond } from './state.js';

export function resolve(script, state) {
  const s = typeof script === 'string' ? SCRIPTS[script] : script;
  if (!s) return [];
  return typeof s === 'function' ? s(state) : s;
}

const CONTROL = new Set(['if', 'run']);

export class Runner {
  constructor(steps, host, id = null) {
    this.host = host;
    this.id = id;
    this.stack = [{ steps: resolve(steps, host.state), i: 0 }];
    this.block = null;
    this.done = false;
  }

  push(steps) { this.stack.push({ steps: resolve(steps, this.host.state), i: 0 }); }

  next() {
    while (this.stack.length) {
      const f = this.stack[this.stack.length - 1];
      if (f.i < f.steps.length) return f.steps[f.i++];
      this.stack.pop();
    }
    return null;
  }

  update(dt, input) {
    for (let guard = 0; guard < 1000 && !this.done; guard++) {
      if (this.block) {
        if (!this.block.update(dt, input)) return;
        this.block = null;
        input.consume();
        dt = 0;
      }
      const step = this.next();
      if (!step) { this.done = true; return; }
      const [op, ...args] = step;
      if (CONTROL.has(op)) {
        if (op === 'if') this.push(cond(this.host.state, args[0]) ? args[1] || [] : args[2] || []);
        else this.push(args[0]);
        continue;
      }
      this.block = this.host.exec(op, args, this) || null;
    }
  }

  draw(g) { this.block?.draw?.(g); }
}
