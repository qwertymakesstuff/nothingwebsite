// Axis-aligned boxes: { x, y, w, h } in pixels.

export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const contains = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

export const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// Move a box by (dx, dy), one axis at a time, stopping against anything `blocked(box)` reports.
// Steps in sub-pixel increments so fast movement never tunnels through a one-tile wall.
// Returns the new position and which axes were stopped.
export function moveBox(box, dx, dy, blocked) {
  let { x, y } = box;
  const hit = { x: false, y: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.5));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx && !hit.x) {
      if (blocked({ x: x + sx, y, w: box.w, h: box.h })) hit.x = true; else x += sx;
    }
    if (sy && !hit.y) {
      if (blocked({ x, y: y + sy, w: box.w, h: box.h })) hit.y = true; else y += sy;
    }
  }
  return { x, y, hit };
}

// every tile a box touches
export function tilesUnder(box, tile) {
  const out = [];
  const x0 = Math.floor(box.x / tile), y0 = Math.floor(box.y / tile);
  const x1 = Math.floor((box.x + box.w - 0.001) / tile), y1 = Math.floor((box.y + box.h - 0.001) / tile);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) out.push([tx, ty]);
  return out;
}
