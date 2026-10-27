// Action-based input. The DOM layer feeds raw key codes and mouse events in; game code asks
// about actions ("up", "interact") so keys can be remapped without touching gameplay.

export const ACTIONS = ['up', 'down', 'left', 'right', 'interact', 'inventory', 'pause'];

export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  interact: 'Interact', inventory: 'Inventory', pause: 'Pause',
};

export const DEFAULT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE', 'Enter'],
  inventory: ['Tab', 'KeyI'],
  pause: ['Escape', 'KeyP'],
};

// fixed menu keys, always available regardless of remapping
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
  return { Escape: 'Esc', Space: 'Space', Enter: 'Enter', Tab: 'Tab', ShiftLeft: 'LShift', ShiftRight: 'RShift',
    ControlLeft: 'LCtrl', ControlRight: 'RCtrl', AltLeft: 'LAlt', AltRight: 'RAlt', Backspace: 'Bksp' }[code] || code;
}

export class Input {
  constructor(bindings = DEFAULT_BINDINGS) {
    this.down = new Set();
    this.pressedCodes = new Set();
    this.anyPressed = false;
    this.lastCode = null;
    this.mouse = { x: 0, y: 0, down: false, clicked: false, rclicked: false, moved: false, inside: false };
    this.setBindings(bindings);
  }

  setBindings(b) {
    this.bindings = {};
    for (const a of ACTIONS) this.bindings[a] = (b && b[a] ? b[a] : DEFAULT_BINDINGS[a]).slice();
  }

  codesFor(action) { return this.bindings[action] || MENU[action] || []; }

  keyDown(code) {
    if (!this.down.has(code)) { this.pressedCodes.add(code); this.anyPressed = true; this.lastCode = code; }
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

  // drop everything, e.g. when the window loses focus
  clearAll() { this.down.clear(); this.endFrame(); this.mouse.down = false; }

  // swallow this frame's presses so a key that opened a menu doesn't also act inside it
  consume() { this.pressedCodes.clear(); this.anyPressed = false; this.mouse.clicked = false; }

  endFrame() {
    this.pressedCodes.clear();
    this.anyPressed = false;
    this.mouse.clicked = false; this.mouse.rclicked = false; this.mouse.moved = false;
  }

  // movement intent from held direction keys
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
