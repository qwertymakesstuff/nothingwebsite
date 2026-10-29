// Meta progression: Clout (earned per run), upgrades bought with it, chart themes and achievements.
// Upgrades widen what you can see and do (alerts, analysis, markets, leverage, starting cash) but
// never decide a trade for you: scanner alerts don't reveal how a pump ends, and news analysis is
// sometimes wrong.

export const UPGRADES = [
  { id: 'scanner', icon: '📡', name: 'Market Scanner', max: 3, cost: [15, 40, 90],
    desc: ['Flags pumps and crashes as they start.', 'Alerts after 6 seconds.', 'Alerts after 3 seconds.', 'Alerts after 1 second.'] },
  { id: 'news', icon: '🧠', name: 'News Analysis', max: 3, cost: [20, 50, 110],
    desc: ['Reads between the lines of headlines.', 'Tags headlines bullish or bearish.', 'Guesses if rumours are real (right ~70% of the time).', 'Better guesses (~85%) and rug-pull risk warnings.'] },
  { id: 'watch', icon: '⭐', name: 'Watchlist Slots', max: 3, cost: [10, 25, 50],
    desc: ['More room on your watchlist.', '10 slots.', '14 slots.', '18 slots.'] },
  { id: 'margin', icon: '🎲', name: 'Margin Account', max: 2, cost: [30, 80],
    desc: ['Higher leverage options. More rope.', 'Unlocks 10× and 25×.', 'Unlocks 50×. Please be careful.'] },
  { id: 'start', icon: '💵', name: 'Seed Money', max: 3, cost: [25, 60, 150],
    desc: ['Start every run with more cash.', 'Start with $1,250.', 'Start with $1,500.', 'Start with $2,000.'] },
  { id: 'orbit', icon: '🛰', name: 'Off-World Exchange', max: 1, cost: [60],
    desc: ['A new market: space stocks and a satellite coin.', 'Adds Mars Dirt Co, Asteroid Bros, Zero-G Noodles and StarDust Coin.'] },
  { id: 'night', icon: '🌙', name: 'The Night Market', max: 1, cost: [100],
    desc: ['A new market for the truly unwell: degen coins and a golden goose.', 'Adds Lambo DAO, Rug Pull Labs, Golden Goose Protocol and WAGMI Inu.'] },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
export const THEME_COST = 15;

export const lvl = (meta, id) => meta.upgrades[id] || 0;
export const upgradeCost = (meta, id) => { const u = UPGRADE_BY_ID[id]; const l = lvl(meta, id); return l >= u.max ? null : u.cost[l]; };

export function buyUpgrade(meta, id) {
  const cost = upgradeCost(meta, id);
  if (cost == null) return { ok: false, error: 'Already maxed out.' };
  if (meta.clout < cost) return { ok: false, error: `Needs ${cost} Clout.` };
  meta.clout -= cost;
  meta.upgrades[id] = lvl(meta, id) + 1;
  return { ok: true };
}

export function buyTheme(meta, id) {
  if (meta.themes.includes(id)) return { ok: false, error: 'Already owned.' };
  if (meta.clout < THEME_COST) return { ok: false, error: `Needs ${THEME_COST} Clout.` };
  meta.clout -= THEME_COST;
  meta.themes.push(id);
  return { ok: true };
}

// What the upgrades mean in play.
export const startCash = meta => [1000, 1250, 1500, 2000][lvl(meta, 'start')];
export const watchSlots = meta => 6 + 4 * lvl(meta, 'watch');
export const scannerDelay = meta => [null, 6, 3, 1][lvl(meta, 'scanner')];
export const newsAccuracy = meta => [0, 0, 0.7, 0.85][lvl(meta, 'news')];
export const leverageOptions = meta => [1, 2, 5, ...(lvl(meta, 'margin') >= 1 ? [10, 25] : []), ...(lvl(meta, 'margin') >= 2 ? [50] : [])];
export const markets = meta => ['main', ...(lvl(meta, 'orbit') ? ['orbit'] : []), ...(lvl(meta, 'night') ? ['night'] : [])];

// Clout for a finished run: grows with the square root of what you ended (or peaked) with.
export function cloutFor(run) {
  const base = run.end.reason === 'bankrupt' ? Math.sqrt(Math.max(0, run.stats.peak)) / 8 : Math.sqrt(Math.max(0, run.end.worth)) / 4;
  const timed = run.duration ? 1 : 0.8;   // endless runs can be stretched, so they pay a little less
  return Math.max(1, Math.floor(base * timed));
}

// ── Achievements ─────────────────────────────────────────────────────────────
// check(ctx) gets { run, worth, tx (a trade just made), end (run just ended) }.
const S = c => c.run.stats;
export const ACHIEVEMENTS = [
  { id: 'first_trade', icon: '👶', name: 'Baby\'s First Trade', desc: 'Make your first trade.', clout: 3, check: c => S(c).trades >= 1 },
  { id: 'first_profit', icon: '💵', name: 'Tendies', desc: 'Sell something for a profit.', clout: 5, check: c => c.tx && c.tx.side === 'sell' && c.tx.pnl > 0 },
  { id: 'ten_k', icon: '🔟', name: 'First $10,000', desc: 'Reach a net worth of $10,000.', clout: 15, check: c => c.worth >= 10000 },
  { id: 'double', icon: '✌️', name: 'Doubled Up', desc: 'Make a 100% gain on a single trade.', clout: 15, check: c => c.tx && c.tx.side === 'sell' && c.tx.pct >= 100 },
  { id: 'survivor', icon: '🪖', name: 'Crash Survivor', desc: 'Hold positions through a market-wide crash and keep 90% of your net worth.', clout: 20, check: c => S(c).crashesSurvived >= 1 },
  { id: 'hundred_k', icon: '🚀', name: '100× Club', desc: 'Turn $1,000 into $100,000.', clout: 40, check: c => c.worth >= 100000 },
  { id: 'millionaire', icon: '🤑', name: 'Millionaire', desc: 'Reach a net worth of $1,000,000.', clout: 80, check: c => c.worth >= 1e6 },
  { id: 'billionaire', icon: '🛥', name: 'Yacht Shaped Like a Duck', desc: 'Reach a net worth of $1,000,000,000.', clout: 200, secret: true, check: c => c.worth >= 1e9 },
  { id: 'big_trade', icon: '🐋', name: 'Whale Trade', desc: 'Make $25,000 profit on a single trade.', clout: 40, check: c => c.tx && c.tx.pnl >= 25000 },
  { id: 'comeback', icon: '🔥', name: 'Comeback Kid', desc: 'Lose 80% of your starting money, then get back above where you started.', clout: 40, check: c => S(c).low <= S(c).start * 0.2 && c.worth >= S(c).start },
  { id: 'diamond', icon: '💎', name: 'Diamond Hands', desc: 'Hold a position that is up 200% or more.', clout: 20, check: c => Object.values(c.run.pf.positions).some(p => p.cost > 0 && (c.run.market.assets[p.t].p * p.qty - p.debt) / p.cost >= 3) },
  { id: 'paper', icon: '🧻', name: 'Paper Hands', desc: 'Sell at a loss within 3 seconds of buying.', clout: 3, check: c => c.tx && c.tx.side === 'sell' && c.tx.pnl < 0 && c.tx.held <= 3 },
  { id: 'rekt', icon: '💀', name: 'Rekt', desc: 'Get liquidated.', clout: 5, check: c => S(c).liquidations >= 1 },
  { id: 'degen_win', icon: '🎰', name: 'Degen Genius', desc: 'Double your money on a 10× or higher leveraged trade.', clout: 30, check: c => c.tx && c.tx.side === 'sell' && c.tx.lev >= 10 && c.tx.pct >= 100 },
  { id: 'diversified', icon: '🧺', name: 'Diversified', desc: 'Hold 8 different assets at once.', clout: 10, check: c => S(c).maxPositions >= 8 },
  { id: 'meme_lord', icon: '🦍', name: 'Meme Lord', desc: 'Close 3 profitable trades on meme stocks or degen coins in one run.', clout: 15, check: c => S(c).memeWins >= 3 },
  { id: 'sprint_5k', icon: '⏱', name: 'Speed Demon', desc: 'Finish a Sprint with $5,000 or more.', clout: 30, check: c => c.end && c.run.mode === 'sprint' && c.end.reason === 'time' && c.end.worth >= 5000 },
  { id: 'all_cash', icon: '🧘', name: 'Cash Is King', desc: 'Be at least 90% in cash when a flash crash hits.', clout: 10, check: c => !!S(c).cashKing },
  { id: 'bankrupt', icon: '📉', name: 'Down Bad', desc: 'Go bankrupt.', clout: 5, check: c => c.end && c.end.reason === 'bankrupt' },
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// Unlock anything newly earned; returns the new achievements (clout is added to meta).
export function checkAchievements(meta, ctx) {
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(ctx); } catch { ok = false; }
    if (!ok) continue;
    meta.achievements[a.id] = Date.now();
    meta.clout += a.clout;
    meta.lifetime.cloutEarned += a.clout;
    out.push(a);
  }
  return out;
}

export const MILESTONES = [2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1e6, 1e7, 1e8, 1e9];
