// The simulated marketplace. Prices follow a bounded, deterministic model: an item's market price
// is its value times a factor that drifts day by day but never leaves +-MARKET.priceBand. These are
// SkinSpin's own fictional numbers and say nothing about any real market.
//
// NPC sellers add listings over time; NPC buyers may buy the player's listings, more readily the
// closer the asking price is to (or below) the market price.

import { MARKET } from './config.js';
import { ITEMS, ITEMS_BY_ID, itemValue } from './items.js';
import { RARITIES } from './rarities.js';
import { rollWear } from './wear.js';
import { pickWeighted, pickIndex, secureRandom } from './rng.js';
import { fail, canAfford, checkConsumable, instanceValue, removeItems, acquireItem, newId, log } from './economy.js';

export const NPC_SELLERS = ['ArcadeAce', 'SilentFox', 'MintCondition', 'LootGoblin', 'Skinsmith', 'NightTrader', 'Rustbucket', 'Gloveless', 'BladeBroker', 'PixelPusher', 'CrateDigger', 'FloatQueen'];
const LISTING_RARITY = { consumer: 22, industrial: 24, milspec: 20, restricted: 14, classified: 10, covert: 6, extraordinary: 4 };

const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const dayIndex = now => Math.floor(now / MARKET.dayMs);

// In [1 - priceBand, 1 + priceBand] for every item and day.
export function marketFactor(itemId, day) {
  const h = hash(itemId);
  const p1 = (h % 1000) / 1000 * Math.PI * 2;
  const p2 = ((h >>> 10) % 1000) / 1000 * Math.PI * 2;
  const noise = (hash(`${itemId}:${day}`) / 4294967296) * 2 - 1; // fixed per item and day
  const wave = 0.45 * Math.sin(day * 0.45 + p1) + 0.35 * Math.sin(day * 0.17 + p2) + 0.2 * noise; // |wave| <= 1
  return 1 + MARKET.priceBand * wave;
}

export function marketPrice(itemId, wear, now = Date.now()) {
  return Math.max(1, Math.round(itemValue(itemId, wear) * marketFactor(itemId, dayIndex(now))));
}

// Daily prices for the last `days` days, oldest first, today last.
export function priceHistory(itemId, wear, now = Date.now(), days = MARKET.historyDays) {
  const today = dayIndex(now);
  const out = [];
  for (let d = today - days + 1; d <= today; d++) out.push({ day: d, at: d * MARKET.dayMs, price: Math.max(1, Math.round(itemValue(itemId, wear) * marketFactor(itemId, d))) });
  return out;
}

export function priceBounds(itemId, wear, now = Date.now()) {
  const mp = marketPrice(itemId, wear, now);
  return { market: mp, min: Math.max(1, Math.ceil(mp * MARKET.playerPriceMin)), max: Math.max(1, Math.floor(mp * MARKET.playerPriceMax)) };
}

// NPC buyers: chance per minute that a player listing at `ratio` x market price sells.
export function saleChancePerMinute(ratio) {
  return Math.max(0, Math.min(0.5, 0.08 * (1.3 - ratio) / 0.4));
}

export const sellerFee = price => Math.round(price * MARKET.fee);

function npcListing(player, rng, listedAt) {
  const rarity = pickWeighted(RARITIES.map(r => ({ weight: LISTING_RARITY[r.id], value: r.id })), rng);
  const pool = ITEMS.filter(i => i.rarity === rarity);
  const item = pool[pickIndex(pool.length, rng)];
  const w = item.hasWear ? rollWear(rng) : { wear: null, float: null };
  const markup = MARKET.npcListingMin + rng() * (MARKET.npcListingMax - MARKET.npcListingMin);
  return {
    id: newId(player, 'l'), itemId: item.id, wear: w.wear, float: w.float,
    price: Math.max(1, Math.round(marketPrice(item.id, w.wear, listedAt) * markup)),
    seller: NPC_SELLERS[pickIndex(NPC_SELLERS.length, rng)], listedAt,
    featured: rarity === 'covert' || rarity === 'extraordinary',
  };
}

// Simulates NPC sellers and buyers up to `now`. Returns { changed, sold: [{ listing, payout }] };
// `changed` is false when only the clock moved.
export function tickMarket(player, { now = Date.now(), rng = secureRandom } = {}) {
  const m = player.market;
  const sold = [];
  let changed = false;

  if (!m.lastListing) {
    for (let i = 0; i < MARKET.initialListings; i++) m.npc.push(npcListing(player, rng, now - Math.floor(rng() * 2 * 60 * 60 * 1000)));
    m.lastListing = now;
    m.lastTick = now;
    changed = true;
  } else {
    const due = Math.floor((now - m.lastListing) / MARKET.newListingEvery);
    if (due > 0) {
      const n = Math.min(due, MARKET.maxNewPerTick);
      for (let i = 0; i < n; i++) m.npc.push(npcListing(player, rng, now - i * 1000));
      m.lastListing = due > n ? now : m.lastListing + due * MARKET.newListingEvery;
      changed = true;
    }
  }
  if (m.npc.length > MARKET.maxNpcListings) {
    m.npc.sort((a, b) => b.listedAt - a.listedAt);
    m.npc.length = MARKET.maxNpcListings;
    changed = true;
  }

  const minutes = Math.min(7 * 24 * 60, Math.max(0, (now - m.lastTick) / 60000));
  if (minutes > 0) {
    for (const listing of [...m.mine]) {
      const ratio = listing.price / marketPrice(listing.item.itemId, listing.item.wear, now);
      const chance = 1 - Math.pow(1 - saleChancePerMinute(ratio), minutes);
      if (rng() < chance) {
        const payout = listing.price - sellerFee(listing.price);
        m.mine = m.mine.filter(l => l.id !== listing.id);
        player.coins += payout;
        player.stats.marketSold += 1;
        player.stats.marketEarned += payout;
        log(player, { type: 'market-sale', at: now, delta: payout, itemId: listing.item.itemId, wear: listing.item.wear, price: listing.price });
        sold.push({ listing, payout });
        changed = true;
      }
    }
    m.lastTick = now;
  }
  return { ok: true, changed, sold };
}

export function buyListing(player, listingId, { now = Date.now() } = {}) {
  if (player.market.mine.some(l => l.id === listingId)) return fail('own-listing', "You can't buy your own listing. Cancel it to get the item back.");
  const listing = player.market.npc.find(l => l.id === listingId);
  if (!listing) return fail('gone', 'That listing is no longer available.');
  if (!ITEMS_BY_ID[listing.itemId]) return fail('gone', 'That listing is no longer available.');
  if (!canAfford(player, listing.price)) return fail('insufficient-funds', `You need $${(listing.price - player.coins).toLocaleString('en-US')} more to buy this.`);

  // --- validated: apply everything ---
  player.market.npc = player.market.npc.filter(l => l.id !== listingId);
  player.coins -= listing.price;
  const item = acquireItem(player, listing, 'market', now);
  player.stats.marketBought += 1;
  player.stats.marketSpent += listing.price;
  log(player, { type: 'market-buy', at: now, delta: -listing.price, itemId: listing.itemId, wear: listing.wear, seller: listing.seller });
  return { ok: true, item, price: listing.price };
}

export function listItem(player, uid, price, { now = Date.now() } = {}) {
  const check = checkConsumable(player, [uid]);
  if (!check.ok) return check.error === 'locked' ? { ...check, message: check.message.replace('to use it', 'to list it') } : check;
  if (player.market.mine.length >= MARKET.maxPlayerListings) return fail('too-many', `You can have at most ${MARKET.maxPlayerListings} listings.`);
  const inst = check.items[0];
  const b = priceBounds(inst.itemId, inst.wear, now);
  if (!Number.isInteger(price) || price < b.min || price > b.max) return fail('bad-price', `Set a whole-dollar price between $${b.min.toLocaleString('en-US')} and $${b.max.toLocaleString('en-US')}.`);

  // --- validated: apply everything ---
  removeItems(player, [uid]);
  const listing = { id: newId(player, 'l'), price, listedAt: now, item: { ...inst, locked: false } };
  player.market.mine.push(listing);
  log(player, { type: 'market-list', at: now, delta: 0, itemId: inst.itemId, wear: inst.wear, price });
  return { ok: true, listing };
}

export function cancelListing(player, listingId, { now = Date.now() } = {}) {
  const listing = player.market.mine.find(l => l.id === listingId);
  if (!listing) return fail('gone', 'That listing has already sold or been removed.');
  player.market.mine = player.market.mine.filter(l => l.id !== listingId);
  player.inventory.push(listing.item);
  log(player, { type: 'market-cancel', at: now, delta: 0, itemId: listing.item.itemId, wear: listing.item.wear });
  return { ok: true, item: listing.item };
}

export const listingsValue = player => player.market.mine.reduce((s, l) => s + instanceValue(l.item), 0);
