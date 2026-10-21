// Entry point: creates the single game state, wires the UI and runs the game loop.
//   logic: every 100 ms, credits production for the real time that passed
//          (keeps running at a slower rate while the tab is in the background)
//   render: every animation frame for the counters, 10 times a second for the shop
import { createState } from './gameState.js';
import * as economy from './economy.js';
import { createUI } from './ui.js';
import { LOOP } from './config.js';
import * as upgradeSystem from './upgradeSystem.js';
import * as progression from './progression.js';

const { checkProgress } = progression;

const state = createState();
const ui = createUI(state);

let lastLogic = performance.now();
function logic() {
  const now = performance.now();
  const seconds = Math.min((now - lastLogic) / 1000, LOOP.maxTickSeconds);
  lastLogic = now;
  economy.tick(state, seconds);
  ui.announce(checkProgress(state));
}
setInterval(logic, LOOP.logicIntervalMs);

let lastShop = 0, lastTitle = 0;
function frame(now) {
  ui.renderTreasury();
  if (now - lastShop >= LOOP.shopIntervalMs) { lastShop = now; ui.renderShop(); ui.renderUpgrades(); ui.renderRank(); }
  if (now - lastTitle >= LOOP.titleIntervalMs) { lastTitle = now; ui.renderTitle(); }
  requestAnimationFrame(frame);
}
checkProgress(state); // nothing to announce on a fresh start
ui.renderShop();
ui.renderUpgrades();
ui.renderRank();
requestAnimationFrame(frame);

// a handle for testing from the browser console
window.idleEmpire = { state, economy, upgrades: upgradeSystem, progression };
