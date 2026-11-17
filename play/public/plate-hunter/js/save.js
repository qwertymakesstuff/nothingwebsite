import { SAVE_KEY, SAVE_VERSION } from './config.js';

export function newSave() {
  return {
    version:SAVE_VERSION, spins:100, coins:0, collection:{}, pending:[], upgrades:{luck:0,speed:0,bulk:0,collector:0,streak:0},
    achievements:{}, favorites:[],
    stats:{totalSpins:0,totalDiscovered:0,uniqueFound:0,duplicates:0,highestRarity:0,rarestRegistration:null,mostValuable:null,coinsEarned:0,coinsSpent:0,timePlayed:0,luckiestSpin:null,startedAt:Date.now(),lastSavedAt:Date.now()}, lastPlate:null,
    settings:{skipAnimation:false,sound:true}, daily:{lastClaimed:null,streak:0}, streak:{count:0}
  };
}

function migrate(data) {
  if (!data || typeof data !== 'object') return newSave();
  if (data.version === SAVE_VERSION) return { ...newSave(), ...data, stats:{...newSave().stats,...data.stats}, upgrades:{...newSave().upgrades,...data.upgrades}, settings:{...newSave().settings,...data.settings}, daily:{...newSave().daily,...data.daily}, streak:{...newSave().streak,...data.streak} };
  return newSave();
}

export function loadSave() {
  try { return migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return newSave(); }
}

export function saveGame(state) {
  state.version = SAVE_VERSION;
  state.stats.lastSavedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
