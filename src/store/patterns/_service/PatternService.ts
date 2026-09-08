import {PatternCanvasService} from "./patternServices/PatternCanvasService";
import {PatternValuesService} from "./patternServices/PatternValuesService";
import {PatternMaskService} from "./patternServices/PatternMaskService";
import {PatternSelectionService} from "./patternServices/PatternSelectionService";
import {PatternToolService} from "./patternServices/PatternToolService";
import {Store} from "redux";
import {AppState} from "../../index";
import {PatternStoreService} from "./patternServices/PatternStoreService";
import {PatternPreviewService} from "./patternServices/PatternPreviewService";
import {PatternVideoService} from "./patternServices/PatternVideoService";
import {PatternPlatformerService} from "./patternServices/PatternPlatformerService";

export class PatternService {
    patternId: string;
    storeService: PatternStoreService;

    canvasService: PatternCanvasService;
    previewService: PatternPreviewService;
    maskService: PatternMaskService;
    selectionService: PatternSelectionService;
    valuesService: PatternValuesService;
    patternToolService: PatternToolService;
    videoService: PatternVideoService;
    platformerService: PatternPlatformerService;

    constructor(patternId: string, store: Store<AppState>) {
        this.patternId = patternId;
        this.storeService = new PatternStoreService(this, store);

        this.canvasService = new PatternCanvasService(this);
        this.maskService = new PatternMaskService(this);
        this.selectionService = new PatternSelectionService(this);
        this.valuesService = new PatternValuesService(this);
        this.patternToolService = new PatternToolService(this);
        this.previewService = new PatternPreviewService(this);
        this.videoService = new PatternVideoService(this);
        this.platformerService = new PatternPlatformerService(this);
    }

    stop = () => {
        this.canvasService.setCanvas();
        this.maskService.setCanvas();
        this.previewService.unbindAll();
        this.videoService.stop();
        this.videoService.stopCamera();
        this.platformerService.stop();
    };

    setWidth = (width: number, noStretch?: boolean): PatternService => {
        this.canvasService.setWidth(width, noStretch);
        this.maskService.setWidth(width, noStretch);

        const height = this.canvasService.canvas?.height ?? 0;

        this.patternToolService.setToolSize?.(width, height);
        this.platformerService.resize(width, height, noStretch);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };
    setHeight = (height: number, noStretch?: boolean): PatternService => {
        this.canvasService.setHeight(height, noStretch);
        this.maskService.setHeight(height, noStretch);

        const width = this.canvasService.canvas?.width ?? 0;

        this.patternToolService.setToolSize?.(width, height);
        this.platformerService.resize(width, height, noStretch);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    setCanvasAndMaskImageData = (canvasImageData: ImageData, maskImageData: ImageData): PatternService => {
        this.canvasService.setImageData(canvasImageData, true, true);
        this.maskService.setImageData(maskImageData, true, true);
        this.patternToolService.setToolSize?.(canvasImageData.width, canvasImageData.height);
        this.platformerService.reloadWorldFromCanvas();

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    setCanvasImageData = (canvasImageData: ImageData, noStretch?: boolean): PatternService => {
        this.maskService.setSize(canvasImageData.width, canvasImageData.height, noStretch);

        this.canvasService.setImageData(canvasImageData, true, true);

        this.patternToolService.setToolSize?.(canvasImageData.width, canvasImageData.height);
        this.platformerService.reloadWorldFromCanvas(noStretch);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    bindCanvas = (canvas: HTMLCanvasElement, width: number, height: number): PatternService => {
        this.canvasService.setCanvas(canvas, width, height);
        this.patternToolService.bindCanvas();

        return this;
    };

    unbindCanvas = (): PatternService => {
        this.patternToolService.unbindCanvas();
        this.canvasService.setCanvas();

        return this;
    };

    bindMaskCanvas = (canvas: HTMLCanvasElement, width: number, height: number): PatternService => {
        this.maskService.setCanvas(canvas, width, height);
        this.patternToolService.bindMaskCanvas();

        return this;
    };

    unbindMaskCanvas = (): PatternService => {
        this.patternToolService.unbindMaskCanvas();
        this.maskService.setCanvas();

        return this;
    };

    setRotationAngle = (angle: number): PatternService => {
        this.patternToolService.canvasEventsService.rotationAngle = angle;
        this.patternToolService.maskCanvasEventsService.rotationAngle = angle;

        return this;
    };
    
    setRotationView = (value: boolean): PatternService => {
        this.patternToolService.canvasEventsService.rotationView = value;
        this.patternToolService.maskCanvasEventsService.rotationView = value;

        return this;
    };


}
