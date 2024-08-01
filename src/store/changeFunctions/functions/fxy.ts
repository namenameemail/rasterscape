import {xyParaboloid, xySis2, xySq} from "./_helpers";
import {coordHelper5} from "../../../components/Area/canvasPosition.servise";
import {patternsService} from "../../index";

export enum FxyType {
    Parab = 'parab',
    Sq = 'sq',
    Sis2 = 'sis2',
    Array = 'array',
}


export interface SqParams {
    a: number
    b: number
    c: number
    h: number
    end: number
}

export interface ParabParams {
    zd: number
    end: number
    x: number
    y: number
}

export interface Sis2Params {
    end: number
    cosA: number
    h: number
    xN: number
    yN: number
    xD: number
    yD: number
    XA: number
    xdd: number
    ydd: number

}

export enum FxyArrayType {
    X = 'x',
    Y = 'y',
}

export interface FxyArrayCoordinateParams {
    drawWidth: number
    drawHeight: number
    valuesArray: Int32Array
    from: number
    to: number
}

export interface FxyArrayParams {
    type: FxyArrayType
    typeParams: {
        [FxyArrayType.X]: FxyArrayCoordinateParams,
        [FxyArrayType.Y]: FxyArrayCoordinateParams,
    }
}

export type AnyFxyParams = ParabParams | Sis2Params | FxyArrayParams | SqParams;

export interface FxyParams {
    type: FxyType
    typeParams: {
        [key: string]: AnyFxyParams
    }
}

export const fxyInitialParams: FxyParams = {
    type: FxyType.Parab,
    typeParams: {
        [FxyType.Parab]: {
            zd: 0,
            end: 1,
            x: 1.5,
            y: 1.5,
        },
        [FxyType.Sq]: {
            a: 0.25,
            b: 0.25,
            c: .5,
            h: 0,
            end: 1,
        },
        [FxyType.Sis2]: {
            end: 1,
            XA: 1.6,
            h: 0,
            cosA: 0,
            xN: 1,
            xD: 1,
            yN: 1,
            yD: 1,
            xdd: 0,
            ydd: 0,
        },
        [FxyType.Array]: {
            type: FxyArrayType.X,
            typeParams: {
                [FxyArrayType.X]: {
                    drawWidth: 400,
                    drawHeight: 400,
                    valuesArray: new Int32Array(1000).fill(0),
                    from: 0,
                    to: 1,
                },
                [FxyArrayType.Y]: {
                    drawWidth: 400,
                    drawHeight: 400,
                    valuesArray: new Int32Array(1000).fill(0),
                    from: 0,
                    to: 1,
                },
            }
        },
    },

};

const fxyArrayFunctionByType: {
    [type: string]: ({startValue, range, params, pattern, position}) => number
} = {
    [FxyArrayType.X]: ({startValue, range, params, pattern, position}) => {

        const {valuesArray, from, to, drawWidth, drawHeight} = params as FxyArrayCoordinateParams;

        const width = patternsService.pattern[pattern.id].canvasService.canvas.width;

        const i = Math.max(Math.min(
            Math.floor(position.x / width * drawWidth),
            drawWidth - 1), 0);


        const coordinateValue = valuesArray[i] / drawHeight;

        const R = range[1] - range[0];

        const amplitude = Math.abs(to - from);
        const min = Math.min(from, to);
        const inverse = to < from;

        const newValue = min * R + amplitude * R * coordinateValue;
        const res = Math.min(
            Math.max(
                newValue,
                range[0]
            ),
            range[1]
        );
        return res;
    },
    [FxyArrayType.Y]: ({startValue, range, params, pattern, position}) => {

        const {valuesArray, from, to, drawWidth, drawHeight} = params as FxyArrayCoordinateParams;

        const height = patternsService.pattern[pattern.id].canvasService.canvas.height;

        const i = Math.max(Math.min(
            Math.floor(position.y / height * drawWidth),
            drawWidth - 1), 0);


        const coordinateValue = valuesArray[i] / drawHeight;

        const R = range[1] - range[0];

        const amplitude = Math.abs(to - from);
        const min = Math.min(from, to);
        const inverse = to < from;

        const newValue = min * R + amplitude * R * coordinateValue;
        const res = Math.min(
            Math.max(
                newValue,
                range[0]
            ),
            range[1]
        );

        return res;
    },
};

const fxyFunctionByType = {
    [FxyType.Parab]: ({startValue, range, params, pattern, position}) => {

        console.log(3, pattern);
        if (!pattern) return;

        const {x, y, end, zd} = params;

        const f = xyParaboloid(1 / 2, 1 / 2, x, y);

        const width = patternsService.pattern[pattern.id].canvasService.canvas.width;
        const height = patternsService.pattern[pattern.id].canvasService.canvas.height;

        const xnorm = position.x / width;
        const ynorm = position.y / height;
        const znorm = f(xnorm, ynorm) + zd;

        // (range[1] - startValue) * end;

        return Math.max(
            Math.min(
                (znorm * end) * (range[1] - range[0]) + startValue,
                startValue + (range[1] - startValue) * end
            ),
            startValue
        );

    },
    [FxyType.Sq]: ({startValue, range, params, pattern, position}) => {

        if (!pattern) return;

        const {a, b, c, h: zd, end} = params;

        const f = xySq(a, b, c);

        const width = patternsService.pattern[pattern.id].canvasService.canvas?.width || 0;
        const height = patternsService.pattern[pattern.id].canvasService.canvas?.height || 0;

        const xnorm = position.x / width;
        const ynorm = position.y / height;
        const znorm = f(xnorm, ynorm) + zd;

        // (range[1] - startValue) * end;

        return Math.max(
            Math.min(
                (znorm * end) * (range[1] - range[0]) + startValue,
                startValue + (range[1] - startValue) * end
            ),
            startValue
        );

    },
    [FxyType.Sis2]: ({startValue, range, params, pattern, position}) => {

        const {end} = params;
        const f = xySis2(params);

        const width = patternsService.pattern[pattern.id].canvasService.canvas.width;
        const height = patternsService.pattern[pattern.id].canvasService.canvas.height;

        const xnorm = position.x / width;
        const ynorm = position.y / height;
        const znorm = f(xnorm, ynorm) * end;


        return Math.max(
            Math.min(
                (znorm * end) * (range[1] - range[0]) + startValue,
                startValue + (range[1] - startValue) * end
            ),
            startValue
        );

    },
    [FxyType.Array]: ({startValue, range, params: functionParams, pattern, position}) => {

        const {type, typeParams} = functionParams as FxyArrayParams;
        const params = typeParams[type];

        return fxyArrayFunctionByType[type]?.({startValue, range, params, pattern, position});

    },
};

export const fxyChangeFunction = () => {
    return ({params, range, pattern, startValue, time, position}) => {

        return fxyFunctionByType[params.type]({
            startValue,
            range,
            params: params.typeParams[params.type],
            pattern,
            position
        })
    };
};
// VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO VIDEO
// export const xyArrayVideoFunctionByType: {
//     [type: string]: ({x, y, width, height, params}) => number
// } = {
//     [FxyArrayType.X]: ({x, y, width, height, params}) => {

//         const {valuesArray, from, to, drawWidth, drawHeight} = params as FxyArrayCoordinateParams;


//         const i = Math.floor(x / width * drawWidth);


//         const coordinateValue = valuesArray[i] / drawHeight;


//         const amplitude = Math.abs(to - from);
//         const min = Math.min(from, to);
//         // const inverse = to < from;


//         return min + amplitude * coordinateValue;
//     },
//     [FxyArrayType.Y]: ({x, y, width, height, params}) => {
//         const {valuesArray, from, to, drawWidth, drawHeight} = params as FxyArrayCoordinateParams;


//         const i = Math.floor(y / height * drawWidth);


//         const coordinateValue = valuesArray[i] / drawHeight;


//         const amplitude = Math.abs(to - from);
//         const min = Math.min(from, to);
//         const inverse = to < from;

//         const znorm = min + amplitude * coordinateValue;

//         return znorm;
//     },
// };


// export const xyVideoFunctionByType = {
//     [FxyType.Parab]: ({x, y, width, height, params}) => {

//         const {x: xk, y: yk, end, zd} = params;

//         const f = xyParaboloid(1 / 2, 1 / 2, xk, yk);


//         const xnorm = x / width;
//         const ynorm = y / height;
//         const znorm = f(xnorm, ynorm) * end + zd;

//         // (range[1] - startValue) * end;

//         return znorm;// * width;
//     },
//     [FxyType.Sis2]: ({x, y, width, height, params}) => {


//         const f = xySis2(params);


//         const xnorm = x / width;
//         const ynorm = y / height;
//         const znorm = f(xnorm, ynorm) * params.end;

//         // (range[1] - startValue) * end;

//         return znorm;// * width;
//     },
//     [FxyType.Array]: ({x, y, width, height, params: functionParams}) => {
//         const {type, typeParams} = functionParams as FxyArrayParams;
//         const params = typeParams[type];

//         return xyArrayVideoFunctionByType[type]?.({x, y, width, height, params});
//     }
// };


// export const fxyVideoChangeFunction =
//     (x, y, width, height, params: FxyParams) => {

//         return xyVideoFunctionByType[params.type]({
//             x, y, width, height,
//             params: params.typeParams[params.type]
//         });
//     };
