import {AppState, patternsService} from '../index';
import {EPatternsAction} from '../patterns/consts';
import {PatternsState} from '../patterns/types';
import {EToolType} from '../tool/types';
import {setActivePattern, stopPatternDeleteHold} from '../activePattern';
import {createEmptyProjectPayload, deserializeProjectPayload} from '../../storage/projectSerializer';
import {ProjectPayloadV1} from '../../storage/projectTypes';
import {EProjectsAction} from './consts';

export function unloadAllPatternServices(): void {
    Object.keys(patternsService.pattern).forEach((id) => {
        patternsService.deletePattern(id);
    });
}

export function syncPatternServicesFromState(patterns: PatternsState, state: AppState): void {
    Object.keys(patterns).forEach((id) => {
        const pattern = patterns[id];
        const service = patternsService.addPattern(id);

        service.maskService.setEnabled(!!pattern.config?.mask);
        if (pattern.mask) {
            service.maskService.setInverted(!!pattern.mask.params?.inverse);
        }

        const current = pattern.history?.value?.current;
        if (current?.canvasImageData && current?.maskImageData) {
            service.setCanvasAndMaskImageData(current.canvasImageData, current.maskImageData);
        } else {
            const empty = new ImageData(pattern.width || 400, pattern.height || 400);
            service.canvasService.setImageData(empty);
            service.maskService.setImageData(new ImageData(pattern.width || 400, pattern.height || 400));
        }

        service.valuesService.update();
    });

    const tool = state.tool.current;
    const toolType = tool === EToolType.Brush
        ? state.brush.params.brushType
        : tool === EToolType.Line
            ? state.line.params.type
            : null;

    if (toolType) {
        patternsService.bindTool(tool, toolType);
    }
}

export const hydrateEditor = (payload: ProjectPayloadV1) => (dispatch, getState: () => AppState) => {
    unloadAllPatternServices();
    dispatch(stopPatternDeleteHold());

    const restored = deserializeProjectPayload(payload);

    dispatch({
        type: EPatternsAction.REPLACE_ALL,
        patterns: restored.patterns,
    });

    dispatch({type: EProjectsAction.RESTORE_CHANGE_FUNCTIONS, state: restored.changeFunctions});
    dispatch({type: EProjectsAction.RESTORE_CHANGING_VALUES, state: restored.changingValues});
    dispatch({type: EProjectsAction.RESTORE_DEPENDENCIES, state: restored.dependencies});
    dispatch({type: EProjectsAction.RESTORE_TOOL, state: restored.tool});
    dispatch({type: EProjectsAction.RESTORE_BRUSH, state: restored.brush});
    dispatch({type: EProjectsAction.RESTORE_LINE, state: restored.line});
    dispatch({type: EProjectsAction.RESTORE_SELECT_TOOL, state: restored.selectTool});
    dispatch({type: EProjectsAction.RESTORE_COLOR, state: restored.color});

    syncPatternServicesFromState(restored.patterns, {
        ...getState(),
        patterns: restored.patterns,
        tool: restored.tool,
        brush: restored.brush,
        line: restored.line,
    });

    dispatch(setActivePattern(restored.activePatternId));
};

export {createEmptyProjectPayload};
