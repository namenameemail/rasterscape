import {handleActions} from "redux-actions";
import {Action} from "redux";

export enum EActivePatternAction {
    SET = "active-pattern/set",
    RESET = "active-pattern/reset",
}

export interface ActivePatternState {
    patternId: string | null
}

export const activePatternReducer = handleActions<ActivePatternState>({
    [EActivePatternAction.SET]: (state, action: SetActivePatternAction) => {
        return {
            ...state,
            patternId: action.patternId,
        }
    },
    [EActivePatternAction.RESET]: (state) => {
        return {
            ...state,
            patternId: null,
        }
    },
}, {
    patternId: null
});


export interface SetActivePatternAction extends Action {
    patternId: string | null
}

export const setActivePattern = (patternId: string | null): SetActivePatternAction => ({
    type: EActivePatternAction.SET, patternId
});

export const resetActivePattern = (): SetActivePatternAction => ({
    type: EActivePatternAction.RESET, patternId: null
});