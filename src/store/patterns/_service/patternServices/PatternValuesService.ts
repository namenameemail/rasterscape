import {createMaskedImageFromImageData, imageDataToCanvas} from "../../../../utils/canvas/helpers/imageData";
import {PatternService} from "../PatternService";
import {performanceSettings} from "../../../../config/performanceSettings";

export class PatternValuesService {
    patternService: PatternService;

    masked?: HTMLCanvasElement;
    selected?: HTMLCanvasElement;

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
        const canvas = this.patternService.canvasService.canvas;

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
        if (!this.patternService.selectionService.mask) {
            this.selected = null;
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
        this.updateMaskedIfNeeded();

        if (this.patternService.selectionService.mask) {
            this.updateSelectedIfNeeded();
        }

        return this.patternService;
    };

    updateMasked = (): PatternService => {
        if (this.patternService.maskService.isMaskEnabled) {
            this.masked = createMaskedImageFromImageData(
                this.patternService.canvasService.getImageData(),
                this.patternService.maskService.getImageData(),
                this.patternService.maskService.isMaskInverted
            );
        } else {
            this.masked = imageDataToCanvas(this.patternService.canvasService.getImageData());
        }

        return this.patternService;
    };

    updateSelected = (): PatternService => {
        this.selected = this.patternService.selectionService.mask
            ? createMaskedImageFromImageData(
                this.patternService.canvasService.getImageData(),
                this.patternService.selectionService.mask
            )
            : null;

        return this.patternService;
    };

    clearSelected = () => {
        this.selected = null;
    };

    private isThrottleDue = (lastTime: number): boolean => {
        const {throttleEnabled, throttleDelayMs} = performanceSettings.valuesService;

        if (!throttleEnabled) {
            return true;
        }

        return performance.now() - lastTime >= throttleDelayMs;
    };
}
