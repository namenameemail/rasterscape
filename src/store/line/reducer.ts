import {handleActions} from "redux-actions";
import {
    ELineCapType,
    ELineJoinType,
    ELineRandomType,
    ELineType,
    LineParams,
    SetLineParamsAction,
    SetLineTypeAction
} from "./types";
import {ELineAction} from "./actions";
import {EProjectsAction} from "../projects/consts";
import {getLineParamsConfig} from "./helpers";
import {ECompositeOperation} from "../compositeOperations";
import {ParamConfig} from "../../components/_shared/Params.types";

export interface LineState {
    params: LineParams
    paramsConfig: ParamConfig[]
}

export const lineReducer = handleActions<LineState>({
    [ELineAction.SET_PARAMS]: (state: LineState, action: SetLineParamsAction) => {
        const params = {
            ...state.params,
            ...action.params
        };
        return {
            ...state,
            params
        }
    },
    [ELineAction.SET_TYPE]: (state: LineState, action: SetLineTypeAction) => {

        return {
            ...state,
            params: {
                ...state.params,
                type: action.lineType
            }
        }
    },
    [EProjectsAction.RESTORE_LINE]: (_state: LineState, action: any) => action.state,
}, {
    params: {
        size: 5,
        patternSize: 1,
        opacity: 1,
        type: ELineType.Solid,
        cap: ELineCapType.Butt,
        join: ELineJoinType.Bevel,
        random: ELineRandomType.OnLine,
        patternMouseCentered: false,
        patternDirection: false,
        compositeOperation: ECompositeOperation.SourceOver
    },
    paramsConfig: getLineParamsConfig()
});


