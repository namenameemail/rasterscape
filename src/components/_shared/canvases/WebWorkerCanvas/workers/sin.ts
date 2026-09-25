/* eslint-disable no-restricted-globals */
export const ctxSin: Worker = self as any;

ctxSin.onmessage = (ev) => {
    const {width, height, params} = ev.data;

    const N = 150;
    const {Tmax, Amax, a: A, t: T, o: O} = params;

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');


    context.strokeStyle = "black";

    context.font = "28px";
    context.textBaseline = "hanging";
    context.fillStyle = 'lightgrey';
    context.fillRect(0,0, width, height);
    context.fillStyle = 'black';


    context.beginPath();
    context.strokeStyle = "black";
    for (let p = 0; p <= N; p++) {

        const pn = p / N;
        const deg = (pn) * (2 * Math.PI) * Tmax / T;
        const x = (pn) * width;
        const y = Math.sin(deg + O * 2 * Math.PI) * A / Amax * height / 2 * (-1) + height / 2;

        context.lineTo(x, y);

    }
    context.stroke();

    context.closePath();

    ctxSin.postMessage({
        imageData: context.getImageData(0, 0, width, height)
    });
};

export {};
