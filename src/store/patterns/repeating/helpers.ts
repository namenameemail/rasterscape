
import Bezier from "bezier-js";
import {ERepeatsType, RepeatsBezierGridParams, RepeatsFlatGridParams, RepeatsParams, RepeatsValue} from "./types";
import {getFunctionState} from "../../../utils/patterns/function";
import {EToolType} from "../../tool/types";

export const getRepeatingState = getFunctionState<RepeatsValue, RepeatsParams>(
    {}, {
        type: ERepeatsType.FlatGrid,
        typeParams: {
            [ERepeatsType.BezierGrid]: {
                xd: 2,
                yd: 2,
                xn0: 0,
                yn0: 0,
                xn1: 0,
                yn1: 0,
                bezierPoints: [{x: 0, y: 0}, {x: 25, y: 25}, {x: 75, y: 75}, {x: 100, y: 100}],
                float: false,
            },
            [ERepeatsType.FlatGrid]: {
                xd: 2,
                yd: 2,
                xOut: 1,
                yOut: 1,
                float: false,
            }
        },
    });


export const getRepeatsParamsStatePathByType = (patternId: string, type: ERepeatsType) =>
    `patterns.${patternId}.repeating.params.typeParams.${type}`;

const canvasItemId = (i, j) => `${i}-${j}`;

export type RepeatingCoordinatesItem = {
    x: number
    y: number
    id?: string
    outer?: boolean
};

export interface GetRepeatsCoordsOptions {
    repeatsParams: RepeatsParams
    width: number
    height: number
    x: number
    y: number
    tool?: EToolType
}

export const getRepeatingCoords = (options: GetRepeatsCoordsOptions): RepeatingCoordinatesItem[] => {

    const {repeatsParams, width, height, x, y, tool} = options;

    if (!repeatsParams) {
        return [{
            x,
            y,
            id: canvasItemId(0, 0),
        }];
    }

    const {type, typeParams} = repeatsParams;

    return repeatsCoordsByType[type]?.(x, y, width, height, typeParams[type], tool)
        || [{x, y, id: canvasItemId(0, 0)}];
};

export const repeatsCoordsByType = {
    [ERepeatsType.BezierGrid]: (x: number, y: number, width: number, height: number, params: RepeatsBezierGridParams) => {
        const {xd: xn, yd: yn, bezierPoints, xn0, yn0, xn1, yn1} = params;

        const xd = width / xn;
        const yd = height / yn;


        const array = [];

        const curve = new Bezier(bezierPoints);

        let i, j;
        for (let inorm = 0; inorm < 1 + xn0 + xn1; inorm++) {
            i = inorm - xn0;

            const xnorm = (x + xd * i) / width;
            const ai = curve.get(xnorm);

            for (let jnorm = 0; jnorm < 1 + yn0 + yn1; jnorm++) {
                j = jnorm - yn0;

                const ynorm = (y + yd * j) / height;
                const aj = curve.get(ynorm);


                const xij = width * ai.x / 100;
                const yij = height * aj.y / 100;

                array.push({
                    x: xij,
                    y: yij,
                    id: canvasItemId(inorm, jnorm),
                    outer: i < 0 || i >= xn || j < 0 || j >= yn,
                });
            }
        }
        return array;
    },
    [ERepeatsType.FlatGrid]: (x: number, y: number, width: number, height: number, params: RepeatsFlatGridParams, tool: EToolType) => {
        const {xd: xn, yd: yn, xOut, yOut} = params;

        const xd = width / xn;
        const yd = height / yn;


        const array = [];

        // x = x % xd;
        // y = y % yd;

        let mxOut = xOut;
        let myOut = yOut;

        // if (tool !== EToolType.Line) {
        //
        //     x = (x + xd) % xd;
        //     y = (y + yd) % yd;
        //
        //     mxOut = Math.max(xOut, 2);
        //     myOut = Math.max(yOut, 2);
        // }

        for (let i = -mxOut; i < xn + mxOut; i++) {

            for (let j = -myOut; j < yn + myOut; j++) {


                const xi = x + xd * i;
                const yj = y + yd * j;
                array.push({
                    x: xi,
                    y: yj,
                    id: canvasItemId(i, j),
                    outer: i < 0 || i >= xn || j < 0 || j >= yn,
                });
            }
        }

        return array;
    },
};