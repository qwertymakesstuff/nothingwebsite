// Entry point: creates the single game state, wires the UI and runs the game loop.
//   logic: every 100 ms, credits production for the real time that passed
//          (keeps running at a slower rate while the tab is in the background)
//   render: every animation frame for the counters, 10 times a second for the shop
import { createState } from './gameState.js';
import * as economy from './economy.js';
import { createUI } from './ui.js';

const LOGIC_INTERVAL_MS = 100;
const SHOP_INTERVAL_MS = 100;
const TITLE_INTERVAL_MS = 1000;
// longest stretch credited in one tick (e.g. after the computer wakes from sleep);
// proper offline earnings are a later phase
const MAX_TICK_SECONDS = 120;

const state = createState();
const ui = createUI(state);

let lastLogic = performance.now();
function logic() {
  const now = performance.now();
  const seconds = Math.min((now - lastLogic) / 1000, MAX_TICK_SECONDS);
  lastLogic = now;
  economy.tick(state, seconds);
}
setInterval(logic, LOGIC_INTERVAL_MS);

let lastShop = 0, lastTitle = 0;
function frame(now) {
  ui.renderTreasury();
  if (now - lastShop >= SHOP_INTERVAL_MS) { lastShop = now; ui.renderShop(); }
  if (now - lastTitle >= TITLE_INTERVAL_MS) { lastTitle = now; ui.renderTitle(); }
  requestAnimationFrame(frame);
}
ui.renderShop();
requestAnimationFrame(frame);

// a handle for testing from the browser console
window.idleEmpire = { state, economy };
