import {PatternAction} from '../pattern/types'
import {PlatformerBackgroundFit, PlatformerParams} from './types'
import {getPlatformerState} from './helpers'
import {AppState, patternsService} from '../../index'
import {EPlatformerAction} from './consts'

export type SetPlayerPatternAction = PatternAction & { value: string | null }
export type SetBackgroundPatternAction = PatternAction & { value: string | null }
export type SetPlayerSizeAction = PatternAction & { width: number; height: number }
export type SetGravityAction = PatternAction & { value: number }
export type SetJumpForceAction = PatternAction & { value: number }
export type SetMoveSpeedAction = PatternAction & { value: number }
export type SetCollisionAlphaThresholdAction = PatternAction & { value: number }
export type SetBackgroundFitAction = PatternAction & { value: PlatformerBackgroundFit }

export const start = (patternId: string) => async (dispatch, getState: () => AppState) => {
    const pattern = getState().patterns[patternId]
    const patternService = patternsService.pattern[patternId]

    if (!pattern || !patternService) {
        return
    }

    if (pattern.room?.value?.connected && !pattern.room?.value?.meDrawer) {
        return
    }

    const params = pattern.platformer?.params ?? getPlatformerState().params

    try {
        patternService.platformerService
            .init({
                width: pattern.width,
                height: pattern.height,
                ...params,
            })
            .start()

        dispatch({type: EPlatformerAction.START_PLAYING, id: patternId})
        patternService.previewService.autoUpdate(true)
    } catch (error) {
        console.error(error)
        patternService.platformerService.stop()
    }
}

export const stop = (patternId: string) => (dispatch, getState: () => AppState) => {
    const patternService = patternsService.pattern[patternId]

    if (!patternService) {
        return
    }

    dispatch({type: EPlatformerAction.STOP_PLAYING, id: patternId})

    patternService.platformerService.stop()
    patternService.previewService.autoUpdate(false)
    patternService.valuesService.update()
}

export const setPlayerPattern = (id: string, value: string | null) => (dispatch, getState: () => AppState) => {
    if (value === id) {
        return
    }

    dispatch({type: EPlatformerAction.SET_PLAYER_PATTERN, id, value})
    patternsService.pattern[id]?.platformerService.setPlayerPatternId(value)
}

export const setBackgroundPattern = (id: string, value: string | null) => (dispatch, getState: () => AppState) => {
    if (value === id) {
        return
    }

    dispatch({type: EPlatformerAction.SET_BACKGROUND_PATTERN, id, value})
    patternsService.pattern[id]?.platformerService.setBackgroundPatternId(value)
}

export const setPlayerSize = (id: string, width: number, height: number) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_PLAYER_SIZE, id, width, height})
    patternsService.pattern[id]?.platformerService.setPlayerSize(width, height)
}

export const setGravity = (id: string, value: number) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_GRAVITY, id, value})
    patternsService.pattern[id]?.platformerService.setGravity(value)
}

export const setJumpForce = (id: string, value: number) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_JUMP_FORCE, id, value})
    patternsService.pattern[id]?.platformerService.setJumpForce(value)
}

export const setMoveSpeed = (id: string, value: number) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_MOVE_SPEED, id, value})
    patternsService.pattern[id]?.platformerService.setMoveSpeed(value)
}

export const setCollisionAlphaThreshold = (id: string, value: number) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_COLLISION_ALPHA_THRESHOLD, id, value})
    patternsService.pattern[id]?.platformerService.setCollisionAlphaThreshold(value)
}

export const setBackgroundFit = (id: string, value: PlatformerBackgroundFit) => (dispatch) => {
    dispatch({type: EPlatformerAction.SET_BACKGROUND_FIT, id, value})
    patternsService.pattern[id]?.platformerService.setBackgroundFit(value)
}

export type PlatformerInitParams = PlatformerParams & {
    width: number
    height: number
}
