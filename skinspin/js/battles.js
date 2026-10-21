// Case battles against simulated opponents. Every participant's drops come from rollCase(),
// the same draw as a normal opening, in turn order with one random stream: NPCs get no special
// treatment. The whole battle is settled in one transaction before any animation plays.
//
// Reward rule: winner takes all. The participant with the highest total value receives every item
// unboxed in the battle. On a tie, the tied participant with the most valuable single item wins;
// if that is tied too, a random draw between them decides.

import { BATTLE } from './config.js';
import { CASES_BY_ID } from './cases.js';
import { ITEMS_BY_ID, itemValue } from './items.js';
import { rollCase } from './rewards.js';
import { secureRandom, pickIndex } from './rng.js';
import { levelInfo } from './playerState.js';
import { fail, canAfford, acquireItem, newId, log } from './economy.js';

export const NPC_NAMES = ['Mako', 'Juniper', 'Vex', 'Orbit', 'Pixel', 'Rook', 'Nova', 'Talon', 'Quill', 'Ember', 'Sable', 'Kit'];

export function battleCost(cases) {
  return cases.reduce((s, id) => s + (CASES_BY_ID[id]?.price || 0), 0);
}

export function checkSetup({ cases, players }, cfg = BATTLE) {
  if (!Array.isArray(cases) || !cases.length) return fail('no-cases', 'Add at least one case.');
  if (cases.length > cfg.maxRounds) return fail('too-many', `A battle has at most ${cfg.maxRounds} rounds.`);
  if (!cases.every(id => CASES_BY_ID[id])) return fail('unknown-case', 'One of those cases does not exist.');
  if (!Number.isInteger(players) || players < cfg.minPlayers || players > cfg.maxPlayers) return fail('players', `Battles have ${cfg.minPlayers} to ${cfg.maxPlayers} players.`);
  return { ok: true, cost: battleCost(cases) };
}

// Index of the winner, and whether a tie-break was needed.
export function decideWinner(participants, rng) {
  const best = Math.max(...participants.map(p => p.total));
  let tied = participants.map((p, i) => i).filter(i => participants[i].total === best);
  if (tied.length === 1) return { winner: tied[0], tieBreak: false };
  const top = i => Math.max(...participants[i].drops.map(d => d.value));
  const bestItem = Math.max(...tied.map(top));
  tied = tied.filter(i => top(i) === bestItem);
  return { winner: tied.length === 1 ? tied[0] : tied[pickIndex(tied.length, rng)], tieBreak: true };
}

export function runBattle(player, setup, { rng = secureRandom, now = Date.now() } = {}) {
  const check = checkSetup(setup);
  if (!check.ok) return check;
  const { cases, players } = setup;
  if (!canAfford(player, check.cost)) return fail('insufficient-funds', `This battle costs $${check.cost.toLocaleString('en-US')}. You need $${(check.cost - player.coins).toLocaleString('en-US')} more.`);

  const names = [...NPC_NAMES];
  const participants = [{ name: player.name, isPlayer: true, drops: [], total: 0 }];
  for (let i = 1; i < players; i++) participants.push({ name: names.splice(pickIndex(names.length, rng), 1)[0], isPlayer: false, drops: [], total: 0 });
  for (const caseId of cases) {
    for (const p of participants) {
      const d = rollCase(CASES_BY_ID[caseId], rng);
      const value = itemValue(d.itemId, d.wear);
      p.drops.push({ ...d, value });
      p.total += value;
    }
  }
  const { winner, tieBreak } = decideWinner(participants, rng);
  const playerWon = participants[winner].isPlayer;
  const xpGained = Math.round(check.cost * BATTLE.xpShare);
  const levelBefore = levelInfo(player.xp).level;

  // --- validated: apply everything ---
  player.coins -= check.cost;
  player.xp += xpGained;
  const s = player.stats;
  s.battlesPlayed += 1;
  s.coinsSpent += check.cost;
  s.casesOpened += cases.length;
  for (const id of cases) s.casesById[id] = (s.casesById[id] || 0) + 1;
  for (const d of participants[0].drops) s.rarityCounts[ITEMS_BY_ID[d.itemId].rarity] += 1;
  const awarded = [];
  if (playerWon) {
    s.battlesWon += 1;
    for (const p of participants) for (const d of p.drops) awarded.push(acquireItem(player, d, 'battle', now).uid);
  }
  const pot = participants.reduce((sum, p) => sum + p.total, 0);
  const battle = { id: newId(player, 'b'), at: now, cases: [...cases], cost: check.cost, participants, winner, tieBreak, awarded };
  player.battles.unshift(battle);
  if (player.battles.length > BATTLE.historyLimit) player.battles.length = BATTLE.historyLimit;
  log(player, { type: 'battle', at: now, delta: -check.cost, won: playerWon, pot, rounds: cases.length, players });

  const levelAfter = levelInfo(player.xp).level;
  return { ok: true, battle, won: playerWon, pot, xpGained, levelUp: levelAfter > levelBefore ? levelAfter : null };
}
