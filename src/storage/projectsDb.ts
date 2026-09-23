import {
    decodePayload,
    encodePayload,
} from './projectSerializer';
import {
    isSerializedFrameRef,
    ProjectMeta,
    ProjectPayloadV1,
    SerializedInlineHistoryItem,
    SerializedPatternHistoryItem,
} from './projectTypes';
import {encodeRawImage} from '../utils/imageDataBinary';
import type {RawStoredImageData as CodecRawImage} from '../utils/imageDataCodec';
import {
    FRAMES_PROJECT_INDEX,
    FRAMES_STORE,
    STORE_NAME,
    StoredFrameImage,
    ProjectFrameRecord,
    ProjectRecord,
    frameBytesSize,
    listProjectFrames,
    openDb,
    putProjectBuffer,
    txDone,
} from './projectsIdb';

export {
    ensureProjectFrames,
    getProjectFrame,
    listProjectFrames,
    putProjectBuffer,
    resetProjectsDbForTests,
    type ProjectFrameRecord,
    type ProjectRecord,
    type StoredFrameImage,
} from './projectsIdb';

export async function listProjects(): Promise<ProjectMeta[]> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const records = await new Promise<ProjectRecord[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as ProjectRecord[]);
        request.onerror = () => reject(request.error);
    });
    await txDone(tx);

    return records
        .map(({id, name, updatedAt, sizeBytes}) => ({id, name, updatedAt, sizeBytes}))
        .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    const record = await new Promise<ProjectRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as ProjectRecord | undefined);
        request.onerror = () => reject(request.error);
    });
    await txDone(tx);
    return record || null;
}

export function createProjectId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storedToDecodable(image: StoredFrameImage | null): CodecRawImage | null {
    if (!image) {
        return null;
    }

    return {
        width: image.width,
        height: image.height,
        bytes: image.bytes,
    };
}

export async function resolveProjectPayloadFrames(
    payload: ProjectPayloadV1,
    projectId: string,
): Promise<ProjectPayloadV1> {
    const frames = await listProjectFrames(projectId);
    const byId = new Map(frames.map(frame => [frame.frameId, frame]));

    const resolveItem = (
        item: SerializedPatternHistoryItem | null,
    ): (SerializedInlineHistoryItem & {frameId?: string}) | null => {
        if (!item) {
            return null;
        }

        if (!isSerializedFrameRef(item)) {
            return item;
        }

        const frame = byId.get(item.frameId);
        if (!frame) {
            return null;
        }

        return {
            frameId: item.frameId,
            canvasImageData: storedToDecodable(frame.canvas) as any,
            maskImageData: storedToDecodable(frame.mask) as any,
        };
    };

    const patterns: ProjectPayloadV1['patterns'] = {};

    payload.patternOrder.forEach((patternId) => {
        const serialized = payload.patterns[patternId];
        if (!serialized) {
            return;
        }

        const history = serialized.state.history;
        if (!history) {
            patterns[patternId] = serialized;
            return;
        }

        patterns[patternId] = {
            state: {
                ...serialized.state,
                history: {
                    params: history.params,
                    value: {
                        before: history.value.before.map(resolveItem).filter(Boolean) as SerializedPatternHistoryItem[],
                        after: history.value.after.map(resolveItem).filter(Boolean) as SerializedPatternHistoryItem[],
                        current: resolveItem(history.value.current),
                    },
                },
            },
        };
    });

    return {
        ...payload,
        patterns,
    };
}

export function encodeResolvedPayloadForExport(payload: ProjectPayloadV1): ProjectPayloadV1 {
    const encodeImage = (image: any) => {
        if (!image) {
            return null;
        }

        if (typeof image.data === 'string') {
            return image;
        }

        if (image.bytes instanceof ArrayBuffer) {
            return encodeRawImage(image.width, image.height, image.bytes);
        }

        return image;
    };

    const encodeItem = (
        item: SerializedPatternHistoryItem | null,
    ): SerializedInlineHistoryItem | null => {
        if (!item) {
            return null;
        }

        if (isSerializedFrameRef(item)) {
            return {canvasImageData: null, maskImageData: null};
        }

        const inline = item as SerializedInlineHistoryItem & {frameId?: string};
        return {
            canvasImageData: encodeImage(inline.canvasImageData),
            maskImageData: encodeImage(inline.maskImageData),
        };
    };

    const patterns: ProjectPayloadV1['patterns'] = {};

    payload.patternOrder.forEach((patternId) => {
        const serialized = payload.patterns[patternId];
        if (!serialized) {
            return;
        }

        const history = serialized.state.history;
        if (!history) {
            patterns[patternId] = serialized;
            return;
        }

        patterns[patternId] = {
            state: {
                ...serialized.state,
                history: {
                    params: history.params,
                    value: {
                        before: history.value.before.map(encodeItem).filter(Boolean) as SerializedPatternHistoryItem[],
                        after: history.value.after.map(encodeItem).filter(Boolean) as SerializedPatternHistoryItem[],
                        current: encodeItem(history.value.current),
                    },
                },
            },
        };
    });

    return {
        ...payload,
        patterns,
    };
}

export async function getProjectPayload(id: string): Promise<ProjectPayloadV1 | null> {
    const record = await getProject(id);
    if (!record) {
        return null;
    }

    const payload = decodePayload(record.payload);
    return resolveProjectPayloadFrames(payload, id);
}

export async function putProject(
    id: string,
    name: string,
    payload: ProjectPayloadV1,
    keepFrameIds?: Set<string>,
): Promise<ProjectMeta> {
    return putProjectBuffer(id, name, encodePayload(payload), keepFrameIds);
}

export async function deleteProject(id: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction([STORE_NAME, FRAMES_STORE], 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);

    const index = tx.objectStore(FRAMES_STORE).index(FRAMES_PROJECT_INDEX);
    const listReq = index.getAll(id);
    await new Promise<void>((resolve, reject) => {
        listReq.onsuccess = () => {
            const frames = listReq.result as ProjectFrameRecord[];
            for (const frame of frames) {
                tx.objectStore(FRAMES_STORE).delete([id, frame.frameId]);
            }
            resolve();
        };
        listReq.onerror = () => reject(listReq.error);
    });

    await txDone(tx);
}

export async function duplicateProject(id: string, newName: string): Promise<ProjectMeta> {
    const source = await getProject(id);
    if (!source) {
        throw new Error('Project not found');
    }

    const frames = await listProjectFrames(id);
    const newId = createProjectId();
    const framesBytes = frames.reduce((sum, frame) => sum + frameBytesSize(frame), 0);

    const db = await openDb();
    const tx = db.transaction([STORE_NAME, FRAMES_STORE], 'readwrite');
    const framesStore = tx.objectStore(FRAMES_STORE);

    for (const frame of frames) {
        framesStore.put({
            ...frame,
            projectId: newId,
        });
    }

    const record: ProjectRecord = {
        id: newId,
        name: newName,
        updatedAt: Date.now(),
        sizeBytes: source.payload.byteLength + framesBytes,
        payload: source.payload,
    };

    tx.objectStore(STORE_NAME).put(record);
    await txDone(tx);

    return {
        id: record.id,
        name: record.name,
        updatedAt: record.updatedAt,
        sizeBytes: record.sizeBytes,
    };
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
