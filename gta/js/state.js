// The one place that says what the game is doing right now, plus money and wanted-heat bookkeeping.
import { data, persist } from './save.js';
import { clamp } from './util.js';

// modes: menu -> playing <-> paused; playing -> wasted | busted -> playing
export const G = {
  mode: 'menu', time: 0, heat: 0, fuzz: 0, stars: 0,
  mission: null, missionCd: 0,
  camYaw: 0, camPitch: .35, camDrag: 0, shake: 0,
  respawnT: 0, pendingRespawn: null, interior: null
};
export const STAR_AT = [15, 45, 90, 150, 230];
export const inWorld = () => G.mode === 'playing' || G.mode === 'wasted' || G.mode === 'busted'; // simulation runs
export const canAct = () => G.mode === 'playing';                                                  // player input is live
export const starsOf = heat => STAR_AT.filter(t => heat >= t).length;

/* money */
export const getMoney = () => data.money;
export const canAfford = n => n >= 0 && data.money >= n;
export function addMoney(n) { if (!(n > 0)) return; data.money = Math.round(data.money + n); persist(); }
export function spend(n) { if (!canAfford(n) || !(n > 0)) return false; data.money = Math.round(data.money - n); persist(); return true; }
export function loseMoney(n) { const l = Math.min(data.money, Math.max(0, Math.round(n))); data.money -= l; persist(); return l; }
export function bump(stat, n) { data.stats[stat] = (data.stats[stat] || 0) + (n || 1); }

/* wanted heat: crimes add heat, stars are derived from it */
export function addHeat(v) { G.heat = clamp(G.heat + v, 0, 320); G.fuzz = 0; }
