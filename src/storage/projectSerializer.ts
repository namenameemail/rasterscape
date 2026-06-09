import {AppState, patternsService} from '../store';
import {PatternService} from '../store/patterns/_service/PatternService';
import {PatternState} from '../store/patterns/pattern/types';
import {PatternHistoryItem} from '../store/patterns/history/types';
import {decodeImageData, encodeImageData} from '../utils/imageDataCodec';
import {
    ProjectExportFile,
    ProjectPayloadV1,
    SerializedHistoryState,
    SerializedPattern,
    SerializedPatternHistoryItem,
} from './projectTypes';

function serializeHistoryItem(item: PatternHistoryItem | null | undefined): SerializedPatternHistoryItem | null {
    if (!item) {
        return null;
    }

    return {
        canvasImageData: encodeImageData(item.canvasImageData),
        maskImageData: encodeImageData(item.maskImageData),
    };
}

function serializeHistory(history: PatternState['history']): SerializedHistoryState | undefined {
    if (!history) {
        return undefined;
    }

    return {
        params: history.params,
        value: {
            before: history.value.before.map(item => serializeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
            after: history.value.after.map(item => serializeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
            current: serializeHistoryItem(history.value.current),
        },
    };
}

function deserializeHistoryItem(item: SerializedPatternHistoryItem | null): PatternHistoryItem | null {
    if (!item) {
        return null;
    }

    const canvasImageData = decodeImageData(item.canvasImageData);
    const maskImageData = decodeImageData(item.maskImageData);

    if (!canvasImageData || !maskImageData) {
        return null;
    }

    return {canvasImageData, maskImageData};
}

function deserializeHistory(history: SerializedHistoryState | undefined): PatternState['history'] {
    if (!history) {
        return undefined;
    }

    const current = deserializeHistoryItem(history.value.current)
        || {
            canvasImageData: new ImageData(1, 1),
            maskImageData: new ImageData(1, 1),
        };

    return {
        params: history.params,
        value: {
            before: history.value.before
                .map(deserializeHistoryItem)
                .filter(Boolean) as PatternHistoryItem[],
            after: history.value.after
                .map(deserializeHistoryItem)
                .filter(Boolean) as PatternHistoryItem[],
            current,
        },
    };
}

function sanitizePatternState(pattern: PatternState): PatternState {
    return {
        ...pattern,
        video: pattern.video ? {
            ...pattern.video,
            params: {
                ...pattern.video.params,
                cameraOn: false,
                updatingOn: false,
                device: undefined as any,
            },
        } : pattern.video,
        room: pattern.room ? {
            ...pattern.room,
            value: {
                ...pattern.room.value,
                connected: undefined,
                drawer: undefined,
                meDrawer: true,
                persistMeDrawer: pattern.room.value?.persistMeDrawer,
                messages: pattern.room.value?.messages || [],
            },
        } : pattern.room,
        platformer: pattern.platformer ? {
            ...pattern.platformer,
            params: {
                ...pattern.platformer.params,
                playingOn: false,
            },
        } : pattern.platformer,
        demonstration: pattern.demonstration ? {
            ...pattern.demonstration,
            value: {
                ...pattern.demonstration.value,
                enabled: false,
            },
        } : pattern.demonstration,
    };
}

export function serializePattern(
    pattern: PatternState,
    patternService?: PatternService,
): SerializedPattern {
    let history = serializeHistory(pattern.history);

    if (patternService && pattern.history) {
        const currentCanvas = patternService.canvasService.getImageData();
        const currentMask = patternService.maskService.getImageData();
        history = {
            params: pattern.history.params,
            value: {
                before: pattern.history.value.before.map(item => serializeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
                after: pattern.history.value.after.map(item => serializeHistoryItem(item) || {canvasImageData: null, maskImageData: null}),
                current: {
                    canvasImageData: encodeImageData(currentCanvas),
                    maskImageData: encodeImageData(currentMask),
                },
            },
        };
    }

    const {history: _history, ...rest} = pattern;

    return {
        state: {
            ...rest,
            history,
        },
    };
}

export function deserializePattern(serialized: SerializedPattern): PatternState {
    const {history, ...rest} = serialized.state;

    return sanitizePatternState({
        ...rest,
        history: deserializeHistory(history),
    } as PatternState);
}

export function createEmptyProjectPayload(state: AppState): ProjectPayloadV1 {
    return {
        version: 1,
        patternOrder: [],
        activePatternId: null,
        patterns: {},
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

export function deserializeProjectPayload(payload: ProjectPayloadV1): {
    patterns: Record<string, PatternState>
    patternOrder: string[]
    activePatternId: string | null
    changeFunctions: AppState['changeFunctions']
    changingValues: AppState['changingValues']
    dependencies: AppState['dependencies']
    tool: AppState['tool']
    brush: AppState['brush']
    line: AppState['line']
    selectTool: AppState['selectTool']
    color: AppState['color']
} {
    const patterns: Record<string, PatternState> = {};

    payload.patternOrder.forEach((id) => {
        const serialized = payload.patterns[id];
        if (serialized) {
            patterns[id] = deserializePattern(serialized);
        }
    });

    return {
        patterns,
        patternOrder: payload.patternOrder.filter(id => !!patterns[id]),
        activePatternId: payload.activePatternId && patterns[payload.activePatternId]
            ? payload.activePatternId
            : (payload.patternOrder.find(id => patterns[id]) ?? null),
        changeFunctions: payload.changeFunctions || {functions: {}, functionsConstants: {}, namesList: []},
        changingValues: payload.changingValues || {},
        dependencies: payload.dependencies || {changeFunctionToPattern: {}, patternToChangeFunction: {}},
        tool: payload.tool,
        brush: payload.brush,
        line: payload.line,
        selectTool: payload.selectTool,
        color: payload.color,
    };
}

export function encodePayload(payload: ProjectPayloadV1): ArrayBuffer {
    return new TextEncoder().encode(JSON.stringify(payload)).buffer;
}

export function decodePayload(buffer: ArrayBuffer): ProjectPayloadV1 {
    const parsed = JSON.parse(new TextDecoder().decode(buffer));

    if (parsed?.version !== 1) {
        throw new Error('Unsupported project version');
    }

    return parsed as ProjectPayloadV1;
}

export function parseProjectExportFile(text: string): ProjectExportFile {
    const parsed = JSON.parse(text);

    if (parsed?.payload?.version !== 1) {
        throw new Error('Unsupported project file');
    }

    return parsed as ProjectExportFile;
}

export function createExportFile(meta: {id?: string, name: string, updatedAt: number}, payload: ProjectPayloadV1): ProjectExportFile {
    return {
        id: meta.id,
        name: meta.name,
        updatedAt: meta.updatedAt,
        payload,
    };
}
