import {AppState, patternsService} from '../store';
import {PatternHistoryItem} from '../store/patterns/history/types';
import {PatternState} from '../store/patterns/pattern/types';
import {toSelectionBBox} from '../store/patterns/selection/types';
import {cloneImageBuffer} from '../utils/imageDataBinary';
import {profileLogger} from '../utils/profiling/ProfileLogger';
import {ensureHistoryItemId} from './historyFrameId';
import {
    ProjectFrameRecord,
    StoredFrameImage,
} from './projectsIdb';
import {
    ProjectSerializeError,
    ProjectSerializeRequest,
    ProjectSerializeResponse,
    RawHistoryItemPayload,
    RawImagePayload,
} from './projectSerializeTypes';
import {ProjectMeta} from './projectTypes';

const SERIALIZE_WORKER_TIMEOUT_MS = 45000;

type BuiltSerializeRequest = Omit<ProjectSerializeRequest, 'projectId' | 'name' | 'frames' | 'keepFrameIds'>

let worker: Worker | null = null;
let requestCounter = 0;
const pending = new Map<number, {
    resolve(meta: ProjectMeta): void
    reject(error: Error): void
}>();

function rejectAllPending(error: Error): void {
    pending.forEach(({reject}) => reject(error));
    pending.clear();
}

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./projectSerialize.worker.ts', import.meta.url), {type: 'module'});

        worker.onmessage = (event: MessageEvent<ProjectSerializeResponse | ProjectSerializeError>) => {
            const message = event.data;
            const handlers = pending.get(message.id);

            if (!handlers) {
                return;
            }

            pending.delete(message.id);

            if ('error' in message) {
                handlers.reject(new Error(message.error));
                return;
            }

            handlers.resolve(message.meta);
        };

        worker.onerror = (error) => {
            const dead = worker;
            worker = null;
            rejectAllPending(new Error(error.message || 'Project serialize worker failed'));
            dead?.terminate();
        };
    }

    return worker;
}

function toRawImage(imageData: ImageData | null | undefined): RawImagePayload | null {
    const bytes = cloneImageBuffer(imageData);

    if (!bytes || !imageData) {
        return null;
    }

    return {
        width: imageData.width,
        height: imageData.height,
        bytes,
    };
}

function toStoredImage(imageData: ImageData | null | undefined): StoredFrameImage | null {
    if (!imageData) {
        return null;
    }

    return {
        width: imageData.width,
        height: imageData.height,
        bytes: imageData.data.slice().buffer,
    };
}

function toRawHistoryRef(item: PatternHistoryItem | null | undefined): RawHistoryItemPayload | null {
    if (!item) {
        return null;
    }

    return {frameId: ensureHistoryItemId(item)};
}

function collectFrameRecord(
    projectId: string,
    item: PatternHistoryItem | null | undefined,
    frames: ProjectFrameRecord[],
    keepFrameIds: Set<string>,
): void {
    if (!item?.canvasImageData && !item?.maskImageData) {
        return;
    }

    const frameId = ensureHistoryItemId(item);
    keepFrameIds.add(frameId);
    frames.push({
        projectId,
        frameId,
        canvas: toStoredImage(item.canvasImageData),
        mask: toStoredImage(item.maskImageData),
    });
}

function buildPatternPayload(
    pattern: PatternState,
    patternId: string,
    projectId: string,
    frames: ProjectFrameRecord[],
    keepFrameIds: Set<string>,
): ProjectSerializeRequest['patterns'][string] {
    const patternService = patternsService.pattern[patternId];

    let history: ProjectSerializeRequest['patterns'][string]['state']['history'];

    if (pattern.history) {
        pattern.history.value.before.forEach(item => {
            collectFrameRecord(projectId, item, frames, keepFrameIds);
        });
        pattern.history.value.after.forEach(item => {
            collectFrameRecord(projectId, item, frames, keepFrameIds);
        });

        history = {
            params: pattern.history.params,
            value: {
                before: pattern.history.value.before.map(item => toRawHistoryRef(item) || {canvas: null, mask: null}),
                after: pattern.history.value.after.map(item => toRawHistoryRef(item) || {canvas: null, mask: null}),
                current: patternService
                    ? {
                        canvas: toRawImage(patternService.canvasService.getImageData()),
                        mask: toRawImage(patternService.maskService.getImageData()),
                    }
                    : {
                        canvas: toRawImage(pattern.history.value.current?.canvasImageData),
                        mask: toRawImage(pattern.history.value.current?.maskImageData),
                    },
            },
        };
    }

    const {history: _history, error: _error, selection, ...rest} = pattern;

    return {
        state: {
            ...rest,
            selection: selection
                ? {
                    ...selection,
                    value: selection.value
                        ? {
                            ...selection.value,
                            bBox: toSelectionBBox(selection.value.bBox),
                        }
                        : selection.value,
                }
                : selection,
            history,
        },
    };
}

export function buildProjectSerializeRequest(
    state: AppState,
    projectId: string,
): {
    request: BuiltSerializeRequest
    frames: ProjectFrameRecord[]
    keepFrameIds: Set<string>
} {
    const patternOrder = Object.keys(state.patterns);
    const patterns: ProjectSerializeRequest['patterns'] = {};
    const frames: ProjectFrameRecord[] = [];
    const keepFrameIds = new Set<string>();

    patternOrder.forEach((patternId) => {
        patterns[patternId] = buildPatternPayload(
            state.patterns[patternId],
            patternId,
            projectId,
            frames,
            keepFrameIds,
        );
    });

    return {
        request: {
            id: 0,
            patternOrder,
            activePatternId: state.activePattern.patternId,
            patterns,
            changeFunctions: state.changeFunctions,
            changingValues: state.changingValues,
            dependencies: state.dependencies,
            tool: state.tool,
            brush: state.brush,
            line: state.line,
            selectTool: state.selectTool,
            color: state.color,
        },
        frames,
        keepFrameIds,
    };
}

function collectTransferables(request: ProjectSerializeRequest): Transferable[] {
    const seen = new Set<ArrayBuffer>();
    const transferables: Transferable[] = [];

    const pushBuffer = (buffer: ArrayBuffer | null | undefined) => {
        if (!buffer || seen.has(buffer)) {
            return;
        }

        seen.add(buffer);
        transferables.push(buffer);
    };

    const pushImage = (image: RawImagePayload | null | undefined) => {
        if (image) {
            pushBuffer(image.bytes);
        }
    };

    const pushHistoryItem = (item: RawHistoryItemPayload | null) => {
        if (!item || 'frameId' in item) {
            return;
        }

        pushImage(item.canvas);
        pushImage(item.mask);
    };

    request.patternOrder.forEach((patternId) => {
        const history = request.patterns[patternId]?.state.history;

        if (!history) {
            return;
        }

        history.value.before.forEach(pushHistoryItem);
        history.value.after.forEach(pushHistoryItem);
        pushHistoryItem(history.value.current);
    });

    request.frames.forEach(frame => {
        pushBuffer(frame.canvas?.bytes);
        pushBuffer(frame.mask?.bytes);
    });

    return transferables;
}

export async function persistProjectViaWorker(
    state: AppState,
    projectId: string,
    name: string,
): Promise<ProjectMeta> {
    const {request, frames, keepFrameIds} = profileLogger.time('projects.autosave.serialize.build', () => {
        const built = buildProjectSerializeRequest(state, projectId);
        const id = ++requestCounter;
        built.request.id = id;
        return built;
    });

    const message: ProjectSerializeRequest = {
        ...request,
        projectId,
        name,
        frames,
        keepFrameIds: [...keepFrameIds],
    };

    return profileLogger.timeAsync('projects.autosave.serialize.worker', () =>
        new Promise<ProjectMeta>((resolve, reject) => {
            let settled = false;

            const finish = (ok: boolean, value?: ProjectMeta, error?: Error) => {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timer);
                pending.delete(request.id);

                if (ok) {
                    resolve(value as ProjectMeta);
                } else {
                    reject(error ?? new Error('serialize worker failed'));
                }
            };

            const timer = window.setTimeout(() => {
                finish(false, undefined, new Error(`serialize worker timeout ${SERIALIZE_WORKER_TIMEOUT_MS}ms`));
                terminateProjectSerializeWorker();
            }, SERIALIZE_WORKER_TIMEOUT_MS);

            pending.set(request.id, {
                resolve: meta => finish(true, meta),
                reject: error => finish(false, undefined, error),
            });

            try {
                getWorker().postMessage(message, collectTransferables(message));
            } catch (error) {
                finish(false, undefined, error instanceof Error ? error : new Error(String(error)));
            }
        }),
    );
}

export function terminateProjectSerializeWorker(): void {
    rejectAllPending(new Error('Project serialize worker terminated'));
    worker?.terminate();
    worker = null;
}
