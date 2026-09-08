import {PatternService} from "../PatternService";
import {resizeImageData} from "../../../../utils/canvas/helpers/imageData";
import {PatternBuffer} from "./PatternBuffer";

export class PatternCanvasService {
    patternService: PatternService

    buffer?: PatternBuffer;

    constructor(patternService: PatternService) {
        this.patternService = patternService;
    }

    get canvas(): HTMLCanvasElement | undefined {
        return this.buffer?.canvas;
    }

    get context(): CanvasRenderingContext2D | undefined {
        return this.buffer?.context;
    }

    get monitor(): HTMLCanvasElement | undefined {
        return this.buffer?.monitor;
    }

    ensureBuffer = (width: number, height: number): PatternBuffer => {
        if (!this.buffer) {
            this.buffer = new PatternBuffer(width, height);
        }

        return this.buffer;
    };

    present = (): PatternService => {
        this.buffer?.ensureGpu();
        this.buffer?.present();
        return this.patternService;
    };

    presentFromCpu = (): PatternService => {
        this.buffer?.markCpuChanged();
        return this.present();
    };

    setImageData = (imageData: ImageData, width?: boolean, height?: boolean): PatternService => {
        if (!imageData) {
            return this.patternService;
        }

        const buffer = this.ensureBuffer(imageData.width, imageData.height);

        if (width || height) {
            buffer.setSize(
                width ? imageData.width : buffer.width,
                height ? imageData.height : buffer.height
            );
        }

        buffer.writePixels(imageData);
        this.present();

        return this.patternService;
    };

    setCanvas = (monitor?: HTMLCanvasElement, width?: number, height?: number): PatternService => {
        if (monitor) {
            this.ensureBuffer(width ?? monitor.width, height ?? monitor.height);
        }

        this.buffer?.setMonitor(monitor);

        return this.patternService;
    };

    setSize = (width: number, height: number, noStretch?: boolean): PatternService => {
        const imageData = this.getImageData();

        return imageData
            ? this.setImageData(resizeImageData(imageData, width, height, noStretch), true, true)
            : this.patternService;
    };

    setWidth = (width: number, noStretch?: boolean): PatternService =>
        this.buffer
            ? this.setSize(width, this.buffer.height, noStretch)
            : this.patternService;

    setHeight = (height: number, noStretch?: boolean): PatternService =>
        this.buffer
            ? this.setSize(this.buffer.width, height, noStretch)
            : this.patternService;

    getImageData = (): ImageData | undefined => this.buffer?.readPixels();
}
