import {ImageAction} from "../../../utils/types";
import {PatternAction} from "../pattern/types";
import {MaskParams} from "./types";
import {AppState, patternsService} from "../../index";
import {historyPush} from "../history/helpers";
import {initHistory, pushHistory} from "../history/actions";
import {EToolType} from "../../tool/types";

export enum EMaskAction {
    UPDATE_MASK = "pattern/update-mask",
    SET_MASK_PARAMS = "pattern/set-mask-params",
}

export interface UpdatePatternMaskAction extends PatternAction {
    noHistory?: boolean
}

export interface SetMaskParamsAction extends PatternAction {
    params: MaskParams
}

export const updateMask = (id: string, imageData?: ImageData, noHistory?: boolean) => (dispatch) => {

    dispatch(pushHistory(id));

    const maskImageData = imageData ?? patternsService.pattern[id].maskService.getImageData();

    dispatch({type: EMaskAction.UPDATE_MASK, imageData: maskImageData, id, noHistory}); // уже не нужный экшен

    patternsService.pattern[id]
        .valuesService.updateMasked()
        .previewService.update();
}
export const setMaskParams = (id: string, params: MaskParams) => (dispatch) => {

    dispatch({type: EMaskAction.SET_MASK_PARAMS, id, params});

    patternsService.pattern[id]
        .maskService.setInverted(params.inverse)
        .valuesService.updateMasked()
        .previewService.update();
}

export const bindMaskCanvas = (id: string, canvas?: HTMLCanvasElement) => (dispatch, getState: () => AppState) => {

    const patternService = patternsService.pattern[id];

    if (!patternService) {
        return;
    }

    if (!canvas) {
        patternService.unbindMaskCanvas();
        return;
    }

    const pattern = getState().patterns[id];

    patternService.bindMaskCanvas(canvas, pattern.width, pattern.height);
};
