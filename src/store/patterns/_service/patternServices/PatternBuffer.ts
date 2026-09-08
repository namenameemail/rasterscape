import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {blurCanvasInPlace} from "../../../../utils/canvas/helpers/blur";

export class PatternBuffer {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;

    monitor?: HTMLCanvasElement;
    private monitorContext?: CanvasRenderingContext2D;

    constructor(width: number, height: number) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    get width(): number {
        return this.canvas.width;
    }

    get height(): number {
        return this.canvas.height;
    }

    setSize = (width: number, height: number): void => {
        this.canvas.width = width;
        this.canvas.height = height;
        this.syncMonitorSize();
    };

    readPixels = (): ImageData =>
        this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    writePixels = (imageData: ImageData): void => {
        this.context.putImageData(imageData, 0, 0);
    };

    blur = (radius: number): void => {
        blurCanvasInPlace(this.canvas, this.context, radius);
    };

    setMonitor = (monitor?: HTMLCanvasElement): void => {
        this.monitor = monitor;
        this.monitorContext = monitor?.getContext('2d') as CanvasRenderingContext2D;
        this.syncMonitorSize();
        this.present();
    };

    present = (): void => {
        const {monitor, monitorContext} = this;

        if (!monitor || !monitorContext) {
            return;
        }

        profileLogger.time('canvas.present', () => {
            monitorContext.clearRect(0, 0, monitor.width, monitor.height);
            monitorContext.drawImage(this.canvas, 0, 0);
        });
    };

    private syncMonitorSize = (): void => {
        if (!this.monitor) {
            return;
        }

        if (this.monitor.width !== this.canvas.width) {
            this.monitor.width = this.canvas.width;
        }
        if (this.monitor.height !== this.canvas.height) {
            this.monitor.height = this.canvas.height;
        }
    };
}
