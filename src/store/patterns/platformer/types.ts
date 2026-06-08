import {FunctionState} from "../../../utils/patterns/function";

export enum PlatformerBackgroundFit {
    Stretch = 'stretch',
    Contain = 'contain',
    Cover = 'cover',
}

export interface PlatformerParams {
    playingOn: boolean
    gravity: number
    jumpForce: number
    moveSpeed: number
    playerPatternId: string | null
    playerWidth: number
    playerHeight: number
    backgroundPatternId: string | null
    backgroundFit: PlatformerBackgroundFit
    collisionAlphaThreshold: number
}

export interface PlatformerValue {
}

export type PlatformerState = FunctionState<PlatformerValue, PlatformerParams>;
