// SELECTION SELECTION SELECTION SELECTION SELECTION SELECTION SELECTION SELECTION

import {Segment} from "../../../utils/path";
import {FunctionState} from "../../../utils/patterns/function";

export interface SelectionParams {
    mask?: any
    strokeColor?: string
    strokeOpacity?: number
    fillColor?: string
    fillOpacity?: number
}

export type Segments = Segment[];

export type SelectionBBox = {
    x: number
    y: number
    width: number
    height: number
}

export interface SelectionValue {
    segments: Segments
    bBox?: SelectionBBox | null
    mask?: any
}

export type SelectionState = FunctionState<SelectionValue, SelectionParams>;

export const toSelectionBBox = (bBox?: SVGRect | SelectionBBox | null): SelectionBBox | null => {
    if (!bBox) {
        return null;
    }

    return {
        x: bBox.x,
        y: bBox.y,
        width: bBox.width,
        height: bBox.height,
    };
};
