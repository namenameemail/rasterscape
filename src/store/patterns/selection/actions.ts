import {PatternAction, PatternState} from "../pattern/types";
import {Segments, SelectionBBox, toSelectionBBox} from "./types";
import {AppState, patternsService} from "../../index";
import {addPattern} from "../actions";
import {copyPatternToClipboard, updateImage} from "../pattern/actions";
import {getPatternConfig, getPatternParams} from "../pattern/helpers";
import {getMaskFromSegments, getSelectedImageData, getSelectedMask} from "./helpers";
import {updateMask} from "../mask/actions";
import {createCleanCanvasState} from "../../../utils/state";
import {EPathModeType, Path} from "../../../utils/path";
import {isMeDrawer} from "../room/helpers";
import {patternValues} from "../values";
import {pushHistory} from "../history/actions";

export enum ESelectionAction {
    UPDATE_SELECTION = "pattern/update-selection",
}

export interface UpdatePatternSelectionAction extends PatternAction {
    value: Segments
    bBox: SelectionBBox | null
}

export interface CreatePatternFromSelection extends PatternAction {
}

export const updateSelection = (id: string, value: Segments, bBox?: SVGRect | SelectionBBox | null) =>
    (dispatch) => {
        const plainBBox = toSelectionBBox(bBox);

        dispatch({type: ESelectionAction.UPDATE_SELECTION, value, bBox: plainBBox, id});

        patternsService.pattern[id]
            .selectionService.update(value, plainBBox)
            .valuesService.update();
    };

export const selectAll = (id: string) => (dispatch, getState: () => AppState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    if (!pattern) return;
    // const patternService = patternsService.pattern[id];

    const {width, height} = pattern;

    const path = Path[EPathModeType.Rect]([], [0, 0, width, height]);

    const segments = [...path, ...pattern.selection?.value?.segments];

    const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
    rect.setAttributeNS(null, 'x', '0');
    rect.setAttributeNS(null, 'y', '0');
    rect.setAttributeNS(null, 'height', `${height}`);
    rect.setAttributeNS(null, 'width', `${width}`);

    const bBox = rect.getBBox();

    dispatch(updateSelection(id, segments, bBox));
    // dispatch({type: ESelectionAction.UPDATE_SELECTION, value: [...path, ...pattern.selection?.value?.segments], bBox, id});
};

export const createPatternFromSelection = (id: string) => (dispatch, getState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    const config = getPatternConfig(pattern, patternsService.pattern[id]);
    const params = getPatternParams(pattern);

    config.startImage = getSelectedImageData(pattern);
    config.startMask = getSelectedMask(pattern);

    dispatch(addPattern(config, params));
};
export const cutPatternBySelection = (id: string) => (dispatch, getState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    if (!pattern) return;

    if (!isMeDrawer(pattern.room?.value)) return;

    const patternService = patternsService.pattern[pattern.id];

    const canvasImageData = getSelectedImageData(pattern);
    const maskImageData = getSelectedMask(pattern);

    patternService.setCanvasAndMaskImageData(canvasImageData, maskImageData);


    dispatch(updateSelection(id, [], null));

    dispatch(pushHistory(id));
};

export const clearSelectionIn = (id: string) => (dispatch, getState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    if (!pattern) return;

    if (!isMeDrawer(pattern.room?.value)) return;

    if (pattern.selection?.value.segments.length) {
        dispatch(updateImage({
            id,
            imageData: getSelectedImageData(pattern, false, true),
            noHistory: false
        }));
    } else {
        dispatch(updateImage({
            id,
            imageData: createCleanCanvasState(pattern.width, pattern.height).imageData,
            noHistory: false
        }));
    }
};

export const cutSelectionInToClipboard = (id: string) => (dispatch, getState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    if (!isMeDrawer(pattern.room.value)) return;

    dispatch(copyPatternToClipboard(id));
    dispatch(clearSelectionIn(id));
};
