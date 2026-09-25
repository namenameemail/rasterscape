import {PatternService} from "../PatternService";
import {getGlContext} from "../../../../gl/GlContext";
import {profileLogger} from "../../../../utils/profiling/ProfileLogger";

export enum PreviewCanvasType {
    Channel = "channel",
    Select = "select"
}
export interface PreviewCanvasItem {
    id: string
    canvas: HTMLCanvasElement,
    type: PreviewCanvasType
}

export class PatternPreviewService {
    patternService: PatternService;

    canvases: PreviewCanvasItem[] = [];
    imageData: ImageData;

    constructor(patternService: PatternService) {
        this.patternService = patternService;
    }

    bindCanvas = (id: string, canvas: HTMLCanvasElement, type: PreviewCanvasType) => {
        const newPreviewItem = {
            id,
            canvas,
            type
        };
        this.canvases.filter(item => item.id !== id);
        this.canvases.push(newPreviewItem);

        this.putImage(newPreviewItem);
    };

    unbindAll = () => {
        this.canvases = [];
    };

    unbindCanvas = (id: string) => {
        this.canvases.filter(item => item.id !== id);
    };

    update = () => {
        this.canvases.forEach(this.putImage);
    }
    
    isAutoUpdateEnabled: number = 0;
    autoUpdateInterval?: ReturnType<typeof setInterval>;
    autoUpdate = (enabled: boolean) => {
        this.isAutoUpdateEnabled = this.isAutoUpdateEnabled + (enabled ? 1 : -1);

        if (this.isAutoUpdateEnabled) {
            if (!this.autoUpdateInterval) {
                this.autoUpdateInterval = setInterval(this.update, 400);
            }
        } else {
            if (this.autoUpdateInterval) {
                clearInterval(this.autoUpdateInterval);
            }
        }
    }

    putImage = (previewItem: PreviewCanvasItem) => {
        const buffer = this.patternService.canvasService.buffer;
        if (!buffer?.width || !buffer.height) return;

        const {canvas} = previewItem;
        if (!canvas.width || !canvas.height) return;

        profileLogger.time('canvas.preview', () => {
            const maskService = this.patternService.maskService;
            const maskEnabled = !!maskService.isMaskEnabled;

            if (maskEnabled) {
                const masked = this.patternService.valuesService.ensureMaskedGpu();
                if (masked) {
                    getGlContext().drawPreviewToCanvas(
                        canvas,
                        masked.texture,
                        masked.width,
                        masked.height,
                        !masked.stampFlipY,
                    );
                    return;
                }
            }

            const source = buffer.ensureGpu();
            getGlContext().drawPreviewToCanvas(
                canvas,
                source,
                buffer.width,
                buffer.height,
                false,
            );
        });
    };
}
