import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {drawMasked} from "../../../../../../utils/canvas/helpers/draw";
import {PatternState} from "../../../../../../store/patterns/pattern/types";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {LineParams} from "../../../../../../store/line/types";
import {PatternService} from "../../../PatternService";
import {patternsService} from "../../../../../index";

const getPatternStrokeStyle = (ctx, x, y, patternSize, linePattern: PatternState, linePatternImage, patternMouseCentered: boolean) => {
    const patternStrokeStyle = ctx.createPattern(linePatternImage, "repeat");
    const matrix = new DOMMatrix();
    const rotation = linePattern.config.rotation ? linePattern.rotation : null;

    patternStrokeStyle.setTransform(
        matrix
            .translateSelf(
                patternMouseCentered ? (x - linePattern.width / 2) : 0,
                patternMouseCentered ? (y - linePattern.height / 2) : 0,
            )
            .translateSelf(
                rotation?.value?.offset?.xd || 0,
                -rotation?.value?.offset?.yd || 0,
            )
            .translateSelf(
                linePattern.width / 2 + (rotation?.value?.offset?.xc || 0),
                linePattern.height / 2 - (rotation?.value?.offset?.yc || 0),
            )
            .rotateSelf(rotation?.value?.angle || 0)
            .scaleSelf(patternSize)
            .translateSelf(
                -linePattern.width / 2 - (rotation?.value?.offset?.xc || 0),
                -linePattern.height / 2 + (rotation?.value?.offset?.yc || 0),
            )
    );
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
        const dest = this.patternService.canvasService.buffer;
        const useGpu = compositeOperation === ECompositeOperation.SourceOver
            && !selectionMask
            && !!dest
            && brushEvent.canvas === dest.canvas;

        patternsService.pattern[patternId]?.valuesService.updateMaskedIfNeeded(true);
        const linePatternImage = patternsService.pattern[patternId]?.valuesService.masked;
        if (!linePatternImage || !toolPattern) return;

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
            ctx.strokeStyle = getPatternStrokeStyle(ctx, x, y, patternSize, toolPattern, linePatternImage, patternMouseCentered);

            if (this.prevPoints[index]) {
                ctx.lineTo(x, y);
            } else {
                ctx.closePath();
                ctx.moveTo(x, y);
            }

            ctx.stroke();
            this.helperCanvas1.context.drawImage(this.canvases[index].canvas, 0, 0);
        });

        if (useGpu) {
            dest.compositeLayerGpu(this.helperCanvas1.canvas, opacity);
            this.helperCanvas1.clear();
            this.drewGpu = true;
            this.prevPoints = newPrevPoints;
            return;
        }

        this.patternService.canvasService.buffer?.ensureCpu();

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
