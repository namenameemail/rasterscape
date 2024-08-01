import {PatternService} from "../PatternService";

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

    putImageByType = {
        [PreviewCanvasType.Select]: (previewItem: PreviewCanvasItem) => {

            const image = this.patternService.valuesService.masked;

            const { canvas } = previewItem;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            const ratio = image.width / image.height

            const width = canvas.width * (ratio <= 1 ? ratio : 1);
            const height = canvas.height * (ratio > 1 ? 1/ratio : 1);
            const x = ratio <= 1 ? (canvas.width - width)/2 : 0;
            const y = ratio > 1 ? (canvas.height - height)/2 : 0;
            context.drawImage(image, x, y, width, height)
        },
        [PreviewCanvasType.Channel]: (previewItem: PreviewCanvasItem) => {
            const image = this.patternService.valuesService.masked;

            const { canvas } = previewItem;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            const ratio = image.width / image.height

            const width = canvas.width * (ratio <= 1 ? ratio : 1);
            const height = canvas.height * (ratio > 1 ? 1/ratio : 1);
            const x = ratio <= 1 ? (canvas.width - width)/2 : 0;
            const y = ratio > 1 ? (canvas.height - height)/2 : 0;
            context.drawImage(image, x, y, width, height)
        },
    };

    putImage = (previewItem: PreviewCanvasItem) => {
        this.putImageByType[previewItem.type](previewItem);
    };
}
