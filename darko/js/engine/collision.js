// Axis-separated box movement. Each axis moves in steps of at most one pixel and stops at the
// first blocked step, so boxes slide along walls instead of sticking to them.

export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function moveBox(box, dx, dy, blocked) {
  let hitX = false, hitY = false;
  const along = (axis, d) => {
    const n = Math.ceil(Math.abs(d));
    if (!n) return false;
    const step = d / n;
    for (let i = 0; i < n; i++) {
      box[axis] += step;
      if (blocked(box)) { box[axis] -= step; return true; }
    }
    return false;
  };
  hitX = along('x', dx);
  hitY = along('y', dy);
  return { hitX, hitY };
}
