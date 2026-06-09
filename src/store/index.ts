import {createStore, combineReducers, applyMiddleware, compose, Store, AnyAction} from "redux";
import logger from 'redux-logger';
import thunk, {ThunkAction} from 'redux-thunk';
import {TypedUseSelectorHook, useDispatch as useReduxDispatch, useSelector as useReduxSelector} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit'
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
import {PatternsState} from "./patterns/types";
import {ChangeFunctionState, ECFType} from "./changeFunctions/types";
import {tutorialReducer, TutorialState} from "./tutorial";
import {changeFunctionHighlightsReducer, ChangeFunctionHighlightsState} from "./changeFunctionsHighlights";
import {activePatternReducer, ActivePatternState} from "./activePattern";
import {optimizationReducer, OptimizationState} from "./optimization";
import {positionReducer, PositionState} from "./position";
import {HotkeysState} from "./hotkeys/types";
import {hotkeysReducer} from "./hotkeys/reducer";
import {PatternsService} from "./patterns/_service";
import {dependenciesReducer, DependenciesState} from "./dependencies";
import {projectsReducer} from "./projects/reducer";
import {ProjectsState} from "./projects/types";
import {projectAutosaveMiddleware} from "../storage/projectAutosave";

export interface AppState {
    fullScreen: FullScreenState
    optimization: OptimizationState
    language: LanguageState
    hotkeys: HotkeysState
    tutorial: TutorialState
    changeFunctionHighlights: ChangeFunctionHighlightsState

    patterns: PatternsState
    activePattern: ActivePatternState
    position: PositionState

    color: ColorState

    tool: ToolState
    brush: BrushState
    line: LineState

    selectTool: SelectToolState

    rooms: RoomsState

    changeFunctions: ChangeFunctionsState
    changingValues: ChangingValuesState
    changing: ChangingState
    dependencies: DependenciesState
    projects: ProjectsState
}

const rootReducer = reduceReducers<AppState>(
    combineReducers<AppState>({
        fullScreen: fullscreenReducer,
        optimization: optimizationReducer,
        language: languageReducer,
        hotkeys: hotkeysReducer,
        tutorial: tutorialReducer,
        changeFunctionHighlights: changeFunctionHighlightsReducer,

        patterns: patternsReducer,
        activePattern: activePatternReducer,
        position: positionReducer,

        color: colorReducer,

        tool: toolReducer,
        brush: brushReducer,
        line: lineReducer,

        selectTool: selectToolReducer,

        rooms: roomsReducer,

        changeFunctions: changeFunctionsReducer,
        changingValues: changingValuesReducer,
        changing: changingReducer,
        dependencies: dependenciesReducer,
        projects: projectsReducer,
    }),
    changeReducer
);



export const store: Store<AppState, any> = createStore(
    rootReducer,
    compose(
        applyMiddleware(thunk, projectAutosaveMiddleware, logger),
        // applyMiddleware(thunk),
        persistState(['hotkeys']), //, 'changeFunctions'
    )
);
//
// export const store = configureStore({
//     reducer: rootReducer,
//     // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),//.concat(persistState(['hotkeys'])),
// });


export const patternsService = new PatternsService(store);


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useDispatch: () => AppDispatch = useReduxDispatch
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector

// export const store = createStore(rootReducer, applyMiddleware(thunk));

// export const useDispatch = () => useReduxDispatch<typeof store.dispatch>();
// export const useSelector: TypedUseSelectorHook<AppState> = useReduxSelector;

//
// const configPersist = {
//     slicer: function myCustomSlicer(paths) {
//         return (state: AppState) => {
//
//             const hotkeys = state.hotkeys;
//
//             const changeFunctions = Object.keys(state.changeFunctions)
//                 .reduce((res, cfId) => {
//                     const cf: ChangeFunctionState = state.changeFunctions[cfId];
//                     switch (cf.type) {
//                         case ECFType.DEPTH:
//                             console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', cf);
//                             res[cfId] = {
//                                 ...cf,
//                                 params: {
//                                     ...cf.params,
//                                     imageData: null
//                                 }
//                             };
//                             break;
//                         default:
//                             res[cfId] = cf;
//                             break;
//                     }
//
//                     return res;
//                 }, {})
//
//             let subset = {
//                 //changeFunctions,
//                 hotkeys
//             };
//             /*Custom logic goes here*/
//             return subset
//         }
//     }
// };