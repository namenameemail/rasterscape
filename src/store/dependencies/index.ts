import {handleActions} from "redux-actions";
import {Action} from "redux";
import {EProjectsAction} from "../projects/consts";

export enum EDependenciesAction {
    ADD_CF_TO_PATTERN_DEP = "dependency/cf-to-p/add",
    REMOVE_CF_TO_PATTERN_DEP = "dependency/cf-to-p/remove",
    ADD_PATTERN_TO_CF_DEP = "dependency/p-to-cf/add",
    REMOVE_PATTERN_TO_CF_DEP = "dependency/p-to-cf/remove",
}

export type AddCfToPatternDepAction = Action & { cfId: string, patternId: string };
export type RemoveCfToPatternDepAction = Action & { cfId: string, patternId: string };

export type AddPatternToCfDepAction = Action & { patternId: string, cfId: string };
export type RemovePatternToCfDepAction = Action & { patternId: string, cfId: string };

export type DependenciesState = {
    changeFunctionToPattern: {
        [cfId: string]: string[] // patternId[]
    },
    patternToChangeFunction: {
        [patternId: string]: string[] // cfId[]
    },
};

export const dependenciesReducer = handleActions<DependenciesState>({
    [EDependenciesAction.ADD_CF_TO_PATTERN_DEP]: (state: DependenciesState, action: AddCfToPatternDepAction) => {
        const changeFunctionToPatternItem = state.changeFunctionToPattern[action.cfId];
        if (changeFunctionToPatternItem?.includes(action.patternId)) {
            return state;
        } else {
            return {
                ...state,
                changeFunctionToPattern: {
                    ...state.changeFunctionToPattern,
                    [action.cfId]: [...(changeFunctionToPatternItem || []), action.patternId]
                },
            }
        }

    },
    [EDependenciesAction.REMOVE_CF_TO_PATTERN_DEP]: (state: DependenciesState, action: RemoveCfToPatternDepAction) => {

        const changeFunctionToPatternItem = state.changeFunctionToPattern[action.cfId]?.filter(patternId => patternId !== action.patternId);

        return {
            ...state,
            changeFunctionToPattern: {
                ...state.changeFunctionToPattern,
                [action.cfId]: changeFunctionToPatternItem?.length
                    ? changeFunctionToPatternItem
                    : undefined
            },
        }
    },
    [EDependenciesAction.ADD_PATTERN_TO_CF_DEP]: (state: DependenciesState, action: AddPatternToCfDepAction) => {
        const patternToChangeFunctionItem = state.patternToChangeFunction[action.patternId];
        if (patternToChangeFunctionItem?.includes(action.patternId)) {
            return state;
        } else {
            return {
                ...state,
                patternToChangeFunction: {
                    ...state.patternToChangeFunction,
                    [action.patternId]: [...(patternToChangeFunctionItem || []), action.cfId]
                },
            }
        }

    },
    [EDependenciesAction.REMOVE_PATTERN_TO_CF_DEP]: (state: DependenciesState, action: RemovePatternToCfDepAction) => {

        const patternToChangeFunctionItem = state.patternToChangeFunction[action.patternId]?.filter(cfId => cfId !== action.cfId);

        return {
            ...state,
            patternToChangeFunction: {
                ...state.patternToChangeFunction,
                [action.patternId]: patternToChangeFunctionItem?.length
                    ? patternToChangeFunctionItem
                    : undefined
            },
        }
    },
    [EProjectsAction.RESTORE_DEPENDENCIES]: (_state: DependenciesState, action: any) => action.state,
}, {
    changeFunctionToPattern: {},
    patternToChangeFunction: {},
});

export const addCfToPatternDependency = (cfId: string, patternId: string) => ({
    type: EDependenciesAction.ADD_CF_TO_PATTERN_DEP, cfId, patternId
});
export const removeCfToPatternDependency = (cfId: string, patternId: string) => ({
    type: EDependenciesAction.REMOVE_CF_TO_PATTERN_DEP, cfId, patternId
});

export const addPatternToCfDependency = (patternId: string, cfId: string) => ({
    type: EDependenciesAction.ADD_PATTERN_TO_CF_DEP, cfId, patternId
});
export const removePatternToCfDependency = (patternId: string, cfId: string) => ({
    type: EDependenciesAction.REMOVE_PATTERN_TO_CF_DEP, cfId, patternId
});
