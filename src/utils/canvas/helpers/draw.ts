import {HelperCanvas} from "./base";

export type DrawMaskedDrawFunction = (helperCanvas: HelperCanvas) => void;
export type DrawMask = ImageData | CanvasImageSource;

export const drawMasked = (
    mask: DrawMask,
    draw: DrawMaskedDrawFunction,
) => (helperCanvas: HelperCanvas): HelperCanvas => {

    const {context} = helperCanvas;

    if (mask) {
        if (mask instanceof ImageData) {
            context.putImageData(mask, 0, 0);
        } else {
            context.drawImage(mask, 0, 0);
        }
        context.globalCompositeOperation = "source-in";
    }

    draw(helperCanvas);

    return helperCanvas;
};
export const drawWithRotation = (
    angle: number,
    x: number, y: number,
    draw: DrawMaskedDrawFunction,
) => (helperCanvas: HelperCanvas): HelperCanvas => {

    helperCanvas.context.translate(x, y);
    helperCanvas.context.rotate(Math.PI * angle / 180);

    draw(helperCanvas);

    helperCanvas.context.rotate(-Math.PI * angle / 180);
    helperCanvas.context.translate(-x, -y);

    return helperCanvas;
};
export const drawMaskedWithRotation = (
    mask: DrawMask,
    angle: number,
    x: number, y: number,
    draw: DrawMaskedDrawFunction,
) => (helperCanvas: HelperCanvas): HelperCanvas => {
    drawMasked(
        mask,
        drawWithRotation(angle, x, y, draw)
    )(helperCanvas);

    return helperCanvas;
};


/**
 *  angle
 *  angle + xd yd
 *  xc yc
 *  angle + xc yc
 *  angle + xd yd + xc yc
 * */
export const drawWithRotationAndOffset = (
    angleB: number,
    angleD: number,
    xc: number, yc: number,
    xd: number, yd: number,
    x: number, y: number,
    draw: DrawMaskedDrawFunction,
) => (helperCanvas: HelperCanvas): HelperCanvas => {

    const {context} = helperCanvas;

    context.translate(x, y);

    context.rotate(-Math.PI * angleD / 180);
    context.translate(xd, yd);

    context.translate(xc, yc);
    context.rotate(Math.PI * angleB / 180);
    context.translate(-xc, -yc);

    draw(helperCanvas);

    context.resetTransform();

    return helperCanvas;
};
export const drawMaskedWithRotationAndOffset = (
    mask: DrawMask,
    angleB: number,
    angleD: number,
    xc: number, yc: number,
    xd: number, yd: number,
    x: number, y: number,
    draw: DrawMaskedDrawFunction,
) => (helperCanvas: HelperCanvas): HelperCanvas => {
    drawMasked(
        mask,
        drawWithRotationAndOffset(angleB, angleD, xc, yc, xd, yd, x, y, draw)
    )(helperCanvas);

    return helperCanvas;
};