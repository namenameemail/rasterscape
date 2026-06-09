import {encodeRawImage} from '../utils/imageDataBinary';
import {
    ProjectPayloadV1,
    SerializedHistoryState,
    SerializedPattern,
    SerializedPatternHistoryItem,
} from './projectTypes';
import {
    ProjectSerializeError,
    ProjectSerializeRequest,
    ProjectSerializeResponse,
    RawHistoryItemPayload,
} from './projectSerializeTypes';

function encodeHistoryItem(item: RawHistoryItemPayload | null): SerializedPatternHistoryItem | null {
    if (!item) {
        return null;
    }

    return {
        canvasImageData: item.canvas
            ? encodeRawImage(item.canvas.width, item.canvas.height, item.canvas.bytes)
            : null,
        maskImageData: item.mask
            ? encodeRawImage(item.mask.width, item.mask.height, item.mask.bytes)
            : null,
    };
}

function encodeHistory(history: ProjectSerializeRequest['patterns'][string]['state']['history']): SerializedHistoryState | undefined {
    if (!history) {
        return undefined;
    }

    return {
        params: history.params,
        value: {
            before: history.value.before.map(item => encodeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
            after: history.value.after.map(item => encodeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
            current: encodeHistoryItem(history.value.current),
        },
    };
}

function buildPayload(request: ProjectSerializeRequest): ProjectPayloadV1 {
    const patterns: Record<string, SerializedPattern> = {};

    request.patternOrder.forEach((patternId) => {
        const raw = request.patterns[patternId];
        if (!raw) {
            return;
        }

        const {history, ...rest} = raw.state;

        patterns[patternId] = {
            state: {
                ...rest,
                history: encodeHistory(history),
            },
        };
    });

    return {
        version: 1,
        patternOrder: request.patternOrder,
        activePatternId: request.activePatternId,
        patterns,
        changeFunctions: request.changeFunctions,
        changingValues: request.changingValues,
        dependencies: request.dependencies,
        tool: request.tool,
        brush: request.brush,
        line: request.line,
        selectTool: request.selectTool,
        color: request.color,
    };
}

self.onmessage = (event: MessageEvent<ProjectSerializeRequest>) => {
    const request = event.data;

    try {
        const payload = buildPayload(request);
        const buffer = new TextEncoder().encode(JSON.stringify(payload)).buffer;
        const response: ProjectSerializeResponse = {id: request.id, buffer};

        self.postMessage(response, [buffer]);
    } catch (error) {
        const response: ProjectSerializeError = {
            id: request.id,
            error: error instanceof Error ? error.message : String(error),
        };

        self.postMessage(response);
    }
};

export type {};
