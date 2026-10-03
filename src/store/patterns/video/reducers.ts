import { reducePattern } from "../pattern/helpers";
import { PatternAction, PatternState } from "../pattern/types";
import {
    SetCFAction, SetCutOffsetAction, SetDepthAction, SetDeviceAction,
    SetEdgeModeAction, SetMirrorModeAction,
    SetSlitModeAction, SetStackSizeAction,
    SetStackTypeAction, SetVideoParamAction,
    SetVideoParamsAction,
    SetVideoSourcePatternAction, SetVideoSourceTypeAction, SetVideoSourceFileAction,
    SetVideoFileLoopRangeAction,
    SetVideoAlwaysCookAction,
    SetVideoVolumeViewAction,
    SetVideoVolumeGhostAction,
} from './actions'
import { act } from "react-dom/test-utils";
import { EVideoAction } from "./consts";
import { VideoSourceType } from "./types";

export const videoReducers = {

    [EVideoAction.START_CAMERA]: reducePattern<PatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    cameraOn: true,
                }
            }
        })),
    [EVideoAction.STOP_CAMERA]: reducePattern<PatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    cameraOn: false,
                }
            }
        })),
    [EVideoAction.START_UPDATING]: reducePattern<PatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    updatingOn: true,
                }
            }
        })),
    [EVideoAction.STOP_UPDATING]: reducePattern<PatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    updatingOn: false,
                }
            }
        })),


    [EVideoAction.SET_VIDEO_PARAMS]: reducePattern<SetVideoParamsAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    ...action.value
                }
            }
        })),
    [EVideoAction.SET_VIDEO_OFFSET]: reducePattern<SetVideoParamAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    offset: {
                        ...pattern.video.params.offset,
                        [action.paramName]: action.value
                    }

                }
            }
        })),
    [EVideoAction.SET_DEVICE]: reducePattern<SetDeviceAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    device: action.device
                }
            }
        })),
    [EVideoAction.SET_EDGE_MODE]: reducePattern<SetEdgeModeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    edgeMode: action.value
                }
            }
        })),
    [EVideoAction.SET_MIRROR_MODE]: reducePattern<SetMirrorModeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    mirrorMode: action.value
                }
            }
        })),
    [EVideoAction.SET_CAMERA_AXIS]: reducePattern<SetSlitModeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    cameraAxis: action.value
                }
            }
        })),
    [EVideoAction.SET_STACK_TYPE]: reducePattern<SetStackTypeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    stackType: action.value
                }
            }
        })),
    [EVideoAction.SET_CHANGE_FUNCTION]: reducePattern<SetCFAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    changeFunctionId: action.value
                }
            }
        })),
    [EVideoAction.SET_STACK_SIZE]: reducePattern<SetStackSizeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    stackSize: action.value
                }
            }
        })),
    [EVideoAction.SET_DEPTH]: reducePattern<SetDepthAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    depth: action.value
                }
            }
        })),
    [EVideoAction.SET_CUT_OFFSET]: reducePattern<SetCutOffsetAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    cutOffset: action.value
                }
            }
        })),
    [EVideoAction.SET_VIDEO_SOURCE_TYPE]: reducePattern<SetVideoSourceTypeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    sourceType: action.value,
                    sourcePatternId: action.value === VideoSourceType.Pattern
                        ? pattern.video.params.sourcePatternId
                        : null,
                    sourceFileName: action.value === VideoSourceType.File
                        ? pattern.video.params.sourceFileName
                        : null,
                    filePlaying: false,
                    cameraOn: action.value === VideoSourceType.Camera
                        ? pattern.video.params.cameraOn
                        : false,
                }
            }
        })),
    [EVideoAction.SET_VIDEO_SOURCE_PATTERN]: reducePattern<SetVideoSourcePatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    sourcePatternId: action.value,
                }
            }
        })),
    [EVideoAction.SET_VIDEO_SOURCE_FILE]: reducePattern<SetVideoSourceFileAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    sourceFileName: action.value,
                    filePlaying: false,
                    fileLoopIn: 0,
                    fileLoopOut: 1,
                }
            }
        })),
    [EVideoAction.START_FILE_PLAYING]: reducePattern<PatternAction>(
        (pattern: PatternState) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    filePlaying: true,
                }
            }
        })),
    [EVideoAction.STOP_FILE_PLAYING]: reducePattern<PatternAction>(
        (pattern: PatternState) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    filePlaying: false,
                }
            }
        })),
    [EVideoAction.SET_FILE_LOOP_RANGE]: reducePattern<SetVideoFileLoopRangeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    fileLoopIn: action.loopIn,
                    fileLoopOut: action.loopOut,
                }
            }
        })),
    [EVideoAction.SET_ALWAYS_COOK]: reducePattern<SetVideoAlwaysCookAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    alwaysCook: action.value,
                }
            }
        })),
    [EVideoAction.SET_VOLUME_VIEW]: reducePattern<SetVideoVolumeViewAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    volumeViewOn: action.value,
                }
            }
        })),
    [EVideoAction.SET_VOLUME_GHOST]: reducePattern<SetVideoVolumeGhostAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            video: {
                ...pattern.video,
                params: {
                    ...pattern.video.params,
                    volumeGhost: action.value,
                }
            }
        })),
};
