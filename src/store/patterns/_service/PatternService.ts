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
    }

    stop = () => {
        this.canvasService.setCanvas();
        this.maskService.setCanvas();
        this.previewService.unbindAll();
        this.videoService.stop();
        this.videoService.stopCamera();
    };

    setWidth = (width: number, noStretch?: boolean): PatternService => {
        this.canvasService.setWidth(width, noStretch);
        this.maskService.setWidth(width, noStretch);
        this.patternToolService.setToolSize?.(width, this.canvasService.canvas.height);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };
    setHeight = (height: number, noStretch?: boolean): PatternService => {
        this.canvasService.setHeight(height, noStretch);
        this.maskService.setHeight(height, noStretch);
        this.patternToolService.setToolSize?.(this.canvasService.canvas.width, height);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    setCanvasAndMaskImageData = (canvasImageData: ImageData, maskImageData: ImageData): PatternService => {
        this.canvasService.setImageData(canvasImageData, true, true);
        this.maskService.setImageData(maskImageData, true, true);
        this.patternToolService.setToolSize?.(canvasImageData.width, canvasImageData.height);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    setCanvasImageData = (canvasImageData: ImageData, noStretch?: boolean): PatternService => {
        this.maskService.setSize(canvasImageData.width, canvasImageData.height, noStretch);

        this.canvasService.setImageData(canvasImageData, true, true);

        this.patternToolService.setToolSize?.(canvasImageData.width, canvasImageData.height);

        this.valuesService.update();
        this.previewService.update();

        return this;
    };

    bindCanvas = (canvas: HTMLCanvasElement, width: number, height: number): PatternService => {
        canvas.width = width;
        canvas.height = height;
        this.canvasService.setCanvas(canvas);
        this.patternToolService.bindCanvas();

        return this;
    };

    bindMaskCanvas = (canvas: HTMLCanvasElement, width: number, height: number): PatternService => {
        canvas.width = width;
        canvas.height = height;
        this.maskService.setCanvas(canvas);
        this.patternToolService.bindMaskCanvas();

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
