import {PatternService} from "../PatternService";
import {performanceSettings} from "../../../../config/performanceSettings";
import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {HelperCanvas} from "../../../../utils/canvas/helpers/base";
import {compositeMasked, ensureCanvas} from "../../../../utils/canvas/helpers/composite";
import {copyTexture2D} from "../../../../gl/draw";
import {getGlContext} from "../../../../gl/GlContext";
import {PatternBuffer} from "./PatternBuffer";

export class PatternValuesService {
    patternService: PatternService;

    masked?: HTMLCanvasElement;
    selected?: HTMLCanvasElement;

    private maskedBuffer?: HelperCanvas;
    private selectedBuffer?: HelperCanvas;
    private lastMaskedUpdateTime = 0;
    private lastSelectedUpdateTime = 0;
    private maskedContentSerial = -1;
    private maskedMaskSerial = -1;
    private maskedInverted = false;
    private selectedContentSerial = -1;
    private selectedMaskSerial = -1;
    private selectedSourceKey = '';
    private selectedGpuTex: WebGLTexture | null = null;
    private selectedGpuW = 0;
    private selectedGpuH = 0;
    private selectedGpuMaskSerial = -1;
    private selectedGpuContentSerial = -1;
    private selectedGpuSourceKey = '';

    constructor(patternService: PatternService) {
        this.patternService = patternService;
    }

    update = (): PatternService => {
        this.updateMasked();
        this.updateSelected();

        return this.patternService;
    };

    syncMaskedReference = (): PatternService => {
        const canvas = this.patternService.canvasService.buffer?.canvas;

        if (canvas) {
            this.masked = canvas;
        }

        return this.patternService;
    };

    updateMaskedIfNeeded = (force = false): PatternService => {
        const maskEnabled = this.patternService.maskService.isMaskEnabled;

        if (!maskEnabled) {
            if (force) {
                this.patternService.canvasService.buffer?.ensureCpu();
            }
            return this.syncMaskedReference();
        }

        if (!force && !this.isThrottleDue(this.lastMaskedUpdateTime)) {
            return this.patternService;
        }

        this.updateMasked();
        this.lastMaskedUpdateTime = performance.now();

        return this.patternService;
    };

    updateSelectedIfNeeded = (force = false, sourceBuffer?: PatternBuffer | null): PatternService => {
        if (!this.patternService.selectionService.maskCanvas) {
            this.selected = undefined;
            this.selectedContentSerial = -1;
            this.selectedMaskSerial = -1;
            this.selectedSourceKey = '';
            return this.patternService;
        }

        if (!force && !this.isThrottleDue(this.lastSelectedUpdateTime)) {
            return this.patternService;
        }

        this.updateSelected(sourceBuffer);
        this.lastSelectedUpdateTime = performance.now();

        return this.patternService;
    };

    updateForVideoFrame = (): PatternService => {
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
                stampFlipY: buffer.stampFlipY,
                premul: buffer.texturePremul,
            };
        }

        const maskBuffer = maskService.buffer;

        if (!maskBuffer) {
            return {
                texture: source,
                width: buffer.width,
                height: buffer.height,
                stampFlipY: buffer.stampFlipY,
                premul: buffer.texturePremul,
            };
        }

        const mask = maskBuffer.ensureGpu();
        const texture = getGlContext().compositeMasked(
            source,
            mask,
            buffer.width,
            buffer.height,
            !!maskService.isMaskInverted,
            false,
            false,
        );

        return {texture, width: buffer.width, height: buffer.height, stampFlipY: true, premul: false};
    };

    ensureSelectedGpu = (
        sourceBuffer?: PatternBuffer | null,
    ): { texture: WebGLTexture, width: number, height: number, stampFlipY: boolean } | null => {
        const buffer = sourceBuffer ?? this.patternService.canvasService.buffer;
        const maskCanvas = this.patternService.selectionService.maskCanvas;
        const sourceKey = buffer === this.patternService.maskService.buffer ? 'mask' : 'canvas';

        if (!buffer?.width || !buffer.height || !maskCanvas) {
            return null;
        }

        const source = buffer.ensureGpu();
        const maskSerial = this.patternService.selectionService.maskSerial;
        const contentSerial = buffer.contentSerial;
        const {width, height} = buffer;

        if (
            this.selectedGpuTex
            && this.selectedGpuSourceKey === sourceKey
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
            false,
            false,
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
        this.selectedGpuSourceKey = sourceKey;
        this.selectedGpuMaskSerial = maskSerial;
        this.selectedGpuContentSerial = contentSerial;

        return {texture: this.selectedGpuTex, width, height, stampFlipY: true};
    };

    updateMasked = (): PatternService => {
        profileLogger.time('values.updateMasked', () => {
            const buffer = this.patternService.canvasService.buffer;

            if (!buffer?.canvas) {
                return;
            }

            const maskService = this.patternService.maskService;

            if (!maskService.isMaskEnabled) {
                this.masked = buffer.canvas;
                this.maskedContentSerial = buffer.contentSerial;
                this.maskedMaskSerial = -1;
                return;
            }

            const maskBuffer = maskService.buffer;

            if (!maskBuffer?.canvas) {
                this.masked = buffer.canvas;
                this.maskedContentSerial = buffer.contentSerial;
                this.maskedMaskSerial = -1;
                return;
            }

            const inverted = !!maskService.isMaskInverted;
            const maskSerial = maskBuffer.contentSerial;

            if (
                this.masked
                && this.maskedContentSerial === buffer.contentSerial
                && this.maskedMaskSerial === maskSerial
                && this.maskedInverted === inverted
            ) {
                return;
            }

            buffer.ensureCpu();
            maskBuffer.ensureCpu();

            this.maskedBuffer = ensureCanvas(this.maskedBuffer, buffer.canvas.width, buffer.canvas.height);
            compositeMasked(
                this.maskedBuffer,
                buffer.canvas,
                maskBuffer.canvas,
                inverted,
            );
            this.masked = this.maskedBuffer.canvas;
            this.maskedContentSerial = buffer.contentSerial;
            this.maskedMaskSerial = maskSerial;
            this.maskedInverted = inverted;
        });

        return this.patternService;
    };

    updateSelected = (sourceBuffer?: PatternBuffer | null): PatternService => {
        profileLogger.time('values.updateSelected', () => {
            const buffer = sourceBuffer ?? this.patternService.canvasService.buffer;
            const mask = this.patternService.selectionService.maskCanvas;
            const maskSerial = this.patternService.selectionService.maskSerial;
            const sourceKey = buffer === this.patternService.maskService.buffer ? 'mask' : 'canvas';

            if (!buffer?.canvas || !mask) {
                this.selected = undefined;
                this.selectedContentSerial = -1;
                this.selectedMaskSerial = -1;
                this.selectedSourceKey = '';
                return;
            }

            if (
                this.selected
                && this.selectedSourceKey === sourceKey
                && this.selectedContentSerial === buffer.contentSerial
                && this.selectedMaskSerial === maskSerial
            ) {
                return;
            }

            buffer.ensureCpu();

            this.selectedBuffer = ensureCanvas(this.selectedBuffer, buffer.canvas.width, buffer.canvas.height);
            compositeMasked(this.selectedBuffer, buffer.canvas, mask);
            this.selected = this.selectedBuffer.canvas;
            this.selectedSourceKey = sourceKey;
            this.selectedContentSerial = buffer.contentSerial;
            this.selectedMaskSerial = maskSerial;
        });

        return this.patternService;
    };

    clearSelected = () => {
        this.selected = undefined;
        this.selectedContentSerial = -1;
        this.selectedMaskSerial = -1;
        this.selectedSourceKey = '';
    };

    private isThrottleDue = (lastTime: number): boolean => {
        const {throttleEnabled, throttleDelayMs} = performanceSettings.valuesService;

        if (!throttleEnabled) {
            return true;
        }

        return performance.now() - lastTime >= throttleDelayMs;
    };
}
