import {PatternService} from "../PatternService";
import {performanceSettings} from "../../../../config/performanceSettings";
import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {HelperCanvas} from "../../../../utils/canvas/helpers/base";
import {compositeMasked, ensureCanvas} from "../../../../utils/canvas/helpers/composite";
import {copyTexture2D} from "../../../../gl/draw";
import {getGlContext} from "../../../../gl/GlContext";

export class PatternValuesService {
    patternService: PatternService;

    masked?: HTMLCanvasElement;
    selected?: HTMLCanvasElement;

    private maskedBuffer?: HelperCanvas;
    private selectedBuffer?: HelperCanvas;
    private lastMaskedUpdateTime = 0;
    private lastSelectedUpdateTime = 0;
    private selectedGpuTex: WebGLTexture | null = null;
    private selectedGpuW = 0;
    private selectedGpuH = 0;
    private selectedGpuMaskSerial = -1;
    private selectedGpuContentSerial = -1;

    constructor(patternService: PatternService) {
        this.patternService = patternService;
    }

    update = (): PatternService => {
        this.updateMasked();
        this.updateSelected();

        return this.patternService;
    };

    syncMaskedReference = (): PatternService => {
        const buffer = this.patternService.canvasService.buffer;
        buffer?.ensureCpu();
        const canvas = buffer?.canvas;

        if (canvas) {
            this.masked = canvas;
        }

        return this.patternService;
    };

    updateMaskedIfNeeded = (force = false): PatternService => {
        const maskEnabled = this.patternService.maskService.isMaskEnabled;

        if (!maskEnabled) {
            return this.syncMaskedReference();
        }

        if (!force && !this.isThrottleDue(this.lastMaskedUpdateTime)) {
            return this.patternService;
        }

        this.updateMasked();
        this.lastMaskedUpdateTime = performance.now();

        return this.patternService;
    };

    updateSelectedIfNeeded = (force = false): PatternService => {
        if (!this.patternService.selectionService.maskCanvas) {
            this.selected = undefined;
            return this.patternService;
        }

        if (!force && !this.isThrottleDue(this.lastSelectedUpdateTime)) {
            return this.patternService;
        }

        this.updateSelected();
        this.lastSelectedUpdateTime = performance.now();

        return this.patternService;
    };

    updateForVideoFrame = (): PatternService => {
        if (this.patternService.selectionService.maskCanvas) {
            this.updateSelectedIfNeeded();
        }

        return this.patternService;
    };

    ensureMaskedGpu = (): { texture: WebGLTexture, width: number, height: number, stampFlipY: boolean, premul: boolean } | null => {
        const buffer = this.patternService.canvasService.buffer;

        if (!buffer?.width || !buffer.height) {
            return null;
        }

        const source = buffer.ensureGpu();
        const maskService = this.patternService.maskService;

        if (!maskService.isMaskEnabled) {
            return {
                texture: source,
                width: buffer.width,
                height: buffer.height,
                stampFlipY: !buffer.textureFromCanvas,
                premul: !buffer.textureFromCanvas,
            };
        }

        const maskBuffer = maskService.buffer;

        if (!maskBuffer) {
            return {
                texture: source,
                width: buffer.width,
                height: buffer.height,
                stampFlipY: !buffer.textureFromCanvas,
                premul: !buffer.textureFromCanvas,
            };
        }

        const mask = maskBuffer.ensureGpu();
        const texture = getGlContext().compositeMasked(
            source,
            mask,
            buffer.width,
            buffer.height,
            !!maskService.isMaskInverted,
            buffer.textureFromCanvas !== maskBuffer.textureFromCanvas,
            buffer.textureFromCanvas,
        );

        return {texture, width: buffer.width, height: buffer.height, stampFlipY: true, premul: false};
    };

    ensureSelectedGpu = (): { texture: WebGLTexture, width: number, height: number, stampFlipY: boolean } | null => {
        const buffer = this.patternService.canvasService.buffer;
        const maskCanvas = this.patternService.selectionService.maskCanvas;

        if (!buffer?.width || !buffer.height || !maskCanvas) {
            return null;
        }

        const source = buffer.ensureGpu();
        const maskSerial = this.patternService.selectionService.maskSerial;
        const contentSerial = buffer.contentSerial;
        const {width, height} = buffer;

        if (
            this.selectedGpuTex
            && this.selectedGpuMaskSerial === maskSerial
            && this.selectedGpuContentSerial === contentSerial
            && this.selectedGpuW === width
            && this.selectedGpuH === height
        ) {
            return {texture: this.selectedGpuTex, width, height, stampFlipY: true};
        }

        const glc = getGlContext();
        const mask = glc.selectionMaskTexture(maskCanvas, maskSerial);
        const composited = glc.compositeMasked(
            source,
            mask,
            width,
            height,
            false,
            !buffer.textureFromCanvas,
            buffer.textureFromCanvas,
        );

        if (!this.selectedGpuTex || this.selectedGpuW !== width || this.selectedGpuH !== height) {
            if (this.selectedGpuTex) {
                glc.gl.deleteTexture(this.selectedGpuTex);
            }
            this.selectedGpuTex = glc.createTexture2D(width, height);
            this.selectedGpuW = width;
            this.selectedGpuH = height;
        }

        copyTexture2D(glc, composited, this.selectedGpuTex, width, height);
        this.selectedGpuMaskSerial = maskSerial;
        this.selectedGpuContentSerial = contentSerial;

        return {texture: this.selectedGpuTex, width, height, stampFlipY: true};
    };

    updateMasked = (): PatternService => {
        profileLogger.time('values.updateMasked', () => {
            const source = this.patternService.canvasService.canvas;

            if (!source) {
                return;
            }

            if (!this.patternService.maskService.isMaskEnabled) {
                this.masked = source;
                return;
            }

            const mask = this.patternService.maskService.canvas;

            if (!mask) {
                this.masked = source;
                return;
            }

            this.maskedBuffer = ensureCanvas(this.maskedBuffer, source.width, source.height);
            compositeMasked(
                this.maskedBuffer,
                source,
                mask,
                this.patternService.maskService.isMaskInverted,
            );
            this.masked = this.maskedBuffer.canvas;
        });

        return this.patternService;
    };

    updateSelected = (): PatternService => {
        profileLogger.time('values.updateSelected', () => {
            const source = this.patternService.canvasService.canvas;
            const mask = this.patternService.selectionService.maskCanvas;

            if (!source || !mask) {
                this.selected = undefined;
                return;
            }

            this.selectedBuffer = ensureCanvas(this.selectedBuffer, source.width, source.height);
            compositeMasked(this.selectedBuffer, source, mask);
            this.selected = this.selectedBuffer.canvas;
        });

        return this.patternService;
    };

    clearSelected = () => {
        this.selected = undefined;
    };

    private isThrottleDue = (lastTime: number): boolean => {
        const {throttleEnabled, throttleDelayMs} = performanceSettings.valuesService;

        if (!throttleEnabled) {
            return true;
        }

        return performance.now() - lastTime >= throttleDelayMs;
    };
}
