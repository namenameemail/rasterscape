import {handleActions} from "redux-actions";
import {SetSelectToolParamsAction, SelectToolParams, CurveValueName} from "./types";
import {ESelectToolAction} from "./actions";
import {EProjectsAction} from "../projects/consts";
import {ECurveType, ESelectionMode} from "./types";
import {getSelectToolParamsConfig} from "./helpers";
import {ParamConfig} from "../../components/_shared/Params.types";

export interface SelectToolState {
    params: SelectToolParams
    paramsConfig: ParamConfig[]
}

export const selectToolReducer = handleActions<SelectToolState>({
    [ESelectToolAction.SET_PARAMS]: (state: SelectToolState, action: SetSelectToolParamsAction) => {
        const params = {
            ...state.params,
            ...action.params
        };
        const paramsConfig = getSelectToolParamsConfig(params);
        return {
            paramsConfig,
            params
        }
    },
    [EProjectsAction.RESTORE_SELECT_TOOL]: (_state: SelectToolState, action: any) => action.state,
}, {
    params: {
        mode: ESelectionMode.Rect,
        curveType: ECurveType.CurveLinear,
        [CurveValueName[ECurveType.CurveBundle]]: 0,
        [CurveValueName[ECurveType.CurveCardinal]]: 1,
        [CurveValueName[ECurveType.CurveCatmullRom]]: 1,
        autoReset: false,
    },
    paramsConfig: getSelectToolParamsConfig(),
});


