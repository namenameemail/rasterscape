import {drawMasked, drawWithRotation} from "../../../../../../utils/canvas/helpers/draw";
import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {ToolService, ToolHandlers} from "../types";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent} from "../types";
import {PatternService} from "../../../PatternService";
import {EBrushType} from "../../../../../brush/types";
import {getRandomColor} from "../../../../../../utils/utils";
import {circle} from "../../../../../../utils/canvas/helpers/geometry";

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
        const selectionMask = this.patternService.selectionService.mask;
        const clipMask = this.patternService.selectionService.maskCanvas;
        const dest = this.patternService.canvasService.buffer;
        const useGpu = compositeOperation === ECompositeOperation.SourceOver
            && !!dest
            && brushEvent.canvas === dest.canvas
            && (!selectionMask || !!clipMask);

        const rotation = pattern.rotation.value;
        const angle = rotation ? rotation.angle : 0;

        this.helperCanvas1.clear();
        coordinates[0]?.forEach(({x, y}) => {
            drawWithRotation(
                -angle,
                x, y,
                ({context}) => {
                    context.fillStyle = getRandomColor();
                    circle(context, 0, 0, size / 2);
                }
            )(this.helperCanvas1);
        });

        if (useGpu) {
            dest.compositeLayerGpu(this.helperCanvas1.canvas, opacity, clipMask);
            this.helperCanvas1.clear();
            this.drewGpu = true;
            return;
        }

        this.patternService.canvasService.buffer?.ensureCpu();

        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;

        const resultCanvas: HelperCanvas = selectionMask
            ? drawMasked(
                selectionMask,
                ({context}) => {
                    context.drawImage(this.helperCanvas1.canvas, 0, 0);
                    this.helperCanvas1.clear();
                }
            )(this.helperCanvas2)
            : this.helperCanvas1;

        context.drawImage(resultCanvas.canvas, 0, 0);
        resultCanvas.clear();
    };
}
