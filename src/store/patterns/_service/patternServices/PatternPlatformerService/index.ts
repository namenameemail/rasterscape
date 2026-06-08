import {PatternService} from '../../PatternService'
import {PlatformerBackgroundFit} from '../../../platformer/types'
import {PlatformerInitParams} from '../../../platformer/actions'
import {resizeImageData} from '../../../../../utils/canvas/helpers/imageData'
import {frameScheduler, FramePriority} from '../../../../../utils/FrameScheduler'
import {WorldBuffer} from './WorldBuffer'
import {PlatformerInput} from './PlatformerInput'
import {Collision} from './Collision'
import {PlatformerEngine} from './PlatformerEngine'
import {PlatformerRenderer} from './PlatformerRenderer'
import {platformerProfiler} from './PlatformerProfiler'

const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])
const JUMP_KEYS = new Set(['Space'])

export class PatternPlatformerService {
    patternService: PatternService

    private width = 0
    private height = 0
    private playing = false
    private unsubscribeFrame: (() => void) | null = null
    private prevFrameTime = 0

    private world = new WorldBuffer(1, 1)
    private input = new PlatformerInput()
    private collision = new Collision(128)
    private engine = new PlatformerEngine()
    private renderer = new PlatformerRenderer()

    private boundKeyDown: (e: KeyboardEvent) => void
    private boundKeyUp: (e: KeyboardEvent) => void

    constructor(patternService: PatternService) {
        this.patternService = patternService
        this.boundKeyDown = this.handleKeyDown
        this.boundKeyUp = this.handleKeyUp
    }

    get isPlaying(): boolean {
        return this.playing
    }

    getWorldContext = (): CanvasRenderingContext2D => {
        return this.world.context
    }

    getWorldCanvas = (): HTMLCanvasElement => {
        return this.world.canvas
    }

    markWorldDirty = (source = 'unknown'): void => {
        this.world.markDirty()
        platformerProfiler.logWorldDirty(source)
    }

    init = (params: PlatformerInitParams): PatternPlatformerService => {
        this.width = params.width
        this.height = params.height

        this.collision.setThreshold(params.collisionAlphaThreshold)
        this.engine.setParams({
            gravity: params.gravity,
            jumpForce: params.jumpForce,
            moveSpeed: params.moveSpeed,
            playerWidth: params.playerWidth,
            playerHeight: params.playerHeight,
        })
        this.engine.setWorldSize(params.width, params.height)

        this.renderer.setBackgroundPatternId(params.backgroundPatternId)
        this.renderer.setPlayerPatternId(params.playerPatternId)
        this.renderer.setBackgroundFit(params.backgroundFit)
        this.renderer.setPlayerSize(params.playerWidth, params.playerHeight)

        this.world.setSize(params.width, params.height)

        const imageData = this.patternService.canvasService.getImageData()
        if (imageData?.width && imageData?.height) {
            const worldImageData = imageData.width === params.width && imageData.height === params.height
                ? imageData
                : resizeImageData(imageData, params.width, params.height)
            this.world.context.putImageData(worldImageData, 0, 0)
            this.world.clearDirty()
        } else {
            this.world.context.clearRect(0, 0, params.width, params.height)
            this.world.clearDirty()
        }

        this.collision.rebuild(this.world.getImageData())
        this.engine.resetPlayer(this.collision)

        return this
    }

    private isActive = (): boolean => {
        return this.playing && this.width > 0 && this.height > 0
    }

    private applyWorldState = (
        imageData: ImageData,
        oldWidth: number,
        oldHeight: number,
        noStretch?: boolean,
        reason = 'resize',
    ): void => {
        this.width = imageData.width
        this.height = imageData.height
        this.world.setImageData(imageData)
        this.engine.setWorldSize(this.width, this.height)

        if (oldWidth > 0 && oldHeight > 0) {
            this.engine.applyResize(oldWidth, oldHeight, noStretch)
        }

        this.collision.rebuild(this.world.getImageData())
        this.engine.resolveOverlap(this.collision)
        this.engine.syncGroundState(this.collision)
        this.refreshDisplay()

        platformerProfiler.log(reason, {
            oldWidth,
            oldHeight,
            width: this.width,
            height: this.height,
            noStretch: !!noStretch,
            player: {...this.engine.player},
            collision: this.collision.getStats(),
        })
    }

    resize = (width: number, height: number, noStretch?: boolean): PatternPlatformerService => {
        if (!this.isActive()) {
            return this
        }

        if (width === this.width && height === this.height) {
            return this
        }

        const oldWidth = this.width
        const oldHeight = this.height
        const resizedWorld = resizeImageData(this.world.getImageData(), width, height, noStretch)

        this.applyWorldState(resizedWorld, oldWidth, oldHeight, noStretch, 'resize')

        return this
    }

    reloadWorldFromCanvas = (noStretch?: boolean): PatternPlatformerService => {
        if (!this.playing) {
            return this
        }

        const imageData = this.patternService.canvasService.getImageData()

        if (!imageData?.width || !imageData?.height) {
            return this
        }

        const oldWidth = this.width
        const oldHeight = this.height

        this.applyWorldState(imageData, oldWidth, oldHeight, noStretch, 'reloadWorld')

        return this
    }

    refreshDisplay = (): void => {
        if (!this.playing) {
            return
        }

        const displayContext = this.patternService.canvasService.context
        if (!displayContext) {
            return
        }

        this.renderer.composite(
            displayContext,
            this.width,
            this.height,
            this.world,
            this.engine.player,
        )
    }

    start = (): PatternPlatformerService => {
        if (this.playing) {
            return this
        }

        this.playing = true
        this.prevFrameTime = 0
        this.input.reset()

        window.addEventListener('keydown', this.boundKeyDown)
        window.addEventListener('keyup', this.boundKeyUp)

        this.unsubscribeFrame?.()
        this.unsubscribeFrame = frameScheduler.subscribe(
            `platformer:${this.patternService.patternId}`,
            this.onFrameTick,
            FramePriority.Platformer,
        )

        platformerProfiler.beginSession(this.patternService.patternId)

        platformerProfiler.log('init', {
            width: this.width,
            height: this.height,
            player: {...this.engine.player},
            collision: this.collision.getStats(),
        })

        return this
    }

    stop = (): PatternPlatformerService => {
        const patternId = this.patternService.patternId

        platformerProfiler.log('stop.state', {
            player: {...this.engine.player},
            collision: this.collision.getStats(),
        })

        platformerProfiler.endSession(patternId)

        this.playing = false
        this.unsubscribeFrame?.()
        this.unsubscribeFrame = null

        window.removeEventListener('keydown', this.boundKeyDown)
        window.removeEventListener('keyup', this.boundKeyUp)
        this.input.reset()

        const displayContext = this.patternService.canvasService.context
        if (displayContext) {
            displayContext.putImageData(this.world.getImageData(), 0, 0)
        }

        return this
    }

    setPlayerPatternId = (id: string | null): PatternPlatformerService => {
        this.renderer.setPlayerPatternId(id)
        return this
    }

    setBackgroundPatternId = (id: string | null): PatternPlatformerService => {
        this.renderer.setBackgroundPatternId(id)
        return this
    }

    setPlayerSize = (width: number, height: number): PatternPlatformerService => {
        this.engine.setParams({playerWidth: width, playerHeight: height})
        this.renderer.setPlayerSize(width, height)
        return this
    }

    setGravity = (value: number): PatternPlatformerService => {
        this.engine.setParams({gravity: value})
        return this
    }

    setJumpForce = (value: number): PatternPlatformerService => {
        this.engine.setParams({jumpForce: value})
        return this
    }

    setMoveSpeed = (value: number): PatternPlatformerService => {
        this.engine.setParams({moveSpeed: value})
        return this
    }

    setCollisionAlphaThreshold = (value: number): PatternPlatformerService => {
        this.collision.setThreshold(value)
        this.world.markDirty()
        return this
    }

    setBackgroundFit = (fit: PlatformerBackgroundFit): PatternPlatformerService => {
        this.renderer.setBackgroundFit(fit)
        return this
    }

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (!this.playing) {
            return
        }

        if (LEFT_KEYS.has(e.code)) {
            this.input.setLeft(true)
            e.preventDefault()
        }
        if (RIGHT_KEYS.has(e.code)) {
            this.input.setRight(true)
            e.preventDefault()
        }
        if (JUMP_KEYS.has(e.code)) {
            this.input.setJump(true)
            e.preventDefault()
        }
    }

    private handleKeyUp = (e: KeyboardEvent): void => {
        if (!this.playing) {
            return
        }

        if (LEFT_KEYS.has(e.code)) {
            this.input.setLeft(false)
        }
        if (RIGHT_KEYS.has(e.code)) {
            this.input.setRight(false)
        }
        if (JUMP_KEYS.has(e.code)) {
            this.input.setJump(false)
        }
    }

    private onFrameTick = (time: number): void => {
        this.onFrame(time)
    }

    private onFrame = (time: number): void => {
        const displayContext = this.patternService.canvasService.context

        if (!displayContext || !this.playing) {
            return
        }

        this.engine.step(this.input, this.collision, this.world)
        this.refreshDisplay()
        this.patternService.valuesService.updateForVideoFrame()
        this.prevFrameTime = time
    }
}
