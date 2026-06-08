import {reducePattern} from '../pattern/helpers'
import {PatternAction, PatternState} from '../pattern/types'
import {
    SetBackgroundFitAction,
    SetBackgroundPatternAction,
    SetCollisionAlphaThresholdAction,
    SetGravityAction,
    SetJumpForceAction,
    SetMoveSpeedAction,
    SetPlayerPatternAction,
    SetPlayerSizeAction,
} from './actions'
import {EPlatformerAction} from './consts'

export const platformerReducers = {
    [EPlatformerAction.START_PLAYING]: reducePattern<PatternAction>(
        (pattern: PatternState) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    playingOn: true,
                },
            },
        })),
    [EPlatformerAction.STOP_PLAYING]: reducePattern<PatternAction>(
        (pattern: PatternState) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    playingOn: false,
                },
            },
        })),
    [EPlatformerAction.SET_PLAYER_PATTERN]: reducePattern<SetPlayerPatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    playerPatternId: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_BACKGROUND_PATTERN]: reducePattern<SetBackgroundPatternAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    backgroundPatternId: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_PLAYER_SIZE]: reducePattern<SetPlayerSizeAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    playerWidth: action.width,
                    playerHeight: action.height,
                },
            },
        })),
    [EPlatformerAction.SET_GRAVITY]: reducePattern<SetGravityAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    gravity: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_JUMP_FORCE]: reducePattern<SetJumpForceAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    jumpForce: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_MOVE_SPEED]: reducePattern<SetMoveSpeedAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    moveSpeed: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_COLLISION_ALPHA_THRESHOLD]: reducePattern<SetCollisionAlphaThresholdAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    collisionAlphaThreshold: action.value,
                },
            },
        })),
    [EPlatformerAction.SET_BACKGROUND_FIT]: reducePattern<SetBackgroundFitAction>(
        (pattern: PatternState, action) => ({
            ...pattern,
            platformer: pattern.platformer && {
                ...pattern.platformer,
                params: {
                    ...pattern.platformer.params,
                    backgroundFit: action.value,
                },
            },
        })),
}
