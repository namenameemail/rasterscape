import {createCanvasStateFromImageData, createCleanCanvasState} from "../../utils/state";
import {omit} from "lodash";
import {PatternsState} from "./types";
import {PatternConfig, PatternParams, PatternState} from "./pattern/types";
import {getHistoryState} from "./history/helpers";
import {getStoreState} from "./store/helpers";
import {getSelectionState} from "./selection/helpers";
import {getMaskState} from "./mask/helpers";
import {getRotationState} from "./rotating/helpers";
import {getRepeatingState} from "./repeating/helpers";
import {getImportState} from "./import/helpers";
import {getVideoState} from "./video/helpers";
import {getRoomState} from "./room/helpers";
import {getBlurState} from "./blur/helpers";
import {patternValues} from "./values";
import {getDemonstrationState} from "./demonstration/helpers";
import {getPlatformerState} from "./platformer/helpers";

export const patternId = (idsArray: string[]): string =>
    (idsArray.length
        ? (Math.max(...idsArray.map(key => +key))) + 1
        : 1).toString();


export const createPatternInitialState = (id: string, config?: PatternConfig, params?: PatternParams): PatternState => {
    const {width, height, history, store, selection, mask, rotation, repeating, startImage, startMask, room} = config || {};

    const patternState: PatternState = {
        id,
        config,
        width, height,
        history: getHistoryState(undefined, params?.history),
        store: getStoreState(undefined, params?.store),
        selection: getSelectionState(undefined, params?.selection),
        mask: getMaskState(undefined, params?.mask),
        rotation: getRotationState(undefined, params?.rotation),
        repeating: getRepeatingState( undefined, params?.repeating),
        import: getImportState( undefined, params?.import),
        video: getVideoState( undefined, params?.video),
        room: getRoomState( undefined, params?.room),
        blur: getBlurState( undefined, params?.blur),
        demonstration: getDemonstrationState( undefined, params?.demonstration),
        platformer: getPlatformerState(undefined, params?.platformer),
    }

    return patternState;
};

// это нужно разнести по разным экшенам
export const updatePatternState = (state: PatternState, config: PatternConfig, params?: PatternParams): PatternState => {
    const {width, height, history, store, selection, mask, rotation, repeating, room} = config || {};
    params = params || {};
    // const maskState = getMaskState(state.current.imageData.width, state.current.imageData.height)(true, state.mask, params.mask);
    return {
        config,
        id: state.id,
        width: state.width,
        height: state.height,
        // current: state.current,
        // resultImage: patternValues.setValue(state.id, state.current.imageData, mask && maskState?.value.imageData, maskState?.params.inverse),
        history: getHistoryState(state.history, params.history),
        store: getStoreState( state.store, params.store),
        selection: getSelectionState( state.selection, params.selection),
        mask: getMaskState(state.mask, params.mask), // почему true?
        rotation: getRotationState(state.rotation, params.rotation),
        repeating: getRepeatingState(state.repeating, params.repeating),
        import: getImportState(state.import, params.import),
        video: getVideoState(state.video, params.video),
        room: getRoomState(state.room, params.room),
        blur: getBlurState(state.blur, params.blur),
        demonstration: getDemonstrationState(state.demonstration, params.demonstration),
        platformer: getPlatformerState(state.platformer, params.platformer),
    }
};
