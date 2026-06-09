import {handleActions} from "redux-actions";
import {createPatternInitialState} from "./helpers";
import {AddPatternAction, RemovePatternAction, ReplaceAllPatternsAction,} from "./pattern/types";
import {PatternsState} from "./types";
import {patternReducers} from "./pattern/reducers";
import {historyReducers} from "./history/reducers";
import {maskReducers} from "./mask/reducers";
import {importReducers} from "./import/reducers";
import {repeatingReducers} from "./repeating/reducers";
import {rotatingReducers} from "./rotating/reducers";
import {selectionReducers} from "./selection/reducers";
import {storeReducers} from "./store/reducers";
import {videoReducers} from "./video/reducers";
import {roomReducers} from "./room/reducers";
import {blurReducers} from "./blur/reducers";
import {demonstrationReducers} from "./demonstration/reducers";
import {platformerReducers} from "./platformer/reducers";
import {EPatternsAction} from "./consts";
import {omit} from "lodash";

export const patternsReducer = handleActions<PatternsState>({
    [EPatternsAction.ADD_PATTERN]: (state: PatternsState, action: AddPatternAction) => {
        return {
            ...state,
            [action.id]: createPatternInitialState(action.id, action.config, action.params)
        }
    },
    [EPatternsAction.REMOVE_PATTERN]: (state: PatternsState, action: RemovePatternAction) =>
        omit(state, action.id),

    [EPatternsAction.REPLACE_ALL]: (_state: PatternsState, action: ReplaceAllPatternsAction) =>
        action.patterns || {},

    ...patternReducers,
    ...demonstrationReducers,
    ...historyReducers,
    ...maskReducers,
    ...selectionReducers,
    ...importReducers,
    ...repeatingReducers,
    ...rotatingReducers,
    ...videoReducers,
    ...storeReducers,
    ...roomReducers,
    ...blurReducers,
    ...platformerReducers,
}, {});


