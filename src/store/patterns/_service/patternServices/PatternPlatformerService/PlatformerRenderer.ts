import {patternsService} from '../../../../index'
import {PlatformerBackgroundFit} from '../../../platformer/types'
import {imageDataToCanvas} from '../../../../../utils/canvas/helpers/imageData'
import {PlayerState} from './types'
import {WorldBuffer} from './WorldBuffer'

export class PlatformerRenderer {
    private backgroundPatternId: string | null = null
    private playerPatternId: string | null = null
    private backgroundFit = PlatformerBackgroundFit.Stretch
    private playerWidth = 16
    private playerHeight = 16

    setBackgroundPatternId = (id: string | null): void => {
        this.backgroundPatternId = id
    }

    setPlayerPatternId = (id: string | null): void => {
        this.playerPatternId = id
    }

    setBackgroundFit = (fit: PlatformerBackgroundFit): void => {
        this.backgroundFit = fit
    }

    setPlayerSize = (width: number, height: number): void => {
        this.playerWidth = width
        this.playerHeight = height
    }

    composite = (
        displayContext: CanvasRenderingContext2D,
        width: number,
        height: number,
        world: WorldBuffer,
        player: PlayerState,
    ): void => {
        displayContext.clearRect(0, 0, width, height)
        this.drawBackground(displayContext, width, height)
        displayContext.drawImage(world.canvas, 0, 0)
        this.drawPlayer(displayContext, player)
    }

    private getPatternSourceCanvas = (patternId: string | null): HTMLCanvasElement | null => {
        if (!patternId) {
            return null
        }

        const source = patternsService.pattern[patternId]
        if (!source) {
            return null
        }

        const boundCanvas = source.canvasService.canvas
        if (boundCanvas) {
            return boundCanvas
        }

        const imageData = source.canvasService.getImageData()
        if (!imageData) {
            return null
        }

        return imageDataToCanvas(imageData)
    }

    private drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
        const sourceCanvas = this.getPatternSourceCanvas(this.backgroundPatternId)

        if (!sourceCanvas) {
            ctx.fillStyle = '#1a1a2e'
            ctx.fillRect(0, 0, width, height)
            return
        }

        if (this.backgroundFit === PlatformerBackgroundFit.Stretch) {
            ctx.drawImage(sourceCanvas, 0, 0, width, height)
            return
        }

        ctx.drawImage(sourceCanvas, 0, 0, width, height)
    }

    private drawPlayer = (ctx: CanvasRenderingContext2D, player: PlayerState): void => {
        const {x, y} = player
        const {playerWidth, playerHeight} = this

        const sourceCanvas = this.getPatternSourceCanvas(this.playerPatternId)

        if (!sourceCanvas) {
            ctx.fillStyle = '#e94560'
            ctx.fillRect(x, y, playerWidth, playerHeight)
            return
        }

        ctx.drawImage(sourceCanvas, x, y, playerWidth, playerHeight)
    }
}
