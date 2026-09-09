import {PatternService} from "../PatternService";
import {performanceSettings} from "../../../../config/performanceSettings";
import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {HelperCanvas} from "../../../../utils/canvas/helpers/base";
import {compositeMasked, ensureCanvas} from "../../../../utils/canvas/helpers/composite";
import {getGlContext} from "../../../../gl/GlContext";

export class PatternValuesService {
    patternService: PatternService;

    masked?: HTMLCanvasElement;
    selected?: HTMLCanvasElement;

    private maskedBuffer?: HelperCanvas;
    private selectedBuffer?: HelperCanvas;
    private lastMaskedUpdateTime = 0;
    private lastSelectedUpdateTime = 0;

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

    ensureMaskedGpu = (): { texture: WebGLTexture, width: number, height: number } | null => {
        const buffer = this.patternService.canvasService.buffer;

        if (!buffer?.width || !buffer.height) {
            return null;
        }

        const source = buffer.ensureGpu();
        const maskService = this.patternService.maskService;

        if (!maskService.isMaskEnabled) {
            return {texture: source, width: buffer.width, height: buffer.height};
        }

        const maskBuffer = maskService.buffer;

        if (!maskBuffer) {
            return {texture: source, width: buffer.width, height: buffer.height};
        }

        const mask = maskBuffer.ensureGpu();
        const texture = getGlContext().compositeMasked(
            source,
            mask,
            buffer.width,
            buffer.height,
            !!maskService.isMaskInverted,
            buffer.textureFromCanvas !== maskBuffer.textureFromCanvas,
        );

        return {texture, width: buffer.width, height: buffer.height};
    };

    ensureSelectedGpu = (): { texture: WebGLTexture, width: number, height: number } | null => {
        const buffer = this.patternService.canvasService.buffer;
        const maskCanvas = this.patternService.selectionService.maskCanvas;

        if (!buffer?.width || !buffer.height || !maskCanvas) {
            return null;
        }

        const source = buffer.ensureGpu();
        const glc = getGlContext();
        const mask = glc.uploadCanvasSized(maskCanvas);
        const texture = glc.compositeMasked(
            source,
            mask,
            buffer.width,
            buffer.height,
            false,
            !buffer.textureFromCanvas,
        );

        return {texture, width: buffer.width, height: buffer.height};
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
