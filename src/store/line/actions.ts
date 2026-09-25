import {ELineType, LineParams} from "./types";
import {AppState, patternsService} from "../index";
import {EToolType} from "../tool/types";
import {syncPatternsCook} from "../patterns/cook/syncCook";

export enum ELineAction {
    SET_PARAMS = "line/set-params",
    SET_TYPE = "line/set-type",
}

export const setLineParams = (params: LineParams) => (dispatch, getState: () => AppState) => {
    const prev = getState().line.params.patternId;
    dispatch({type: ELineAction.SET_PARAMS, params});
    syncPatternsCook(prev, params.patternId);
}


export const setLineType = (lineType: ELineType) => (dispatch, getState: () => AppState) => {
    const patternId = getState().line.params.patternId;
    patternsService.bindTool(EToolType.Line, lineType);
    dispatch({type: ELineAction.SET_TYPE, lineType });
    syncPatternsCook(patternId);
}
