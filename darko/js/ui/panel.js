// Shared UI drawing: bordered panels and small labels.

import { C } from '../game/palette.js';

export function panel(g, x, y, w, h, { fill = C.ink, border = C.grey, alpha = 0.94 } = {}) {
  g.alpha(alpha, () => g.rect(x, y, w, h, fill));
  g.box(x, y, w, h, border);
  g.px(x, y, C.black); g.px(x + w - 1, y, C.black); g.px(x, y + h - 1, C.black); g.px(x + w - 1, y + h - 1, C.black);
}

export function dim(g, a = 0.6) {
  g.alpha(a, () => g.rect(0, 0, 320, 180, C.black));
}

// "[E] label" key hint
export function keyHint(g, key, label, x, y, align = 'left') {
  const kw = g.textWidth(key) + 4;
  const total = kw + 4 + g.textWidth(label);
  let cx = align === 'center' ? Math.round(x - total / 2) : align === 'right' ? x - total : x;
  g.rect(cx, y - 1, kw, 10, C.bone);
  g.text(key, cx + 2, y, C.ink);
  g.text(label, cx + kw + 4, y, C.mist, { shadow: C.black });
}
