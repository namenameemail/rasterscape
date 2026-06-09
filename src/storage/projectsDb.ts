import {
    decodePayload,
    encodePayload,
} from './projectSerializer';
import {ProjectMeta, ProjectPayloadV1} from './projectTypes';

const DB_NAME = 'rasterscape-projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export interface ProjectRecord extends ProjectMeta {
    payload: ArrayBuffer
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
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
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

function runTransaction<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
    }));
}

export function createProjectId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function listProjects(): Promise<ProjectMeta[]> {
    const records = await runTransaction<ProjectRecord[]>('readonly', store => store.getAll());

    return records
        .map(({id, name, updatedAt, sizeBytes}) => ({id, name, updatedAt, sizeBytes}))
        .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
    const record = await runTransaction<ProjectRecord | undefined>('readonly', store => store.get(id));
    return record || null;
}

export async function getProjectPayload(id: string): Promise<ProjectPayloadV1 | null> {
    const record = await getProject(id);
    if (!record) {
        return null;
    }

    return decodePayload(record.payload);
}

export async function putProjectBuffer(
    id: string,
    name: string,
    buffer: ArrayBuffer,
): Promise<ProjectMeta> {
    const record: ProjectRecord = {
        id,
        name,
        updatedAt: Date.now(),
        sizeBytes: buffer.byteLength,
        payload: buffer,
    };

    await runTransaction('readwrite', store => store.put(record));

    return {
        id: record.id,
        name: record.name,
        updatedAt: record.updatedAt,
        sizeBytes: record.sizeBytes,
    };
}

export async function putProject(
    id: string,
    name: string,
    payload: ProjectPayloadV1,
): Promise<ProjectMeta> {
    return putProjectBuffer(id, name, encodePayload(payload));
}

export async function deleteProject(id: string): Promise<void> {
    await runTransaction('readwrite', store => store.delete(id));
}

export async function duplicateProject(id: string, newName: string): Promise<ProjectMeta> {
    const source = await getProject(id);
    if (!source) {
        throw new Error('Project not found');
    }

    const newId = createProjectId();

    return putProjectBuffer(newId, newName, source.payload);
}

export async function estimateStorage(): Promise<{quota: number, usage: number, free: number}> {
    if (!navigator.storage?.estimate) {
        return {quota: 0, usage: 0, free: 0};
    }

    const {quota = 0, usage = 0} = await navigator.storage.estimate();
    return {
        quota,
        usage,
        free: Math.max(0, quota - usage),
    };
}

export const CURRENT_PROJECT_ID_KEY = 'currentProjectId';

export function getStoredCurrentProjectId(): string | null {
    return localStorage.getItem(CURRENT_PROJECT_ID_KEY);
}

export function setStoredCurrentProjectId(id: string | null): void {
    if (id) {
        localStorage.setItem(CURRENT_PROJECT_ID_KEY, id);
    } else {
        localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
    }
}
