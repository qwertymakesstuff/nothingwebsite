// How Chirper posts move the market. Content (who says what) lives in the account files; this
// table is the only place that turns a post type into a market effect.
//
// Effects are small and bounded: they nudge hype, volatility and short-term sentiment, they never
// fix a price, and cooldowns stop any one account from steering an asset. Hype ranges are added
// to the asset's 0-100 hype; shock/fair are log-price nudges; pump starts a short pump whose
// ending (fade, moon or rug) is still up to the market.

import { applyEffect } from '../market.js';
import { ASSET_BY_T, CATS } from '../assets.js';

export const MOVES = {
  endorse: { label: 'Celebrity endorsement', tone: 1, hype: [8, 16], pumpChance: 0.4, pump: { mul: 0.6, len: [4, 10] }, stockShock: [0.004, 0.02] },
  product: { label: 'Product announcement', tone: 1, fair: [0.01, 0.035], shock: [0.005, 0.02], hype: [3, 6] },
  feud:    { label: 'Public feud', tone: 0, vol: [1.7, 25], hype: [4, 8] },
  rumor:   { label: 'Rumour', tone: 1, hype: [10, 15], pumpChance: 1, pump: { mul: 0.9, len: [4, 8], fates: { moon: 0, fade: 0.35, rug: 0.65 } } },
  apology: { label: 'Apology', tone: -1, hype: [-25, -15], shock: [-0.04, -0.01] },
  meme:    { label: 'Viral meme', tone: 1, hype: [15, 25], pumpChance: 0.55, pump: { mul: 0.8, len: [4, 10] } },
  moon:    { label: 'Moon prediction', tone: 1, hype: [4, 8] },
  doom:    { label: 'Public warning', tone: -1, hype: [-8, -3], vol: [1.2, 15] },
};

export const ASSET_COOLDOWN = 45;    // seconds between Chirper effects on one asset
export const PAIR_COOLDOWN = 240;    // seconds before one account can move the same asset again
export const HYPE_CAP = 90;          // positive hype stops stacking above this

export function canMove(feed, by, t, tick, market) {
  const a = market.assets[t];
  if (!a || ASSET_BY_T[t].stable) return false;
  if ((feed.cd.asset[t] ?? -1e9) + ASSET_COOLDOWN > tick) return false;
  if ((feed.cd.pair[by + '>' + t] ?? -1e9) + PAIR_COOLDOWN > tick) return false;
  return true;
}

// Apply a post's effect once. Returns a summary for the post, or null if nothing happened.
export function applyMove(feed, market, type, t, by, rng, tick) {
  const m = MOVES[type];
  const a = market.assets[t];
  if (!m || !a) return null;
  const d = ASSET_BY_T[t];
  const hypeable = CATS[d.cat].hypeable && !d.stable;
  const eff = {};
  if (m.hype && hypeable) {
    const h = rng.range(m.hype[0], m.hype[1]);
    eff.hype = h > 0 && a.hype >= HYPE_CAP ? 0 : h;
  }
  if (m.shock) eff.shock = m.shock;
  if (m.stockShock && !hypeable) eff.shock = m.stockShock;
  if (m.fair) eff.fair = m.fair;
  if (m.vol) eff.vol = m.vol;
  if (m.pump && rng.chance(m.pumpChance ?? 1) && !(a.pump && type !== 'rumor')) eff.pump = m.pump;
  applyEffect(market, a, eff, rng, [], 1, 'chirper:' + type);
  feed.cd.asset[t] = tick;
  feed.cd.pair[by + '>' + t] = tick;
  for (const k of Object.keys(feed.cd.pair)) if (feed.cd.pair[k] + PAIR_COOLDOWN < tick) delete feed.cd.pair[k];
  return { type, t, label: m.label, tone: m.tone };
}
