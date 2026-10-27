// Action-based input. The DOM layer feeds raw key codes and mouse events in; game code asks
// about actions ("up", "interact") so the keys behind them can change without touching gameplay.

export const ACTIONS = ['up', 'down', 'left', 'right', 'interact', 'run', 'journal', 'pause'];

export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  interact: 'Interact / talk', run: 'Walk faster', journal: 'Journal', pause: 'Pause',
};

export const DEFAULT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE', 'Enter', 'Space'],
  run: ['ShiftLeft', 'ShiftRight'],
  journal: ['KeyJ', 'Tab', 'KeyI'],
  pause: ['Escape', 'KeyP'],
};

// fixed menu keys, always available
const MENU = {
  menuUp: ['ArrowUp', 'KeyW'], menuDown: ['ArrowDown', 'KeyS'],
  menuLeft: ['ArrowLeft', 'KeyA'], menuRight: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space', 'KeyE'], cancel: ['Escape', 'Backspace'],
};

export function keyName(code) {
  if (!code) return '-';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  return { Escape: 'Esc', Space: 'Space', Enter: 'Enter', Tab: 'Tab', ShiftLeft: 'Shift', ShiftRight: 'RShift', Backspace: 'Bksp' }[code] || code;
}

export class Input {
  constructor(bindings = DEFAULT_BINDINGS) {
    this.down = new Set();
    this.pressedCodes = new Set();
    this.anyPressed = false;
    this.mouse = { x: 0, y: 0, down: false, clicked: false, rclicked: false, moved: false, inside: false };
    this.setBindings(bindings);
  }

  setBindings(b) {
    this.bindings = {};
    for (const a of ACTIONS) this.bindings[a] = (b && b[a] ? b[a] : DEFAULT_BINDINGS[a]).slice();
  }

  codesFor(action) { return this.bindings[action] || MENU[action] || []; }

  keyDown(code) {
    if (!this.down.has(code)) { this.pressedCodes.add(code); this.anyPressed = true; }
    this.down.add(code);
  }
  keyUp(code) { this.down.delete(code); }

  mouseMove(x, y) { this.mouse.x = x; this.mouse.y = y; this.mouse.moved = true; this.mouse.inside = true; }
  mouseDown(button) {
    if (button === 0) { this.mouse.down = true; this.mouse.clicked = true; this.anyPressed = true; }
    if (button === 2) this.mouse.rclicked = true;
  }
  mouseUp(button) { if (button === 0) this.mouse.down = false; }

  held(action) { return this.codesFor(action).some(c => this.down.has(c)); }
  pressed(action) { return this.codesFor(action).some(c => this.pressedCodes.has(c)); }

  // confirm by key or by left click anywhere
  advance() { return this.pressed('confirm') || this.mouse.clicked; }

  clearAll() { this.down.clear(); this.endFrame(); this.mouse.down = false; }

  // swallow this frame's presses so a key that closed one thing doesn't also act on the next
  consume() { this.pressedCodes.clear(); this.anyPressed = false; this.mouse.clicked = false; this.mouse.rclicked = false; }

  endFrame() {
    this.pressedCodes.clear();
    this.anyPressed = false;
    this.mouse.clicked = false; this.mouse.rclicked = false; this.mouse.moved = false;
  }

  axis() {
    let dx = 0, dy = 0;
    if (this.held('left')) dx -= 1;
    if (this.held('right')) dx += 1;
    if (this.held('up')) dy -= 1;
    if (this.held('down')) dy += 1;
    return { dx, dy };
  }
}

export const isGameKey = code =>
  Object.values(DEFAULT_BINDINGS).flat().includes(code) || Object.values(MENU).flat().includes(code);
