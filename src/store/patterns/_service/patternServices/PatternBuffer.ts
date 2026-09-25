import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {blurCanvasInPlace} from "../../../../utils/canvas/helpers/blur";
import {getGlContext} from "../../../../gl/GlContext";
import {blendTextureOver} from "../../../../gl/blend";
import {blitTexture, copyTexture2D} from "../../../../gl/draw";
import {PatternFillSource, PatternStroke} from "../../../../gl/patternFill";
import {drawRepeatLayer, RepeatStamp} from "../../../../gl/repeatLayer";
import {drawStrokeLayer, StrokeDraw} from "../../../../gl/strokeDraw";
import {StampDrawParams} from "../../../../gl/stampMat";
import {ECompositeOperation} from "../../../compositeOperations";
import {profileDebug} from "../../../../utils/profileDebug";

export type RepeatCopy = {
    canvas: HTMLCanvasElement
    dx: number
    dy: number
    color: [number, number, number]
    originX: number
    originY: number
}

export class PatternBuffer {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    texture: WebGLTexture | null = null;

    monitor?: HTMLCanvasElement;
    private monitorContext?: CanvasRenderingContext2D;
    private gpuInSync = false;
    private cpuInSync = true;
    private gpuPremul = false;
    private texW = 0;
    private texH = 0;
    private imageSerial = 0;
    private repeatBase: WebGLTexture | null = null;
    private repeatReady = false;
    private repeatW = 0;
    private repeatH = 0;
    private repeatTex = new Map<HTMLCanvasElement, {tex: WebGLTexture, w: number, h: number}>();

    constructor(width: number, height: number) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
    }

    get width(): number {
        return this.canvas.width;
    }

    get height(): number {
        return this.canvas.height;
    }

    get textureFromCanvas(): boolean {
        return false;
    }

    get stampFlipY(): boolean {
        return true;
    }

    get texturePremul(): boolean {
        return this.gpuPremul;
    }

    get isGpuAhead(): boolean {
        return this.gpuInSync && !this.cpuInSync && !!this.texture;
    }

    get contentSerial(): number {
        return this.imageSerial;
    }

    private bumpContent = (): void => {
        this.imageSerial += 1;
    };

    private afterCpuWrite = (): void => {
        this.gpuInSync = false;
        this.cpuInSync = true;
        this.gpuPremul = false;
    };

    private afterGpuDraw = (bump = true): void => {
        this.gpuInSync = true;
        this.cpuInSync = false;
        this.gpuPremul = true;
        if (bump) this.bumpContent();
    };

    private afterGpuUpload = (): void => {
        this.gpuInSync = true;
        this.cpuInSync = true;
        this.gpuPremul = false;
        this.bumpContent();
    };

    private afterCpuDownload = (): void => {
        this.cpuInSync = true;
    };

    markGpuContent = (): void => {
        this.bumpContent();
    };

    markCpuChanged = (): void => {
        this.afterCpuWrite();
    };

    setSize = (width: number, height: number): void => {
        this.canvas.width = width;
        this.canvas.height = height;
        this.afterCpuWrite();
        this.syncMonitorSize();
    };

    readPixels = (): ImageData => {
        this.ensureCpu();
        return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    };

    writePixels = (imageData: ImageData): void => {
        this.context.putImageData(imageData, 0, 0);
        this.afterCpuWrite();
    };

    blur = (radius: number): void => {
        this.ensureCpu();
        blurCanvasInPlace(this.canvas, this.context, radius);
        this.afterCpuWrite();
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

    private normalizeUploadToGl = (texture: WebGLTexture): void => {
        const glc = getGlContext();
        const {width, height} = this.canvas;
        const scratch = glc.ensureScratch(width, height);
        blitTexture(glc, texture, scratch, width, height, true);
        copyTexture2D(glc, scratch, texture, width, height);
    };

    ensureGpu = (): WebGLTexture => {
        const texture = this.ensureTexture();

        if (!this.gpuInSync) {
            this.ensureCpu();
            profileLogger.time('canvas.uploadGpu', () => {
                getGlContext().uploadCanvas(this.canvas, texture);
                this.normalizeUploadToGl(texture);
            });
            this.afterGpuUpload();
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
            glc.blitToDefault(this.texture as WebGLTexture, width, height, false);
            this.context.clearRect(0, 0, width, height);
            this.context.drawImage(glc.canvas, 0, 0);
        });
        this.afterCpuDownload();
    };

    captureFramebuffer = (): void => {
        const glc = getGlContext();
        const texture = this.ensureTexture();
        glc.copyFramebufferToTexture(texture, this.canvas.width, this.canvas.height);
        this.afterGpuDraw();
    };

    compositeFramebuffer = (): void => {
        const glc = getGlContext();
        const dest = this.ensureGpu();
        glc.compositeDefaultOver(dest, this.canvas.width, this.canvas.height, false);
        this.afterGpuDraw();
    };

    compositeVideo = (video: WebGLTexture): void => {
        const dest = this.ensureGpu();
        getGlContext().compositeTextureOver(
            video,
            dest,
            this.canvas.width,
            this.canvas.height,
            false,
        );
        this.afterGpuDraw();
    };

    stampGpu = (
        source: WebGLTexture,
        sourceFlipY: boolean,
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
        sourcePremul = false,
    ): void => {
        const dest = this.ensureGpu();
        profileLogger.time('canvas.stampGpu', () => {
            getGlContext().stampTextures(
                dest,
                this.canvas.width,
                this.canvas.height,
                false,
                source,
                sourceFlipY,
                stamps,
                opacity,
                clipMask,
                compositeOperation,
                sourcePremul,
            );
        });
        this.afterGpuDraw(!!stamps.length);
    };

    stampCirclesGpu = (
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        if (!stamps.length) return;
        const dest = this.ensureGpu();
        profileLogger.time('canvas.stampCirclesGpu', () => {
            getGlContext().stampCircles(
                dest,
                this.canvas.width,
                this.canvas.height,
                false,
                stamps,
                opacity,
                clipMask,
                compositeOperation,
            );
        });
        this.afterGpuDraw();
    };

    compositeLayerGpu = (
        layer: HTMLCanvasElement,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        const dest = this.ensureGpu();
        profileLogger.time('canvas.compositeLayerGpu', () => {
            getGlContext().compositeCanvasOver(
                dest,
                this.canvas.width,
                this.canvas.height,
                false,
                layer,
                opacity,
                clipMask,
                compositeOperation,
            );
        });
        this.afterGpuDraw();
    };

    compositePatternStrokesGpu = (
        strokes: PatternStroke[],
        source: PatternFillSource,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        if (!strokes.length) {
            return;
        }
        const dest = this.ensureGpu();
        const {width, height} = this.canvas;
        const glc = getGlContext();
        profileLogger.time('canvas.compositePatternStroke', () => {
            if (this.repeatReady && this.repeatBase) {
                copyTexture2D(glc, this.repeatBase, dest, width, height);
            }
            glc.compositePatternStrokes(
                dest,
                width,
                height,
                false,
                strokes,
                source,
                opacity,
                clipMask,
                compositeOperation,
            );
        });
        this.afterGpuDraw();
    };

    beginRepeat = (): void => {
        const {width, height} = this.canvas;
        if (this.repeatReady && this.repeatBase && this.repeatW === width && this.repeatH === height) {
            profileDebug('canvas', 'beginRepeat.skip', {
                serial: this.imageSerial,
                w: width,
                h: height,
            });
            return;
        }
        const dest = this.ensureGpu();
        const glc = getGlContext();
        if (!this.repeatBase || this.repeatW !== width || this.repeatH !== height) {
            if (this.repeatBase) glc.gl.deleteTexture(this.repeatBase);
            this.repeatBase = glc.createTexture2D(width, height);
            this.repeatW = width;
            this.repeatH = height;
        }
        copyTexture2D(glc, dest, this.repeatBase, width, height);
        profileDebug('canvas', 'beginRepeat.capture', {serial: this.imageSerial, w: width, h: height});
        this.repeatReady = true;
    };

    endRepeat = (): void => {
        profileDebug('canvas', 'endRepeat', {
            serial: this.imageSerial,
            wasReady: this.repeatReady,
        });
        this.repeatReady = false;
        const gl = getGlContext().gl;
        for (const slot of this.repeatTex.values()) gl.deleteTexture(slot.tex);
        this.repeatTex.clear();
    };

    compositeStrokesGpu = (
        strokes: StrokeDraw[],
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        if (!this.repeatReady || !this.repeatBase) return;
        const dest = this.ensureGpu();
        const {width, height} = this.canvas;
        const glc = getGlContext();
        profileLogger.time('canvas.compositeStrokesGpu', () => {
            copyTexture2D(glc, this.repeatBase as WebGLTexture, dest, width, height);
            const layer = glc.ensureLayer(width, height);
            drawStrokeLayer(glc, layer, width, height, strokes, opacity, clipMask);
            blendTextureOver(glc, dest, layer, width, height, false, false, compositeOperation, 1, true);
        });
        this.afterGpuDraw();
    };

    compositeRepeatsGpu = (
        copies: RepeatCopy[],
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        compositeOperation: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        if (!this.repeatReady || !this.repeatBase) return;
        const dest = this.ensureGpu();
        const {width, height} = this.canvas;
        const glc = getGlContext();
        profileLogger.time('canvas.compositeRepeatsGpu', () => {
            copyTexture2D(glc, this.repeatBase as WebGLTexture, dest, width, height);
            const stamps: RepeatStamp[] = [];
            let uploaded: HTMLCanvasElement | null = null;
            for (const copy of copies) {
                let slot = this.repeatTex.get(copy.canvas);
                if (!slot || slot.w !== copy.canvas.width || slot.h !== copy.canvas.height) {
                    if (slot) glc.gl.deleteTexture(slot.tex);
                    slot = {
                        tex: glc.createTexture2D(copy.canvas.width, copy.canvas.height),
                        w: copy.canvas.width,
                        h: copy.canvas.height,
                    };
                    this.repeatTex.set(copy.canvas, slot);
                    uploaded = null;
                }
                if (uploaded !== copy.canvas) {
                    glc.uploadCanvas(copy.canvas, slot.tex);
                    uploaded = copy.canvas;
                }
                stamps.push({
                    tex: slot.tex,
                    stamp: {
                        x: copy.originX + copy.canvas.width / 2 + copy.dx,
                        y: copy.originY + copy.canvas.height / 2 + copy.dy,
                        angleB: 0,
                        angleD: 0,
                        xc: 0,
                        yc: 0,
                        xd: 0,
                        yd: 0,
                        width: copy.canvas.width,
                        height: copy.canvas.height,
                        color: copy.color,
                    },
                });
            }
            const layer = glc.ensureLayer(width, height);
            drawRepeatLayer(glc, layer, width, height, stamps, opacity, clipMask);
            blendTextureOver(glc, dest, layer, width, height, false, false, compositeOperation, 1, true);
        });
        this.afterGpuDraw();
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
            getGlContext().blitToDefault(texture, this.canvas.width, this.canvas.height, false);
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

        if (this.isGpuAhead) {
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
