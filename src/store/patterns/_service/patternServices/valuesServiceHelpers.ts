import {AppState} from '../../../index'
import {EBrushType} from '../../../brush/types'
import {ELineType} from '../../../line/types'
import {EToolType} from '../../../tool/types'
import {PatternService} from '../PatternService'

export const isPatternUsedAsActiveToolSource = (patternId: string, state: AppState): boolean =>
    getActiveToolSourcePatternIds(state).includes(patternId)

export const getActiveToolSourcePatternIds = (state: AppState): string[] => {
    const tool = state.tool.current

    if (tool === EToolType.Brush && state.brush.params.brushType === EBrushType.Pattern) {
        const id = state.brush.params.paramsByType[EBrushType.Pattern].patternId
        return id ? [id] : []
    }

    if (tool === EToolType.Line) {
        const lineType = state.line.params.type

        if (lineType === ELineType.SolidPattern || lineType === ELineType.TrailingPattern) {
            const id = state.line.params.patternId
            return id ? [id] : []
        }
    }

    return []
}

export const hasMaskedConsumers = (patternService: PatternService, state?: AppState): boolean => {
    if (patternService.previewService.canvases.length > 0) {
        return true
    }

    if (patternService.maskService.isMaskEnabled) {
        return true
    }

    const appState = state ?? patternService.storeService.getState()

    return isPatternUsedAsActiveToolSource(patternService.patternId, appState)
}
