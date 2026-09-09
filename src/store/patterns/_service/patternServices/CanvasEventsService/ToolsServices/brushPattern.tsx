import {drawMasked, drawWithRotationAndOffset} from "../../../../../../utils/canvas/helpers/draw";
import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {getRandomColor} from "../../../../../../utils/utils";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {patternsService} from "../../../../../../store";
import {PatternService} from "../../../PatternService";
import {EBrushType} from "../../../../../brush/types";
import {StampDrawParams} from "../../../../../../gl/stampMat";

export class BrushPattern implements ToolService {
    patternService: PatternService;
    drewGpu = false;

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    handlers: ToolHandlers = {};

    constructor(patternService: PatternService, _width: number, _height: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDraw: this.patternBrush,
            onClick: this.patternBrush,
        };
    }

    setSize = (width: number, height: number) => {
        this.helperCanvas1.canvas.width = width;
        this.helperCanvas2.canvas.width = width;
        this.helperCanvas1.canvas.height = height;
        this.helperCanvas2.canvas.height = height;
    };

    patternBrush = (brushEvent: CanvasServiceEvent) => {
        this.drewGpu = false;
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const targetPattern = state.patterns[this.patternService.patternId];
        const {
            size: patternSize,
            opacity,
            compositeOperation,
            patternId: toolPatternId
        } = state.brush.params.paramsByType[EBrushType.Pattern];
        const toolPattern = state.patterns[toolPatternId];
        const coordinates = state.position.coordinates;
        const selectionMask = this.patternService.selectionService.mask;
        const dest = this.patternService.canvasService.buffer;
        const useGpu = compositeOperation === ECompositeOperation.SourceOver
            && !selectionMask
            && !!dest
            && brushEvent.canvas === dest.canvas;

        const brushRotation = toolPattern?.config?.rotation ? toolPattern?.rotation?.value : null;
        const destinationRotation = (
            targetPattern?.config?.rotation &&
            targetPattern?.rotation?.value?.rotateDrawAreaElement
        ) ? targetPattern?.rotation?.value : null;

        if (useGpu) {
            const masked = patternsService.pattern[toolPatternId]?.valuesService.ensureMaskedGpu();
            if (!masked) return;

            const sourceService = patternsService.pattern[toolPatternId];
            const stamps: StampDrawParams[] = [];
            const width = patternSize * masked.width;
            const height = patternSize * masked.height;

            coordinates[0]?.forEach(({x, y}) => {
                const destAngle = destinationRotation ? destinationRotation.angle : 0;
                const brushAngle = brushRotation ? brushRotation.angle : 0;
                stamps.push({
                    x, y,
                    angleB: brushAngle,
                    angleD: destAngle,
                    xc: brushRotation ? patternSize * brushRotation.offset.xc : 0,
                    yc: brushRotation ? -patternSize * brushRotation.offset.yc : 0,
                    xd: brushRotation ? patternSize * brushRotation.offset.xd : 0,
                    yd: brushRotation ? -patternSize * brushRotation.offset.yd : 0,
                    width,
                    height,
                });
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

        this.patternService.canvasService.buffer?.ensureCpu();
        patternsService.pattern[toolPatternId]?.valuesService.updateMaskedIfNeeded(true);

        const brushPatternImage = patternsService.pattern[toolPatternId]?.valuesService.masked;
        if (!brushPatternImage) return;

        context.fillStyle = getRandomColor();
        context.globalAlpha = opacity;
        context.globalCompositeOperation = compositeOperation;
        context.imageSmoothingEnabled = true;

        const width = patternSize * brushPatternImage.width;
        const height = patternSize * brushPatternImage.height;

        coordinates[0].forEach(({x, y}) => {
            const destAngle = destinationRotation ? destinationRotation.angle : 0;
            const brushAngle = brushRotation ? brushRotation.angle : 0;
            const brushCenter = brushRotation ? {
                x: patternSize * brushRotation.offset.xc,
                y: patternSize * brushRotation.offset.yc
            } : {x: 0, y: 0};
            const brushOffset = brushRotation ? {
                x: patternSize * brushRotation.offset.xd,
                y: patternSize * brushRotation.offset.yd
            } : {x: 0, y: 0};

            drawWithRotationAndOffset(
                brushAngle,
                destAngle,
                brushCenter.x, -brushCenter.y,
                brushOffset.x, -brushOffset.y,
                x, y,
                ({context, canvas}) => {
                    context.drawImage(brushPatternImage, -width / 2, -height / 2, width, height);
                }
            )(this.helperCanvas1);
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
