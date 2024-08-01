import {ChangeFunctions} from "./reducer";
import {ECFType} from "./types";
import {
    depthInitialParams,
    depthNumberChangeFunction,
    // depthVideoChangeFunction
} from "./functions/depth";
import {waveChangeFunction, waveInitialParams, waveParamsConfig} from "./functions/wave";
import {fxyChangeFunction, fxyInitialParams} from "./functions/fxy";

const getId = (key: string, type: ECFType) => +key.slice(type.toString().length);

export const cfId = (type: ECFType, state: ChangeFunctions): {id: string, number: number} => {
    const number = (Object.keys(state).length
        ? (Math.max(0,
        ...Object
            .keys(state)
            .filter(key => state[key].type === type)
            .map(key => getId(key, state[key].type)))) + 1
        : 1);

    return {
        id: type.toString() + number,
        number,
    };
};

const chInitialParams = {
    [ECFType.WAVE]: waveInitialParams,
    [ECFType.FXY]: fxyInitialParams,
    [ECFType.DEPTH]: depthInitialParams,
};

export const createCFInitialState = (id: string, type: ECFType, number: number) => {

    return {
        id,
        type,
        number,
        params: chInitialParams[type],
    }
};

export const changeFunctionByType = {
    [ECFType.WAVE]: waveChangeFunction,
    [ECFType.FXY]: fxyChangeFunction,
    [ECFType.DEPTH]: depthNumberChangeFunction,
};

// export const videoChangeFunctionByType = {
//     [ECFType.FXY]: fxyVideoChangeFunction,
//     [ECFType.DEPTH]: depthVideoChangeFunction,
// };
//({a, b, c, h}) => (x, y) => (Math.sin(x / a) * Math.cos(y / b) * c + h),
