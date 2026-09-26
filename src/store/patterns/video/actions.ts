import {PatternAction} from "../pattern/types";
import {VideoParams, VideoSourceType} from "./types";
import {getVideoState} from "./helpers";
import {AppState, patternsService} from "../../index";
import 'p5/lib/addons/p5.dom';
import {updateImage} from "../pattern/actions";
import {ThunkAction} from "redux-thunk";
import {EVideoAction} from "./consts";
import {addCfToPatternDependency, removeCfToPatternDependency} from "../../dependencies";
import {
    EdgeMode,
    MirrorMode,
    CameraAxis,
    StackType,
} from '../_service/patternServices/PatternVideoService/ShaderVideoModule'
import {depthPatternIdsForCf, syncPatternCook, syncPatternsCook} from '../cook/syncCook';

export interface SetVideoParamsAction extends PatternAction {
    value: VideoParams
}

export interface SetVideoParamAction extends PatternAction {
    paramName: string
    value: any
}

export type SetDeviceAction = PatternAction & { device: MediaDeviceInfo };
export type SetEdgeModeAction = PatternAction & { value: EdgeMode };
export type SetMirrorModeAction = PatternAction & { value: MirrorMode };
export type SetSlitModeAction = PatternAction & { value: CameraAxis };
export type SetStackTypeAction = PatternAction & { value: StackType };
export type SetCFAction = PatternAction & { value: string };
export type SetStackSizeAction = PatternAction & { value: number };
export type SetCutOffsetAction = PatternAction & { value: number };
export type SetDepthAction = PatternAction & { value: number };
export type SetVideoSourceTypeAction = PatternAction & { value: VideoSourceType };
export type SetVideoSourcePatternAction = PatternAction & { value: string | null };
export type SetVideoAlwaysCookAction = PatternAction & { value: boolean };
export type SetVideoVolumeViewAction = PatternAction & { value: boolean };

export const setDevice = (id: string, device: MediaDeviceInfo) => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_DEVICE,
        id,
        device
    });
    patternsService.pattern[id].videoService.setDevice(device);
};

export const startCamera = (id: string) => (dispatch, getState: () => AppState) => {

    dispatch({type: EVideoAction.START_CAMERA, id});

    const pattern = getState().patterns[id];

    patternsService.pattern[id].videoService
        .initCamera({
            width: pattern.width,
            height: pattern.height,
            device: pattern.video.params.device
        })
        .startCamera();
};

export const stopCamera = (id: string) => (dispatch, getState: () => AppState) => {

    dispatch({type: EVideoAction.STOP_CAMERA, id});
    patternsService.pattern[id].videoService.stopCamera();
};

export const start = (patternId: string) => async (dispatch, getState: () => AppState) => {

    const pattern = getState().patterns[patternId];
    const patternService = patternsService.pattern[patternId];

    if (pattern.room?.value?.connected && !pattern.room?.value?.meDrawer)
        return;

    const {
        edgeMode,
        cameraAxis,
        stackType,
        mirrorMode,
        stackSize,
        offset,
        sourceType,
        sourcePatternId,
    } = pattern?.video?.params || {};

    dispatch(updateImage({
        id: patternId,
        noHistory: false,
        emit: false,
    }));
    dispatch({type: EVideoAction.START_UPDATING, id: patternId});

    patternService.previewService.autoUpdate(true);

    (await patternService.videoService
        .init({
            width: pattern.width,
            height: pattern.height,
            stackSize,
            edgeMode,
            cameraAxis,
            stackType,
            mirrorMode,
            offset
        }))
        .setSourceType(sourceType ?? getVideoState().params.sourceType)
        .setSourcePatternId(sourcePatternId ?? getVideoState().params.sourcePatternId);

    const state = getState();
    syncPatternsCook(
        patternId,
        sourcePatternId,
        ...depthPatternIdsForCf(state, pattern?.video?.params?.changeFunctionId),
    );
};

export const stop = (id: string) => (dispatch, getState: () => AppState) => {
    const pattern = getState().patterns[id];
    const sourcePatternId = pattern?.video?.params?.sourcePatternId;
    const changeFunctionId = pattern?.video?.params?.changeFunctionId;
    
    dispatch(updateImage({
        id,
        noHistory: true,
        emit: true,
    }));
    
    dispatch({type: EVideoAction.STOP_UPDATING, id});
    
    patternsService.pattern[id].videoService.stop();

    patternsService.pattern[id].previewService.autoUpdate(false);
    patternsService.pattern[id].valuesService.update();

    syncPatternsCook(
        id,
        sourcePatternId,
        ...depthPatternIdsForCf(getState(), changeFunctionId),
    );
};

export const setEdgeMode = (id: string, value: EdgeMode) => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_EDGE_MODE,
        id,
        value
    });
    
    patternsService.pattern[id].videoService.setEdgeMode(value);
};

export const setMirrorMode = (id: string, value: MirrorMode) => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_MIRROR_MODE,
        id,
        value
    });
    
    patternsService.pattern[id].videoService.setMirrorMode(value);
};

export const setCameraAxis = (id: string, value: CameraAxis) => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_CAMERA_AXIS,
        id,
        value
    });

    patternsService.pattern[id].videoService.setCameraAxis(value);
};
export const setStackType = (id: string, value: StackType) => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_STACK_TYPE,
        id,
        value
    });
    
    patternsService.pattern[id].videoService.setStackType(value);
};

export const setChangeFunction = (id: string, changeFunctionId: string) => (dispatch, getState: () => AppState) => {
    const prevCfId = patternsService.pattern[id].videoService.changeFunctionId;
    const prevDepthIds = depthPatternIdsForCf(getState(), prevCfId);

    dispatch({
        type: EVideoAction.SET_CHANGE_FUNCTION,
        id,
        value: changeFunctionId
    });

    dispatch(removeCfToPatternDependency(prevCfId, id));

    patternsService.pattern[id].videoService.setChangeFunction(changeFunctionId);

    changeFunctionId && dispatch(addCfToPatternDependency(changeFunctionId, id));

    syncPatternsCook(id, ...prevDepthIds, ...depthPatternIdsForCf(getState(), changeFunctionId));
};

export const setStackSize = (id: string, value: number): ThunkAction<any, any, any, SetStackSizeAction> => (dispatch, getState: () => AppState) => {
    dispatch({
        type: EVideoAction.SET_STACK_SIZE,
        id,
        value
    });

    patternsService.pattern[id].videoService.setStackSize(value);
};

export const setSize = (id: string, width?: number, height?: number): ThunkAction<any, any, any, any> => dispatch => {
    // Captures.captures[id]?.setSize(width, height);
};

export const setVideoWidth = (id: string, width?: number): ThunkAction<any, any, any, any> => dispatch => {
    // Captures.captures[id]?.setWidth(width);
};

export const setVideoHeight = (id: string, height?: number): ThunkAction<any, any, any, any> => dispatch => {
    // Captures.captures[id]?.setHeight(height);
};

export const setVideoOffset = (id: string, paramName: string, value: any): ThunkAction<any, any, any, any> => dispatch => {
    dispatch({
        type: EVideoAction.SET_VIDEO_OFFSET,
        id,
        value,
        paramName
    });

    patternsService.pattern[id].videoService.setOffset(paramName, value);
};

export const setVideoSourceType = (id: string, value: VideoSourceType) => (dispatch, getState: () => AppState) => {
    const pattern = getState().patterns[id];
    const videoParams = pattern?.video?.params ?? getVideoState().params;
    const prevSource = videoParams.sourcePatternId;

    if (value === VideoSourceType.Pattern && videoParams.cameraOn) {
        dispatch(stopCamera(id));
    }

    dispatch({
        type: EVideoAction.SET_VIDEO_SOURCE_TYPE,
        id,
        value,
    });

    patternsService.pattern[id].videoService
        .setSourceType(value)
        .setSourcePatternId(value === VideoSourceType.Camera ? null : videoParams.sourcePatternId);

    syncPatternsCook(id, prevSource, value === VideoSourceType.Camera ? null : videoParams.sourcePatternId);
};

export const setVideoSourcePattern = (id: string, sourcePatternId: string | null) => (dispatch, getState: () => AppState) => {
    if (sourcePatternId === id) {
        return;
    }

    const prevSource = getState().patterns[id]?.video?.params?.sourcePatternId;

    dispatch({
        type: EVideoAction.SET_VIDEO_SOURCE_PATTERN,
        id,
        value: sourcePatternId,
    });

    patternsService.pattern[id].videoService.setSourcePatternId(sourcePatternId);

    syncPatternsCook(id, prevSource, sourcePatternId);
};

export const setVideoAlwaysCook = (id: string, value: boolean) => (dispatch) => {
    dispatch({
        type: EVideoAction.SET_ALWAYS_COOK,
        id,
        value,
    });
    syncPatternCook(id);
};

export const setVideoVolumeView = (id: string, value: boolean) => (dispatch) => {
    dispatch({
        type: EVideoAction.SET_VOLUME_VIEW,
        id,
        value,
    });
};