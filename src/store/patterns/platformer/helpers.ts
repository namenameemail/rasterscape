import {PlatformerBackgroundFit, PlatformerParams, PlatformerValue} from './types'
import {getFunctionState} from '../../../utils/patterns/function'

export const getPlatformerState = getFunctionState<PlatformerValue, PlatformerParams>(
    {}, {
        playingOn: false,
        gravity: 0.6,
        jumpForce: 12,
        moveSpeed: 4,
        playerPatternId: null,
        playerWidth: 16,
        playerHeight: 16,
        backgroundPatternId: null,
        backgroundFit: PlatformerBackgroundFit.Stretch,
        collisionAlphaThreshold: 128,
    })
