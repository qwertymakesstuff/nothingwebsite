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
    if (L.glasses) g.rect(hx, top + 3, headW, 1, C.ink);
  } else if (side) {
    g.px(dir > 0 ? hx + headW - 2 : hx + 1, top + 3, C.ink);
    if (L.glasses) g.rect(dir > 0 ? hx + headW - 3 : hx, top + 3, 3, 1, C.ink);
  }
  if (L.mask && facing !== 'up') {
    // a Halloween mask over the face
    g.rect(hx, top + 1, headW, headH - 1, L.mask);
    g.px(hx + 1, top + 3, C.ink); g.px(hx + headW - 2, top + 3, C.ink); g.rect(hx + 2, top + 5, headW - 4, 1, C.ink);
  }
  if (L.bones) {
    // painted ribs on a black suit
    const ty = top + headH, bw = side ? 6 : 8, bx = Math.round(hx + headW / 2) - (bw >> 1);
    for (let i = 0; i < 3; i++) g.rect(bx + 1, ty + 2 + i * 2, bw - 2, 1, C.white);
    if (facing === 'down') { g.rect(hx + 1, top + 2, 2, 2, C.ink); g.rect(hx + headW - 3, top + 2, 2, 2, C.ink); g.rect(hx + 2, top + 5, headW - 4, 1, C.ink); }
  }
  if (L.cap) { g.rect(hx - 1, top - 1, headW + 2, 3, L.cap); if (facing === 'down') g.rect(hx - 1, top + 2, headW + 2, 1, L.cap); }
  if (L.earmuffs && facing !== 'up') { g.rect(hx - 2, top + 2, 2, 3, L.earmuffs); g.rect(hx + headW, top + 2, 2, 3, L.earmuffs); g.rect(hx, top - 1, headW, 1, L.earmuffs); }
}

// Frank: a six-foot rabbit, a head taller than anyone, drawn as a pale silhouette with a fixed
// grin. He never walks on screen; he is simply there, swaying slightly.
export function drawFrank(g, x, y, facing = 'down', t = 0, steady = false, opts = {}) {
  x = Math.round(x); y = Math.round(y);
  const suit = '#b4b0bc', shade = '#7c7888', dark = '#2a2830';
  const sway = steady || opts.still ? 0 : Math.round(Math.sin(t * 1.3));
  const top = y - 25;
  g.alpha(0.5, () => g.rect(x - 6, y - 1, 12, 2, C.black));
  // legs and body
  g.rect(x - 4, y - 7, 3, 7, shade); g.rect(x + 1, y - 7, 3, 7, shade);
  g.rect(x - 5 + sway, top + 9, 10, 10, suit);
  g.rect(x - 5 + sway, top + 16, 10, 3, shade);
  g.rect(x - 7 + sway, top + 10, 2, 8, shade); g.rect(x + 5 + sway, top + 10, 2, 8, shade);
  const hx = x - 4 + sway;
  if (opts.unmasked) {
    // the man inside: a young face, and, when he is a ghost, the eye that isn't there
    g.rect(hx + 1, top + 3, 7, 7, C.skin);
    g.rect(hx + 1, top + 2, 7, 2, C.hairBr); g.px(hx, top + 3, C.hairBr); g.px(hx + 8, top + 3, C.hairBr);
    if (facing !== 'up') {
      g.px(hx + 6, top + 5, C.ink);
      if (opts.wounded) { g.rect(hx + 2, top + 5, 2, 2, C.redD); g.px(hx + 2, top + 7, C.red); g.px(hx + 3, top + 8, C.red); }
      else g.px(hx + 2, top + 5, C.ink);
    }
    if (opts.helmet) {
      // the rabbit head, held by its ears at his side
      const rx = x + 7;
      g.rect(rx, top + 13, 7, 6, suit); g.rect(rx + 1, top + 9, 1, 4, suit); g.rect(rx + 4, top + 8, 1, 5, suit);
      g.rect(rx + 1, top + 15, 2, 1, dark); g.rect(rx + 4, top + 14, 2, 2, dark); g.rect(rx + 1, top + 17, 5, 1, C.white);
    }
    return;
  }
  // the rabbit head and ears
  g.rect(hx - 1, top + 1, 10, 8, suit);
  g.rect(hx, top - 9, 2, 10, suit); g.rect(hx + 6, top - 10, 2, 11, suit);
  g.px(hx, top - 9, shade); g.px(hx + 7, top - 10, shade);
  if (facing === 'up') { g.rect(hx - 1, top + 7, 10, 2, shade); return; }
  // the eye holes, one larger than the other, and the teeth
  g.rect(hx, top + 3, 3, 2, dark); g.rect(hx + 5, top + 2, 3, 3, dark);
  g.px(hx + 6, top + 3, steady || Math.sin(t * 2) > -0.6 ? '#5a5864' : dark);
  g.rect(hx + 1, top + 6, 6, 2, C.white);
  for (let i = 0; i < 3; i++) g.px(hx + 2 + i * 2, top + 7, dark);
}

// a "spear": the silvery gel channel Donnie sees growing out of people's stomachs, tracing
// where they are about to go
export function drawSpear(g, x, y, dx, dy, len, t) {
  const d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  for (let i = 0; i < len; i++) {
    const wob = Math.sin(i * 0.35 - t * 6) * 1.2;
    const px = x + ux * i - uy * wob, py = y + uy * i + ux * wob;
    const w = i > len - 4 ? 1 : 2;
    g.rect(px, py, w, w, i % 3 ? '#c8d4e0' : '#eef4f8');
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
    if (v.state.beat === 'frank' || v.state.beat === 'flood') {
      // signed off: static
      g.rect(sx, sy, sw, sh, v.state.beat === 'flood' ? C.ink : C.grey);
      if (v.state.beat === 'frank') for (let i = 0; i < 24; i++) g.px(sx + ((i * 7 + Math.floor(v.t * 30) * 3) % sw), sy + ((i * 5 + Math.floor(v.t * 20)) % sh), i % 2 ? C.white : C.ink);
    } else {
      const k = v.flash ? 0 : Math.floor(v.t * 3) % 4;
      const cols = [C.tv, '#a7c0d4', '#7d98b8', C.tvD];
      g.rect(sx, sy, sw, sh, cols[k]);
      g.rect(sx, sy + ((v.t * 18) % sh | 0), sw, 1, '#c8dbe8');
    }
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

  carh(g, p) {
    // the Taurus, side-on to the camera, nose to the right
    const b = p.col || '#4a3a34', d = '#2e2420';
    g.alpha(0.45, () => g.rect(p.x + 3, p.y + 3, p.w, p.h, C.black));
    g.rect(p.x, p.y + 2, p.w, p.h - 4, b);
    g.rect(p.x + 6, p.y, p.w - 12, p.h, b);
    g.rect(p.x + 9, p.y + 3, 8, p.h - 6, C.slate); g.rect(p.x + p.w - 20, p.y + 3, 8, p.h - 6, C.slate);
    g.rect(p.x + 18, p.y + 4, p.w - 39, p.h - 8, d);
    g.rect(p.x + p.w - 2, p.y + 3, 2, 4, C.glow); g.rect(p.x + p.w - 2, p.y + p.h - 7, 2, 4, C.glow);
    g.rect(p.x, p.y + 3, 1, 4, C.red); g.rect(p.x, p.y + p.h - 7, 1, 4, C.red);
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


  // ---- school ----------------------------------------------------------------------------

  lockers(g, p) {
    for (let x = p.x; x < p.x + p.w - 1; x += 8) {
      g.rect(x, p.y, 7, p.h, '#3a4c6a');
      g.rect(x, p.y, 7, 1, '#4c6082');
      for (let i = 0; i < 3; i++) g.rect(x + 2, p.y + 3 + i * 2, 3, 1, '#26324a');
      g.px(x + 5, p.y + Math.floor(p.h / 2), C.mist);
    }
    if (p.mine) g.rect(p.x + 8 * p.mine + 2, p.y + p.h - 6, 3, 2, C.lamp);
  },
  schooldesk(g, p) {
    g.rect(p.x + 1, p.y + p.h - 3, 1, 3, C.ink); g.rect(p.x + p.w - 2, p.y + p.h - 3, 1, 3, C.ink);
    g.rect(p.x, p.y, p.w, p.h - 3, '#7a6448');
    g.rect(p.x, p.y + p.h - 4, p.w, 1, '#56442e');
    g.rect(p.x + 2, p.y + p.h, p.w - 4, 3, C.slate);
  },
  teacherdesk(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x, p.y, p.w, p.h - 4, C.wood);
    g.rect(p.x + 4, p.y + 2, 8, 6, C.bone); g.rect(p.x + p.w - 10, p.y + 3, 5, 4, C.red);
  },
  chalkboard(g, p, v) {
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 3, C.woodL);
    g.rect(p.x, p.y, p.w, p.h, '#22382c');
    const lines = typeof p.text === 'function' ? p.text(v.state) : p.text || [];
    lines.forEach((l, i) => { if (l) g.alpha(0.85, () => g.text(l, p.x + 4, p.y + 3 + i * 9, '#c8d0c0')); });
    g.rect(p.x + p.w - 14, p.y + p.h, 6, 1, C.white);
  },
  tvcart(g, p, v) {
    g.rect(p.x + 1, p.y + p.h - 3, 1, 3, C.ink); g.rect(p.x + p.w - 2, p.y + p.h - 3, 1, 3, C.ink);
    g.rect(p.x, p.y + p.h - 8, p.w, 5, C.grey);
    g.rect(p.x + 1, p.y, p.w - 2, p.h - 8, C.ink);
    const on = v.state.has('tape_on');
    g.rect(p.x + 3, p.y + 2, p.w - 6, p.h - 13, on ? (Math.floor(v.t * 4) % 2 && !v.flash ? '#9ab8a0' : '#8aa8c0') : '#1e2830');
  },
  statue(g, p) {
    // the bronze Middlesex mongrel on its plinth, built up from the bottom
    const base = p.y + p.h - 8;
    g.rect(p.x, base, p.w, 8, C.concrete);
    g.rect(p.x, base, p.w, 1, '#5a5862');
    const b = '#6a4e2a', bl = '#8a6a3a';
    for (const lx of [6, 9, p.w - 13, p.w - 10]) g.rect(p.x + lx, base - 6, 2, 6, b);
    g.rect(p.x + 5, base - 13, p.w - 12, 7, b);
    g.rect(p.x + 5, base - 13, p.w - 12, 1, bl);
    g.rect(p.x + p.w - 10, base - 18, 7, 7, b);
    g.rect(p.x + p.w - 5, base - 15, 4, 3, b);
    g.rect(p.x + p.w - 9, base - 20, 2, 3, bl);
    g.px(p.x + p.w - 5, base - 16, C.ink);
    g.rect(p.x + 2, base - 14, 3, 2, b);
  },
  trophies(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2, '#1a1e24');
    for (let i = 0; i < 4; i++) { g.rect(p.x + 3 + i * 7, p.y + 4, 4, 5, C.amber); g.rect(p.x + 4 + i * 7, p.y + 9, 2, 3, C.amber); }
    g.rect(p.x + 1, p.y + p.h / 2, p.w - 2, 1, C.fog);
  },
  banner(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#2a3a6a');
    g.box(p.x, p.y, p.w, p.h, C.lamp);
    g.text(p.text || '', p.x + p.w / 2, p.y + 2, C.lamp, { align: 'center' });
  },
  pipes(g, p, v) {
    g.rect(p.x, p.y + 3, p.w, 4, C.grey); g.rect(p.x, p.y + 3, p.w, 1, C.fog);
    for (let x = p.x + 6; x < p.x + p.w; x += 20) g.rect(x, p.y + 1, 3, 8, C.dusk);
    if (v.state.has('pipe_broken')) {
      for (let i = 0; i < 10; i++) g.px(p.x + p.w / 2 + Math.sin(i * 3 + v.t * 9) * 5, p.y + 8 + ((v.t * 40 + i * 4) % 14), C.tv);
    }
  },
  valve(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#3a4250');
    g.rect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, C.grey);
    g.rect(p.x + p.w / 2 - 1, p.y - 3, 2, 3, C.red);
    if (v.state.has('pipe_broken')) { g.rect(p.x + 3, p.y + 3, p.w - 6, 2, C.ink); g.rect(p.x + p.w / 2, p.y + p.h, 1, 4, C.tv); }
  },
  water(g, p, v) {
    for (let i = 0; i < 18; i++) g.alpha(0.6, () => g.rect(p.x + (i * 23) % p.w, p.y + (i * 11 + Math.floor(v.t * 6)) % p.h, 6, 1, '#4a6a8a'));
  },

  // ---- the golf course, the engine, the morning after -------------------------------------

  green(g, p) {
    g.rect(p.x + 4, p.y, p.w - 8, p.h, '#3c5434');
    g.rect(p.x, p.y + 4, p.w, p.h - 8, '#3c5434');
    g.dither(p.x + 2, p.y + 2, p.w - 4, p.h - 4, '#4a6440', 0.25);
  },
  pin(g, p, v) {
    g.rect(p.x + 1, p.y, 1, p.h, C.bone);
    const wave = Math.round(Math.sin(v.t * 3));
    g.rect(p.x + 2, p.y, 6 + wave, 4, C.red);
    g.rect(p.x, p.y + p.h - 1, 3, 2, C.ink);
    g.text('7', p.x + 3, p.y - 1, C.white);
  },
  bunker(g, p) {
    g.rect(p.x + 3, p.y, p.w - 6, p.h, '#8a7a5a');
    g.rect(p.x, p.y + 3, p.w, p.h - 6, '#8a7a5a');
    g.dither(p.x + 2, p.y + 2, p.w - 4, p.h - 4, '#a8966c', 0.3);
  },
  golfcart(g, p) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 3, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, C.bone);
    g.rect(p.x + 2, p.y + 2, p.w - 4, 6, C.white);
    g.rect(p.x + 3, p.y + 9, p.w - 6, p.h - 13, '#2a3a2a');
    g.rect(p.x - 1, p.y + 4, 2, 5, C.ink); g.rect(p.x + p.w - 1, p.y + 4, 2, 5, C.ink);
    g.rect(p.x - 1, p.y + p.h - 7, 2, 5, C.ink); g.rect(p.x + p.w - 1, p.y + p.h - 7, 2, 5, C.ink);
  },
  ball(g, p) { g.rect(p.x, p.y, 2, 2, C.white); },
  engine(g, p, v) {
    // a jet engine, seen from above, lying where a bed used to be
    g.alpha(0.5, () => g.rect(p.x + 3, p.y + 4, p.w, p.h, C.black));
    g.rect(p.x + 4, p.y, p.w - 8, p.h, '#56545e');
    g.rect(p.x, p.y + 4, p.w, p.h - 8, '#56545e');
    g.rect(p.x + 3, p.y + 3, p.w - 6, p.h - 6, '#3a3842');
    g.rect(p.x + 6, p.y + 6, p.w - 12, p.h - 12, '#1c1b22');
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + (v.state.has('engine_spin') ? v.t * 2 : 0.3);
      for (let r = 3; r < Math.min(p.w, p.h) / 2 - 7; r++) g.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, '#7c7a86');
    }
    g.rect(cx - 2, cy - 2, 4, 4, '#9a98a4');
    g.rect(p.x + 4, p.y + 1, p.w - 8, 1, '#7c7a86');
  },
  debris(g, p) {
    const cols = [C.bone, C.cream, C.woodD, '#56545e', C.creamD];
    for (let i = 0; i < 40; i++) g.rect(p.x + (i * 37) % p.w, p.y + (i * 23) % p.h, 1 + (i % 3), 1 + ((i >> 1) % 2), cols[i % 5]);
  },
  tarp(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#2e4a7a');
    for (let x = p.x + 3; x < p.x + p.w; x += 9) g.rect(x, p.y, 1, p.h, '#24406a');
    const ripple = Math.floor(v.t * 2) % 2;
    g.rect(p.x, p.y + 3 + ripple, p.w, 1, '#3e5a8a');
  },
  firetruck(g, p) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 4, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, '#8a1e1e');
    g.rect(p.x + 4, p.y + 3, p.w - 26, p.h - 6, '#6a1616');
    g.rect(p.x + 6, p.y + p.h / 2 - 1, p.w - 30, 2, C.mist);
    g.rect(p.x + p.w - 18, p.y + 2, 14, p.h - 4, C.slate);
    g.rect(p.x + p.w - 20, p.y + 1, 2, 3, C.red); g.rect(p.x + p.w - 20, p.y + p.h - 4, 2, 3, '#4a6aaa');
  },
  policecar(g, p, v) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 3, p.w, p.h, C.black));
    g.rect(p.x, p.y + 2, p.w, p.h - 4, C.bone);
    g.rect(p.x + 2, p.y, p.w - 4, p.h, C.bone);
    g.rect(p.x + 8, p.y + 2, p.w - 16, p.h - 4, C.ink);
    g.rect(p.x + 11, p.y + 3, p.w - 22, p.h - 6, C.bone);
    const k = v.flash ? 0 : Math.floor(v.t * 4) % 2;
    g.rect(p.x + p.w / 2 - 3, p.y + 3, 3, 3, k ? C.red : '#4a2020');
    g.rect(p.x + p.w / 2, p.y + 3, 3, 3, k ? '#3a3a7a' : '#5a6aca');
  },
  newsvan(g, p) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 3, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, C.mist);
    g.rect(p.x + p.w - 10, p.y + 2, 8, p.h - 4, C.slate);
    g.rect(p.x + 8, p.y - 4, 2, 6, C.fog); g.rect(p.x + 5, p.y - 7, 8, 3, C.bone);
    g.text('12', p.x + 4, p.y + 2, C.red);
  },
  barricade(g, p) {
    g.rect(p.x, p.y + 2, p.w, 3, C.bone);
    for (let x = p.x; x < p.x + p.w; x += 8) g.rect(x, p.y + 2, 4, 3, C.red);
    g.rect(p.x + 2, p.y + 5, 1, p.h - 5, C.woodD); g.rect(p.x + p.w - 3, p.y + 5, 1, p.h - 5, C.woodD);
  },
  crane(g, p) {
    // a caterpillar crane: tracks, cab, and a boom reaching up over the roof
    g.rect(p.x, p.y + p.h - 10, p.w, 10, C.ink);
    for (let x = p.x + 1; x < p.x + p.w; x += 4) g.rect(x, p.y + p.h - 10, 2, 10, '#2a2a30');
    g.rect(p.x + 4, p.y + p.h - 22, p.w - 8, 12, '#b89a2a');
    g.rect(p.x + 6, p.y + p.h - 20, 8, 6, C.slate);
    for (let i = 0; i < p.h - 24; i++) g.rect(p.x + p.w / 2 + Math.floor(i * 0.6), p.y + p.h - 22 - i, 3, 1, '#a88a24');
  },
  flatbed(g, p, v) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 4, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, '#3a3a44');
    g.rect(p.x + p.w - 20, p.y, 20, p.h, '#5a2a24');
    g.rect(p.x + p.w - 16, p.y + 2, 10, p.h - 4, C.slate);
    if (p.cargo) PROPS.engine(g, { x: p.x + 6, y: p.y - 4, w: 40, h: p.h + 8 }, v);
  },
  bus(g, p) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 4, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, '#c89a1e');
    g.rect(p.x, p.y + p.h - 4, p.w, 4, C.ink);
    for (let x = p.x + 8; x < p.x + p.w - 14; x += 12) g.rect(x, p.y + 3, 9, 7, C.slate);
    g.rect(p.x + p.w - 10, p.y + 3, 8, p.h - 8, C.slate);
    g.text('SCHOOL BUS', p.x + p.w / 2 - 6, p.y + 12, C.ink, { align: 'center' });
  },

  // ---- hotel, Dr. Thurman's office, Old Gun Road -----------------------------------------

  hotelbed(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.woodD);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 3, C.white);
    g.rect(p.x + 3, p.y + 2, p.w - 6, 6, C.bone);
    g.rect(p.x + 1, p.y + 10, p.w - 2, p.h - 13, '#6a4a5a');
    g.rect(p.x + 1, p.y + 10, p.w - 2, 2, '#54384a');
  },
  painting(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.amber);
    g.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2, '#4a6a8a');
    g.rect(p.x + 1, p.y + p.h - 5, p.w - 2, 4, '#3a5a3a');
    g.rect(p.x + p.w - 8, p.y + 3, 3, 3, C.lamp);
  },
  armchair(g, p) {
    g.rect(p.x, p.y, p.w, p.h, p.col || '#5a3a4a');
    g.rect(p.x + 3, p.y + 3, p.w - 6, p.h - 7, '#74505e');
    g.rect(p.x, p.y + p.h - 4, p.w, 4, '#3a2430');
  },
  sparrowhouse(g, p, v) {
    // a small brick house up the hill, one lamp on
    g.rect(p.x, p.y + 10, p.w, p.h - 10, C.brick);
    for (let y = p.y + 13; y < p.y + p.h; y += 3) g.rect(p.x, y, p.w, 1, '#3a201c');
    for (let i = 0; i < 12; i++) g.rect(p.x - 4 + i, p.y + 10 - i, p.w + 8 - i * 2, 1, '#2a2228');
    windowPane(g, p.x + 6, p.y + 16, 8, 7, v, !v.state.has('cellar_open') || v.phase === 'day');
    // someone watching from the upstairs window
    if (v.state.has('sparrow_window')) { g.rect(p.x + 9, p.y + 17, 3, 6, C.ink); g.rect(p.x + 9, p.y + 16, 3, 2, '#e0dcd8'); }
    windowPane(g, p.x + p.w - 14, p.y + 16, 8, 7, v, false);
    g.rect(p.x + p.w / 2 - 3, p.y + p.h - 11, 6, 11, C.woodD);
  },
  graffiti(g, p) {
    g.alpha(0.9, () => g.text('THEY MADE ME DO IT', p.x + p.w / 2, p.y + 1, C.red, { align: 'center' }));
  },
  axe(g, p) {
    g.rect(p.x + 4, p.y, 2, p.h, C.woodL);
    g.rect(p.x, p.y + p.h - 4, 6, 4, C.mist);
    g.rect(p.x, p.y + p.h - 4, 1, 4, C.white);
  },
  field(g, p) { g.dither(p.x, p.y, p.w, p.h, '#4a5a34', 0.3); },


  // ---- the house, later ------------------------------------------------------------------

  mirror(g, p, v) {
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2, C.bone);
    g.rect(p.x, p.y, p.w, p.h, '#5a6878');
    g.rect(p.x + 2, p.y + 2, 3, p.h - 6, '#7a8898');
    if (v.state.has('frank_mirror')) {
      // something behind the glass that isn't in the room
      const cx = p.x + p.w / 2 | 0;
      g.rect(cx - 4, p.y + 4, 8, 7, '#b4b0bc'); g.rect(cx - 3, p.y - 0, 2, 4, '#b4b0bc'); g.rect(cx + 2, p.y - 1, 2, 5, '#b4b0bc');
      g.rect(cx - 3, p.y + 6, 2, 2, '#2a2830'); g.rect(cx + 1, p.y + 5, 2, 3, '#2a2830'); g.rect(cx - 2, p.y + 9, 4, 1, C.white);
      g.rect(cx - 5, p.y + 11, 10, p.h - 11, '#b4b0bc');
    }
    g.rect(p.x, p.y + p.h - 3, p.w, 3, C.bone);
  },
  tub(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.white);
    g.rect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, '#a8b4c0');
    g.rect(p.x + p.w - 6, p.y + 3, 2, 2, C.mist);
  },
  toilet(g, p) {
    g.rect(p.x + 1, p.y, p.w - 2, 5, C.white);
    g.rect(p.x, p.y + 5, p.w, p.h - 5, C.white);
    g.rect(p.x + 2, p.y + 7, p.w - 4, p.h - 9, '#a8b4c0');
  },
  closet(g, p) {
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 1, C.bone);
    g.rect(p.x, p.y, p.w, p.h, C.woodL);
    g.rect(p.x + p.w / 2 | 0, p.y, 1, p.h, C.woodD);
    for (let y = p.y + 3; y < p.y + p.h - 2; y += 3) { g.rect(p.x + 2, y, p.w / 2 - 3, 1, C.wood); g.rect(p.x + p.w / 2 + 2, y, p.w / 2 - 3, 1, C.wood); }
  },
  dresser(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.wood);
    for (let i = 0; i < 3; i++) { g.rect(p.x + 1, p.y + 3 + i * 4, p.w - 2, 1, C.woodD); g.px(p.x + p.w / 2, p.y + 5 + i * 4, C.amber); }
  },
  calendar(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, C.white);
    g.rect(p.x, p.y, p.w, 3, C.red);
    const day = v.state.day;
    for (let i = 0; i < 28; i++) {
      const cx = p.x + 1 + (i % 7) * 2, cy = p.y + 4 + Math.floor(i / 7) * 2;
      g.px(cx, cy, i + 1 < day ? C.red : C.grey);
    }
    // the drawing of Frank tacked to the corner
    g.rect(p.x + p.w - 5, p.y + p.h - 7, 6, 7, C.bone); g.rect(p.x + p.w - 4, p.y + p.h - 5, 1, 1, C.ink); g.rect(p.x + p.w - 2, p.y + p.h - 5, 1, 1, C.ink);
    g.rect(p.x + p.w - 4, p.y + p.h - 9, 1, 3, C.bone); g.rect(p.x + p.w - 2, p.y + p.h - 9, 1, 3, C.bone);
  },
  pumpkin(g, p, v) {
    g.rect(p.x + 1, p.y + 2, p.w - 2, p.h - 2, '#c86a1e'); g.rect(p.x, p.y + 4, p.w, p.h - 6, '#c86a1e');
    g.rect(p.x + p.w / 2 | 0, p.y, 2, 3, C.green);
    if (v.state.has('pumpkin_carved')) {
      const glow = v.phase === 'day' ? C.ink : C.lamp;
      g.rect(p.x + 2, p.y + 4, 2, 2, glow); g.rect(p.x + p.w - 4, p.y + 4, 2, 2, glow); g.rect(p.x + 2, p.y + 8, p.w - 4, 1, glow);
      g.rect(p.x + 3, p.y + 1, 1, 3, glow); g.rect(p.x + p.w - 4, p.y + 1, 1, 3, glow);
    }
  },
  trampoline(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#3a3a44');
    g.rect(p.x + 3, p.y + 3, p.w - 6, p.h - 6, C.ink);
    g.box(p.x + 1, p.y + 1, p.w - 2, p.h - 2, '#4a6aaa');
  },
  patio(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#4a4852');
    for (let x = p.x; x < p.x + p.w; x += 12) g.rect(x, p.y, 1, p.h, '#3a3842');
    for (let y = p.y; y < p.y + p.h; y += 12) g.rect(p.x, y, p.w, 1, '#3a3842');
  },
  patiotable(g, p) {
    g.rect(p.x, p.y, p.w, p.h - 3, C.bone); g.rect(p.x + 2, p.y + 2, p.w - 4, p.h - 7, '#d8d0c0');
    g.rect(p.x + p.w / 2 - 1, p.y + p.h - 3, 2, 3, C.grey);
  },
  leafsheet(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#6a7a5a');
    if (v.state.has('raked')) PROPS.leaves(g, { x: p.x + 4, y: p.y + 3, w: p.w - 8, h: p.h - 6 });
  },
  rake(g, p) {
    g.rect(p.x + 1, p.y, 1, p.h - 4, C.woodL);
    g.rect(p.x - 2, p.y + p.h - 4, 7, 2, C.grey);
  },

  // ---- school, more ------------------------------------------------------------------------

  oldphotos(g, p) {
    for (let i = 0; i < 4; i++) {
      const x = p.x + i * 9;
      g.rect(x, p.y, 8, p.h, C.woodD);
      g.rect(x + 1, p.y + 1, 6, p.h - 2, '#a8a090');
      for (let j = 0; j < 3; j++) g.rect(x + 2 + j * 2, p.y + p.h - 5, 1, 2, '#5a5448');
    }
  },
  seats(g, p) {
    // a row of folding seats, seen from behind
    for (let x = p.x; x < p.x + p.w - 6; x += 9) {
      g.rect(x, p.y, 8, p.h - 2, p.col || '#5a2a2a');
      g.rect(x, p.y, 8, 2, '#7a3a3a');
      g.rect(x + 1, p.y + p.h - 2, 6, 2, C.ink);
    }
  },
  stage(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#5a4030');
    for (let x = p.x; x < p.x + p.w; x += 8) g.rect(x, p.y, 1, p.h, '#4a3426');
    g.rect(p.x, p.y + p.h - 3, p.w, 3, C.ink);
  },
  curtain(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#6a1414');
    for (let x = p.x + 2; x < p.x + p.w; x += 5) g.rect(x, p.y, 1, p.h, '#4a0e0e');
    g.rect(p.x, p.y, p.w, 3, '#8a2020');
  },
  micstand(g, p) {
    g.rect(p.x + 2, p.y + 3, 1, p.h - 4, C.ink);
    g.rect(p.x + 1, p.y, 3, 3, C.grey);
    g.rect(p.x, p.y + p.h - 1, 5, 1, C.ink);
  },
  screen(g, p, v) {
    // a projection screen; what's on it depends on the night
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2, C.ink);
    const show = v.state.has('screen_portal') ? 'portal' : v.state.has('screen_house') ? 'house' : v.state.has('screen_slides') ? 'slides' : v.state.has('screen_movie') ? 'movie' : 'blank';
    if (show === 'blank') { g.rect(p.x, p.y, p.w, p.h, '#b8b4a8'); return; }
    if (show === 'slides') {
      g.rect(p.x, p.y, p.w, p.h, '#d8d0b0');
      g.text('HIS NAME WAS FRANK', p.x + p.w / 2, p.y + 3, C.red, { align: 'center' });
      g.rect(p.x + p.w / 2 - 5, p.y + 12, 10, 10, C.skin); g.rect(p.x + p.w / 2 - 3, p.y + 15, 2, 2, C.red); g.rect(p.x + p.w / 2 + 1, p.y + 15, 2, 2, C.red);
      return;
    }
    if (show === 'movie') {
      g.rect(p.x, p.y, p.w, p.h, '#1a1416');
      const k = v.flash ? 0 : Math.floor(v.t * 2) % 3;
      g.dither(p.x, p.y + p.h / 2, p.w, p.h / 2, ['#3a1a1a', '#2a2a3a', '#4a2020'][k], 0.5);
      g.rect(p.x + 8 + (v.t * 10 % (p.w - 20)), p.y + p.h - 12, 4, 8, C.bone);
      return;
    }
    if (show === 'house') {
      g.rect(p.x, p.y, p.w, p.h, '#1e1a24');
      const hx = p.x + p.w / 2 - 20;
      g.rect(hx, p.y + 14, 40, p.h - 16, '#3a2a22');
      for (let i = 0; i < 10; i++) g.rect(hx - 4 + i * 2, p.y + 14 - i, 48 - i * 4, 1, '#2a1e18');
      for (const wx of [4, 16, 28]) g.rect(hx + wx, p.y + 18, 6, 6, C.lamp);
      g.rect(hx + 10, p.y + 14, 1, p.h - 16, '#1a120e'); g.rect(hx + 26, p.y + 14, 1, p.h - 16, '#1a120e');
      return;
    }
    PROPS.portal(g, { x: p.x, y: p.y, w: p.w, h: p.h }, v);
  },

  // ---- Cunningham's house and the fire -------------------------------------------------------

  tudor(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#c8bca0');
    for (let x = p.x + 6; x < p.x + p.w; x += 14) g.rect(x, p.y, 2, p.h, '#3a2a1e');
    for (let x = p.x + 6; x < p.x + p.w - 14; x += 28) for (let i = 0; i < 12; i++) g.px(x + i, p.y + 2 + i, '#3a2a1e');
    g.rect(p.x, p.y, p.w, 2, '#3a2a1e'); g.rect(p.x, p.y + p.h - 3, p.w, 3, C.concrete);
    for (const w of p.windows || []) windowPane(g, p.x + w.x, p.y + w.y, w.w || 10, w.h || 8, v, v.phase !== 'day' && !v.state.has('house_burned'));
    if (v.state.has('house_burned')) g.dither(p.x, p.y, p.w, p.h, C.ink, 0.6);
  },
  deer(g, p) {
    g.rect(p.x + 3, p.y + 4, 6, 8, C.woodD);
    g.rect(p.x + 4, p.y + 6, 4, 6, '#6a4a2e');
    g.rect(p.x, p.y, 2, 5, '#a89070'); g.rect(p.x + 10, p.y, 2, 5, '#a89070');
    g.px(p.x + 1, p.y - 1, '#a89070'); g.px(p.x + 10, p.y - 1, '#a89070');
    g.px(p.x + 5, p.y + 8, C.ink); g.px(p.x + 7, p.y + 8, C.ink);
  },
  gascan(g, p) {
    g.rect(p.x, p.y + 2, p.w, p.h - 2, C.red);
    g.rect(p.x + 1, p.y, 3, 2, C.ink);
    g.rect(p.x + 1, p.y + 4, p.w - 2, 1, '#b02a2a');
  },
  fire(g, p, v) {
    // flames, licking upward, never quite the same twice
    const t = v.t, n = Math.max(3, p.w / 3 | 0);
    for (let i = 0; i < n; i++) {
      const fx = p.x + i * (p.w / n);
      const h = (p.h * (0.5 + 0.5 * Math.abs(Math.sin(t * 7 + i * 1.7)))) | 0;
      g.rect(fx, p.y + p.h - h, 3, h, C.red);
      g.rect(fx + 1, p.y + p.h - h * 0.7, 2, h * 0.7, C.amber);
      g.rect(fx + 1, p.y + p.h - h * 0.35, 1, h * 0.35, C.glow);
    }
  },
  scorch(g, p) { g.dither(p.x, p.y, p.w, p.h, C.ink, 0.7); },
  basementdoor(g, p, v) {
    g.rect(p.x - 1, p.y - 1, p.w + 2, p.h + 1, C.ink);
    g.rect(p.x, p.y, p.w, p.h, '#3a3a40');
    g.rect(p.x + p.w - 4, p.y + p.h / 2, 2, 2, C.grey);
    g.rect(p.x + 2, p.y + 4, p.w - 4, 2, C.slate);
  },

  // ---- the ridge, the sky, the cellar, the crash ---------------------------------------------

  canyon(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#0e1410');
    for (let i = 0; i < 40; i++) {
      const x = p.x + (i * 37) % p.w, y = p.y + 6 + (i * 13) % (p.h - 8);
      g.rect(x, y, 3, 4, i % 2 ? '#1c2a1c' : '#223222'); g.px(x + 1, y - 1, '#1c2a1c');
    }
    g.rect(p.x, p.y, p.w, 2, '#5a4a3a');
  },
  portal(g, p, v) {
    // the storm: a slow spiral of cloud with a hard white center
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, t = v.t * (v.flash ? 0.3 : 1);
    for (let r = Math.min(p.w, p.h) / 2; r > 2; r -= 3) {
      for (let a = 0; a < 24; a++) {
        const ang = a / 24 * Math.PI * 2 + t * (0.6 + 6 / r) + r * 0.15;
        g.px(cx + Math.cos(ang) * r * (p.w / p.h), cy + Math.sin(ang) * r, r > 8 ? '#5a5870' : '#a8a8c8');
      }
    }
    g.rect(cx - 2, cy - 2, 4, 4, C.white);
  },
  stormsky(g, p, v) {
    g.dither(p.x, p.y, p.w, p.h, '#2a2838', 0.5);
    PROPS.portal(g, { x: p.x + p.w / 2 - 40, y: p.y, w: 80, h: p.h }, v);
  },
  piano(g, p) {
    g.rect(p.x, p.y, p.w, p.h, C.ink);
    g.rect(p.x + 2, p.y + p.h - 6, p.w - 4, 4, C.white);
    for (let x = p.x + 3; x < p.x + p.w - 2; x += 3) g.rect(x, p.y + p.h - 6, 1, 3, C.ink);
  },
  boxes(g, p) {
    const cols = [C.cream, C.creamD, '#8a7a5a'];
    for (let i = 0; i < 4; i++) g.rect(p.x + (i % 2) * (p.w / 2), p.y + Math.floor(i / 2) * (p.h / 2), p.w / 2 - 1, p.h / 2 - 1, cols[i % 3]);
  },
  chandelier(g, p) {
    g.rect(p.x + p.w / 2, p.y, 1, 3, C.amber);
    g.rect(p.x, p.y + 3, p.w, 2, C.amber);
    for (let x = p.x; x < p.x + p.w; x += 3) g.px(x, p.y + 6, C.white);
  },
  chimney(g, p) {
    g.rect(p.x, p.y, p.w, p.h, '#6a5a52');
    for (let y = p.y + 2; y < p.y + p.h; y += 3) g.rect(p.x, y, p.w, 1, '#4a3e38');
    g.rect(p.x + 2, p.y, 2, 2, '#2a2226'); g.rect(p.x + p.w - 5, p.y, 3, 1, '#2a2226');
  },
  cellardoor(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, '#3a2a20');
    g.rect(p.x + p.w / 2 | 0, p.y, 1, p.h, '#1e1612');
    if (v.state.has('cellar_open')) g.rect(p.x + 2, p.y + 2, p.w - 4, 2, C.lamp);
  },
  van(g, p) {
    g.alpha(0.45, () => g.rect(p.x + 2, p.y + 3, p.w, p.h, C.black));
    g.rect(p.x, p.y, p.w, p.h, C.bone);
    g.rect(p.x + p.w - 10, p.y + 2, 8, p.h - 4, C.slate);
    g.rect(p.x + 4, p.y + 3, p.w - 18, 2, '#4a6aaa');
    g.text('AIRPORT', p.x + 4, p.y + 6, C.slate);
  },
  letterbox(g, p, v) { PROPS.mailbox(g, p, v); if (v.state.has('letter_sent')) g.rect(p.x + 7, p.y - 2, 1, 3, C.red); },
  arcadecab(g, p, v) {
    g.rect(p.x, p.y, p.w, p.h, C.ink);
    g.rect(p.x + 1, p.y + 1, p.w - 2, 3, p.col || C.red);
    const k = v.flash ? 0 : Math.floor(v.t * 6 + p.x) % 4;
    g.rect(p.x + 2, p.y + 5, p.w - 4, 8, ['#2a4a8a', '#8a2a6a', '#2a8a6a', '#8a8a2a'][k]);
    g.rect(p.x + 2, p.y + p.h - 5, p.w - 4, 2, C.grey);
  },

  // things with nothing to draw (talk zones, invisible blockers)
  none() {},
};

export const drawProp = (g, p, v) => (PROPS[p.type] || PROPS.none)(g, p, v);

export const clockText = state => formatTime(state.time);
