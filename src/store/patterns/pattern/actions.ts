import {
    EditPatternConfigAction,
    PatternConfig,
    SetPatternHeightAction,
    SetPatternWidthAction,
    UpdateOptions,
} from "./types";
import {AppState, patternsService} from "../../index";
import {imageDataToCanvas} from "../../../utils/canvas/helpers/imageData";
import {addPattern} from "../actions";
import {getPatternConfig, getPatternParams} from "./helpers";
import * as StackBlur from 'stackblur-canvas';
import {sendImage} from "../room/actions";
import {ThunkAction} from 'redux-thunk'
import {setVideoHeight, setVideoWidth} from "../video/actions";
import {copyToClipboard} from "../../../utils/clipboard";
import {EPatternAction} from "./consts";
import {pushHistory} from "../history/actions";
import {getSelectedImageData} from "../selection/helpers";
import {PreviewCanvasType} from "../_service/patternServices/PatternPreviewService";
import {imageDataDebug} from "../../../components/Area/canvasPosition.servise";

export const bindCanvas = (id: string, canvas: HTMLCanvasElement) => (dispatch, getState: () => AppState) => {

    const state = getState();
    const pattern = state.patterns[id];

    patternsService.pattern[id]
        .bindCanvas(canvas, pattern.width, pattern.height);
};
export const bindPreview = (id: string, previewId: string, canvas: HTMLCanvasElement) => (dispatch, getState: () => AppState) => {
    patternsService.pattern[id]
        .previewService.bindCanvas(previewId, canvas, PreviewCanvasType.Select);
};

export const bindChannelPreview = (id: string, previewId: string, canvas: HTMLCanvasElement) => (dispatch, getState: () => AppState) => {
    console.log('bindChannelPreview', id, previewId);
    patternsService.pattern[id]
        .previewService.bindCanvas(previewId, canvas, PreviewCanvasType.Channel);
};

export const unbindPreview = (id: string, previewId: string) => (dispatch, getState: () => AppState) => {
    console.log('unbindPreview', id, previewId);
    patternsService.pattern[id]
        ?.previewService.unbindCanvas(previewId);
};

export const updateImage = (options: UpdateOptions) => //: ThunkResult<UpdatePatternImageAction, AppState> =>
    (dispatch, getState: () => AppState) => {

        const {
            id,
            imageData,
            emit = true,
            // blur,
            noHistory,
        } = options;

        const pattern = getState().patterns[id];
        const patternService = patternsService.pattern[id];
        // const tool = getState().tool.current;

        if (!pattern)
            return;

        if (!noHistory) {
            dispatch(pushHistory(id));
        }

        let resultImageData;

        if (imageData) {
            patternService.canvasService.setImageData(imageData);
            resultImageData = imageData; 
        } else {
            resultImageData = patternService.canvasService.getImageData();
        }

        dispatch({type: EPatternAction.UPDATE_IMAGE, imageData: resultImageData, id});

        //отправка в сокет если нужно
        emit && dispatch(sendImage(id));

        //обновление изображения выделения
        patternService
            .valuesService.update()
            .previewService.update();
        // dispatch(updateSelectionImage(id)); это не нужно ууже вроде

    };
export const editConfig = (id: string, config: PatternConfig) => (dispatch, getState) => {
    patternsService.pattern[id]
        .maskService.setEnabled(config.mask)
        .valuesService.updateMasked()
        .previewService.update();

    dispatch({type: EPatternAction.EDIT_CONFIG, id, config} as EditPatternConfigAction);
};

export const setWidth = (id: string, width: number): ThunkAction<any, any, any, SetPatternWidthAction> => (dispatch, getState: () => AppState) => {


    patternsService.pattern[id]
        .setWidth(width, !getState().patterns[id].import?.params.fit);

    dispatch(setVideoWidth(id, width));

    dispatch({type: EPatternAction.SET_WIDTH, id, width});
    dispatch(pushHistory(id));
}
export const setHeight = (id: string, height: number): ThunkAction<any, any, any, SetPatternHeightAction> => (dispatch, getState: () => AppState) => {

    patternsService.pattern[id]
        .setHeight(height, !getState().patterns[id].import?.params.fit);

    dispatch(setVideoHeight(id, height));
    dispatch({type: EPatternAction.SET_HEIGHT, id, height});

    dispatch(pushHistory(id));
}
export const doublePattern = (id: string) => (dispatch, getState) => {
    const state: AppState = getState();

    const pattern = state.patterns[id];

    const config = getPatternConfig(pattern, patternsService.pattern[id]);
    const params = getPatternParams(pattern);

    dispatch(addPattern(config, params));
};


export const copyPatternToClipboard = (id: string) => async (dispatch, getState: () => AppState) => {
    const patternService = patternsService.pattern[id];

    (
        patternService.valuesService.selected
            ? imageDataToCanvas(getSelectedImageData(getState().patterns[id], false))
            : patternService.canvasService.canvas
    )?.toBlob((blob) => {
        blob && copyToClipboard(blob);
    });
};
