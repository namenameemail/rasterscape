import {Segments, SelectionParams, SelectionValue} from "./types";
import {PatternState} from "../pattern/types";
import {maskInverse} from "../../../utils/canvas/helpers/imageData";
import {createCanvas} from "../../../utils/canvas/helpers/base";
import {pathDataToString} from "../../../utils/path";
import {getFunctionState} from "../../../utils/patterns/function";
import {patternsService} from "../../index";

export const getSelectionState = getFunctionState<SelectionValue, SelectionParams>({
    segments: [],
    bBox: null,
    mask: null
}, {});

export const getMaskFromSegments = (width, height, selectionValue: Segments): ImageData => {

    const {context} = createCanvas(width, height);

    const path = new Path2D(pathDataToString(selectionValue));

    context.fillStyle = "black";
    context.fill(path);

    return context.getImageData(0, 0, width, height);

};

const drawSelectionMask = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pattern: PatternState,
    inverse?: boolean,
): void => {
    const patternService = patternsService.pattern[pattern.id];
    const maskCanvas = patternService.selectionService.maskCanvas;

    if (maskCanvas && !inverse) {
        context.drawImage(maskCanvas, 0, 0);
        return;
    }

    const maskImageData = maskCanvas
        ? patternService.selectionService.ensureMaskCpu()
        : getMaskFromSegments(width, height, pattern.selection.value.segments);

    if (!maskImageData) return;

    context.putImageData(inverse ? maskInverse(maskImageData) : maskImageData, 0, 0);
};

export const getSelectedImageData = (pattern: PatternState, withMask?: boolean, inverse?: boolean): ImageData => {

    const patternService = patternsService.pattern[pattern.id];
    patternService.canvasService.buffer?.ensureCpu();
    if (withMask) {
        patternService.valuesService.updateMasked();
    }

    const {width, height} = patternService.canvasService.canvas;

    const maskedImage = withMask
        ? patternService.valuesService.masked
        : patternService.canvasService.canvas;

    if (!inverse) {

        const {width, height} = patternService.canvasService.canvas;

        const bbox = patternService.selectionService.bBox || {
            width,
            height,
            x: 0,
            y: 0,
        };

        const {context} = createCanvas(width, height);

        drawSelectionMask(context, width, height, pattern);
        context.globalCompositeOperation = "source-in";
        context.drawImage(maskedImage, 0, 0, width, height);

        return context.getImageData(bbox.x, bbox.y, bbox.width, bbox.height);

    } else {
        const {context} = createCanvas(width, height);

        drawSelectionMask(context, width, height, pattern, true);
        context.globalCompositeOperation = "source-in";
        context.drawImage(maskedImage, 0, 0, width, height);

        return context.getImageData(0, 0, width, height);
    }
};
export const getSelectedMask = (pattern: PatternState): ImageData => {

    const patternService = patternsService.pattern[pattern.id];
    const {width, height} = patternService.canvasService.canvas;
    const bbox = patternService.selectionService.bBox;

    patternService.maskService.buffer?.ensureCpu();

    const {context} = createCanvas(width, height);

    drawSelectionMask(context, width, height, pattern);
    context.globalCompositeOperation = "source-in";

    if (pattern.config.mask) {
        context.drawImage(patternService.maskService.canvas, 0, 0, width, height)
    } else {
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);
    }

    try {
        return context.getImageData(bbox.x, bbox.y, bbox.width, bbox.height);
    } catch (e) {
        console.error(e);

        return new ImageData(0, 0);
    }

};
