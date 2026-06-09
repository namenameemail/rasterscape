import {handleActions} from "redux-actions";
import {ChangeColorAction} from "./types";
import {EColorAction} from "./actions";
import {EProjectsAction} from "../projects/consts";


export interface ColorState {
    value: string
}

export const colorReducer = handleActions<ColorState>({
    [EColorAction.CHANGE]: (state: ColorState, action: ChangeColorAction) => {

        return {
            ...state,
            value: action.color
        }
    },
    [EProjectsAction.RESTORE_COLOR]: (_state: ColorState, action: any) => action.state,
}, {
    value: "#000000"
});