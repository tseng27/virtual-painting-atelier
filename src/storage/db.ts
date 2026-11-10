/** Minimal promise wrapper around IndexedDB (no external dependency). */
const DB_NAME = 'atelier';
const DB_VERSION = 1;
export const STORE_META = 'artworks';
export const STORE_DATA = 'projects';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'id' }).createIndex('updated', 'updated');
      if (!db.objectStoreNames.contains(STORE_DATA)) db.createObjectStore(STORE_DATA, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

/** for tests */
export function resetDbConnection() { dbPromise = null; }

const done = (tx: IDBTransaction) => new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
const req2p = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function put(store: string, value: unknown) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await done(tx);
}
export async function putBoth(meta: unknown, data: unknown) {
  const db = await openDb();
  const tx = db.transaction([STORE_META, STORE_DATA], 'readwrite');
  tx.objectStore(STORE_META).put(meta);
  tx.objectStore(STORE_DATA).put(data);
  await done(tx);
}
export async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return req2p(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}
export async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return req2p(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}
export async function del(key: string) {
  const db = await openDb();
  const tx = db.transaction([STORE_META, STORE_DATA], 'readwrite');
  tx.objectStore(STORE_META).delete(key);
  tx.objectStore(STORE_DATA).delete(key);
  await done(tx);
}
