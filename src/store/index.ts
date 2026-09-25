import {createStore, combineReducers, applyMiddleware, compose} from "redux";
import logger from 'redux-logger';
import thunk from 'redux-thunk';
import reduceReducers from 'reduce-reducers';
import persistState from 'redux-localstorage';

import {patternsReducer} from "./patterns/reducer";
import {ToolState, toolReducer} from "./tool/reducer";
import {BrushState, brushReducer} from "./brush/reducer";
import {LineState, lineReducer} from "./line/reducer";
import {SelectToolState, selectToolReducer} from "./selectTool/reducer";
import {RoomsState, roomsReducer} from "./rooms/reducer";
import {ChangeFunctionsState, changeFunctionsReducer} from "./changeFunctions/reducer";
import {ChangingValuesState, changingValuesReducer} from "./changingValues/reducer";
import {changingReducer, ChangingState} from "./changing/reducer";
import {colorReducer, ColorState} from "./color/reducer";
import {changeReducer} from "./change/reducer";
import {fullscreenReducer, FullScreenState} from "./fullscreen";
import {languageReducer, LanguageState} from "./language";
import {hotkeysReducer, HotkeysState} from "./hotkeys";
import {PatternsState} from "./patterns/types";
import {ChangeFunction, ECFType} from "./changeFunctions/types";
import {tutorialReducer, TutorialState} from "./tutorial";

export interface AppState {
    fullScreen: FullScreenState
    language: LanguageState
    hotkeys: HotkeysState
    tutorial: TutorialState

    patterns: PatternsState

    color: ColorState

    tool: ToolState
    brush: BrushState
    line: LineState

    selectTool: SelectToolState

    rooms: RoomsState

    changeFunctions: ChangeFunctionsState
    changingValues: ChangingValuesState
    changing: ChangingState
}

const rootReducer = reduceReducers(
    combineReducers<AppState>({
        fullScreen: fullscreenReducer,
        language: languageReducer,
        hotkeys: hotkeysReducer,
        tutorial: tutorialReducer,

        patterns: patternsReducer,

        color: colorReducer,

        tool: toolReducer,
        brush: brushReducer,
        line: lineReducer,

        selectTool: selectToolReducer,

        rooms: roomsReducer,

        changeFunctions: changeFunctionsReducer,
        changingValues: changingValuesReducer,
        changing: changingReducer
    }),
    changeReducer
);


const configPersist = {
    slicer: function myCustomSlicer(paths) {
        return (state: AppState) => {

            const hotkeys = state.hotkeys;

            const changeFunctions = Object.keys(state.changeFunctions)
                .reduce((res, cfId) => {
                    const cf: ChangeFunction = state.changeFunctions[cfId];
                    switch (cf.type) {
                        case ECFType.DEPTH:
                            console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', cf);
                            res[cfId] = {
                                ...cf,
                                params: {
                                    ...cf.params,
                                    imageData: null
                                }
                            };
                            break;
                        default:
                            res[cfId] = cf;
                            break;
                    }

                    return res;
                }, {})

            let subset = {
                //changeFunctions,
                hotkeys
            };
            /*Custom logic goes here*/
            return subset
        }
    }
};

export const store = createStore(
    rootReducer,
    compose(
        applyMiddleware(thunk, logger),
        persistState(['hotkeys'], {key: 'rasterscape-8m'}), //, 'changeFunctions'
    )
);
// export const store = createStore(rootReducer, applyMiddleware(thunk));
