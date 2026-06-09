import {patternsService} from '../store';
import {PatternState} from '../store/patterns/pattern/types';
import {decodeImageData} from '../utils/imageDataCodec';
import {ProjectPayloadV1} from './projectTypes';

export type ProjectPatternPreview = {
    id: string
    imageData: ImageData | null
};

function getCanvasFromSerializedPattern(pattern: ProjectPayloadV1['patterns'][string] | undefined): ImageData | null {
    const serialized = pattern?.state.history?.value?.current?.canvasImageData;
    return decodeImageData(serialized);
}

function getCanvasFromLivePattern(patternId: string, patterns: Record<string, PatternState>): ImageData | null {
    const service = patternsService.pattern[patternId];

    if (service) {
        return service.canvasService.getImageData();
    }

    return patterns[patternId]?.history?.value?.current?.canvasImageData ?? null;
}

export function getPatternPreviewsFromPayload(payload: ProjectPayloadV1): ProjectPatternPreview[] {
    return payload.patternOrder.map((patternId) => ({
        id: patternId,
        imageData: getCanvasFromSerializedPattern(payload.patterns[patternId]),
    }));
}

export function getPatternPreviewsFromLivePatterns(
    patterns: Record<string, PatternState>,
): ProjectPatternPreview[] {
    return Object.keys(patterns).map((patternId) => ({
        id: patternId,
        imageData: getCanvasFromLivePattern(patternId, patterns),
    }));
}
