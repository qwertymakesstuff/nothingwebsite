// Roulette geometry and timing, with no DOM. The strip is built around a winner that was already
// decided; these functions only work out where to scroll so that card lands under the marker.

import { ROULETTE } from './config.js';
import { rollCase } from './rewards.js';

// A strip of `length` drops with the winner at `winnerIndex`. Filler cards are cosmetic draws.
export function buildStrip(caseDef, winner, { length = ROULETTE.length, winnerIndex = ROULETTE.winnerIndex, rng = Math.random } = {}) {
  const strip = [];
  for (let i = 0; i < length; i++) strip.push(i === winnerIndex ? { ...winner, winner: true } : rollCase(caseDef, rng));
  return strip;
}

// Scroll distance (px) that puts the centre of card `index` under the viewport's centre line.
export function centerOffset(index, { cardWidth, gap, viewportWidth }) {
  return index * (cardWidth + gap) + cardWidth / 2 - viewportWidth / 2;
}

// Which card sits under the centre line at a given scroll distance.
export function indexAtOffset(offset, { cardWidth, gap, viewportWidth }) {
  return Math.floor((offset + viewportWidth / 2 + gap / 2) / (cardWidth + gap));
}

export const easeOut = t => 1 - Math.pow(1 - t, 4);
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// landing: where the main spin stops (inside the winning card, off-centre for suspense);
// final: the exact centre the strip glides to afterwards.
export function planSpin(index, geometry, { rng = Math.random, jitter = ROULETTE.jitter, duration = ROULETTE.duration, settle = ROULETTE.settle } = {}) {
  const final = centerOffset(index, geometry);
  const landing = final + (rng() - 0.5) * jitter * geometry.cardWidth;
  return { final, landing, duration, settle, total: duration + settle };
}

// Scroll distance at `elapsed` ms. Driven by elapsed time, so it is frame-rate independent.
export function offsetAt(elapsed, plan) {
  if (elapsed <= 0) return 0;
  if (elapsed < plan.duration) return plan.landing * easeOut(elapsed / plan.duration);
  if (elapsed < plan.total) return plan.landing + (plan.final - plan.landing) * easeInOut((elapsed - plan.duration) / plan.settle);
  return plan.final;
}
