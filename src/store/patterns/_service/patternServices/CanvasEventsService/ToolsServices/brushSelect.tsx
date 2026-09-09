import {
    drawWithRotationAndOffset
} from "../../../../../../utils/canvas/helpers/draw";
import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {PatternService} from "../../../PatternService";
import {EBrushType} from "../../../../../brush/types";
import {StampDrawParams} from "../../../../../../gl/stampMat";
import {getGlContext} from "../../../../../../gl/GlContext";

export class BrushSelect implements ToolService {
    patternService: PatternService;
    drewGpu = false;

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    handlers: ToolHandlers = {};
    offsetX = 0;
    offsetY = 0;

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDown: (brushEvent: CanvasServiceEvent) => {
                const event = brushEvent.events[0];
                const state = this.patternService.storeService.getState();
                const targetPattern = state.patterns[this.patternService.patternId];
                this.offsetX = this.offsetX || (event.offsetX - targetPattern.width / 2);
                this.offsetY = this.offsetY || (event.offsetY - targetPattern.height / 2);
            },
            onDraw: this.brushSelect,
            onClick: this.brushSelect,
            onRelease: () => {
                this.offsetX = 0;
                this.offsetY = 0;
            },
        };
    }

    setSize = (width: number, height: number) => {
        this.helperCanvas1.canvas.width = width;
        this.helperCanvas2.canvas.width = width;
        this.helperCanvas1.canvas.height = height;
        this.helperCanvas2.canvas.height = height;
    };

    brushSelect = (brushEvent: CanvasServiceEvent) => {
        this.drewGpu = false;
        const {context, events} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();
        const targetPattern = state.patterns[this.patternService.patternId];
        const {
            size: patternSize,
            opacity,
            compositeOperation,
        } = state.brush.params.paramsByType[EBrushType.Select];
        const coordinates = state.position.coordinates;
        const dest = this.patternService.canvasService.buffer;
        const useGpu = compositeOperation === ECompositeOperation.SourceOver
            && !!dest
            && brushEvent.canvas === dest.canvas;

        const brushRotation = targetPattern?.config?.rotation ? targetPattern?.rotation?.value : null;
        const destinationRotation = (
            targetPattern?.config?.rotation &&
            targetPattern?.rotation?.value?.rotateDrawAreaElement
        ) ? targetPattern?.rotation?.value : null;

        if (useGpu) {
            const selectedCanvas = this.patternService.valuesService.selected;
            let texture: WebGLTexture;
            let sourceFlipY: boolean;
            let sw: number;
            let sh: number;

            if (selectedCanvas) {
                texture = getGlContext().uploadCanvasSized(selectedCanvas);
                sourceFlipY = true;
                sw = selectedCanvas.width;
                sh = selectedCanvas.height;
            } else {
                const selected = this.patternService.valuesService.ensureSelectedGpu();
                if (!selected) return;
                texture = selected.texture;
                sourceFlipY = false;
                sw = selected.width;
                sh = selected.height;
            }

            const width = patternSize * sw;
            const height = patternSize * sh;
            const stamps: StampDrawParams[] = [];

            coordinates[0]?.forEach(({x, y}) => {
                const destAngle = destinationRotation ? destinationRotation.angle : 0;
                const brushAngle = brushRotation ? brushRotation.angle : 0;
                stamps.push({
                    x: x - this.offsetX,
                    y: y - this.offsetY,
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

            dest.stampGpu(texture, sourceFlipY, stamps, opacity);
            this.drewGpu = true;
            return;
        }

        this.patternService.canvasService.buffer?.ensureCpu();

        const brushPatternImage = this.patternService.valuesService.selected;
        if (!brushPatternImage) return;

        context.globalAlpha = opacity;
        context.globalCompositeOperation = compositeOperation;
        context.imageSmoothingEnabled = true;

        const width = patternSize * brushPatternImage.width;
        const height = patternSize * brushPatternImage.height;

        coordinates[0]?.forEach(({x, y}) => {
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
                x - this.offsetX, y - this.offsetY,
                ({context}) => {
                    context.drawImage(brushPatternImage, -width / 2, -height / 2, width, height);
                }
            )(this.helperCanvas1);
        });

        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;
        context.drawImage(this.helperCanvas1.canvas, 0, 0);
        this.helperCanvas1.clear();

        context.globalCompositeOperation = ECompositeOperation.SourceOver;
        context.globalAlpha = 1;
    };
}
