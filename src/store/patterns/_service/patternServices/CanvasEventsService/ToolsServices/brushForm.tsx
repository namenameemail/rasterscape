import {drawMasked, drawWithRotation} from "../../../../../../utils/canvas/helpers/draw";
import {ToolService, ToolHandlers} from "../types";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent} from "../types";
import {PatternService} from "../../../PatternService";
import {EBrushType} from "../../../../../brush/types";
import {getRandomColor} from "../../../../../../utils/utils";
import {circle} from "../../../../../../utils/canvas/helpers/geometry";
import {bufferForDrawCanvas} from "../drawTarget";
import {StampDrawParams} from "../../../../../../gl/stampMat";

const hexRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export class BrushShape implements ToolService {
    patternService: PatternService;
    drewGpu = false;

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    handlers: ToolHandlers = {};

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDraw: this.circleBrush,
            onClick: this.circleBrush,
        };
    }

    setSize = (width: number, height: number) => {
        this.helperCanvas1.canvas.width = width;
        this.helperCanvas2.canvas.width = width;
        this.helperCanvas1.canvas.height = height;
        this.helperCanvas2.canvas.height = height;
    };

    circleBrush = (brushEvent: CanvasServiceEvent) => {
        this.drewGpu = false;
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const pattern = state.patterns[this.patternService.patternId];
        const {size, opacity, compositeOperation} = state.brush.params.paramsByType[EBrushType.Shape];
        const coordinates = state.position.coordinates;
        const points = coordinates[0] ?? [];
        if (!points.length || size <= 0) return;

        const selectionMask = this.patternService.selectionService.mask;
        const clipMask = this.patternService.selectionService.maskCanvas;
        const dest = bufferForDrawCanvas(this.patternService, brushEvent.canvas);
        const useGpu = !!dest && (!selectionMask || !!clipMask);

        if (useGpu && dest) {
            const stamps: StampDrawParams[] = points.map(({x, y}) => ({
                x, y,
                angleB: 0,
                angleD: 0,
                xc: 0,
                yc: 0,
                xd: 0,
                yd: 0,
                width: size,
                height: size,
                color: hexRgb(getRandomColor()),
            }));
            dest.stampCirclesGpu(stamps, opacity, clipMask, compositeOperation);
            this.drewGpu = true;
            return;
        }

        const rotation = pattern.rotation.value;
        const angle = rotation ? rotation.angle : 0;

        this.helperCanvas1.clear();
        points.forEach(({x, y}) => {
            drawWithRotation(
                -angle,
                x, y,
                ({context: c}) => {
                    c.fillStyle = getRandomColor();
                    circle(c, 0, 0, size / 2);
                }
            )(this.helperCanvas1);
        });

        dest?.ensureCpu();

        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;

        const resultCanvas: HelperCanvas = selectionMask
            ? drawMasked(
                selectionMask,
                ({context: c}) => {
                    c.drawImage(this.helperCanvas1.canvas, 0, 0);
                    this.helperCanvas1.clear();
                }
            )(this.helperCanvas2)
            : this.helperCanvas1;

        context.drawImage(resultCanvas.canvas, 0, 0);
        resultCanvas.clear();
    };
}
