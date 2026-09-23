import {FunctionState} from "../../../utils/patterns/function";

export interface PatternHistoryItem {
    id?: string
    canvasImageData?: ImageData
    maskImageData?: ImageData
}

export interface HistoryParams {
    length?: number
}

export interface HistoryValue {
    before: PatternHistoryItem[]
    after: PatternHistoryItem[]
    current: PatternHistoryItem
}

export type HistoryState = FunctionState<HistoryValue, HistoryParams>;
