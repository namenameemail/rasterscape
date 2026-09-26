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
import {buildStroke} from "../../../../../../gl/strokeMesh";
import {ERepeatsType} from "../../../../repeating/types";
import {PatternBuffer} from "../../PatternBuffer";
import {profileDebug} from "../../../../../../utils/profileDebug";

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

    trails: Record<string, {x: number, y: number}[]> = {};
    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;
    handlers: ToolHandlers = {};
    draw: boolean = false;
    flat = false;
    refId?: string;
    private repeatDest?: PatternBuffer;

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
                this.trails = {};
                this.refId = undefined;
                this.flat = false;
                const dest = this.repeatDest;
                this.repeatDest = undefined;
                dest?.endRepeat();
                profileDebug('draw', 'lineSolidPattern.endRepeat', {
                    target: dest === this.patternService.maskService.buffer ? 'mask'
                        : dest === this.patternService.canvasService.buffer ? 'canvas'
                        : dest ? 'other' : 'none',
                    serial: dest?.contentSerial,
                });
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
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const pattern = state.patterns[this.patternService.patternId];
        const {size, opacity, compositeOperation, cap, join, patternMouseCentered, patternId, patternSize} = state.line.params as LineParams;
        const points = state.position.coordinates[0] ?? [];
        if (!points.length) return;

        const toolPattern = state.patterns[patternId];
        const clipMask = this.patternService.selectionService.maskCanvas;
        const dest = bufferForDrawCanvas(this.patternService, brushEvent.canvas);
        const useGpu = !!dest;
        const flatNow = !!pattern.config.repeating && pattern.repeating.params.type === ERepeatsType.FlatGrid;

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
            this.trails = {};
            this.refId = points[0].id;
            this.flat = flatNow;
            points.forEach(({x, y, id}) => {
                this.trails[id] = [{x, y}];
            });
            return;
        }

        if (this.flat !== flatNow) {
            this.flat = flatNow;
        }

        points.forEach(({x, y, id}) => {
            if (!this.trails[id]) this.trails[id] = [];
            this.trails[id].push({x, y});
        });

        const ref = points.find(({id}) => id === this.refId) ?? points[0];
        this.refId = ref.id;
        const ready = points.some(({id}) => (this.trails[id]?.length ?? 0) >= 2);
        if (!ready || size <= 0) return;

        const lineCap = cap as CanvasLineCap;
        const lineJoin = join as CanvasLineJoin;

        const invByPointer: Record<string, PatternInverse> = {};
        if (patternGpu) {
            let invertible = true;
            for (const point of points) {
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

        if (patternGpu && dest) {
            const flatMesh = this.flat
                ? buildStroke(this.trails[ref.id] ?? [], size, lineCap, lineJoin)
                : null;
            const strokes: PatternStroke[] = [];
            for (const {x, y, id} of points) {
                const inv = invByPointer[id];
                if (!inv) continue;
                const mesh = flatMesh ?? buildStroke(this.trails[id] ?? [], size, lineCap, lineJoin);
                if (mesh.length < 6) continue;
                strokes.push({
                    mesh,
                    inv,
                    dx: this.flat ? x - ref.x : 0,
                    dy: this.flat ? y - ref.y : 0,
                });
            }
            if (strokes.length) {
                this.repeatDest = dest;
                dest.beginRepeat();
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
            }
            return;
        }

        const linePatternImage = patternsService.pattern[patternId]?.valuesService.masked;
        if (!linePatternImage) return;

        this.helperCanvas1.clear();
        points.forEach(({x, y, id}) => {
            const trail = this.trails[id] ?? [];
            if (trail.length < 2) return;
            const strokeCtx = this.helperCanvas1.context;
            strokeCtx.imageSmoothingEnabled = false;
            strokeCtx.lineWidth = size;
            strokeCtx.lineJoin = join;
            strokeCtx.lineCap = cap;
            strokeCtx.globalAlpha = size ? opacity : 0;
            strokeCtx.strokeStyle = getPatternStrokeStyle(strokeCtx, x, y, patternSize, toolPattern, linePatternImage, patternMouseCentered);
            strokeCtx.beginPath();
            strokeCtx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) strokeCtx.lineTo(trail[i].x, trail[i].y);
            strokeCtx.stroke();
        });
        context.globalAlpha = 1;

        if (useGpu && dest) {
            dest.compositeLayerGpu(this.helperCanvas1.canvas, opacity, clipMask, compositeOperation);
            this.helperCanvas1.clear();
            return;
        }

        dest?.ensureCpu();

        const resultCanvas: HelperCanvas = clipMask
            ? drawMasked(
                clipMask,
                ({context: maskContext}) => {
                    maskContext.drawImage(this.helperCanvas1.canvas, 0, 0);
                    this.helperCanvas1.clear();
                }
            )(this.helperCanvas2)
            : this.helperCanvas1;

        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;
        context.drawImage(resultCanvas.canvas, 0, 0);
        resultCanvas.clear();
    }
}
