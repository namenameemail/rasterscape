/* eslint-disable no-restricted-globals */
export const ctxNoise: Worker = self as any;

ctxNoise.onmessage = (ev) => {
    const {width, height, params} = ev.data;

    const N = 150;
    const {f, end, start} = params;

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');


    context.strokeStyle = "black";

    context.font = "28px";
    context.textBaseline = "hanging";
    context.fillStyle = 'lightgrey';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'black';

    for (let p = 0; p <= N; p++) {

        const x = (p / N) * width;

        const min = height * start;
        const max = height * end;
        const y = height - Math.random() * (max - min) - min;

        context.lineTo(x, y);
        context.lineTo(x + width / N, y);

    }
    context.stroke();

    ctxNoise.postMessage({
        imageData: context.getImageData(0, 0, width, height)
    });
};

export {};
