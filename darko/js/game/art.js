// Pixel art drawn from rectangles at runtime: people, the dog, and every prop in the world.
// Prop drawers get the prop's pixel rect and a view context { t, state, phase, flash }.

import { C } from './palette.js';
import { formatTime } from './calendar.js';

// ---- people --------------------------------------------------------------------------------

export function drawPerson(g, x, y, L, facing = 'down', frame = 0, pose = 'stand') {
  x = Math.round(x); y = Math.round(y);
  const side = facing === 'left' || facing === 'right';
  const dir = facing === 'left' ? -1 : 1;
  const child = L.h < 15;
  const sit = pose === 'sit';
  const headW = child ? 5 : 6, headH = child ? 5 : 6;
  const legH = sit ? 1 : child ? 3 : 5;
  const top = y - L.h + (sit ? 4 : 0);
  const bodyH = y - legH - (top + headH);
  const bw = side ? 6 : (child ? 7 : 8);
  const bx = x - (bw >> 1);
  const hx = x - (headW >> 1);

  g.alpha(0.45, () => g.rect(x - 5, y - 1, 10, 2, C.black));

  // legs
  if (!sit) {
    const ly = y - legH;
    if (side) {
      const s = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      g.rect(x - 1 - s, ly, 3, legH, L.bottom); g.rect(x - 1 - s, y - 1, 3, 1, L.shoes);
      if (s) { g.rect(x - 1 + s, ly, 3, legH, L.bottom); g.rect(x - 1 + s, y - 1, 3, 1, L.shoes); }
    } else {
      const l1 = frame === 1 ? 1 : 0, l2 = frame === 2 ? 1 : 0;
      g.rect(bx + 1, ly, 3, legH - l1, L.bottom); g.rect(bx + 1, y - 1 - l1, 3, 1, L.shoes);
      g.rect(bx + bw - 4, ly, 3, legH - l2, L.bottom); g.rect(bx + bw - 4, y - 1 - l2, 3, 1, L.shoes);
    }
  } else {
    g.rect(bx + 1, y - 2, bw - 2, 2, L.bottom);
  }

  // hood behind the head
  if (L.hood && facing !== 'up') g.rect(hx - 1, top + 2, headW + 2, headH - 1, L.topD);

  // torso and arms
  const ty = top + headH;
  g.rect(bx, ty, bw, bodyH, L.top);
  g.rect(bx, ty + bodyH - 1, bw, 1, L.topD);
  if (side) {
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    g.rect(x - 1 + swing * dir, ty + 1, 2, bodyH - 1, L.topD);
    g.rect(x - 1 + swing * dir, ty + bodyH - 1, 2, 1, L.skin);
  } else {
    const a1 = frame === 1 ? 1 : 0, a2 = frame === 2 ? 1 : 0;
    g.rect(bx - 1, ty + 1 + a1, 1, bodyH - 2, L.topD); g.px(bx - 1, ty + bodyH - 1 + a1, L.skin);
    g.rect(bx + bw, ty + 1 + a2, 1, bodyH - 2, L.topD); g.px(bx + bw, ty + bodyH - 1 + a2, L.skin);
  }
  if (L.hood && facing === 'up') g.rect(hx, ty, headW, 2, L.topD);

  // head
  g.rect(hx, top, headW, headH, L.skin);
  g.rect(hx, top + headH - 1, headW, 1, C.skinD);
  drawHair(g, hx, top, headW, headH, L, facing, dir);
  if (facing === 'down') {
    g.px(hx + 1, top + 3, C.ink); g.px(hx + headW - 2, top + 3, C.ink);
  } else if (side) {
    g.px(dir > 0 ? hx + headW - 2 : hx + 1, top + 3, C.ink);
  }
}

function drawHair(g, hx, top, w, h, L, facing, dir) {
  const c = L.hair;
  const side = facing === 'left' || facing === 'right';
  if (facing === 'up') {
    if (L.style === 'receding') { g.rect(hx, top + 1, w, h - 2, c); return; }
    g.rect(hx, top, w, h - 1, c);
    if (L.style === 'long') g.rect(hx, top + h - 1, w, 5, c);
    if (L.style === 'bob') g.rect(hx - 1, top + 1, w + 2, h - 1, c);
    if (L.style === 'pony') g.rect(hx + (w >> 1) - 1, top + h - 1, 2, 4, c);
    return;
  }
  switch (L.style) {
    case 'messy':
      g.rect(hx, top, w, 2, c);
      g.px(hx - 1, top, c); g.px(hx + w, top + 1, c); g.px(hx + 2, top - 1, c); g.px(hx + 4, top - 1, c);
      if (side) g.rect(dir > 0 ? hx : hx + w - 2, top, 2, 4, c);
      break;
    case 'bob':
      g.rect(hx - 1, top, w + 2, 2, c);
      if (side) g.rect(dir > 0 ? hx - 1 : hx + w - 2, top, 3, h, c);
      else { g.rect(hx - 1, top + 1, 1, h, c); g.rect(hx + w, top + 1, 1, h, c); }
      break;
    case 'long':
      g.rect(hx, top, w, 2, c);
      if (side) g.rect(dir > 0 ? hx - 1 : hx + w - 2, top, 3, h + 5, c);
      else { g.rect(hx - 1, top + 1, 1, h + 5, c); g.rect(hx + w, top + 1, 1, h + 5, c); }
      break;
    case 'receding':
      g.rect(hx + 1, top, w - 2, 1, c);
      if (side) g.rect(dir > 0 ? hx : hx + w - 2, top + 1, 2, 3, c);
      else { g.rect(hx - 1, top + 1, 1, 3, c); g.rect(hx + w, top + 1, 1, 3, c); }
      break;
    case 'pony':
      g.rect(hx, top, w, 2, c);
      if (side) { g.rect(dir > 0 ? hx - 2 : hx + w, top + 1, 2, 4, c); g.px(dir > 0 ? hx : hx + w - 1, top + 2, c); }
      else { g.px(hx - 1, top + 1, c); g.px(hx + w, top + 1, c); }
      break;
    default:
      g.rect(hx, top, w, 2, c);
  }
}

export function drawDog(g, x, y, facing = 'left', frame = 0, asleep = false, t = 0) {
  x = Math.round(x); y = Math.round(y);
  const dir = facing === 'right' ? 1 : -1;
  const body = '#2a2830', light = '#4a4652';
  g.alpha(0.45, () => g.rect(x - 7, y - 1, 14, 2, C.black));
  if (asleep) {
    g.rect(x - 6, y - 5, 12, 5, body);
    g.rect(x - 6, y - 5, 12, 1, light);
    g.rect(x + dir * 5 - 2, y - 4, 4, 4, body);
    g.px(x + dir * 6, y - 5, light);
    return;
  }
  const bob = frame === 1 ? 1 : 0;
  g.rect(x - 5, y - 8 + bob, 10, 5, body);
  g.rect(x - 5, y - 8 + bob, 10, 1, light);
  for (const lx of [-4, -2, 2, 3]) g.rect(x + lx, y - 3, 1, 3 - (frame && lx > 0 ? 1 : 0), body);
  const hx = x + dir * 6 - 2;
  g.rect(hx, y - 11 + bob, 5, 5, body);
  g.rect(hx + (dir > 0 ? 3 : -1), y - 9 + bob, 3, 2, body);
  g.px(hx + (dir > 0 ? 3 : 1), y - 10 + bob, C.bone);
  g.px(hx + (dir > 0 ? 0 : 4), y - 12 + bob, body);
  const wag = Math.sin(t * 8) > 0 ? -1 : 0;
  g.rect(x - dir * 6 - (dir > 0 ? 1 : 0), y - 10 + wag, 1, 3, body);
}

// ---- props ---------------------------------------------------------------------------------

const night = v => v.phase === 'night';

function windowPane(g, x, y, w, h, v, lit = false) {
  g.rect(x - 1, y - 1, w + 2, h + 2, C.bone);
  const glass = lit ? C.lamp : v.phase === 'day' ? C.mist : v.phase === 'dusk' ? C.grey : C.night;
  g.rect(x, y, w, h, glass);
  if (!lit && v.phase === 'dusk') g.rect(x, y + h - 3, w, 3, '#5e4a5a');
  if (!lit) g.dither(x, y, w, h >> 1, C.deep, 0.25);
  g.rect(x + (w >> 1), y, 1, h, C.bone);
  g.rect(x, y + (h >> 1), w, 1, C.bone);
  g.rect(x - 1, y + h + 1, w + 2, 1, C.creamD);
}

export const PROPS = {
  window(g, p, v) {
    windowPane(g, p.x + 2, p.y + 2, p.w - 4, p.h - 4, v, false);
    // curtains
    g.rect(p.x, p.y, 3, p.h - 1, p.curtain || C.redD);
    g.rect(p.x + p.w - 3, p.y, 3, p.h - 1, p.curtain || C.redD);
  },
  litwindow(g, p, v) { windowPane(g, p.x + 1, p.y + 1, p.w - 2, p.h - 2, v, p.lit !== false && v.phase !== 'day'); },

  poster(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.ink);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2, '#20202c');
    g.rect(p.x + 3, p.y + 4, p.w - 6, 6, C.redD);
    g.rect(p.x + 3, p.y + p.h - 6, p.w - 6, 1, C.fog);
    g.rect(p.x + 3, p.y + p.h - 4, p.w - 9, 1, C.fog);
    g.px(p.x + p.w - 2, p.y + 1, C.fog);
  },

  shelf(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2, C.ink);
    const cols = [C.red, C.blue, C.bone, C.green, C.amber, C.fog, C.teal];
    for (let r = 0; r < 3; r++) {
      const sy = p.y + 2 + r * Math.floor((p.h - 4) / 3);
      const sh = Math.floor((p.h - 4) / 3) - 1;
      let bx = p.x + 2;
      let i = r * 3;
      while (bx < p.x + p.w - 3) {
        const w = 2 + (i % 2);
        g.rect(bx, sy + (i % 3 === 0 ? 1 : 0), w, sh - (i % 3 === 0 ? 1 : 0), cols[i % cols.length]);
        bx += w + 1; i++;
      }
      g.rect(p.x + 1, sy + sh, p.w - 2, 1, C.wood);
    }
  },

  bed(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 3, C.bone);
    g.rect(p.x + 3, p.y + 2, p.w - 6, 7, C.white);
    g.rect(p.x + 1, p.y + 12, p.w - 2, p.h - 15, C.blue);
    g.rect(p.x + 1, p.y + 12, p.w - 2, 2, C.blueD);
    g.rect(p.x + 4, p.y + 20, p.w - 10, 2, C.blueD);
    g.rect(p.x + 8, p.y + 28, p.w - 12, 2, C.blueD);
    g.rect(p.x, p.y + p.h - 2, p.w, 2, C.wood);
  },

  book(g, p) {
    g.rect(p.x, p.y, 7, 5, C.red);
    g.rect(p.x + 1, p.y + 1, 5, 1, C.bone);
    g.rect(p.x, p.y + 4, 7, 1, C.redD);
  },

  desk(g, p) {
    g.rect(p.x, p.y + p.h - 4, 2, 4, C.woodD); g.rect(p.x + p.w - 2, p.y + p.h - 4, 2, 4, C.woodD);
    g.rect(p.x, p.y, p.w, p.h - 4, C.wood);
    g.rect(p.x, p.y + p.h - 5, p.w, 1, C.woodD);
    g.rect(p.x + 4, p.y + 2, 9, 7, C.bone);
    g.rect(p.x + 5, p.y + 4, 6, 1, C.fog); g.rect(p.x + 5, p.y + 6, 5, 1, C.fog);
    g.rect(p.x + 16, p.y + 3, 6, 4, C.ink);
  },

  desklamp(g, p, v) {
    const on = !v.state.has('lamp_off');
    g.rect(p.x + 2, p.y + p.h - 2, 6, 2, C.ink);
    g.rect(p.x + 4, p.y + 4, 1, p.h - 5, C.ink);
    g.rect(p.x + 1, p.y, 7, 4, on ? C.lamp : C.grey);
    if (on) g.rect(p.x + 2, p.y + 4, 5, 1, C.glow);
  },

  stereo(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.ink);
    g.rect(p.x + 1, p.y + 1, p.w - 2, 1, C.grey);
    g.rect(p.x + 2, p.y + 4, 5, 5, '#22222c'); g.rect(p.x + p.w - 7, p.y + 4, 5, 5, '#22222c');
    g.px(p.x + 4, p.y + 6, C.fog); g.px(p.x + p.w - 5, p.y + 6, C.fog);
    g.rect(p.x + 8, p.y + 5, p.w - 16, 3, C.slate);
    g.px(p.x + 9, p.y + 3, C.red);
  },

  rug(g, p) {
    g.dither(p.x, p.y, p.w, p.h, C.redD, 0.75);
    g.box(p.x + 2, p.y + 2, p.w - 4, p.h - 4, C.brick);
  },

  clothes(g, p) {
    g.rect(p.x + 1, p.y + 3, 12, 5, C.slate);
    g.rect(p.x + 5, p.y + 1, 9, 4, C.blueD);
    g.rect(p.x, p.y + 6, 6, 3, C.bone);
  },

  door(g, p, v) {
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 1, C.bone);
    g.rect(p.x, p.y, p.w, p.h, p.col || C.wood);
    g.box(p.x + 2, p.y + 3, p.w - 4, 9, C.woodD);
    g.box(p.x + 2, p.y + 15, p.w - 4, p.h - 18, C.woodD);
    g.rect(p.x + p.w - 4, p.y + 15, 2, 2, C.amber);
    if (p.sign) { g.rect(p.x + 3, p.y + 5, p.w - 6, 5, C.white); g.rect(p.x + 4, p.y + 7, p.w - 8, 1, C.red); }
    if (p.light && night(v)) g.rect(p.x, p.y + p.h - 1, p.w, 1, C.lamp);
  },

  photos(g, p) {
    const f = [[0, 2, 7, 8], [9, 0, 8, 10], [19, 3, 6, 7]];
    for (const [fx, fy, fw, fh] of f) {
      if (fx + fw > p.w) continue;
      g.rect(p.x + fx, p.y + fy, fw, fh, C.woodL);
      g.rect(p.x + fx + 1, p.y + fy + 1, fw - 2, fh - 2, C.dusk);
      g.rect(p.x + fx + 2, p.y + fy + fh - 4, fw - 4, 2, C.skinD);
    }
  },

  tv(g, p, v) {
    g.rect(p.x, p.y + 4, p.w, p.h - 4, C.woodD);
    g.rect(p.x + 1, p.y + 5, p.w - 2, 1, C.wood);
    const sx = p.x + 4, sy = p.y + 7, sw = p.w - 14, sh = p.h - 12;
    g.rect(sx - 1, sy - 1, sw + 2, sh + 2, C.ink);
    const k = v.flash ? 0 : Math.floor(v.t * 3) % 4;
    const cols = [C.tv, '#a7c0d4', '#7d98b8', C.tvD];
    g.rect(sx, sy, sw, sh, cols[k]);
    g.rect(sx, sy + ((v.t * 18) % sh | 0), sw, 1, '#c8dbe8');
    g.rect(p.x + p.w - 8, p.y + 8, 4, 2, C.ink); g.rect(p.x + p.w - 8, p.y + 12, 4, 2, C.ink);
    // rabbit ears
    g.rect(p.x + 9, p.y, 1, 4, C.fog); g.rect(p.x + 15, p.y - 1, 1, 5, C.fog);
  },

  recliner(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.hairBr);
    g.rect(p.x + 3, p.y + 3, p.w - 6, p.h - 6, '#5e4030');
    g.rect(p.x, p.y + p.h - 5, p.w, 5, C.woodD);
    g.rect(p.x + 2, p.y + p.h - 4, p.w - 4, 2, '#5e4030');
  },

  couch(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#3e3a2c');
    g.rect(p.x + 3, p.y + 2, p.w - 6, p.h - 8, '#56503a');
    const n = 3, cw = Math.floor((p.w - 6) / n);
    for (let i = 1; i < n; i++) g.rect(p.x + 3 + i * cw, p.y + 2, 1, p.h - 8, '#3e3a2c');
    g.rect(p.x, p.y + p.h - 5, p.w, 5, '#2e2b21');
  },

  coffeetable(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.wood);
    g.rect(p.x, p.y + p.h - 2, p.w, 2, C.woodD);
    g.rect(p.x + 6, p.y + 2, 12, 8, C.bone);
    g.rect(p.x + 7, p.y + 3, 10, 2, C.ink);
    g.rect(p.x + 7, p.y + 6, 4, 3, C.fog); g.rect(p.x + 12, p.y + 6, 5, 1, C.fog); g.rect(p.x + 12, p.y + 8, 4, 1, C.fog);
    g.rect(p.x + 24, p.y + 3, 4, 4, C.redD);
  },

  floorlamp(g, p, v) {
    g.rect(p.x + 1, p.y + p.h - 2, 7, 2, C.ink);
    g.rect(p.x + 4, p.y + 6, 1, p.h - 7, C.ink);
    g.rect(p.x, p.y, 9, 7, night(v) || v.phase === 'dusk' ? C.lamp : C.cream);
    g.rect(p.x, p.y + 6, 9, 1, C.creamD);
  },

  plant(g, p) {
    g.rect(p.x + 3, p.y + p.h - 6, 8, 6, C.brick);
    g.rect(p.x + 3, p.y + p.h - 6, 8, 1, '#6a3a32');
    for (const [lx, ly, lw, lh] of [[0, 4, 5, 3], [8, 2, 6, 3], [4, 0, 4, 5], [2, 7, 4, 3], [8, 6, 5, 3]]) g.rect(p.x + lx, p.y + ly, lw, lh, C.greenL);
    g.px(p.x + 6, p.y + 2, C.green);
  },

  coatrack(g, p) {
    g.rect(p.x + 4, p.y + 2, 1, p.h - 3, C.woodD);
    g.rect(p.x + 1, p.y + p.h - 1, 7, 1, C.woodD);
    g.rect(p.x, p.y + 3, 4, 8, C.blueD);
    g.rect(p.x + 5, p.y + 2, 4, 6, C.hairBr);
  },

  fridge(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.bone);
    g.rect(p.x + 1, p.y + 1, p.w - 2, 1, C.white);
    g.rect(p.x, p.y + 12, p.w, 1, C.creamD);
    g.rect(p.x + p.w - 3, p.y + 4, 1, 6, C.fog); g.rect(p.x + p.w - 3, p.y + 15, 1, 8, C.fog);
    // the notepad
    g.rect(p.x + 4, p.y + 14, 8, 10, C.white);
    g.rect(p.x + 5, p.y + 16, 6, 1, C.ink); g.rect(p.x + 5, p.y + 18, 5, 1, C.ink); g.rect(p.x + 5, p.y + 20, 6, 1, C.ink);
    g.rect(p.x + 6, p.y + 3, 3, 3, C.red);
  },

  counter(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.creamD);
    g.rect(p.x, p.y, p.w, 3, C.cream);
    g.rect(p.x, p.y + 3, p.w, 1, C.ink);
    for (let x = p.x + 4; x < p.x + p.w - 2; x += 9) g.px(x, p.y + 9, C.ink);
  },
  sink(g, p) {
    PROPS.counter(g, p);
    g.rect(p.x + 3, p.y + 4, p.w - 6, 6, C.fog);
    g.rect(p.x + 4, p.y + 5, p.w - 8, 4, C.grey);
    g.rect(p.x + (p.w >> 1), p.y, 1, 4, C.mist);
  },
  stove(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.bone);
    g.rect(p.x, p.y + 3, p.w, 1, C.ink);
    g.rect(p.x + 2, p.y + 5, 5, 3, C.ink); g.rect(p.x + p.w - 7, p.y + 5, 5, 3, C.ink);
    g.rect(p.x + 3, p.y + 11, p.w - 6, p.h - 13, C.slate);
    g.rect(p.x + 3, p.y + 1, p.w - 6, 1, C.fog);
  },

  clock(g, p, v) {
    const cx = p.x + (p.w >> 1), cy = p.y + (p.h >> 1);
    g.rect(p.x + 1, p.y, p.w - 2, p.h, C.white); g.rect(p.x, p.y + 1, p.w, p.h - 2, C.white);
    g.box(p.x, p.y, p.w, p.h, C.ink);
    const t = v.state.time;
    const ha = ((t / 60) % 12) / 12 * Math.PI * 2, ma = (t % 60) / 60 * Math.PI * 2;
    for (let i = 1; i <= 3; i++) g.px(cx + Math.round(Math.sin(ha) * i * 0.9), cy - Math.round(Math.cos(ha) * i * 0.9), C.ink);
    for (let i = 1; i <= 5; i++) g.px(cx + Math.round(Math.sin(ma) * i * 0.9), cy - Math.round(Math.cos(ma) * i * 0.9), C.red);
    g.px(cx, cy, C.ink);
  },

  phone(g, p) {
    g.rect(p.x, p.y, p.w, p.h - 4, C.cream);
    g.rect(p.x + 1, p.y + 1, p.w - 2, 3, C.bone);
    g.rect(p.x + 2, p.y + 6, p.w - 4, 3, C.creamD);
    for (let i = 0; i < 5; i++) g.px(p.x + 2 + (i % 2) * 3, p.y + p.h - 4 + i, C.creamD);
  },

  table(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, C.woodL);
    g.rect(p.x, p.y + p.h - 3, p.w, 3, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, 1, '#86664a');
    const plates = [[0.2, 0.25], [0.5, 0.25], [0.8, 0.25], [0.12, 0.65], [0.88, 0.65], [0.5, 0.72]];
    for (const [fx, fy] of plates) {
      const px = p.x + Math.round(fx * p.w) - 3, py = p.y + Math.round(fy * (p.h - 3)) - 2;
      g.rect(px, py, 6, 4, C.white); g.rect(px + 1, py + 1, 4, 2, v.state.has('dinner_done') ? C.bone : C.mist);
    }
    if (!v.state.has('dinner_done')) g.rect(p.x + (p.w >> 1) - 4, p.y + Math.round(p.h / 2) - 3, 8, 5, C.hairBr);
  },

  chair(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 3, C.wood);
  },

  // ---- outside ---------------------------------------------------------------------------

  facade(g, p, v) {
    // siding over a run of wall-face tiles, with its own colour
    g.rect(p.x, p.y, p.w, p.h, p.col || C.cream);
    for (let y = p.y + 3; y < p.y + p.h; y += 4) g.rect(p.x, y, p.w, 1, p.colD || C.creamD);
    g.rect(p.x, p.y + p.h - 3, p.w, 3, C.concrete);
    g.rect(p.x, p.y, p.w, 2, C.ink);
    for (const w of p.windows || []) {
      const lit = (w.lit ?? true) && v.phase !== 'day' && !(w.until && v.state.time >= w.until);
      windowPane(g, p.x + w.x, p.y + w.y, w.w || 10, w.h || 8, v, lit);
    }
    if (p.door) PROPS.door(g, { x: p.x + p.door, y: p.y + 7, w: 11, h: p.h - 10, col: p.doorCol || C.redD }, v);
  },

  garage(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.bone);
    for (let y = p.y + 4; y < p.y + p.h; y += 5) g.rect(p.x + 1, y, p.w - 2, 1, C.cream);
    g.box(p.x, p.y, p.w, p.h, C.creamD);
  },

  porchlight(g, p, v) {
    g.rect(p.x, p.y, 3, 4, night(v) || v.phase === 'dusk' ? C.glow : C.fog);
    g.rect(p.x, p.y + 4, 3, 1, C.ink);
  },

  car(g, p) {
    // a sedan seen from above, nose toward the bottom
    const b = p.col || '#3a4258', d = '#262c3c';
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 4, p.w - 2, p.h - 2, C.black));
    g.rect(p.x + 2, p.y, p.w - 4, p.h, b);
    g.rect(p.x, p.y + 6, p.w, p.h - 12, b);
    g.rect(p.x + 5, p.y + 7, p.w - 10, 8, C.slate);
    g.rect(p.x + 6, p.y + 8, p.w - 12, 2, C.fog);
    g.rect(p.x + 5, p.y + p.h - 16, p.w - 10, 6, C.slate);
    g.rect(p.x + 4, p.y + 16, p.w - 8, p.h - 33, d);
    g.rect(p.x + 3, p.y + p.h - 2, 5, 2, C.glow); g.rect(p.x + p.w - 8, p.y + p.h - 2, 5, 2, C.glow);
    g.rect(p.x + 3, p.y, 5, 1, C.red); g.rect(p.x + p.w - 8, p.y, 5, 1, C.red);
  },

  bike(g, p) {
    g.rect(p.x + 1, p.y + 2, 7, 7, C.ink); g.rect(p.x + 2, p.y + 3, 5, 5, C.green);
    g.rect(p.x + 14, p.y + 2, 7, 7, C.ink); g.rect(p.x + 15, p.y + 3, 5, 5, C.green);
    g.rect(p.x + 4, p.y + 5, 14, 1, C.red); g.rect(p.x + 8, p.y + 2, 6, 1, C.red);
    g.rect(p.x + 15, p.y, 4, 1, C.mist);
    g.px(p.x + 3, p.y + 4, C.greenL); g.px(p.x + 17, p.y + 6, C.greenL);
  },

  tree(g, p) {
    const cx = p.x + (p.w >> 1);
    g.alpha(0.4, () => g.rect(p.x + 2, p.y + p.h - 4, p.w - 4, 4, C.black));
    g.rect(cx - 2, p.y + p.h - 14, 5, 14, C.woodD);
    const r = Math.floor(p.w / 2);
    for (let y = 0; y < p.h - 10; y++) {
      const dy = (y - (p.h - 10) / 2) / ((p.h - 10) / 2);
      const half = Math.round(r * Math.sqrt(Math.max(0, 1 - dy * dy)));
      g.rect(cx - half, p.y + y, half * 2, 1, y < (p.h - 10) * 0.4 ? C.greenL : C.green);
    }
    g.dither(p.x + 3, p.y + 4, p.w - 6, p.h - 18, C.greenD, 0.35);
  },

  bush(g, p) {
    g.rect(p.x + 1, p.y + 2, p.w - 2, p.h - 2, C.green);
    g.rect(p.x, p.y + 4, p.w, p.h - 6, C.green);
    g.rect(p.x + 2, p.y + 2, p.w - 4, 2, C.greenL);
    g.dither(p.x, p.y + p.h - 4, p.w, 3, C.greenD, 0.6);
  },

  leaves(g, p) {
    const cols = [C.amber, C.brick, C.redD, '#7a5a2a'];
    for (let i = 0; i < 26; i++) g.px(p.x + (i * 7) % p.w, p.y + (i * 5) % p.h, cols[i % 4]);
  },

  mailbox(g, p) {
    g.rect(p.x + 3, p.y + 6, 2, p.h - 6, C.woodD);
    g.rect(p.x, p.y, 8, 6, C.grey);
    g.rect(p.x, p.y, 8, 1, C.fog);
    g.rect(p.x + 7, p.y + 1, 1, 3, C.red);
  },

  streetlamp(g, p, v) {
    g.rect(p.x + 3, p.y + 6, 2, p.h - 6, C.ink);
    g.rect(p.x + 2, p.y + p.h - 2, 4, 2, C.ink);
    g.rect(p.x, p.y + 2, 8, 4, C.ink);
    g.rect(p.x + 1, p.y + 5, 6, 2, v.phase === 'day' ? C.fog : C.glow);
  },

  roadline(g, p) {
    for (let x = p.x; x < p.x + p.w; x += 20) g.rect(x, p.y, 10, 1, '#6a6450');
  },

  sign(g, p) {
    g.rect(p.x + 4, p.y + 8, 1, p.h - 8, C.fog);
    g.rect(p.x, p.y, 9, 8, C.blueD);
    g.box(p.x, p.y, 9, 8, C.bone);
    g.rect(p.x + 2, p.y + 3, 5, 2, C.bone);
  },

  fence(g, p) {
    g.rect(p.x, p.y + 3, p.w, 1, C.woodD);
    g.rect(p.x, p.y + 8, p.w, 1, C.woodD);
    for (let x = p.x; x < p.x + p.w; x += 4) g.rect(x, p.y, 2, p.h, C.wood);
  },

  // things with nothing to draw (talk zones, invisible blockers)
  none() {},
};

export const drawProp = (g, p, v) => (PROPS[p.type] || PROPS.none)(g, p, v);

export const clockText = state => formatTime(state.time);
