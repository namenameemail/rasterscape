import {getRandomColor} from "../../../../../../utils/utils";
import {ELineRandomType} from "../../../../../../store/line/types";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {drawMasked} from "../../../../../../utils/canvas/helpers/draw";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {bufferForDrawCanvas} from "../drawTarget";
import {PatternService} from "../../../PatternService";
import {ERepeatsType} from "../../../../repeating/types";
import {paintCoverage} from "../../../../repeating/coverage";
import {RepeatCopy, PatternBuffer} from "../../PatternBuffer";
import {buildStroke} from "../../../../../../gl/strokeMesh";
import {StrokeDraw} from "../../../../../../gl/strokeDraw";
import {profileDebug} from "../../../../../../utils/profileDebug";

const hexRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export class LineSolid implements ToolService {
    patternService: PatternService;

    trails: Record<string, {x: number, y: number}[]> = {};
    painted: Record<string, number> = {};
    colors: Record<string, string> = {};
    shapes: Record<string, HelperCanvas> = {};
    flatShape?: HelperCanvas;
    originX = 0;
    originY = 0;
    geomKey = '';
    styleKey = '';
    refId?: string;
    flat = false;
    cpuBase?: HelperCanvas;
    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;
    handlers: ToolHandlers = {};
    draw: boolean = false;
    private repeatDest?: PatternBuffer;

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDraw: this.lineDraw,
            onClick: this.lineDraw,
            onRelease: () => {
                this.draw = false;
                this.trails = {};
                this.painted = {};
                this.colors = {};
                this.shapes = {};
                this.flatShape = undefined;
                this.geomKey = '';
                this.styleKey = '';
                this.refId = undefined;
                this.flat = false;
                this.cpuBase = undefined;
                const dest = this.repeatDest;
                this.repeatDest = undefined;
                dest?.endRepeat();
                profileDebug('draw', 'lineSolid.endRepeat', {
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
        this.flatShape = undefined;
        this.shapes = {};
        this.painted = {};
        this.geomKey = '';
        this.cpuBase = undefined;
    };

    lineDraw = (brushEvent: CanvasServiceEvent) => {
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const pattern = state.patterns[this.patternService.patternId];
        const {width, height} = pattern;
        const {size, opacity, compositeOperation, cap, join, random} = state.line.params;
        const points = state.position.coordinates[0] ?? [];
        if (!points.length) return;

        const clipMask = this.patternService.selectionService.maskCanvas;
        const dest = bufferForDrawCanvas(this.patternService, brushEvent.canvas);
        const useGpu = !!dest;
        const flatNow = !!pattern.config.repeating && pattern.repeating.params.type === ERepeatsType.FlatGrid;

        if (!this.draw) {
            this.draw = true;
            this.trails = {};
            this.painted = {};
            this.colors = {};
            this.shapes = {};
            this.flatShape = undefined;
            this.geomKey = '';
            this.refId = points[0].id;
            this.flat = flatNow;
            this.cpuBase = undefined;
        } else if (this.flat !== flatNow) {
            this.flat = flatNow;
            this.painted = {};
            this.flatShape = undefined;
            this.shapes = {};
            this.geomKey = '';
        }

        points.forEach(({x, y, id}) => {
            if (!this.trails[id]) this.trails[id] = [];
            this.trails[id].push({x, y});
            if (!this.colors[id]) this.colors[id] = getRandomColor();
        });

        const ref = points.find(({id}) => id === this.refId) ?? points[0];
        this.refId = ref.id;
        const ready = points.some(({id}) => this.trails[id].length >= 2);
        if (!ready) return;

        if (size <= 0) {
            if (useGpu && dest) {
                this.repeatDest = dest;
                dest.beginRepeat();
                dest.compositeStrokesGpu([], opacity, clipMask, compositeOperation);
            }
            return;
        }

        const styleKey = `${size}|${cap}|${join}`;
        if (styleKey !== this.styleKey) {
            this.styleKey = styleKey;
            this.painted = {};
        }

        const lineCap = cap as CanvasLineCap;
        const lineJoin = join as CanvasLineJoin;
        if (useGpu && dest) {
            const flatMesh = this.flat
                ? buildStroke(this.trails[ref.id] ?? [], size, lineCap, lineJoin)
                : null;
            const strokes: StrokeDraw[] = points.map(({x, y, id}) => ({
                mesh: flatMesh ?? buildStroke(this.trails[id] ?? [], size, lineCap, lineJoin),
                dx: this.flat ? x - ref.x : 0,
                dy: this.flat ? y - ref.y : 0,
                color: hexRgb(random === ELineRandomType.OnFrame ? getRandomColor() : this.colors[id]),
            }));
            const mesh = strokes[0]?.mesh;
            profileDebug('draw', 'solidRepeats', {
                flat: this.flat,
                copies: strokes.length,
                verts: mesh ? mesh.length / 2 : 0,
                dx: strokes[0]?.dx,
                dy: strokes[0]?.dy,
                x0: mesh?.[0],
                y0: mesh?.[1],
                x1: mesh?.[2],
                y1: mesh?.[3],
                target: dest === this.patternService.maskService.buffer ? 'mask' : 'canvas',
                serial: dest.contentSerial,
            });
            this.repeatDest = dest;
            dest.beginRepeat();
            dest.compositeStrokesGpu(strokes, opacity, clipMask, compositeOperation);
            return;
        }

        if (this.flat) {
            this.ensureFlat(width, height, size);
            const trail = this.trails[ref.id] ?? [];
            this.painted[ref.id] = paintCoverage(
                this.flatShape as HelperCanvas,
                trail,
                this.painted[ref.id] ?? 0,
                this.originX,
                this.originY,
                size,
                lineCap,
                lineJoin,
            );
        } else {
            points.forEach(({id}) => {
                if (!this.shapes[id]) this.shapes[id] = createCanvas(width, height);
                this.painted[id] = paintCoverage(
                    this.shapes[id],
                    this.trails[id],
                    this.painted[id] ?? 0,
                    0,
                    0,
                    size,
                    lineCap,
                    lineJoin,
                );
            });
        }

        const copies: RepeatCopy[] = points.map(({x, y, id}) => ({
            canvas: (this.flat ? this.flatShape : this.shapes[id])?.canvas as HTMLCanvasElement,
            dx: this.flat ? x - ref.x : 0,
            dy: this.flat ? y - ref.y : 0,
            color: hexRgb(random === ELineRandomType.OnFrame ? getRandomColor() : this.colors[id]),
            originX: this.flat ? this.originX : 0,
            originY: this.flat ? this.originY : 0,
        }));

        if (!this.cpuBase) {
            dest?.ensureCpu();
            this.cpuBase = createCanvas(width, height);
            this.cpuBase.context.drawImage(context.canvas, 0, 0);
        }

        const layer = this.helperCanvas1;
        layer.context.setTransform(1, 0, 0, 1, 0, 0);
        layer.clear();
        const tint = this.helperCanvas2;
        copies.forEach((copy) => {
            const rgb = copy.color;
            tint.context.setTransform(1, 0, 0, 1, 0, 0);
            tint.clear();
            tint.context.setTransform(1, 0, 0, 1, copy.dx + copy.originX, copy.dy + copy.originY);
            tint.context.drawImage(copy.canvas, 0, 0);
            tint.context.setTransform(1, 0, 0, 1, 0, 0);
            tint.context.globalCompositeOperation = 'source-in';
            tint.context.fillStyle = `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
            tint.context.fillRect(0, 0, width, height);
            tint.context.globalCompositeOperation = 'source-over';
            layer.context.drawImage(tint.canvas, 0, 0);
        });

        const masked: HelperCanvas = clipMask
            ? drawMasked(
                clipMask,
                ({context: maskContext}) => {
                    maskContext.drawImage(layer.canvas, 0, 0);
                }
            )(tint)
            : layer;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'copy';
        context.drawImage(this.cpuBase.canvas, 0, 0);
        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;
        context.drawImage(masked.canvas, 0, 0);
        context.globalAlpha = 1;
    };

    private ensureFlat = (width: number, height: number, size: number) => {
        const pattern = this.patternService.storeService.getState().patterns[this.patternService.patternId];
        const grid = pattern.repeating.params.typeParams[ERepeatsType.FlatGrid];
        const pad = Math.ceil(Math.max(size, 1) * 16 + 8);
        const originX = -grid.xOut * (width / grid.xd) - pad;
        const originY = -grid.yOut * (height / grid.yd) - pad;
        const key = `${originX}:${originY}:${pad}:${width}:${height}`;
        if (this.flatShape && this.geomKey === key) return;
        this.originX = originX;
        this.originY = originY;
        this.geomKey = key;
        this.flatShape = createCanvas(Math.ceil(width + pad * 2), Math.ceil(height + pad * 2));
        this.painted = {};
    };
}
