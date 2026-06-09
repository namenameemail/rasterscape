import {handleActions} from "redux-actions";
import {
    ActivateValueChangingAction,
    ChangingValue,
    DeactivateValueChangingAction, SetStartValueAction,
    SetValueInChangingListAction
} from "./types";
import {EChangingValuesAction} from "./actions";
import omit from "lodash/omit";
import {EChangeFunctionsAction} from "../changeFunctions/actions";
import {RemoveCFAction} from "../changeFunctions/types";
import {EProjectsAction} from "../projects/consts";

export interface ChangingValuesState {
    [path: string]: ChangingValue
}

export const changingValuesReducer = handleActions<ChangingValuesState>({
    [EChangingValuesAction.SET_VALUE_IN_CHANGING_LIST]: (state: ChangingValuesState, action: SetValueInChangingListAction) => {
        if (!state[action.path]) {
            if (action.changeFunctionId) {
                return {
                    ...state,
                    [action.path]: {
                        active: true,
                        path: action.path,
                        changeFunctionId: action.changeFunctionId,
                        range: action.range,
                        startValue: action.startValue,
                    }
                }
            } else {
                return state;
            }
        } else {
            if (action.changeFunctionId) {
                return {
                    ...state,
                    [action.path]: {
                        ...state[action.path],
                        path: action.path,
                        changeFunctionId: action.changeFunctionId,
                        range: action.range,
                    }
                }
            } else {
                return omit(state, action.path);
            }
        }
    },
    [EChangingValuesAction.SET_START_VALUE]: (state: ChangingValuesState, action: SetStartValueAction) => {
        return state[action.path] ? {
            ...state,
            [action.path]: {
                ...state[action.path],
                startValue: action.startValue,
            }
        } : state
    },
    [EChangingValuesAction.ACTIVATE_VALUE_CHANGING]: (state: ChangingValuesState, action: ActivateValueChangingAction) => ({
        ...state,
        [action.path]: {
            ...state[action.path],
            active: true
        }
    }),
    [EChangingValuesAction.DEACTIVATE_VALUE_CHANGING]: (state: ChangingValuesState, action: DeactivateValueChangingAction) => ({
        ...state,
        [action.path]: {
            ...state[action.path],
            active: false
        }
    }),
    [EChangeFunctionsAction.REMOVE_CF]: (state: ChangingValuesState, action: RemoveCFAction) => {
        const toDelete = Object.values(state)
            .filter(({changeFunctionId, path}) => {
                return (
                    changeFunctionId === action.name // удаляем изменение значений которые управляются этой функцией
                    || (path.includes('changeFunctions.functions') && path.split('.')[2] === action.name) // удаляем изменения значений внутри этой функции
                )
            })
            .map(({path}) => path);
        return omit(state, ...toDelete);
    },
    [EProjectsAction.RESTORE_CHANGING_VALUES]: (_state: ChangingValuesState, action: any) => action.state,
}, {});
