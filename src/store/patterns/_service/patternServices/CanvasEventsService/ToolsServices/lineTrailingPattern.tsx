import {
    drawMasked,
    drawWithRotationAndOffset
} from "../../../../../../utils/canvas/helpers/draw";
import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {getRandomColor} from "../../../../../../utils/utils";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {PatternService} from "../../../PatternService";
import {patternsService} from "../../../../../index";
import {StampDrawParams} from "../../../../../../gl/stampMat";

function distanceBetween(point1, point2) {
    if (!point1 || !point2) return 0;
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

function angleBetween(point1, point2) {
    if (!point1 || !point2) return 0;
    return Math.atan2(point2?.x - point1?.x, point2?.y - point1?.y);
}

export class LineTrailingPattern implements ToolService {
    patternService: PatternService;
    drewGpu = false;

    draw: boolean = false;

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    canvases: Record<string, HelperCanvas> = {};
    prevPoints = {};

    handlers: ToolHandlers = {};

    constructor(patternService: PatternService, _width: number, _height: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDraw: this.patternLine,
            onClick: this.patternLine,
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

    patternLine = (brushEvent: CanvasServiceEvent) => {
        this.drewGpu = false;
        const {context, events, gpuAhead} = brushEvent;
        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const targetPattern = state.patterns[this.patternService.patternId];
        const {
            patternSize,
            opacity,
            compositeOperation,
            patternId: toolPatternId,
            patternDirection,
        } = state.line.params;
        const toolPattern = state.patterns[toolPatternId];
        const coordinates = state.position.coordinates;
        const selectionMask = patternsService.pattern[this.patternService.patternId].selectionService.mask;
        const useGpu = !!gpuAhead
            && compositeOperation === ECompositeOperation.SourceOver
            && !selectionMask;

        const brushRotation = toolPattern?.config?.rotation ? toolPattern?.rotation?.value : null;
        const destinationRotation =
            targetPattern?.config?.rotation
            && targetPattern?.rotation?.value?.rotateDrawAreaElement
                ? targetPattern?.rotation?.value : null;

        if (!this.draw) {
            coordinates[0]?.forEach(({x, y, id}) => {
                this.prevPoints[id] = {x, y};
            });
            this.draw = true;
            return;
        }

        if (patternSize < 0.01) return;

        Object.keys(this.prevPoints)
            .filter(pointId => coordinates[0]?.findIndex(({id}) => pointId === id) === -1)
            .forEach(pointId => {
                this.prevPoints[pointId] = null
            });

        if (useGpu) {
            const masked = patternsService.pattern[toolPatternId]?.valuesService.ensureMaskedGpu();
            const dest = this.patternService.canvasService.buffer;
            if (!masked || !dest) return;

            const sourceService = patternsService.pattern[toolPatternId];
            const width = patternSize * masked.width;
            const height = patternSize * masked.height;
            const stamps: StampDrawParams[] = [];

            coordinates[0]?.forEach(({x, y, id}) => {
                const prevPoint = this.prevPoints[id];
                this.prevPoints[id] = {x, y};
                if (!prevPoint) return;

                const destAngle = (destinationRotation?.angle || 0)
                    + (patternDirection ? (angleBetween(prevPoint, {x, y}) / Math.PI * 180) : 0);
                const brushAngle = brushRotation?.angle || 0;
                const brushCenter = brushRotation ? {
                    x: patternSize * brushRotation.offset.xc,
                    y: patternSize * brushRotation.offset.yc
                } : {x: 0, y: 0};
                const brushOffset = brushRotation ? {
                    x: patternSize * brushRotation.offset.xd,
                    y: patternSize * brushRotation.offset.yd
                } : {x: 0, y: 0};

                const dist = distanceBetween(prevPoint, {x, y});
                const angle = angleBetween(prevPoint, {x, y});

                for (let i = 0; i < dist || i === 0; i += 5) {
                    const px = prevPoint.x + (Math.sin(angle) * i);
                    const py = prevPoint.y + (Math.cos(angle) * i);
                    stamps.push({
                        x: px,
                        y: py,
                        angleB: brushAngle,
                        angleD: destAngle,
                        xc: brushCenter.x,
                        yc: -brushCenter.y,
                        xd: brushOffset.x,
                        yd: -brushOffset.y,
                        width,
                        height,
                    });
                }
            });

            dest.stampGpu(
                masked.texture,
                sourceService.canvasService.buffer?.textureFromCanvas ?? true,
                stamps,
                opacity,
            );
            this.drewGpu = true;
            return;
        }

        if (gpuAhead) {
            this.patternService.canvasService.buffer?.ensureCpu();
            patternsService.pattern[toolPatternId]?.valuesService.updateMaskedIfNeeded(true);
        }

        const linePatternImage = patternsService.pattern[toolPatternId]?.valuesService.masked;
        if (!linePatternImage) return;

        context.fillStyle = getRandomColor();
        context.globalAlpha = opacity;
        context.globalCompositeOperation = compositeOperation;
        context.imageSmoothingEnabled = true;

        this.helperCanvas1.clear();

        const width = patternSize * linePatternImage.width;
        const height = patternSize * linePatternImage.height;

        coordinates[0]?.forEach(({x, y, id}) => {
            const prevPoint = this.prevPoints[id];
            this.prevPoints[id] = {x, y};
            if (!prevPoint) return;

            const destAngle = (destinationRotation?.angle || 0)
                + (patternDirection ? (angleBetween(prevPoint, {x, y}) / Math.PI * 180) : 0);
            const brushAngle = brushRotation?.angle || 0;
            const brushCenter = brushRotation ? {
                x: patternSize * brushRotation.offset.xc,
                y: patternSize * brushRotation.offset.yc
            } : {x: 0, y: 0};
            const brushOffset = brushRotation ? {
                x: patternSize * brushRotation.offset.xd,
                y: patternSize * brushRotation.offset.yd
            } : {x: 0, y: 0};

            const dist = distanceBetween(prevPoint, {x, y});
            const angle = angleBetween(prevPoint, {x, y});

            for (let i = 0; i < dist || i === 0; i += 5) {
                const px = prevPoint.x + (Math.sin(angle) * i);
                const py = prevPoint.y + (Math.cos(angle) * i);

                drawWithRotationAndOffset(
                    brushAngle,
                    destAngle,
                    brushCenter.x, -brushCenter.y,
                    brushOffset.x, -brushOffset.y,
                    px, py,
                    ({context}) => {
                        context.drawImage(linePatternImage, -width / 2, -height / 2, width, height);
                    },
                )(this.helperCanvas1);
            }
        });

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

        context.globalCompositeOperation = ECompositeOperation.SourceOver;
        context.globalAlpha = 1;
    };
}
