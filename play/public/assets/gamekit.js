// Shared arcade kit. A game extends Game, sets a size, and implements:
//   reset()            put everything back to the start
//   update(dt)         advance the game by dt seconds (only called while playing)
//   draw(ctx, w, h)    paint one frame (called every frame, also while paused / on the start screen)
//   press(code)        a key (or on-screen button / swipe / tap) was pressed; codes are normalised:
//                      Arrow*, Space, Enter, Escape and letters like 'KeyZ' (WASD arrive as arrows)
//   pointer(type, x, y, event)   optional: 'down' | 'move' | 'up' in canvas coordinates
// The kit provides the page chrome (title, score, best, pause, mute), start / pause / game-over screens,
// keyboard + touch controls, sound, a high score saved in the browser, and pausing when the tab is hidden.

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const choice = (list) => list[Math.floor(Math.random() * list.length)];
export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const KEY_ALIASES = { KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight' };
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
export const dirOf = (code) => DIRS[code] || null;

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode / full */ } },
};
export const saved = store;

let audioCtx = null;

export class Game {
  /**
   * @param {{ slug: string, title: string, width: number, height: number, help?: string, bg?: string,
   *           controls?: { dpad?: boolean, buttons?: { code: string, label: string, hold?: boolean, wide?: boolean }[],
   *                        swipe?: boolean, tap?: string, pointer?: boolean },
   *           lowerIsBetter?: boolean, scoreLabel?: string }} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.slug = opts.slug;
    this.w = opts.width;
    this.h = opts.height;
    this.state = 'ready'; // ready | playing | paused | over
    this.score = 0;
    this.choice = opts.choices ? store.get(`play:${opts.slug}:choice`, opts.choices[0].id) : null;
    if (opts.choices && !opts.choices.some((c) => c.id === this.choice)) this.choice = opts.choices[0].id;
    this.best = store.get(this.bestKey(), 0);
    this.keys = new Set();
    this.muted = store.get('play:muted', false);
    this.time = 0;
    this.pointerPos = { x: this.w / 2, y: this.h / 2, down: false, inside: false };
  }

  // ---- to override ----
  reset() {}
  update() {}
  draw() {}
  press() {}
  pointer() {}

  held(code) { return this.keys.has(code); }
  bestKey() { return `play:${this.slug}:best${this.choice ? `:${this.choice}` : ''}`; }

  // ---- lifecycle ----
  mount(root = document.getElementById('game')) {
    const { title, help = '', controls = {} } = this.opts;
    this.root = root;
    this.canvas = h('canvas', { class: 'gk-canvas', width: 10, height: 10, tabindex: '0', 'aria-label': `${title} game board` });
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = h('span', { class: 'gk-score' }, '0');
    this.bestEl = h('span', { class: 'gk-best' }, '0');
    this.pauseBtn = h('button', { class: 'gk-btn', type: 'button', 'aria-label': 'Pause', onclick: () => this.togglePause() }, 'Pause');
    this.muteBtn = h('button', { class: 'gk-btn', type: 'button', 'aria-pressed': String(this.muted), 'aria-label': 'Sound', onclick: () => this.setMuted(!this.muted) }, '');
    this.overlayTitle = h('h2');
    this.overlayText = h('p');
    this.overlayBtn = h('button', { class: 'gk-play', type: 'button', onclick: () => this.primary() }, 'Play');
    this.choiceRow = this.opts.choices ? h('div', { class: 'gk-choices', role: 'group', 'aria-label': this.opts.choiceLabel || 'Mode' }, this.opts.choices.map((c) => h('button', {
      class: 'gk-choice', type: 'button', 'data-id': c.id, 'aria-pressed': String(c.id === this.choice),
      onclick: () => this.setChoice(c.id),
    }, c.label))) : null;
    this.overlay = h('div', { class: 'gk-overlay' }, this.overlayTitle, this.overlayText, this.choiceRow, this.overlayBtn);
    this.stage = h('div', { class: 'gk-stage', style: `--ratio:${this.w / this.h}; --w:${this.w}px` }, this.canvas, this.overlay);

    const bar = h('div', { class: 'gk-bar' },
      h('h1', {}, title),
      h('div', { class: 'gk-scores', 'aria-live': 'polite' }, h('span', {}, this.opts.scoreLabel || 'Score', ' ', this.scoreEl), h('span', { class: 'gk-sep' }, '·'), h('span', {}, 'Best ', this.bestEl)),
      h('div', { class: 'gk-tools' }, this.pauseBtn, this.muteBtn));
    root.dataset.ctl = controls.dpad ? 'dpad' : (controls.buttons || []).length ? 'buttons' : 'none';
    root.replaceChildren(bar, this.stage, this.buildTouch(controls), h('p', { class: 'gk-help' }, help));

    this.fit();
    this.paintMute();
    this.bestEl.textContent = this.bestText();
    this.bind(controls);
    this.reset();
    this.showOverlay('ready');
    this.last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      if (this.state === 'playing') this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
    window.__game = this; // handy for tests
    return this;
  }

  fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dpr = dpr;
  }

  render() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.opts.bg || '#0b0b10';
    ctx.fillRect(0, 0, this.w, this.h);
    this.draw(ctx, this.w, this.h);
  }

  fmt(n) { return this.opts.format ? this.opts.format(n) : String(n); }

  bestText() { return this.opts.lowerIsBetter && !this.best ? '–' : this.fmt(this.best); }

  setScore(n) {
    this.score = n;
    this.scoreEl.textContent = this.fmt(n);
  }
  addScore(n) { this.setScore(this.score + n); }

  setChoice(id) {
    if (this.state === 'playing' || this.state === 'paused') return;
    this.choice = id;
    store.set(`play:${this.slug}:choice`, id);
    this.best = store.get(this.bestKey(), 0);
    this.bestEl.textContent = this.bestText();
    this.choiceRow?.querySelectorAll('.gk-choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    this.reset();
    this.onChoice?.(id);
  }

  /** Start screen / game over screen button, Enter and Space. */
  primary() {
    if (this.state === 'ready' || this.state === 'over') this.start();
    else if (this.state === 'paused') this.resume();
    this.canvas.focus({ preventScroll: true });
  }

  start() {
    this.unlockAudio();
    this.keys.clear();
    this.setScore(0);
    this.reset();
    this.state = 'playing';
    this.hideOverlay();
  }

  /** `won: false` means this result must not count as a best (for example a lost game of Sweeper). */
  gameOver(message = '', { won = true } = {}) {
    if (this.state === 'over') return;
    this.state = 'over';
    const better = won && (this.opts.lowerIsBetter ? (this.score > 0 && (!this.best || this.score < this.best)) : this.score > this.best);
    if (better) { this.best = this.score; store.set(this.bestKey(), this.best); this.bestEl.textContent = this.bestText(); }
    this.showOverlay('over', message, better);
  }

  pause() { if (this.state === 'playing') { this.state = 'paused'; this.keys.clear(); this.showOverlay('paused'); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.hideOverlay(); } }
  togglePause() { if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); }

  showOverlay(kind, message = '', record = false) {
    const t = this.opts.title;
    this.overlay.hidden = false;
    this.overlay.dataset.kind = kind;
    if (kind === 'ready') { this.overlayTitle.textContent = t; this.overlayText.textContent = (this.opts.help || '').split(/(?<=[.!?])\s/)[0]; this.overlayBtn.textContent = 'Play'; }
    if (kind === 'paused') { this.overlayTitle.textContent = 'Paused'; this.overlayText.textContent = 'Press P or Esc, or tap Resume.'; this.overlayBtn.textContent = 'Resume'; }
    if (kind === 'over') {
      this.overlayTitle.textContent = message || 'Game over';
      this.overlayText.textContent = `${this.opts.scoreLabel || 'Score'} ${this.fmt(this.score)}${record ? ' · new best!' : ''}`;
      this.overlayBtn.textContent = 'Play again';
    }
    if (this.choiceRow) this.choiceRow.hidden = kind === 'paused';
    this.pauseBtn.disabled = kind !== 'paused' && this.state !== 'playing';
    this.overlayBtn.focus({ preventScroll: true });
  }
  hideOverlay() { this.overlay.hidden = true; this.pauseBtn.disabled = false; }

  // ---- sound ----
  unlockAudio() {
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch { /* no audio */ }
  }
  /** A short beep. Cheap, no files. */
  sfx(freq, dur = 0.08, type = 'square', vol = 0.04, slide = 0) {
    if (this.muted || !audioCtx) return;
    try {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), audioCtx.currentTime + dur);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
    } catch { /* ignore */ }
  }
  setMuted(on) { this.muted = on; store.set('play:muted', on); this.paintMute(); }
  paintMute() { this.muteBtn.textContent = this.muted ? 'Sound off' : 'Sound on'; this.muteBtn.setAttribute('aria-pressed', String(this.muted)); }

  // ---- input ----
  /** WASD act as arrows, except in typing games (`typing: true`), where letters are letters. */
  norm(code) { return this.opts.typing ? code : (KEY_ALIASES[code] || code); }

  send(code) {
    if (this.state === 'playing') this.press(code);
  }

  buildTouch(c) {
    const buttons = [];
    if (c.dpad) {
      buttons.push({ code: 'ArrowUp', label: '▲', cls: 'up', hold: true }, { code: 'ArrowLeft', label: '◀', cls: 'left', hold: true },
        { code: 'ArrowRight', label: '▶', cls: 'right', hold: true }, { code: 'ArrowDown', label: '▼', cls: 'down', hold: true });
    }
    (c.buttons || []).forEach((b) => buttons.push({ ...b, cls: b.wide ? 'wide' : 'act', hold: b.hold === true }));
    this.touchEl = h('div', { class: `gk-touch${c.dpad ? ' gk-touch--dpad' : ''}`, hidden: buttons.length === 0, 'aria-label': 'On-screen controls' });
    for (const b of buttons) {
      const btn = h('button', { class: `gk-key gk-key--${b.cls}`, type: 'button', 'aria-label': b.aria || b.label, 'data-code': b.code }, b.label);
      const down = (e) => { e.preventDefault(); btn.classList.add('is-down'); try { btn.setPointerCapture(e.pointerId); } catch { /* ok */ } if (b.hold) this.keys.add(b.code); this.send(b.code); };
      const up = (e) => { e.preventDefault(); btn.classList.remove('is-down'); this.keys.delete(b.code); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
      this.touchEl.append(btn);
    }
    return this.touchEl;
  }

  canvasPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.w, y: ((e.clientY - r.top) / r.height) * this.h };
  }

  bind(c) {
    this.onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const code = this.norm(e.code);
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if ((code === 'KeyP' && !this.opts.typing) || code === 'Escape') { if (this.state === 'playing' || this.state === 'paused') { e.preventDefault(); this.togglePause(); } return; }
      if ((code === 'Enter' || code === 'Space') && (this.state === 'ready' || this.state === 'over' || this.state === 'paused')) {
        if (document.activeElement === this.overlayBtn || document.activeElement === this.canvas || document.activeElement === document.body) { e.preventDefault(); this.primary(); return; }
      }
      if (GAME_KEYS.has(code) && this.state !== 'ready') e.preventDefault();
      if (e.repeat) { return; }
      this.keys.add(code);
      this.send(code);
    };
    this.onKeyUp = (e) => this.keys.delete(this.norm(e.code));
    this.onHide = () => { if (document.hidden) this.pause(); };
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onHide);

    let start = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      const p = this.canvasPoint(e);
      this.pointerPos = { ...p, down: true, inside: true };
      start = { ...p, t: performance.now(), id: e.pointerId };
      if (this.state === 'ready' || this.state === 'over') return;
      if (c.pointer) this.pointer('down', p.x, p.y, e);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const p = this.canvasPoint(e);
      this.pointerPos = { ...p, down: this.pointerPos.down, inside: true };
      if (c.pointer && this.state === 'playing') this.pointer('move', p.x, p.y, e);
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointerPos.inside = false; });
    const end = (e) => {
      const p = this.canvasPoint(e);
      this.pointerPos = { ...p, down: false, inside: this.pointerPos.inside };
      if (c.pointer && this.state === 'playing') this.pointer('up', p.x, p.y, e);
      if (!start || this.state !== 'playing') { start = null; return; }
      const dx = p.x - start.x, dy = p.y - start.y;
      const dist = Math.hypot(dx, dy);
      if (c.swipe && dist > 18) this.send(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
      else if (c.tap && dist < 14) this.send(c.tap);
      start = null;
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', () => { start = null; this.pointerPos.down = false; });
    this.canvas.addEventListener('contextmenu', (e) => { if (c.pointer) e.preventDefault(); });
    // stop the page scrolling / zooming while swiping on the board
    this.canvas.style.touchAction = 'none';
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onHide);
  }
}

// ---- small drawing helpers shared by games ----
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
export function text(ctx, str, x, y, { size = 16, color = '#fff', align = 'center', weight = '700', baseline = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}
