// Key-value persistence on IndexedDB, falling back to localStorage when IndexedDB is unavailable
// (private windows, some embedded browsers). Every call resolves; failures are logged, never thrown.
const DB = 'fakeos', STORE = 'kv';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise(resolve => {
    try {
      if (!('indexedDB' in globalThis)) return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
function ls() { try { return globalThis.localStorage; } catch { return null; } }
export async function get(key) {
  const db = await open();
  if (db) {
    try {
      return await new Promise((res, rej) => {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    } catch (e) { console.warn('fakeos db get', e); }
  }
  try { const v = ls()?.getItem('fakeos:' + key); return v ? JSON.parse(v) : undefined; } catch { return undefined; }
}
export async function set(key, value) {
  const db = await open();
  if (db) {
    try {
      await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
      return true;
    } catch (e) { console.warn('fakeos db set', e); }
  }
  try { ls()?.setItem('fakeos:' + key, JSON.stringify(value)); return true; } catch { return false; }
}
export async function del(key) {
  const db = await open();
  if (db) { try { db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); } catch {} }
  try { ls()?.removeItem('fakeos:' + key); } catch {}
}
