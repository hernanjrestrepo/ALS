// Fotos del muestreo guardadas en el telefono (IndexedDB) hasta que se envian: en
// campo puede no haber senal, y localStorage no guarda archivos (2026-10-23).

const DB_NAME = 'als-muestreo';
const STORE = 'fotos';

export interface StoredPhoto {
    id: string;
    group: string; // `${oitId}:${serviceKey}`
    stepIndex: number;
    name: string;
    type: string;
    blob: Blob;
    takenAt: string;
}

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('group', 'group');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const savePhoto = (photo: StoredPhoto) => run('readwrite', s => s.put(photo));
export const deletePhoto = (id: string) => run('readwrite', s => s.delete(id));
export const listPhotos = (group: string) => run<StoredPhoto[]>('readonly', s => s.index('group').getAll(group));

export async function clearPhotos(group: string) {
    for (const p of await listPhotos(group)) await deletePhoto(p.id);
}
