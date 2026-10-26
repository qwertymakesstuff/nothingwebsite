export const W = 256, H = 192, TILE = 8;
export const TICK_HZ = 60;
export const PLAYER_SPEED = 0.8;          // pixels per tick
export const STEP_EVERY = 18;             // ticks between footsteps
export const INTERACT_COOLDOWN = 10;

// deterministic per-tile noise in [0, 1)
export function hash(x, y, k = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
