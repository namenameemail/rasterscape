import {BrushState} from '../store/brush/reducer';
import {ChangeFunctionsState} from '../store/changeFunctions/reducer';
import {ColorState} from '../store/color/reducer';
import {DependenciesState} from '../store/dependencies';
import {LineState} from '../store/line/reducer';
import {PatternState} from '../store/patterns/pattern/types';
import {SelectToolState} from '../store/selectTool/reducer';
import {ToolState} from '../store/tool/reducer';
import {ChangingValuesState} from '../store/changingValues/reducer';
import {HistoryState} from '../store/patterns/history/types';
import {SerializedImageData} from '../utils/imageDataCodec';

export interface ProjectMeta {
    id: string
    name: string
    updatedAt: number
    sizeBytes: number
}

export interface SerializedPatternHistoryItem {
    canvasImageData: SerializedImageData | null
    maskImageData: SerializedImageData | null
}

export interface SerializedHistoryState {
    value: {
        before: SerializedPatternHistoryItem[]
        after: SerializedPatternHistoryItem[]
        current: SerializedPatternHistoryItem | null
    }
    params: HistoryState['params']
}

export interface SerializedPattern {
    state: Omit<PatternState, 'history'> & {
        history?: SerializedHistoryState
    }
}

export interface ProjectPayloadV1 {
    version: 1
    patternOrder: string[]
    activePatternId: string | null
    patterns: Record<string, SerializedPattern>
    changeFunctions: ChangeFunctionsState
    changingValues: ChangingValuesState
    dependencies: DependenciesState
    tool: ToolState
    brush: BrushState
    line: LineState
    selectTool: SelectToolState
    color: ColorState
}

export interface ProjectExportFile {
    id?: string
    name: string
    updatedAt: number
    payload: ProjectPayloadV1
}

export const PROJECT_FILE_EXTENSION = 'rs2d';

export function stripProjectFileExtension(fileName: string): string {
    return fileName.replace(/\.(rs2d|rs|json)$/i, '');
}

export function resolveUniqueProjectName(desiredName: string, existingNames: readonly string[]): string {
    const name = desiredName.trim() || 'Imported project';
    const taken = new Set(existingNames);

    if (!taken.has(name)) {
        return name;
    }

    for (let i = 1; i <= 9999; i++) {
        const candidate = `${name} (${i})`;
        if (!taken.has(candidate)) {
            return candidate;
        }
    }

    return `${name} (${Date.now()})`;
}
