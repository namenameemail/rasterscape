import {imageDataToCanvas} from './canvas/helpers/imageData';

export function drawPatternPreview(
    canvas: HTMLCanvasElement,
    imageData: ImageData | null | undefined,
): void {
    const context = canvas.getContext('2d');

    if (!context) {
        return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!imageData) {
        return;
    }

    const ratio = imageData.width / imageData.height;
    const width = canvas.width * (ratio <= 1 ? ratio : 1);
    const height = canvas.height * (ratio > 1 ? 1 / ratio : 1);
    const x = ratio <= 1 ? (canvas.width - width) / 2 : 0;
    const y = ratio > 1 ? (canvas.height - height) / 2 : 0;

    context.drawImage(imageDataToCanvas(imageData), x, y, width, height);
}
