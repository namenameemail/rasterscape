import type {AppState} from '../../index'
import {patternsService} from '../../index'
import {EBrushType} from '../../brush/types'
import {ECFType} from '../../changeFunctions/types'
import {CfDepthParams} from '../../changeFunctions/functions/depth'
import {ELineType} from '../../line/types'
import {VideoSourceType} from '../video/types'

const lineUsesPattern = (type: ELineType | undefined): boolean =>
    type === ELineType.SolidPattern
    || type === ELineType.TrailingPattern
    || type === ELineType.Pattern

export const isPatternVisible = (state: AppState, id: string): boolean => {
    if (state.activePattern.patternId === id) {
        return true
    }
    if (state.patterns[id]?.demonstration?.value?.enabled) {
        return true
    }
    return !!patternsService.pattern[id]?.canvasService.monitor
}

export const isPatternWanted = (state: AppState, id: string): boolean => {
    const pattern = state.patterns[id]
    if (!pattern) {
        return false
    }
    if (pattern.room?.value?.connected) {
        return true
    }
    if (pattern.demonstration?.value?.enabled) {
        return true
    }

    const brushPatternId = state.brush?.params?.paramsByType?.[EBrushType.Pattern]?.patternId
    if (brushPatternId === id) {
        return true
    }

    const line = state.line?.params
    if (lineUsesPattern(line?.type) && line.patternId === id) {
        return true
    }

    for (const other of Object.values(state.patterns)) {
        if (!other || other.id === id) {
            continue
        }

        const video = other.video?.params
        if (
            video?.updatingOn &&
            video.sourceType === VideoSourceType.Pattern &&
            video.sourcePatternId === id
        ) {
            return true
        }

        if (video?.updatingOn && video.changeFunctionId) {
            const cf = state.changeFunctions.functions[video.changeFunctionId]
            if (cf?.type === ECFType.DEPTH) {
                const items = (cf.params as CfDepthParams).items
                if (items?.some((item) => item.patternId === id)) {
                    return true
                }
            }
        }

        const platformer = other.platformer?.params
        if (
            platformer?.playingOn &&
            (platformer.playerPatternId === id || platformer.backgroundPatternId === id)
        ) {
            return true
        }
    }

    return false
}

export const shouldCookVideo = (state: AppState, id: string): boolean => {
    const params = state.patterns[id]?.video?.params
    if (!params?.updatingOn) {
        return false
    }
    return isPatternVisible(state, id) || isPatternWanted(state, id) || !!params.alwaysCook
}

export const shouldCookPlatformer = (state: AppState, id: string): boolean => {
    const params = state.patterns[id]?.platformer?.params
    if (!params?.playingOn) {
        return false
    }
    return isPatternVisible(state, id) || isPatternWanted(state, id) || !!params.alwaysCook
}

export const syncPatternCook = (id: string | null | undefined): void => {
    if (!id) {
        return
    }

    const service = patternsService.pattern[id]
    if (!service) {
        return
    }

    const state = service.storeService.getState()

    const wantVideo = shouldCookVideo(state, id)
    if (wantVideo) {
        if (!service.videoService.isCooking()) {
            service.videoService.start()
            service.videoService.onFrame()
            service.previewService.autoUpdate(true)
        }
    } else if (service.videoService.isCooking()) {
        service.videoService.stop()
        if (state.patterns[id]?.video?.params?.updatingOn) {
            service.previewService.autoUpdate(false)
        }
    }

    const wantPlatformer = shouldCookPlatformer(state, id)
    if (wantPlatformer) {
        if (!service.platformerService.isCooking()) {
            service.platformerService.startFrame()
            service.platformerService.tickOnce()
        }
    } else if (service.platformerService.isCooking()) {
        service.platformerService.stopFrame()
    }
}

export const syncPatternsCook = (...ids: Array<string | null | undefined>): void => {
    const unique = new Set<string>()
    for (const id of ids) {
        if (id) {
            unique.add(id)
        }
    }
    unique.forEach(syncPatternCook)
}

export const depthPatternIdsForCf = (state: AppState, changeFunctionId: string | null | undefined): string[] => {
    if (!changeFunctionId) {
        return []
    }
    const cf = state.changeFunctions.functions[changeFunctionId]
    if (cf?.type !== ECFType.DEPTH) {
        return []
    }
    return ((cf.params as CfDepthParams).items ?? [])
        .map((item) => item.patternId)
        .filter(Boolean)
}
