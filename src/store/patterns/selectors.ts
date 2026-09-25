import {createSelector} from "reselect";
import {objectToSelectItems} from "../../utils/utils";
import {PatternState} from "./pattern/types";
import {AppState} from "../index";
import {shouldCookPlatformer, shouldCookVideo} from "./cook/syncCook";

const getPatternsState = state => state.patterns;


export const patternHasBackgroundActivity = (state: AppState, id: string): boolean => {
    const pattern = state.patterns[id];
    if (!pattern) {
        return false;
    }

    return !!(
        shouldCookVideo(state, id) ||
        shouldCookPlatformer(state, id) ||
        pattern.room?.value?.connected ||
        pattern.demonstration?.value?.enabled
    );
};

export const getPatternsSelectItems = createSelector(
    [getPatternsState],
    patterns => {
        return Object.values(patterns).map((pattern) => {
            const {id, width, height} = pattern as PatternState;
            return {
                width, height,
                // imageData: current.imageData,
                // image: resultImage,
                id
            }
        })
    });
