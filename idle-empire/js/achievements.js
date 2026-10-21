// The achievement catalogue (data). Each achievement:
//   id, name, description, group, icon (inner SVG, 24 x 24)
//   hidden     shown as "???" in the collection until unlocked
//   check(state, ctx)      true once it is earned; ctx = { now (ms), pps (BigNum per second) }
//   progress(state, ctx)   optional, 0..1, for the bar on locked achievements
// Every unlocked achievement adds ACHIEVEMENT_BONUS (+1%) to all production.
import BigNum from './bigNum.js';
import { BUILDINGS } from './buildings.js';
import { UPGRADES } from './upgrades.js';
import { RANKS } from './milestones.js';
import { formatGoal as formatNumber } from './numberFormatter.js';

export const ACHIEVEMENT_BONUS = 0.01;

const ICONS = {
  click: '<path d="M9 2h2v7H9zM4.2 4.6l1.4-1.4 4 4-1.4 1.4zM2 11h7v2H2z"/><path d="M11 10l9 4-4 1.5 3.5 3.5-2 2-3.5-3.5L12.5 21z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M8 15l1-6 2 2 1-3 1 3 2-2 1 6z" fill="#3a2608"/>',
  chart: '<path d="M3 20h18v2H3z"/><path d="M4 18V12h3v6zM10 18V8h3v10zM16 18V4h3v14z"/>',
  build: '<path d="M2 21V11l6 4v-4l6 4V5h3v-2h3v18z"/>',
  upgrade: '<path d="M12 3l7 8h-4v9H9v-9H5z"/>',
  crown: '<path d="M3 18l2-11 4.5 4L12 4l2.5 7L19 7l2 11z"/><path d="M3 19h18v2H3z"/>',
  key: '<circle cx="8" cy="12" r="5"/><path d="M12 11h10v3h-2v3h-3v-3h-5z"/>',
  star: '<path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/>',
};

const ratio = (have, need) => Math.max(0, Math.min(1, BigNum.from(have).div(need).toNumber()));
// "reach `target` of something": check + progress from one getter
const reach = (get, target) => ({
  check: (s, c) => BigNum.from(get(s, c)).gte(target),
  progress: (s, c) => ratio(get(s, c), target),
});
const totalOwned = s => Object.values(s.buildings).reduce((a, b) => a + b, 0);
const upgradesOwned = s => Object.values(s.upgrades).filter(l => l > 0).length;
const buildingsOpen = s => Object.keys(s.buildingsUnlocked).length;

const tiered = (group, icon, prefix, list, get, describe) => list.map(([target, name]) => ({
  id: `${prefix}-${target}`, name, group, icon, description: describe(target), ...reach(get, target),
}));

export const ACHIEVEMENTS = [
  ...tiered('Clicking', ICONS.click, 'clicks', [
    [1, 'First Strike'], [100, 'Warming Up'], [1000, 'Callused Fingers'], [5000, 'Hammer Time'],
    [25000, 'Tireless'], [100000, 'The Hand of the Empire'],
  ], s => s.totalClicks, n => `Click the Mint ${formatNumber(n)} time${n === 1 ? '' : 's'}.`),
  ...tiered('Clicking', ICONS.click, 'clickearned', [
    [1e3, 'Pocket Money'], [1e6, 'Handmade Fortune'], [1e9, 'Golden Knuckles'], [1e12, 'Click Baron'],
  ], s => s.stats.clickEarned, n => `Earn ${formatNumber(n)} crowns by clicking.`),

  ...tiered('Earning', ICONS.coin, 'earned', [
    [100, 'Loose Change'], [1e4, 'Nest Egg'], [1e6, 'Millionaire'], [1e8, 'Strongbox'], [1e10, 'Vault Keeper'],
    [1e12, 'Trillionaire'], [1e15, 'Dragon Hoard'], [1e18, 'Treasury of Nations'], [1e21, 'Gold Standard'], [1e24, 'Infinite Coffers'],
  ], s => s.totalEarned, n => `Earn ${formatNumber(n)} crowns in total.`),

  ...tiered('Production', ICONS.chart, 'pps', [
    [1, 'Passive Income'], [100, 'Steady Trickle'], [1e4, 'Running River'], [1e6, 'Flood of Gold'],
    [1e8, 'Gold Rush'], [1e10, 'Torrent'], [1e12, 'Golden Ocean'],
  ], (s, c) => c.pps, n => `Make ${formatNumber(n)} crowns per second.`),

  ...tiered('Buildings', ICONS.build, 'owned', [
    [1, 'Open for Business'], [50, 'Small Holdings'], [100, 'Growing Concern'], [250, 'Estate'],
    [500, 'Conglomerate'], [1000, 'Sprawling Empire'], [2000, 'Map Painter'],
  ], totalOwned, n => `Own ${formatNumber(n)} building${n === 1 ? '' : 's'} in total.`),
  ...BUILDINGS.map(b => ({
    id: `hundred-${b.id}`, name: `Century of ${b.plural}`, group: 'Buildings', icon: b.icon,
    description: `Own 100 ${b.plural}.`, ...reach(s => s.buildings[b.id] || 0, 100),
  })),

  ...tiered('Upgrades', ICONS.upgrade, 'upgrades', [
    [1, 'Improvement'], [10, 'Modernised'], [25, 'State of the Art'], [50, 'Cutting Edge'],
  ], upgradesOwned, n => `Buy ${n} different upgrade${n === 1 ? '' : 's'}.`),
  { id: 'upgrades-all', name: 'Nothing Left to Improve', group: 'Upgrades', icon: ICONS.upgrade,
    description: `Buy every one of the ${UPGRADES.length} upgrades.`, ...reach(upgradesOwned, UPGRADES.length) },
  { id: 'max-rep-click', name: 'Razor Dies', group: 'Upgrades', icon: ICONS.upgrade,
    description: 'Raise Sharper Dies to its last level.', ...reach(s => s.upgrades['rep-click'] || 0, 20) },
  { id: 'max-rep-global', name: 'No Days Off', group: 'Upgrades', icon: ICONS.upgrade,
    description: 'Raise Overtime Shifts to its last level.', ...reach(s => s.upgrades['rep-global'] || 0, 25) },

  ...tiered('Progress', ICONS.key, 'open', [
    [5, 'Diversified'], [10, 'Industrial Age'], [BUILDINGS.length, 'The Whole Map'],
  ], buildingsOpen, n => (n === BUILDINGS.length ? 'Unlock every building.' : `Unlock ${n} kinds of building.`)),
  ...[2, 4, 7, RANKS.length - 1].map(i => ({
    id: `rank-${i}`, name: `Hail the ${RANKS[i].name}`, group: 'Progress', icon: ICONS.crown,
    description: `Reach the rank of ${RANKS[i].name}.`, ...reach(s => s.rank, i),
  })),

  // hidden: unusual things, revealed only when done
  { id: 'hidden-hoarder', name: 'Dragon on a Pile', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Hold 1,000,000 crowns while owning 10 buildings or fewer.',
    check: s => s.currency.gte(1e6) && totalOwned(s) <= 10 },
  { id: 'hidden-handson', name: 'Hands-On Management', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Earn 10,000 crowns before buying a single building.',
    check: s => s.totalEarned.gte(1e4) && totalOwned(s) === 0 },
  { id: 'hidden-burst', name: 'Tap Dancer', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Click the Mint 15 times within one second.', check: s => s.stats.bestBurst >= 15 },
  { id: 'hidden-sevens', name: 'Lucky Sevens', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Hold exactly 777 crowns.', check: s => s.currency.floor().eq(777) },
  { id: 'hidden-mono', name: 'Monoculture', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Own 100 Market Stalls and no other building.',
    check: s => s.buildings.stall >= 100 && totalOwned(s) === s.buildings.stall },
  { id: 'hidden-spent', name: 'Down to the Last Crown', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Make a purchase of 1,000 crowns or more that leaves you with less than one.', check: s => !!s.flags.spentAll },
  { id: 'hidden-bigmax', name: 'Bulk Order', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Buy 100 or more of a building in one Buy Max.', check: s => !!s.flags.bigMax },
  { id: 'hidden-window', name: 'Window Shopper', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Try to buy something you cannot afford 25 times.', check: s => s.stats.denied >= 25 },
  { id: 'hidden-indecisive', name: 'Indecisive', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Change the buy mode 20 times.', check: s => s.stats.modeSwitches >= 20 },
  { id: 'hidden-nightowl', name: 'Night Shift Manager', group: 'Hidden', icon: ICONS.star, hidden: true,
    description: 'Play between midnight and 4 a.m.', check: (s, c) => new Date(c.now).getHours() < 4 },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
export const ACHIEVEMENT_GROUPS = [...new Set(ACHIEVEMENTS.map(a => a.group))];
