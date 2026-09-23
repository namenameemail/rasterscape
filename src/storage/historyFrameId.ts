import {PatternHistoryItem} from '../store/patterns/history/types'

export function createHistoryFrameId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }

    return `frame-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createHistoryItem(
    canvasImageData: ImageData | null | undefined,
    maskImageData: ImageData | null | undefined,
): PatternHistoryItem {
    if (!canvasImageData || !maskImageData) {
        throw new Error('history item requires canvas and mask ImageData')
    }

    return {
        id: createHistoryFrameId(),
        canvasImageData,
        maskImageData,
    }
}

export function ensureHistoryItemId(item: PatternHistoryItem): string {
    if (!item.id) {
        item.id = createHistoryFrameId()
    }

    return item.id
}
