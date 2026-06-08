import {PatternsState} from "../types";
import {PatternAction, PatternConfig, PatternParams, PatternState} from "./types";
import {PatternService} from "../_service/PatternService";

export type PatternReducer<T extends PatternAction> =
    (pattern: PatternState, action: T, state: PatternsState) => PatternState

export const reducePattern = <T extends PatternAction>(reducer: PatternReducer<T>) =>
    (state: PatternsState, action: T) => state[action.id] ? ({
        ...state,
        [action.id]: (() => {
            try {
                return reducer(state[action.id], action, state);
            } catch (error) {
                console.error(error);
                return {
                    ...state[action.id],
                    //error
                }
            }
        })()
    }) : state;

export const getPatternConfig = (pattern: PatternState, patternService: PatternService): PatternConfig => {
    return {
        ...pattern.config,
        startImage: patternService.canvasService.getImageData(),
        startMask: pattern.mask ? patternService.maskService.getImageData() : null,
    };
};
export const getPatternParams = (pattern: PatternState): PatternParams => {
    return {
        history: pattern.history && pattern.history.params,

        store: pattern.store && pattern.store.params,

        rotation: pattern.rotation && pattern.rotation.params,

        repeating: pattern.repeating && pattern.repeating.params,

        selection: pattern.selection && pattern.selection.params,

        mask: pattern.mask && pattern.mask.params,

        import: pattern.import && pattern.import.params,

        room: pattern.room && pattern.room.params,

        platformer: pattern.platformer && pattern.platformer.params,
    }
};
