import {AppState, patternsService} from '../store';
import {PatternHistoryItem} from '../store/patterns/history/types';
import {PatternState} from '../store/patterns/pattern/types';
import {cloneImageBuffer} from '../utils/imageDataBinary';
import {profileLogger} from '../utils/profiling/ProfileLogger';
import {
    ProjectSerializeError,
    ProjectSerializeRequest,
    ProjectSerializeResponse,
    RawHistoryItemPayload,
    RawImagePayload,
} from './projectSerializeTypes';

const SERIALIZE_WORKER_TIMEOUT_MS = 45000;

let worker: Worker | null = null;
let requestCounter = 0;
const pending = new Map<number, {
    resolve(buffer: ArrayBuffer): void
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

            handlers.resolve(message.buffer);
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

function toRawHistoryItem(item: PatternHistoryItem | null | undefined): RawHistoryItemPayload | null {
    if (!item) {
        return null;
    }

    return {
        canvas: toRawImage(item.canvasImageData),
        mask: toRawImage(item.maskImageData),
    };
}

function buildPatternPayload(pattern: PatternState, patternId: string): ProjectSerializeRequest['patterns'][string] {
    let history = pattern.history
        ? {
            params: pattern.history.params,
            value: {
                before: pattern.history.value.before.map(item => toRawHistoryItem(item) || {canvas: null, mask: null}),
                after: pattern.history.value.after.map(item => toRawHistoryItem(item) || {canvas: null, mask: null}),
                current: toRawHistoryItem(pattern.history.value.current),
            },
        }
        : undefined;

    const patternService = patternsService.pattern[patternId];

    if (patternService && pattern.history) {
        history = {
            params: pattern.history.params,
            value: {
                before: pattern.history.value.before.map(item => toRawHistoryItem(item) || {canvas: null, mask: null}),
                after: pattern.history.value.after.map(item => toRawHistoryItem(item) || {canvas: null, mask: null}),
                current: {
                    canvas: toRawImage(patternService.canvasService.getImageData()),
                    mask: toRawImage(patternService.maskService.getImageData()),
                },
            },
        };
    }

    const {history: _history, error: _error, ...rest} = pattern;

    return {
        state: {
            ...rest,
            history,
        },
    };
}

export function buildProjectSerializeRequest(state: AppState): ProjectSerializeRequest {
    const patternOrder = Object.keys(state.patterns);
    const patterns: ProjectSerializeRequest['patterns'] = {};

    patternOrder.forEach((patternId) => {
        patterns[patternId] = buildPatternPayload(state.patterns[patternId], patternId);
    });

    return {
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
    };
}

function collectTransferables(request: ProjectSerializeRequest): Transferable[] {
    const transferables: Transferable[] = [];

    const pushImage = (image: RawImagePayload | null) => {
        if (image) {
            transferables.push(image.bytes);
        }
    };

    const pushHistoryItem = (item: RawHistoryItemPayload | null) => {
        if (!item) {
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

    return transferables;
}

export function serializeProjectToBuffer(state: AppState): Promise<ArrayBuffer> {
    const request = profileLogger.time('projects.autosave.serialize.build', () => {
        const built = buildProjectSerializeRequest(state);
        const id = ++requestCounter;
        built.id = id;
        return built;
    });

    return profileLogger.timeAsync('projects.autosave.serialize.worker', () =>
        new Promise<ArrayBuffer>((resolve, reject) => {
            let settled = false;

            const finish = (ok: boolean, value?: ArrayBuffer, error?: Error) => {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timer);
                pending.delete(request.id);

                if (ok) {
                    resolve(value as ArrayBuffer);
                } else {
                    reject(error ?? new Error('serialize worker failed'));
                }
            };

            const timer = window.setTimeout(() => {
                finish(false, undefined, new Error(`serialize worker timeout ${SERIALIZE_WORKER_TIMEOUT_MS}ms`));
                terminateProjectSerializeWorker();
            }, SERIALIZE_WORKER_TIMEOUT_MS);

            pending.set(request.id, {
                resolve: buffer => finish(true, buffer),
                reject: error => finish(false, undefined, error),
            });

            try {
                getWorker().postMessage(request, collectTransferables(request));
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
