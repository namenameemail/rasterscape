import {coordHelper} from "../../../components/Area/canvasPosition.servise";

export const xyParaboloid = (centerX, centerY, kx, ky) => (x, y) =>
    Math.pow(x - centerX, 2) * kx
    + Math.pow(y - centerY, 2) * ky;

    
export const xySq = (a, b, c) => (x, y) => (Math.sin(x / a) * Math.cos(y / b) * c);

export const xySis2 = ({cosA, h, xN, yN, xD, yD, XA, xdd, ydd}) =>
    (x, y) => {

        const W = 300;
        const H = 300;

        const xx = x * W;
        const yy = y * H;

        const xxmW2pxdd = xx - W / 2 + xdd;
        const yymH2pydd = yy - H / 2 + ydd;

        const r = (XA * Math.sqrt(Math.pow(xxmW2pxdd, 2) + Math.pow(yymH2pydd, 2))
            + h
            + cosA * Math.cos(
                Math.sqrt(
                    Math.pow(xxmW2pxdd + xx * (xN / xD - 1), 2)
                    + Math.pow(yymH2pydd + yy * (yN / yD - 1), 2)
                )
            )) / W;


        // coordHelper.writeln(r);

        return r;
    };