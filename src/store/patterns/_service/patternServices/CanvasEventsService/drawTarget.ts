import {PatternService} from '../../PatternService'
import {PatternBuffer} from '../PatternBuffer'

export function bufferForDrawCanvas(
    patternService: PatternService,
    canvas: HTMLCanvasElement,
): PatternBuffer | undefined {
    const patternBuffer = patternService.canvasService.buffer
    if (patternBuffer?.canvas === canvas) {
        return patternBuffer
    }

    const maskBuffer = patternService.maskService.buffer
    if (maskBuffer?.canvas === canvas) {
        return maskBuffer
    }

    return undefined
}
