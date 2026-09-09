import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {blurCanvasInPlace} from "../../../../utils/canvas/helpers/blur";
import {getGlContext} from "../../../../gl/GlContext";
import {StampDrawParams} from "../../../../gl/stampMat";

export class PatternBuffer {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    texture: WebGLTexture | null = null;

    monitor?: HTMLCanvasElement;
    private monitorContext?: CanvasRenderingContext2D;
    private gpuInSync = false;
    private cpuInSync = true;
    private gpuFromCanvas = true;
    private texW = 0;
    private texH = 0;

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

    get textureFromCanvas(): boolean {
        return this.gpuFromCanvas;
    }

    get isGpuAhead(): boolean {
        return this.gpuInSync && !this.cpuInSync && !!this.texture;
    }

    markCpuChanged = (): void => {
        this.gpuInSync = false;
        this.cpuInSync = true;
    };

    setSize = (width: number, height: number): void => {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gpuInSync = false;
        this.cpuInSync = true;
        this.syncMonitorSize();
    };

    readPixels = (): ImageData => {
        this.ensureCpu();
        return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    };

    writePixels = (imageData: ImageData): void => {
        this.context.putImageData(imageData, 0, 0);
        this.gpuInSync = false;
        this.cpuInSync = true;
    };

    blur = (radius: number): void => {
        this.ensureCpu();
        blurCanvasInPlace(this.canvas, this.context, radius);
        this.gpuInSync = false;
        this.cpuInSync = true;
    };

    private ensureTexture = (): WebGLTexture => {
        const glc = getGlContext();
        const {width, height} = this.canvas;

        if (!this.texture) {
            this.texture = glc.createTexture2D(width, height);
            this.texW = width;
            this.texH = height;
            this.gpuInSync = false;
        } else if (this.texW !== width || this.texH !== height) {
            glc.resizeTexture2D(this.texture, width, height);
            this.texW = width;
            this.texH = height;
            this.gpuInSync = false;
        }

        return this.texture;
    };

    ensureGpu = (): WebGLTexture => {
        const texture = this.ensureTexture();

        if (!this.gpuInSync) {
            this.ensureCpu();
            profileLogger.time('canvas.uploadGpu', () => {
                getGlContext().uploadCanvas(this.canvas, texture);
            });
            this.gpuInSync = true;
            this.gpuFromCanvas = true;
        }

        return texture;
    };

    ensureCpu = (): void => {
        if (this.cpuInSync || !this.gpuInSync || !this.texture) {
            return;
        }

        const {width, height} = this.canvas;
        const glc = getGlContext();

        profileLogger.time('canvas.downloadGpu', () => {
            glc.blitToDefault(this.texture as WebGLTexture, width, height, this.gpuFromCanvas);
            this.context.clearRect(0, 0, width, height);
            this.context.drawImage(glc.canvas, 0, 0);
        });
        this.cpuInSync = true;
    };

    captureFramebuffer = (): void => {
        const glc = getGlContext();
        const texture = this.ensureTexture();
        glc.copyFramebufferToTexture(texture, this.canvas.width, this.canvas.height);
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuFromCanvas = false;
    };

    compositeFramebuffer = (): void => {
        const glc = getGlContext();
        const dest = this.ensureGpu();
        glc.compositeDefaultOver(dest, this.canvas.width, this.canvas.height, this.gpuFromCanvas);
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuFromCanvas = false;
    };

    compositeVideo = (video: WebGLTexture): void => {
        const dest = this.ensureGpu();
        getGlContext().compositeTextureOver(
            video,
            dest,
            this.canvas.width,
            this.canvas.height,
            this.gpuFromCanvas,
        );
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuFromCanvas = false;
    };

    stampGpu = (
        source: WebGLTexture,
        sourceFlipY: boolean,
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
    ): void => {
        const dest = this.ensureGpu();
        profileLogger.time('canvas.stampGpu', () => {
            getGlContext().stampTextures(
                dest,
                this.canvas.width,
                this.canvas.height,
                source,
                sourceFlipY,
                stamps,
                opacity,
                clipMask,
            );
        });
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuFromCanvas = false;
    };

    compositeLayerGpu = (
        layer: HTMLCanvasElement,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
    ): void => {
        const dest = this.ensureGpu();
        profileLogger.time('canvas.compositeLayerGpu', () => {
            getGlContext().compositeCanvasOver(
                dest,
                this.canvas.width,
                this.canvas.height,
                this.gpuFromCanvas,
                layer,
                opacity,
                clipMask,
            );
        });
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuFromCanvas = false;
    };

    setMonitor = (monitor?: HTMLCanvasElement): void => {
        this.monitor = monitor;
        this.monitorContext = monitor?.getContext('2d') as CanvasRenderingContext2D;
        this.syncMonitorSize();
        this.present();
    };

    presentGl = (): void => {
        const {monitor, monitorContext, texture} = this;

        if (!monitor || !monitorContext) {
            return;
        }

        if (texture) {
            getGlContext().blitToDefault(texture, this.canvas.width, this.canvas.height, this.gpuFromCanvas);
        }

        profileLogger.time('canvas.present', () => {
            monitorContext.clearRect(0, 0, monitor.width, monitor.height);
            monitorContext.drawImage(getGlContext().canvas, 0, 0);
        });
    };

    present = (): void => {
        const {monitor, monitorContext} = this;

        if (!monitor || !monitorContext) {
            return;
        }

        if (!this.cpuInSync && this.gpuInSync && this.texture) {
            const glc = getGlContext();
            glc.blitToDefault(this.texture, this.canvas.width, this.canvas.height, this.gpuFromCanvas);
            this.presentGl();
            return;
        }

        this.ensureCpu();

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
