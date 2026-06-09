import {BrushState} from '../store/brush/reducer';
import {ChangeFunctionsState} from '../store/changeFunctions/reducer';
import {ColorState} from '../store/color/reducer';
import {DependenciesState} from '../store/dependencies';
import {LineState} from '../store/line/reducer';
import {HistoryState} from '../store/patterns/history/types';
import {PatternState} from '../store/patterns/pattern/types';
import {SelectToolState} from '../store/selectTool/reducer';
import {ToolState} from '../store/tool/reducer';
import {ChangingValuesState} from '../store/changingValues/reducer';

export type RawImagePayload = {
    width: number
    height: number
    bytes: ArrayBuffer
}

export type RawHistoryItemPayload = {
    canvas: RawImagePayload | null
    mask: RawImagePayload | null
}

export type RawHistoryPayload = {
    params: HistoryState['params']
    value: {
        before: RawHistoryItemPayload[]
        after: RawHistoryItemPayload[]
        current: RawHistoryItemPayload | null
    }
}

export type RawPatternPayload = {
    state: Omit<PatternState, 'history'> & {
        history?: RawHistoryPayload
    }
}

export type ProjectSerializeRequest = {
    id: number
    patternOrder: string[]
    activePatternId: string | null
    patterns: Record<string, RawPatternPayload>
    changeFunctions: ChangeFunctionsState
    changingValues: ChangingValuesState
    dependencies: DependenciesState
    tool: ToolState
    brush: BrushState
    line: LineState
    selectTool: SelectToolState
    color: ColorState
}

export type ProjectSerializeResponse = {
    id: number
    buffer: ArrayBuffer
}

export type ProjectSerializeError = {
    id: number
    error: string
}
