import { ACHIEVEMENTS, DESIGN_BY_ID, RARITY_BY_ID, UPGRADE_CONFIG } from './config.js';

export function recordSpin(state, plates) {
  const count = plates.length;
  state.spins -= count;
  state.stats.totalSpins += count;
  state.stats.totalDiscovered += count;
  state.streak.count += count;
  for (const plate of plates) {
    state.stats.highestRarity = Math.max(state.stats.highestRarity, RARITY_BY_ID[plate.rarity].rank);
    if (!state.stats.rarestRegistration || RARITY_BY_ID[plate.rarity].rank > RARITY_BY_ID[state.stats.rarestRegistration.rarity].rank) state.stats.rarestRegistration = plate;
    if (!state.stats.mostValuable || plate.value > state.stats.mostValuable.value) state.stats.mostValuable = plate;
    if (!state.stats.luckiestSpin || RARITY_BY_ID[plate.rarity].rank > RARITY_BY_ID[state.stats.luckiestSpin.rarity].rank) state.stats.luckiestSpin = plate;
  }
  state.pending.push(...plates);
  const streakEvery = Math.max(25, 50 - state.upgrades.streak * 5);
  const milestones = Math.floor(state.streak.count / streakEvery) - Math.floor((state.streak.count - count) / streakEvery);
  if (milestones > 0) state.spins += milestones;
  checkAchievements(state);
  return milestones;
}

export function collectPending(state) {
  const plates = state.pending.splice(0);
  let unique = 0;
  for (const plate of plates) {
    state.lastPlate = plate;
    const entry = state.collection[plate.id];
    if (entry) { entry.quantity += 1; state.stats.duplicates += 1; }
    else { state.collection[plate.id] = { ...plate, quantity:1, firstDiscoveredAt:plate.discoveredAt }; unique += 1; }
  }
  state.stats.uniqueFound = Object.keys(state.collection).length;
  checkAchievements(state);
  return { count:plates.length, unique, duplicates:plates.length-unique };
}

export function sellPlate(state, id, amount=1) {
  const entry = state.collection[id];
  if (!entry || state.favorites.includes(id)) return 0;
  const sold = Math.min(Math.max(0,amount), entry.quantity);
  if (!sold) return 0;
  const bonus = 1 + state.upgrades.collector * 0.12;
  const coins = Math.max(1,Math.floor(entry.value * sold * bonus));
  entry.quantity -= sold;
  if (entry.quantity <= 0) delete state.collection[id];
  state.coins += coins;
  state.stats.coinsEarned += coins;
  state.stats.uniqueFound = Object.keys(state.collection).length;
  checkAchievements(state);
  return coins;
}

export function buyUpgrade(state, id) {
  const config = UPGRADE_CONFIG[id];
  const level = state.upgrades[id] || 0;
  const cost = config?.costs[level];
  if (!config || cost == null || state.coins < cost) return { ok:false };
  state.coins -= cost;
  state.stats.coinsSpent += cost;
  state.upgrades[id] = level + 1;
  return { ok:true, cost, level:level+1 };
}

export function toggleFavorite(state,id) {
  state.favorites = state.favorites.includes(id) ? state.favorites.filter(item=>item!==id) : [...state.favorites,id];
}

export function claimDaily(state, now=new Date()) {
  const today = now.toISOString().slice(0,10);
  if (state.daily.lastClaimed === today) return null;
  const yesterday = new Date(now.getTime()-86400000).toISOString().slice(0,10);
  state.daily.streak = state.daily.lastClaimed === yesterday ? Math.min(7,state.daily.streak+1) : 1;
  state.daily.lastClaimed = today;
  const coins = 120 + 20 * (state.daily.streak-1);
  const spins = 3 + Math.floor((state.daily.streak-1)/3);
  state.coins += coins;
  state.spins += spins;
  state.stats.coinsEarned += coins;
  return { coins, spins, streak:state.daily.streak };
}

export function checkAchievements(state) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements[achievement.id] && achievement.test(state)) {
      state.achievements[achievement.id] = Date.now();
      state.coins += achievement.reward;
      state.stats.coinsEarned += achievement.reward;
      unlocked.push(achievement);
    }
  }
  return unlocked;
}

export function collectionValue(state) {
  return Object.values(state.collection).reduce((sum,p)=>sum+p.value*p.quantity,0);
}

export function plateLabel(plate) {
  return `${plate.registration} · ${DESIGN_BY_ID[plate.designId]?.region || plate.region}`;
}
