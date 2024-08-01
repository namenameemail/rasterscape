import {BlurParams, BlurValue} from "./types";
import {getFunctionState} from "../../../utils/patterns/function";

export const getBlurState = getFunctionState<BlurValue, BlurParams>(
    {
        radius: 0,
        // onUpdate: true
    }, {});