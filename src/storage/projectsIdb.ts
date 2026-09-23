import {ProjectMeta} from './projectTypes';

export const DB_NAME = 'rasterscape-projects';
export const DB_VERSION = 2;
export const STORE_NAME = 'projects';
export const FRAMES_STORE = 'frames';
export const FRAMES_PROJECT_INDEX = 'projectId';

export interface ProjectRecord extends ProjectMeta {
    payload: ArrayBuffer
}

export type StoredFrameImage = {
    width: number
    height: number
    bytes: ArrayBuffer
}

export type ProjectFrameRecord = {
    projectId: string
    frameId: string
    canvas: StoredFrameImage | null
    mask: StoredFrameImage | null
}

let dbPromise: Promise<IDBDatabase> | null = null;

export async function resetProjectsDbForTests(): Promise<void> {
    if (dbPromise) {
        const db = await dbPromise.catch(() => null);
        db?.close();
        dbPromise = null;
    }

    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
    });
}

export function openDb(): Promise<IDBDatabase> {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {keyPath: 'id'});
            }

            if (!db.objectStoreNames.contains(FRAMES_STORE)) {
                const frames = db.createObjectStore(FRAMES_STORE, {keyPath: ['projectId', 'frameId']});
                frames.createIndex(FRAMES_PROJECT_INDEX, 'projectId', {unique: false});
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

export function txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
}

export function frameBytesSize(frame: ProjectFrameRecord): number {
    return (frame.canvas?.bytes.byteLength ?? 0) + (frame.mask?.bytes.byteLength ?? 0);
}

export async function getProjectFrame(
    projectId: string,
    frameId: string,
): Promise<ProjectFrameRecord | null> {
    const db = await openDb();
    const tx = db.transaction(FRAMES_STORE, 'readonly');
    const request = tx.objectStore(FRAMES_STORE).get([projectId, frameId]);
    const record = await new Promise<ProjectFrameRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as ProjectFrameRecord | undefined);
        request.onerror = () => reject(request.error);
    });
    await txDone(tx);
    return record || null;
}

export async function listProjectFrames(projectId: string): Promise<ProjectFrameRecord[]> {
    const db = await openDb();
    const tx = db.transaction(FRAMES_STORE, 'readonly');
    const request = tx.objectStore(FRAMES_STORE).index(FRAMES_PROJECT_INDEX).getAll(projectId);
    const frames = await new Promise<ProjectFrameRecord[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as ProjectFrameRecord[]);
        request.onerror = () => reject(request.error);
    });
    await txDone(tx);
    return frames;
}

export async function ensureProjectFrames(
    projectId: string,
    frames: ProjectFrameRecord[],
): Promise<void> {
    if (!frames.length) {
        return;
    }

    const db = await openDb();
    const tx = db.transaction(FRAMES_STORE, 'readwrite');
    const store = tx.objectStore(FRAMES_STORE);

    for (const frame of frames) {
        const getReq = store.get([projectId, frame.frameId]);
        getReq.onsuccess = () => {
            if (!getReq.result) {
                store.put({...frame, projectId});
            }
        };
    }

    await txDone(tx);
}

export async function putProjectBuffer(
    id: string,
    name: string,
    buffer: ArrayBuffer,
    keepFrameIds?: Set<string>,
): Promise<ProjectMeta> {
    const db = await openDb();
    const tx = db.transaction([STORE_NAME, FRAMES_STORE], 'readwrite');
    const projects = tx.objectStore(STORE_NAME);
    const framesStore = tx.objectStore(FRAMES_STORE);

    let framesBytes = 0;

    const index = framesStore.index(FRAMES_PROJECT_INDEX);
    const listReq = index.getAll(id);
    const meta = await new Promise<ProjectMeta>((resolve, reject) => {
        listReq.onsuccess = () => {
            const existing = listReq.result as ProjectFrameRecord[];

            for (const frame of existing) {
                if (keepFrameIds && !keepFrameIds.has(frame.frameId)) {
                    framesStore.delete([id, frame.frameId]);
                } else {
                    framesBytes += frameBytesSize(frame);
                }
            }

            const record: ProjectRecord = {
                id,
                name,
                updatedAt: Date.now(),
                sizeBytes: buffer.byteLength + framesBytes,
                payload: buffer,
            };

            const putReq = projects.put(record);
            putReq.onsuccess = () => {
                resolve({
                    id: record.id,
                    name: record.name,
                    updatedAt: record.updatedAt,
                    sizeBytes: record.sizeBytes,
                });
            };
            putReq.onerror = () => reject(putReq.error);
        };
        listReq.onerror = () => reject(listReq.error);
    });

    await txDone(tx);
    return meta;
}
