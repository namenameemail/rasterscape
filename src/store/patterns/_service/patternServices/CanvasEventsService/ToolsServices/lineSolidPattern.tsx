import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {bufferForDrawCanvas} from "../drawTarget";
import {drawMasked} from "../../../../../../utils/canvas/helpers/draw";
import {PatternState} from "../../../../../../store/patterns/pattern/types";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {LineParams} from "../../../../../../store/line/types";
import {PatternService} from "../../../PatternService";
import {patternsService} from "../../../../../index";
import {linePatternInverse, linePatternMatrix, LinePatternPlacement, PatternInverse} from "../../../../../../gl/linePattern";
import {PatternStroke} from "../../../../../../gl/patternFill";

const placementOf = (
    x: number,
    y: number,
    patternSize: number,
    linePattern: PatternState,
    patternMouseCentered: boolean,
): LinePatternPlacement => {
    const rotation = linePattern.config.rotation ? linePattern.rotation : null;
    return {
        x,
        y,
        patternSize,
        width: linePattern.width,
        height: linePattern.height,
        patternMouseCentered,
        angle: rotation?.value?.angle || 0,
        xc: rotation?.value?.offset?.xc || 0,
        yc: rotation?.value?.offset?.yc || 0,
        xd: rotation?.value?.offset?.xd || 0,
        yd: rotation?.value?.offset?.yd || 0,
    };
};

const getPatternStrokeStyle = (ctx, x, y, patternSize, linePattern: PatternState, linePatternImage, patternMouseCentered: boolean) => {
    const patternStrokeStyle = ctx.createPattern(linePatternImage, "repeat");
    patternStrokeStyle.setTransform(linePatternMatrix(placementOf(x, y, patternSize, linePattern, patternMouseCentered)));
    return patternStrokeStyle;
};

export class LineSolidPattern implements ToolService {
    patternService: PatternService;
    drewGpu = false;

    prevPoints: Record<string, { x: number, y: number }> = {};
    canvases: Record<string, HelperCanvas> = {};
    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;
    handlers: ToolHandlers = {};
    draw: boolean = false;

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDown: () => {},
            onDraw: this.lineDraw,
            onClick: this.lineDraw,
            onRelease: () => {
                this.draw = false;
                this.canvases = {};
            }
        };
    }

    setSize = (width: number, height: number) => {
        this.helperCanvas1.canvas.width = width;
        this.helperCanvas2.canvas.width = width;
        this.helperCanvas1.canvas.height = height;
        this.helperCanvas2.canvas.height = height;
    };

    lineDraw = (brushEvent: CanvasServiceEvent) => {
        this.drewGpu = false;
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const pattern = state.patterns[this.patternService.patternId];
        const {width, height} = pattern;
        const {size, opacity, compositeOperation, cap, join, patternMouseCentered, patternId, patternSize} = state.line.params as LineParams;
        const coordinates = state.position.coordinates;
        const newPrevPoints = {};
        const toolPattern = state.patterns[patternId];
        const selectionMask = this.patternService.selectionService.mask;
        const clipMask = this.patternService.selectionService.maskCanvas;
        const dest = bufferForDrawCanvas(this.patternService, brushEvent.canvas);
        const useGpu = !!dest && (!selectionMask || !!clipMask);

        if (!toolPattern) return;

        let patternGpu = useGpu
            ? patternsService.pattern[patternId]?.valuesService.ensureMaskedGpu() ?? null
            : null;

        if (!patternGpu) {
            patternsService.pattern[patternId]?.valuesService.updateMaskedIfNeeded(true);
            if (!patternsService.pattern[patternId]?.valuesService.masked) return;
        }

        if (!this.draw) {
            this.draw = true;
            coordinates[0]?.forEach(({x, y, id: index}) => {
                this.canvases[index] = createCanvas(width, height);
                const ctx = this.canvases[index]?.context;
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(x, y);
            });
            this.prevPoints = newPrevPoints;
            return;
        }

        const invByPointer: Record<string, PatternInverse> = {};
        if (patternGpu) {
            let invertible = true;
            for (const point of coordinates[0] ?? []) {
                const inv = linePatternInverse(placementOf(point.x, point.y, patternSize, toolPattern, patternMouseCentered));
                if (!inv) {
                    invertible = false;
                    break;
                }
                invByPointer[point.id] = inv;
            }
            if (!invertible) {
                patternGpu = null;
                patternsService.pattern[patternId]?.valuesService.updateMaskedIfNeeded(true);
            }
        }

        const linePatternImage = patternGpu ? null : patternsService.pattern[patternId]?.valuesService.masked;
        if (!patternGpu && !linePatternImage) return;

        const strokes: PatternStroke[] = [];

        coordinates[0]?.forEach(({x, y, id: index}) => {
            if (!this.canvases[index]) {
                this.canvases[index] = createCanvas(width, height);
            }
            const ctx = this.canvases[index]?.context;
            this.canvases[index].clear();
            newPrevPoints[index] = {x, y};

            ctx.lineWidth = size;
            ctx.lineJoin = join;
            ctx.lineCap = cap;
            ctx.globalAlpha = size ? opacity : 0;
            ctx.strokeStyle = patternGpu
                ? '#fff'
                : getPatternStrokeStyle(ctx, x, y, patternSize, toolPattern, linePatternImage, patternMouseCentered);

            if (this.prevPoints[index]) {
                ctx.lineTo(x, y);
            } else {
                ctx.closePath();
                ctx.moveTo(x, y);
            }

            ctx.stroke();
            if (patternGpu) {
                const inv = invByPointer[index];
                if (inv) strokes.push({canvas: this.canvases[index].canvas, inv});
            } else {
                this.helperCanvas1.context.drawImage(this.canvases[index].canvas, 0, 0);
            }
        });

        if (patternGpu && dest) {
            if (strokes.length) {
                dest.compositePatternStrokesGpu(
                    strokes,
                    {
                        texture: patternGpu.texture,
                        width: patternGpu.width,
                        height: patternGpu.height,
                        flipY: patternGpu.stampFlipY,
                        premul: patternGpu.premul,
                    },
                    opacity,
                    clipMask,
                    compositeOperation,
                );
                this.drewGpu = true;
            }
            this.helperCanvas1.clear();
            this.prevPoints = newPrevPoints;
            return;
        }

        if (useGpu && dest) {
            dest.compositeLayerGpu(this.helperCanvas1.canvas, opacity, clipMask, compositeOperation);
            this.helperCanvas1.clear();
            this.drewGpu = true;
            this.prevPoints = newPrevPoints;
            return;
        }

        dest?.ensureCpu();

        const resultCanvas: HelperCanvas = selectionMask
            ? drawMasked(
                selectionMask,
                ({context}) => {
                    context.drawImage(this.helperCanvas1.canvas, 0, 0);
                    this.helperCanvas1.clear();
                }
            )(this.helperCanvas2)
            : this.helperCanvas1;

        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;
        context.drawImage(resultCanvas.canvas, 0, 0);
        resultCanvas.clear();

        this.prevPoints = newPrevPoints;
    }
}
