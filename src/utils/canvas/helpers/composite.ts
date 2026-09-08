import {HelperCanvas, createCanvas} from "./base";

export const ensureCanvas = (helper: HelperCanvas | undefined, width: number, height: number): HelperCanvas => {
    if (!helper) {
        return createCanvas(width, height);
    }

    if (helper.canvas.width !== width || helper.canvas.height !== height) {
        helper.canvas.width = width;
        helper.canvas.height = height;
    } else {
        helper.clear();
    }

    return helper;
};

export const compositeMasked = (
    dest: HelperCanvas,
    source: CanvasImageSource,
    mask?: CanvasImageSource | null,
    inverse?: boolean,
    dx = 0,
    dy = 0,
    dw?: number,
    dh?: number,
): void => {
    const {context, canvas} = dest;
    const width = dw ?? canvas.width;
    const height = dh ?? canvas.height;

    if (!mask) {
        context.drawImage(source, dx, dy, width, height);
        return;
    }

    if (inverse) {
        context.fillStyle = '#000';
        context.fillRect(dx, dy, width, height);
        context.globalCompositeOperation = 'destination-out';
        context.drawImage(mask, dx, dy, width, height);
    } else {
        context.drawImage(mask, dx, dy, width, height);
    }

    context.globalCompositeOperation = 'source-in';
    context.drawImage(source, dx, dy, width, height);
    context.globalCompositeOperation = 'source-over';
};
