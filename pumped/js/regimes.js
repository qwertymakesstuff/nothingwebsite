// Market-wide special events ("regimes"). One runs at a time, for `len` ticks.
// cats: per-category changes ({ vol, drift, pump, crash } multipliers / per-tick drift), `all` applies to every category.
// events: weight multipliers for news events while the regime runs.

import { registerRegimes } from './market.js';
import { ASSET_BY_T } from './assets.js';

export const REGIMES = {
  bull: {
    id: 'bull', name: '🐂 BULL RUN', color: '#2bff88', weight: 3, len: [50, 100], tone: 1,
    headline: 'BULL RUN: money is pouring in and everything is going up. For now.',
    cats: { all: { drift: 0.0012, pump: 1.5, crash: 0.6 }, safe: { drift: 0.0002 }, crypto: { drift: 0.0016 }, degen: { drift: 0.0016 } },
    events: { breakthrough: 1.5, partnership: 1.5, panic: 0.3, scandal: 0.6 },
  },
  bear: {
    id: 'bear', name: '🐻 BEAR MARKET', color: '#ff3b5c', weight: 3, len: [50, 100], tone: -1,
    headline: 'BEAR MARKET: buyers have left the building. Cash is king.',
    cats: { all: { drift: -0.0016, pump: 0.5, crash: 1.7, vol: 1.15 }, safe: { drift: 0.00005, crash: 0.5 } },
    events: { panic: 2, regulation: 1.5, scandal: 1.5, hack: 1.5, breakthrough: 0.5 },
  },
  mania: {
    id: 'mania', name: '🦍 MEME MANIA', color: '#ff5edb', weight: 2.5, len: [40, 80], tone: 1,
    headline: 'MEME MANIA: the forums have taken over. Speculative assets are going completely feral.',
    cats: { meme: { vol: 1.9, pump: 3.2, crash: 1.6 }, degen: { vol: 1.9, pump: 3.2, crash: 1.6 } },
    events: { viral_meme: 3, celebrity: 2.5, hype_campaign: 3, squeeze: 3, rug_watch: 2 },
    onStart(m, rng) { for (const t of m.order) { const a = m.assets[t]; if (['meme', 'degen'].includes(catOf(t))) a.hype = Math.min(100, a.hype + rng.range(15, 35)); } },
  },
  flash: {
    id: 'flash', name: '⚡ FLASH CRASH', color: '#ff3b5c', weight: 1.5, len: [12, 20], tone: -1,
    headline: 'FLASH CRASH! A runaway sell algorithm is dumping everything. Circuit breakers sweating.',
    cats: { all: { pump: 0.1, vol: 1.6 }, safe: { vol: 1 } },
    events: { panic: 0, flavor: 2 },
    onStart(m, rng, notes, fx) {
      for (const t of m.order) {
        const c = catOf(t);
        if (c === 'safe' || stable(t)) continue;
        if (rng.chance(0.85)) fx.startCrash(m, m.assets[t], rng, notes, { mul: 0.75, len: [3, 6], fate: rng.chance(0.75) ? 'recover' : 'permanent', cause: 'flash' });
      }
    },
  },
  alt: {
    id: 'alt', name: '🪙 ALTCOIN SEASON', color: '#ffd23f', weight: 2.5, len: [45, 90], tone: 1,
    headline: 'ALTCOIN SEASON: crypto money is rotating into every coin with a pulse.',
    cats: { crypto: { drift: 0.002, pump: 2.6, vol: 1.4 }, degen: { drift: 0.002, pump: 2.4, vol: 1.4 }, rare: { pump: 1.5 } },
    events: { listing_rumor: 3, celebrity: 1.5, outage: 1.5, whale: 1.5 },
  },
  earnings: {
    id: 'earnings', name: '📊 EARNINGS WEEK', color: '#3be8ff', weight: 2.5, len: [45, 80], tone: 0,
    headline: 'EARNINGS WEEK: companies are reporting. Expect big moves in individual stocks.',
    cats: { stock: { vol: 1.35 } },
    events: { earnings: 7, breakthrough: 1.5, scandal: 1.5, buyback: 1.5 },
  },
  snooze: {
    id: 'snooze', name: '😴 SIDEWAYS SNOOZEFEST', color: '#8a9aa0', weight: 2, len: [40, 70], tone: 0,
    headline: 'Markets go sideways. Traders reportedly "watching paint dry, but bullish on paint".',
    cats: { all: { vol: 0.6, pump: 0.4, crash: 0.5 } },
    events: { flavor: 3 },
  },
};

const catOf = t => ASSET_BY_T[t].cat;
const stable = t => !!ASSET_BY_T[t].stable;

registerRegimes(REGIMES);
