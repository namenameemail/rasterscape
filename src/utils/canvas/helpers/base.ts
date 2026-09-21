/**
 * очистить канвас
 */

export const clearCanvas = (canvas: HTMLCanvasElement): void =>
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
/**
 * создать вспомогательный канвас
 */

export type HelperCanvas = {
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    clear: Function
}
export const createHelperCanvas = (canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D): HelperCanvas => {
    context = context || canvas.getContext('2d', {willReadFrequently: true});

    const clear = () => context.clearRect(0, 0, canvas.width, canvas.height);

    return {
        canvas, context, clear
    }
};

export const createCanvas = (width: number, height: number): HelperCanvas => {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return createHelperCanvas(canvas);
};