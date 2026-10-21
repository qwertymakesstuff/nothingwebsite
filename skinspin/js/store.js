// The live game: owns the one player object, runs transactions against it, saves after every
// successful one and tells subscribers what changed.

import { SAVE_KEY } from './config.js';
import { secureRandom } from './rng.js';
import { createPlayer } from './playerState.js';
import { loadSave, savePlayer, sanitizePlayer, migrate } from './save.js';
import { SAVE_VERSION } from './config.js';
import * as economy from './economy.js';
import { upgradeItem } from './upgrade.js';
import { signContract } from './contracts.js';
import { claimCollection } from './collections.js';
import { runBattle } from './battles.js';
import { tickMarket, buyListing, listItem, cancelListing } from './market.js';

export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
    keys: () => [...data.keys()],
  };
}

export function createStore({ storage, rng = secureRandom, clock = () => Date.now() } = {}) {
  const loaded = loadSave(storage, clock());
  let player = loaded.player;
  let saveOk = true;
  const listeners = new Set();

  const persist = () => { saveOk = savePlayer(storage, player); return saveOk; };
  const emit = event => { for (const fn of listeners) fn(event, player); };
  const run = (type, fn) => {
    const result = fn();
    if (result.ok) { persist(); emit({ type, result }); }
    return result;
  };

  if (loaded.status !== 'loaded' && loaded.status !== 'unavailable') persist();
  if (loaded.status === 'unavailable') saveOk = false;

  return {
    get player() { return player; },
    get saveOk() { return saveOk; },
    loadStatus: loaded.status,
    backupKey: loaded.backupKey || null,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    openCase: caseId => run('open', () => economy.openCase(player, caseId, { rng, now: clock() })),
    sell: (uids, opts = {}) => run('sell', () => economy.sellItems(player, uids, { ...opts, now: clock() })),
    setFlag: (uid, flag, value) => run('flag', () => economy.setItemFlag(player, uid, flag, value)),
    updateSettings: patch => run('settings', () => economy.updateSettings(player, patch)),
    rename: name => run('rename', () => economy.renamePlayer(player, name)),
    claimRefill: () => run('refill', () => economy.claimRefill(player, { now: clock() })),
    upgrade: (uid, target) => run('upgrade', () => upgradeItem(player, uid, target, { rng, now: clock() })),
    contract: uids => run('contract', () => signContract(player, uids, { rng, now: clock() })),
    claimCollection: id => run('collection', () => claimCollection(player, id, { now: clock() })),
    battle: setup => run('battle', () => runBattle(player, setup, { rng, now: clock() })),
    buyListing: id => run('market', () => buyListing(player, id, { now: clock() })),
    listItem: (uid, price) => run('market', () => listItem(player, uid, price, { now: clock() })),
    cancelListing: id => run('market', () => cancelListing(player, id, { now: clock() })),
    // NPC market activity. Always saved (so simulated time is never replayed), announced only if something happened.
    tickMarket() {
      const result = tickMarket(player, { rng, now: clock() });
      persist();
      if (result.changed) emit({ type: 'market', result, tick: true });
      return result;
    },

    reset() {
      player = createPlayer(clock());
      persist();
      emit({ type: 'reset' });
      return { ok: true };
    },
    // Replace the player with an exported save. Everything in it is validated like a normal load.
    importData(text) {
      let data;
      try { data = JSON.parse(text); } catch { return { ok: false, error: 'bad-json', message: 'That file is not a SkinSpin save.' }; }
      if (!data || typeof data !== 'object' || Array.isArray(data) || !('coins' in data) || !('inventory' in data)) {
        return { ok: false, error: 'bad-save', message: 'That file is not a SkinSpin save.' };
      }
      const prepared = Number.isInteger(data.version) && data.version > SAVE_VERSION ? data : migrate(data);
      const { player: p, repaired } = sanitizePlayer(prepared, clock());
      player = p;
      persist();
      emit({ type: 'reset' });
      return { ok: true, repaired };
    },
    // Another tab saved: adopt its state so the two tabs don't overwrite each other.
    reloadFromStorage() {
      player = loadSave(storage, clock()).player;
      emit({ type: 'external' });
    },
    SAVE_KEY,
  };
}

// Guards the one-at-a-time rule for openings: while a roulette runs, no second opening starts.
export function createOpener(store) {
  let busy = false;
  return {
    get busy() { return busy; },
    start(caseId) {
      if (busy) return { ok: false, error: 'busy', message: 'An opening is already in progress.' };
      const result = store.openCase(caseId);
      if (result.ok) busy = true;
      return result;
    },
    finish() { busy = false; },
  };
}
