import {handleActions} from "redux-actions";
import {BrushParams, EBrushShapeType, EBrushType} from "./types";
import {
    EBrushAction,
    SetBrushShapeParamsAction,
    SetBrushPatternParamsAction,
    SetBrushSelectParamsAction,
    SetBrushTypeAction
} from "./actions";
import {EProjectsAction} from "../projects/consts";
import {ECompositeOperation} from "../compositeOperations";

export interface BrushState {
    params: BrushParams
}

export const brushReducer = handleActions<BrushState>({
    [EBrushAction.SET_TYPE]: (state: BrushState, action: SetBrushTypeAction) => {
        const params = {
            ...state.params,
            brushType: action.brushType,
        };
        return {
            ...state,
            params,
        }
    },
    [EBrushAction.SET_PATTERN_PARAMS]: (state: BrushState, action: SetBrushPatternParamsAction) => {
        const params = {
            ...state.params,
            paramsByType: {
                ...state.params.paramsByType,
                [EBrushType.Pattern]: {
                    ...state.params.paramsByType[EBrushType.Pattern],
                    ...action.params
                }
            },
        };
        return {
            ...state,
            params,
        }
    },
    [EBrushAction.SET_FORM_PARAMS]: (state: BrushState, action: SetBrushShapeParamsAction) => {
        const params = {
            ...state.params,
            paramsByType: {
                ...state.params.paramsByType,
                [EBrushType.Shape]: {
                    ...state.params.paramsByType[EBrushType.Shape],
                    ...action.params
                }
            },
        };
        return {
            ...state,
            params,
        }
    },
    [EBrushAction.SET_SELECT_PARAMS]: (state: BrushState, action: SetBrushSelectParamsAction) => {
        const params = {
            ...state.params,
            paramsByType: {
                ...state.params.paramsByType,
                [EBrushType.Select]: {
                    ...state.params.paramsByType[EBrushType.Select],
                    ...action.params
                }
            },
        };
        return {
            ...state,
            params,
        }
    },
    [EProjectsAction.RESTORE_BRUSH]: (_state: BrushState, action: any) => action.state,
}, {
    params: {
        brushType: EBrushType.Shape,
        paramsByType: {
            [EBrushType.Shape]: {
                size: 43,
                opacity: 1,
                compositeOperation: ECompositeOperation.SourceOver,
                shapeType: EBrushShapeType.Circle
            },
            [EBrushType.Pattern]: {
                size: 1,
                opacity: 1,
                patternId: null,
                compositeOperation: ECompositeOperation.SourceOver
            },
            [EBrushType.Select]: {
                size: 1,
                opacity: 1,
                compositeOperation: ECompositeOperation.SourceOver
            },
        },
    },
});


