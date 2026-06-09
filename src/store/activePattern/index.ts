import {handleActions} from "redux-actions";
import {Action} from "redux";

export const PATTERN_DELETE_HOLD_MS = 800;

export enum EActivePatternAction {
    SET = "active-pattern/set",
    RESET = "active-pattern/reset",
    DELETE_HOLD_START = "active-pattern/delete-hold-start",
    DELETE_HOLD_STOP = "active-pattern/delete-hold-stop",
}

export interface ActivePatternState {
    patternId: string | null
    deleteHoldPatternId: string | null
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
    [EActivePatternAction.DELETE_HOLD_START]: (state, action: StartPatternDeleteHoldAction) => {
        return {
            ...state,
            deleteHoldPatternId: action.patternId,
        }
    },
    [EActivePatternAction.DELETE_HOLD_STOP]: (state) => {
        return {
            ...state,
            deleteHoldPatternId: null,
        }
    },
}, {
    patternId: null,
    deleteHoldPatternId: null,
});


export interface SetActivePatternAction extends Action {
    patternId: string | null
}

export interface StartPatternDeleteHoldAction extends Action {
    patternId: string
}

export interface StopPatternDeleteHoldAction extends Action {
}

export const setActivePattern = (patternId: string | null): SetActivePatternAction => ({
    type: EActivePatternAction.SET, patternId
});

export const resetActivePattern = (): SetActivePatternAction => ({
    type: EActivePatternAction.RESET, patternId: null
});

export const startPatternDeleteHold = (patternId: string): StartPatternDeleteHoldAction => ({
    type: EActivePatternAction.DELETE_HOLD_START,
    patternId,
});

export const stopPatternDeleteHold = (): StopPatternDeleteHoldAction => ({
    type: EActivePatternAction.DELETE_HOLD_STOP,
});