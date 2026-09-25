import {DemonstrationParams, DemonstrationValue} from "./types";
import {PatternAction} from "../pattern/types";
import {AppState} from "../../index";
import {syncPatternCook} from "../cook/syncCook";

export enum EDemonstrationAction {
    TOGGLE_DEMONSTRATION = "pattern/toggle-demonstration",
    SET_DEMONSTRATION_ENABLED = "pattern/set-demonstration-enabled",
    SET_DEMONSTRATION_PARAMS = "pattern/set-demonstration-params",
}

export interface SetDemonstrationEnabledAction extends PatternAction {
    enabled: boolean
}

export interface SetDemonstrationParamsAction extends PatternAction {
    params: DemonstrationParams
}

export const toggleDemonstration = (id: string) => (dispatch, getState: () => AppState) => {
    dispatch({type: EDemonstrationAction.TOGGLE_DEMONSTRATION, id});
    syncPatternCook(id);
};

export const setDemonstrationEnabled = (id: string, enabled: boolean) => (dispatch) => {
    dispatch({type: EDemonstrationAction.SET_DEMONSTRATION_ENABLED, id, enabled} as SetDemonstrationEnabledAction);
    syncPatternCook(id);
};

export const setDemonstrationParams = (id: string, params: any): SetDemonstrationParamsAction =>
    ({type: EDemonstrationAction.SET_DEMONSTRATION_PARAMS, id, params});
