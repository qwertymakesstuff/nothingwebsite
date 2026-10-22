// The fishing minigame window: a tall track, the fish, the green catch bar and a progress meter.
// Hold Space, the mouse button or a finger to raise the bar.

import { h } from './dom.js';
import { stepMinigame } from '../fishing.js';
import { iconURL } from '../render/sprites.js';

export function openFishing(ui, g, done) {
  const W = 30, H = 120;
  const cv = h('canvas', { width: W, height: H });
  const ctx = cv.getContext('2d');
  const fishImg = new Image();
  fishImg.src = iconURL(g.fish.id);
  let holding = false, last = performance.now(), raf = 0, finished = false;
  const down = e => { e.preventDefault(); holding = true; };
  const up = () => { holding = false; };
  const content = h('div.fishing',
    cv,
    h('div.col', { style: { maxWidth: '240px' } }, h('h2', 'Reel it in!'), h('p', 'Hold Space, the mouse button or your finger to raise the green bar. Keep the fish inside it until the meter fills.'), h('p.hint', `Something is pulling hard... (difficulty ${g.fish.difficulty})`)));
  content.addEventListener('pointerdown', down);
  content.addEventListener('pointerup', up);
  content.addEventListener('pointerleave', up);
  const entry = ui.modal(content, { closable: false });
  entry.keys = e => { if (e.code === 'Space') { holding = e.type !== 'keyup'; return true; } return true; };
  ui.fishingHold = v => { holding = v; };
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    ui.fishingHold = null;
    setTimeout(() => { entry.close(); done(g); }, 450);
  };
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepMinigame(g, dt, holding);
    // draw
    ctx.fillStyle = '#2a4a6a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a6a9a'; ctx.fillRect(2, 2, 18, H - 4);
    const trackH = H - 4;
    const barY = 2 + trackH - (g.bar + g.barSize) * trackH, barH = g.barSize * trackH;
    ctx.fillStyle = holding ? '#8fe060' : '#6ac04a'; ctx.fillRect(2, barY, 18, barH);
    ctx.fillStyle = '#4f9a3a'; ctx.fillRect(2, barY, 18, 1); ctx.fillRect(2, barY + barH - 1, 18, 1);
    const fy = 2 + trackH - g.pos * trackH;
    ctx.drawImage(fishImg, 3, Math.round(fy - 8), 16, 16);
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(22, 2, 6, H - 4);
    ctx.fillStyle = g.progress > 0.3 ? '#f5c33a' : '#e05a3a';
    ctx.fillRect(22, 2 + trackH * (1 - g.progress), 6, trackH * g.progress);
    if (g.done) { finish(); if (g.done === 'caught') { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); } return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
