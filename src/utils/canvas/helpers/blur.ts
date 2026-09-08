import {createCanvas, HelperCanvas} from "./base";

const STACK_BLUR_RADIUS_TO_SIGMA = 0.5;

let scratch: HelperCanvas | null = null;

const getScratch = (width: number, height: number): HelperCanvas => {
    if (!scratch) {
        scratch = createCanvas(width, height);
    } else if (scratch.canvas.width !== width || scratch.canvas.height !== height) {
        scratch.canvas.width = width;
        scratch.canvas.height = height;
    } else {
        scratch.clear();
    }

    return scratch;
};

export const blurCanvasInPlace = (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    radius: number
): void => {
    const {width, height} = canvas;

    if (radius <= 0 || !width || !height) {
        return;
    }

    const target = getScratch(width, height);

    target.context.filter = `blur(${radius * STACK_BLUR_RADIUS_TO_SIGMA}px)`;
    target.context.drawImage(canvas, 0, 0);
    target.context.filter = 'none';

    context.clearRect(0, 0, width, height);
    context.drawImage(target.canvas, 0, 0);
};
