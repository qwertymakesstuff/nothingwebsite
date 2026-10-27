// Keyboard, mouse and touch input. Movement is read every frame; actions fire on press (and
// repeat while the use button is held, for watering rows).

import { h } from './ui/dom.js';
import { MENU_KEYS } from './ui/menu.js';

const HOTBAR_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];

export class Input {
  constructor(game, ui, renderer, audio) {
    this.game = game; this.ui = ui; this.renderer = renderer; this.audio = audio;
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.useHeld = false;
    this.mouseTile = null;
    this.touch = matchMedia('(pointer: coarse)').matches;
    addEventListener('keydown', e => this.keydown(e));
    addEventListener('keyup', e => this.keyup(e));
    addEventListener('blur', () => { this.keys.clear(); this.useHeld = false; });
    const cv = renderer.canvas;
    cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') this.mouseTile = renderer.screenToTile(e.clientX, e.clientY); });
    cv.addEventListener('pointerleave', () => { this.mouseTile = null; });
    cv.addEventListener('pointerdown', e => this.pointer(e));
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (!ui.busy) { game.cycleSlot(e.deltaY > 0 ? 1 : -1); ui.sig = ''; } }, { passive: true });
    addEventListener('pointerup', () => { this.useHeld = false; ui.fishingHold?.(false); });
    if (this.touch) this.buildTouch();
  }

  keydown(e) {
    this.audio?.unlock();
    if (e.target?.tagName === 'INPUT') return;
    if (this.ui.fishingHold && e.code === 'Space') { this.ui.fishingHold(true); e.preventDefault(); return; }
    if (this.ui.busy) { if (this.ui.key(e)) e.preventDefault(); return; }
    this.keys.add(e.code);
    const g = this.game;
    const i = HOTBAR_KEYS.indexOf(e.code);
    if (i >= 0) { g.selectSlot(i); this.ui.sig = ''; return; }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (!e.repeat) { this.useHeld = true; this.useAt(); }
        return;
      case 'KeyE': case 'Enter':
        if (!e.repeat) g.interact(this.mouseTileInReach());
        return;
      case 'KeyQ': g.cycleSlot(e.shiftKey ? -1 : 1); this.ui.sig = ''; return;
      case 'Tab': e.preventDefault(); this.ui.openMenu('inventory'); return;
      case 'Escape': this.ui.openMenu('options'); return;
    }
    if (MENU_KEYS[e.code]) this.ui.openMenu(MENU_KEYS[e.code]);
  }

  keyup(e) {
    this.keys.delete(e.code);
    if (e.code === 'Space') { this.useHeld = false; this.ui.fishingHold?.(false); }
  }

  mouseTileInReach() {
    if (!this.mouseTile || this.touch) return null;
    const t = this.game.targetTile(this.mouseTile);
    return t === this.mouseTile ? t : null;
  }

  useAt() { this.game.useAction(this.mouseTileInReach()); }

  pointer(e) {
    this.audio?.unlock();
    if (this.ui.busy) return;
    const tile = this.renderer.screenToTile(e.clientX, e.clientY);
    const inReach = this.game.targetTile(tile) === tile ? tile : null;
    if (e.pointerType === 'mouse') {
      this.mouseTile = tile;
      if (e.button === 2) this.game.interact(inReach);
      else if (e.button === 0) { this.useHeld = true; this.game.useAction(inReach); }
      return;
    }
    // touch: tapping a nearby tile interacts with it (or uses the held item if there is nothing to interact with)
    if (inReach) {
      const it = this.game.interaction(...inReach);
      if (it) this.game.interact(inReach); else this.game.useAction(inReach);
    }
  }

  // Movement vector for this frame.
  move() {
    const k = this.keys;
    let dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let dy = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (!dx && !dy && (this.stick.x || this.stick.y)) { dx = this.stick.x; dy = this.stick.y; }
    return { dx, dy };
  }

  // Called every frame: repeat the use action while held.
  update() {
    if (this.useHeld && !this.ui.busy && !this.game.swing && !this.game.fishing) {
      const held = this.game.state.inventory[this.game.player.slot];
      if (held && ['hoe', 'can', 'axe', 'pickaxe', 'scythe'].includes(held.id)) this.useAt();
    }
  }

  buildTouch() {
    document.body.classList.add('touch');
    const root = document.getElementById('touch');
    root.hidden = false;
    const knob = h('i');
    const stick = h('div.stick', knob);
    let id = null, cx = 0, cy = 0;
    const set = (x, y) => {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), max = 46;
      const k = d > max ? max / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      const n = d < 10 ? 0 : 1;
      this.stick = { x: n * (dx / Math.max(d, 1)), y: n * (dy / Math.max(d, 1)) };
    };
    stick.addEventListener('pointerdown', e => { this.audio?.unlock(); id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); set(e.clientX, e.clientY); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === id) set(e.clientX, e.clientY); });
    const end = e => { if (e.pointerId !== id) return; id = null; this.stick = { x: 0, y: 0 }; knob.style.transform = ''; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    const btn = (cls, label, down, up) => {
      const b = h(`button.tbtn.${cls}`, label);
      b.addEventListener('pointerdown', e => { e.preventDefault(); this.audio?.unlock(); down(); });
      if (up) { b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); }
      return b;
    };
    root.append(stick,
      btn('use', 'Use', () => { if (this.ui.fishingHold) { this.ui.fishingHold(true); return; } if (this.ui.busy) { if (this.ui.dialogueEl) this.ui.advanceDialogue(); return; } this.useHeld = true; this.game.useAction(); }, () => { this.useHeld = false; this.ui.fishingHold?.(false); }),
      btn('act', 'Act', () => { if (this.ui.dialogueEl) { this.ui.advanceDialogue(); return; } if (!this.ui.busy) this.game.interact(); }),
      btn('bag', 'Bag', () => { if (!this.ui.busy) this.ui.openMenu('inventory'); }));
  }
}
