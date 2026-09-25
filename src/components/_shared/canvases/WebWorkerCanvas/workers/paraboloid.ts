/* eslint-disable no-restricted-globals */
import {xyParaboloid} from "../../../../../store/changeFunctions/functions/_helpers";
import * as Color from "color";

export const ctxParaboloid: Worker = self as any;

ctxParaboloid.onmessage = (ev) => {
    const {imageData, width, height, params} = ev.data;

    const {zd, end, x, y, xa, ya} = params;

    const WW = 1;
    const HH = 1;



    const f = xyParaboloid(WW/2, HH/2, x, y);

    for (let i = 0; i < imageData.data.length; i += 4) {

        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);

        const xnorm = x / width * WW;
        const ynorm = y / height * HH;
        const znorm = f(xnorm, ynorm) + zd;

        const colorTo = 350;
        const colorFrom = colorTo - 100;


        const color = Color.hsl(Math.max(Math.min(colorTo- znorm * (colorTo - colorFrom), colorTo), colorFrom), 50, 50);


        const rgb = color.rgb().array();


        imageData.data[i] = rgb[0];
        imageData.data[i + 1] = rgb[1];
        imageData.data[i + 2] = rgb[2];
        imageData.data[i + 3] = 255;
    }

    ctxParaboloid.postMessage({
        imageData
    });
};

export {};
