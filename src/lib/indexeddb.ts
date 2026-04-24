const DB_NAME = 'CorvascKardexDB';
const DB_VER = 1;
const STORE = 'movimientos';
const META = 'meta';

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    r.onsuccess = (e: any) => res(e.target.result);
    r.onerror = (e: any) => rej(e.target.error);
  });
}

function dbPut(store: string, key: string, val: any): Promise<void> {
  return openDB().then(db => {
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(val, key);
      tx.oncomplete = () => res();
      tx.onerror = (e: any) => rej(e.target.error);
    });
  });
}

function dbGet(store: string, key: string): Promise<any> {
    return openDB().then(db => {
        return new Promise((res, rej) => {
          const tx = db.transaction(store, 'readonly');
          const r = tx.objectStore(store).get(key);
          r.onsuccess = () => res(r.result);
          r.onerror = (e: any) => rej(e.target.error);
        });
    });
}

export async function saveToDB(movs: any[], fileName?: string, fileMeta?: string[]): Promise<void> {
  try {
    const serialized = movs.map(r => ({ ...r, fechaHora: r.fechaHora ? r.fechaHora.toISOString() : null, caducidad: r.caducidad ? r.caducidad.toISOString() : null }));
    await dbPut(STORE, 'all', serialized);
    await dbPut(META, 'loadedAt', new Date().toISOString());
    if (fileName) {
      await dbPut(META, 'fileName', fileName);
    }
    if (fileMeta) {
      await dbPut(META, 'fileMeta', JSON.stringify(fileMeta));
    }
  } catch (e) { console.warn('DB save error', e); }
}

export async function loadFromDB(): Promise<{ movs: any[], loadedAt: Date | null, fileName: string | null, fileMeta: string[] | null } | null> {
  try {
    const data = await dbGet(STORE, 'all');
    const loadedAtStr = await dbGet(META, 'loadedAt');
    const fileName = await dbGet(META, 'fileName') || null;
    const fileMetaRaw = await dbGet(META, 'fileMeta');
    const fileMeta = fileMetaRaw ? JSON.parse(fileMetaRaw) : null;
    
    if (Array.isArray(data) && data.length) {
      const movs = data.map(r => ({ 
        ...r, 
        fechaHora: r.fechaHora ? new Date(r.fechaHora) : null,
        caducidad: r.caducidad ? new Date(r.caducidad) : null
      }));
      const loadedAt = loadedAtStr ? new Date(loadedAtStr) : null;
      return { movs, loadedAt, fileName, fileMeta };
    }
  } catch (e) { console.warn('DB load error', e); }
  return null;
}

export async function clearDB(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction([STORE, META], 'readwrite');
      tx.objectStore(STORE).clear();
      tx.objectStore(META).clear();
      tx.oncomplete = () => res();
      tx.onerror = (e: any) => rej(e.target.error);
    });
  } catch (e) { console.warn('DB clear error', e); }
}
