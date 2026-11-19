/**
 * IndexedDB Large-Capacity Storage Utility for Windows Fix Wizard
 * Overcomes browser localStorage 5MB limit by supporting 100MB+ datasets.
 */

const DB_NAME = 'WinFixWizardDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbOpenPromise) {
    return dbOpenPromise;
  }
  dbOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      dbOpenPromise = null;
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        if (dbInstance === db) dbInstance = null;
      };
      db.onversionchange = () => {
        db.close();
        if (dbInstance === db) dbInstance = null;
      };
      dbInstance = db;
      dbOpenPromise = null;
      resolve(db);
    };
    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error || new Error('IndexedDB open failed'));
    };
    request.onblocked = () => {
      dbOpenPromise = null;
      reject(new Error('IndexedDB connection blocked'));
    };
  });
  return dbOpenPromise;
}

export async function idbSet<T = any>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      store.put(value, key);
    });
  } catch (err) {
    console.warn(`IndexedDB set failed for '${key}':`, err);
  }
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } catch (err) {
    console.warn(`IndexedDB get failed for '${key}':`, err);
    return null;
  }
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      store.delete(key);
    });
  } catch (err) {
    console.warn(`IndexedDB remove failed for '${key}':`, err);
  }
}
