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
import { loadAchievements, saveAchievements } from './achievementStore.js';
import * as achievementSystem from './achievementSystem.js';
import { sampleHistory } from './statistics.js';
import * as prestigeSystem from './prestige.js';

const { checkProgress } = progression;

const state = createState();
state.achievements = loadAchievements(); // achievements survive a refresh (everything else: a later phase)
const ui = createUI(state);

let lastLogic = performance.now();
function logic() {
  const now = performance.now();
  const seconds = Math.min((now - lastLogic) / 1000, LOOP.maxTickSeconds);
  lastLogic = now;
  economy.tick(state, seconds);
  sampleHistory(state);
  progress();
}

// record and announce what was just reached; persist achievements the moment one unlocks
function progress() {
  const events = checkProgress(state);
  if (events.some(e => e.type === 'achievement')) saveAchievements(state.achievements);
  ui.announce(events);
}
setInterval(logic, LOOP.logicIntervalMs);

let lastShop = 0, lastTitle = 0;
function frame(now) {
  ui.renderTreasury();
  if (now - lastShop >= LOOP.shopIntervalMs) { lastShop = now; ui.renderShop(); ui.renderUpgrades(); ui.renderRank(); }
  if (now - lastTitle >= LOOP.titleIntervalMs) { lastTitle = now; ui.renderTitle(); ui.renderAchievements(); ui.renderStats(); }
  requestAnimationFrame(frame);
}
progress();
ui.renderShop();
ui.renderUpgrades();
ui.renderRank();
requestAnimationFrame(frame);

// a handle for testing from the browser console
window.idleEmpire = { state, economy, upgrades: upgradeSystem, progression, achievements: achievementSystem, prestige: prestigeSystem };
