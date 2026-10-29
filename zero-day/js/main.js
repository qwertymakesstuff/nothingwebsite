// Boot ZERO DAY: a short terminal boot animation, then hand off to the game shell.
import { load } from './state.js';
import { startGame } from './game.js';

const bootEl = document.getElementById('boot');
const bootText = document.getElementById('bootText');
const app = document.getElementById('app');

const LINES = [
  'ZERO DAY // underground operations terminal',
  'fictional training environment — no live systems',
  '',
  'loading cracking suite ........ ok',
  'mounting data vault ........... ok',
  'spoofing hardware id .......... ok',
  'routing through 7 relays ...... ok',
  'contacting the board .......... ok',
  '',
  'welcome back, operator.',
];

let reduce = false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

function skip() { finishBoot(); }
document.addEventListener('keydown', skip, { once: true });
bootEl.addEventListener('click', skip, { once: true });

let out = '';
let li = 0, ci = 0;
function typeLoop() {
  if (li >= LINES.length) { setTimeout(finishBoot, 500); return; }
  const line = LINES[li];
  if (ci <= line.length) {
    bootText.textContent = out + line.slice(0, ci) + '█';
    ci++;
    setTimeout(typeLoop, 12 + Math.random() * 22);
  } else {
    out += line + '\n';
    li++; ci = 0;
    setTimeout(typeLoop, line === '' ? 80 : 160);
  }
}

let booted = false;
function finishBoot() {
  if (booted) return; booted = true;
  bootEl.hidden = true;
  app.hidden = false;
  load();
  startGame(app);
}

if (reduce) {
  bootText.textContent = LINES.join('\n');
  setTimeout(finishBoot, 300);
} else {
  typeLoop();
}
