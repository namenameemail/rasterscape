import {AddCFAction, ECFType} from "./types";
import {AppState} from "../index";
import {setChangingMode} from "../changing/actions";
import {ChangingMode} from "../changing/types";
import {addPatternToCfDependency, removePatternToCfDependency} from "../dependencies";
import {CfDepthParams} from "./functions/depth";
import {syncPatternCook} from "../patterns/cook/syncCook";

export enum EChangeFunctionsAction {
    ADD_CF = "change-functions/add",
    REMOVE_CF = "change-functions/remove",
    CHANGE_PARAMS = "change-functions/change-params",
    CF_DEPTH_ADD_PATTERN = "change-functions/depth/add-pattern",
    CF_DEPTH_REMOVE_PATTERN = "change-functions/depth/remove-pattern",
}

export const addCF = (cfType: ECFType): AddCFAction =>
    ({type: EChangeFunctionsAction.ADD_CF, cfType});

export const removeCF = (name: string) => (dispatch, getState: () => AppState) => {
    dispatch({type: EChangeFunctionsAction.REMOVE_CF, name});

    const cfs = getState().changeFunctions.functions;
    const cfLength = Object.values(cfs).length;

    if (!cfLength) {
        dispatch(setChangingMode(ChangingMode.Auto))
    }
}

export const changeCFParams = (id: string, params: any) => (dispatch, getState: () => AppState) => {

    dispatch({type: EChangeFunctionsAction.CHANGE_PARAMS, params, id});

};


export const addDepthCfPattern = (id: string, patternId: any) => (dispatch, getState: () => AppState) => {


    console.log(id, patternId);
    dispatch({type: EChangeFunctionsAction.CF_DEPTH_ADD_PATTERN, id, patternId});

    dispatch(addPatternToCfDependency(patternId, id));
    syncPatternCook(patternId);
};

export const removeDepthCfPattern = (id: string, index: number) => (dispatch, getState: () => AppState) => {
    const cfPatternsItems = (getState().changeFunctions.functions[id].params as CfDepthParams).items;
    const patternId = cfPatternsItems[index].patternId;

    dispatch({type: EChangeFunctionsAction.CF_DEPTH_REMOVE_PATTERN, id, index});
    const cfPatternsNewItems = (getState().changeFunctions.functions[id].params as CfDepthParams).items;

    if (!cfPatternsNewItems.some(item => item.patternId === patternId))
        dispatch(removePatternToCfDependency(patternId, id));

    syncPatternCook(patternId);
};

