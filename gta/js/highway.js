// The elevated highway: a deck above road HW_ROAD running east-west, with a ramp at each end that comes down to the ground
// intersection at the edge of the map. Pure functions (height, which layer a car is on, where the ground barriers are).
import { N, RD, rc } from './layout.js';
export const HW_ROAD = 7, HW_Z = rc(HW_ROAD), HW_H = 7, HW_HALF = RD / 2;
// x positions: ramp west foot .. top, deck, ramp east top .. foot
export const HW = { w0: rc(0) + RD / 2, w1: rc(1) - RD / 2, e0: rc(N - 2) + RD / 2, e1: rc(N - 1) + RD / 2 + 0 };
HW.e1 = rc(N) - RD / 2; HW.e0 = rc(N - 1) + RD / 2; HW.w1 = rc(1) - RD / 2; HW.deckA = HW.w1; HW.deckB = HW.e0;
export const inCorridor = z => Math.abs(z - HW_Z) < HW_HALF;
/** 'rampW' | 'deck' | 'rampE' | null for an (x, z) position */
export function zoneAt(x, z) {
  if (!inCorridor(z)) return null;
  if (x >= HW.w0 && x < HW.w1) return 'rampW';
  if (x >= HW.w1 && x <= HW.e0) return 'deck';
  if (x > HW.e0 && x <= HW.e1) return 'rampE';
  return null;
}
/** height of the road surface on the highway at x (ignoring which layer you are on) */
export function deckHeight(x) {
  if (x <= HW.w0 || x >= HW.e1) return 0;
  if (x < HW.w1) return HW_H * (x - HW.w0) / (HW.w1 - HW.w0);
  if (x <= HW.e0) return HW_H;
  return HW_H * (HW.e1 - x) / (HW.e1 - HW.e0);
}
/** slope dH/dx on the ramps */
export function deckSlope(x) { if (x > HW.w0 && x < HW.w1) return HW_H / (HW.w1 - HW.w0); if (x > HW.e0 && x < HW.e1) return -HW_H / (HW.e1 - HW.e0); return 0; }
/**
 * Which layer a vehicle is on after moving. 1 = on the ramp/deck, 0 = on the ground. On the ramps everything is on the highway;
 * under the deck a vehicle keeps whichever layer it had when it arrived.
 */
export function nextLayer(layer, x, z) {
  const zone = zoneAt(x, z);
  if (zone === 'rampW' || zone === 'rampE') return 1;
  if (zone === 'deck') return layer;
  return 0;
}
export const heightFor = (layer, x, z) => (layer === 1 && zoneAt(x, z)) ? deckHeight(x) : 0;
/** ground vehicles may not drive up a ramp from underneath the deck: true if moving x0 -> x1 at ground level crosses a ramp mouth */
export function groundBlocked(x0, x1, z) {
  if (!inCorridor(z)) return false;
  return (x0 >= HW.w1 && x1 < HW.w1) || (x0 <= HW.e0 && x1 > HW.e0);
}
/** the deck's solid area for people on foot: ramps and deck are not walkable */
export const walkBlocked = (x, z) => { const zn = zoneAt(x, z); return zn === 'rampW' || zn === 'rampE'; };
