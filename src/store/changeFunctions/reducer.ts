import {handleActions} from "redux-actions";
import {
    AddCFAction,
    ChangeCFParamsAction,
    ChangeFunctionState,
    ChangeFunctionConstants,
    RemoveCFAction, CfDepthAddPatternAction, CfDepthRemovePatternAction
} from "./types";
import {EChangeFunctionsAction} from "./actions";
import {cfId, createCFInitialState} from "./helpers";
import {omit} from "lodash";
import {CfDepthParams} from "./functions/depth";
import {EProjectsAction} from "../projects/consts";

export interface ChangeFunctions {
    [id: string]: ChangeFunctionState
}

export interface ChangeFunctionsConstants {
    [id: string]: ChangeFunctionConstants
}

export interface ChangeFunctionsState {
    functions: ChangeFunctions
    functionsConstants: ChangeFunctionsConstants
    namesList: string[]
}

export const changeFunctionsReducer = handleActions<ChangeFunctionsState>({
    [EChangeFunctionsAction.ADD_CF]: (state: ChangeFunctionsState, action: AddCFAction) => {
        const {id, number} = cfId(action.cfType, state.functions);

        return {
            functions: {
                ...state.functions,
                [id]: createCFInitialState(id, action.cfType, number),
            },
            namesList: [...Object.keys(state.functions), id],
            functionsConstants: {
                ...state.functionsConstants,
                [id]: {
                    id,
                    type: action.cfType,
                    number,
                },
            }
        }
    },
    [EChangeFunctionsAction.REMOVE_CF]: (state: ChangeFunctionsState, action: RemoveCFAction) => {
        const newFunctions = omit(state.functions, action.name);
        const newFunctionsConstants = omit(state.functionsConstants, action.name);
        return {
            functions: newFunctions,
            functionsConstants: newFunctionsConstants,
            namesList: Object.keys(newFunctions)
        }
    },
    [EChangeFunctionsAction.CHANGE_PARAMS]: (state: ChangeFunctionsState, action: ChangeCFParamsAction) => {
        return {
            ...state,
            functions: {
                ...state.functions,
                [action.id]: {
                    ...state.functions[action.id],
                    params: action.params
                }
            }
        }
    },
    [EChangeFunctionsAction.CF_DEPTH_ADD_PATTERN]: (state: ChangeFunctionsState, action: CfDepthAddPatternAction) => {

        const oldItems = (state.functions[action.id].params as CfDepthParams).items;
        const id = Math.max(...oldItems.map(({id}) => id), 0) + 1;
        const newItems = [
            ...oldItems,
            {
                id,
                patternId: action.patternId,
                zd: 0,
                zed: 1,
                component: 0
            }
        ];
        if (newItems.length > 4) {
            newItems.shift();
        }
        return {
            ...state,
            functions: {
                ...state.functions,
                [action.id]: {
                    ...state.functions[action.id],
                    params: {
                        items: newItems
                    }
                }
            }
        }
    },
    [EChangeFunctionsAction.CF_DEPTH_REMOVE_PATTERN]: (state: ChangeFunctionsState, action: CfDepthRemovePatternAction) => {
        const newItems = (state.functions[action.id].params as CfDepthParams).items.filter((item, index) => index !== action.index);

        return {
            ...state,
            functions: {
                ...state.functions,
                [action.id]: {
                    ...state.functions[action.id],
                    params: {
                        items: newItems
                    }
                }
            }
        }
    },
    [EProjectsAction.RESTORE_CHANGE_FUNCTIONS]: (_state: ChangeFunctionsState, action: any) => action.state,
}, {
    functions: {},
    namesList: [],
});
