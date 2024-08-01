// BLUR BLUR BLUR BLUR BLUR BLUR BLUR BLUR BLUR BLUR BLUR BLUR

import {FunctionState} from "../../../utils/patterns/function";

export interface BlurParams {
}

export interface BlurValue {
    radius: number
    // onUpdate: boolean
}

export type BlurState = FunctionState<BlurValue, BlurParams>;