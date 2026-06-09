import {handleActions} from "redux-actions";
import {EToolType, SetCurrentToolAction} from "./types";
import {EToolAction} from "./actions";
import {EProjectsAction} from "../projects/consts";

export interface ToolState {
    current: EToolType
}

export const toolReducer = handleActions<ToolState>({
    [EToolAction.SET_CURRENT]: (state: ToolState, action: SetCurrentToolAction) => ({
        ...state,
        current: action.tool
    }),
    [EProjectsAction.RESTORE_TOOL]: (_state: ToolState, action: any) => action.state,
}, {
    current: EToolType.Brush
});


