import {Collision} from './Collision'
import {PlatformerInput} from './PlatformerInput'
import {platformerProfiler} from './PlatformerProfiler'
import {PlayerState} from './types'
import {WorldBuffer} from './WorldBuffer'

export interface PlatformerPhysicsParams {
    gravity: number
    jumpForce: number
    moveSpeed: number
    playerWidth: number
    playerHeight: number
}

export class PlatformerEngine {
    player: PlayerState = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        onGround: false,
    }

    private width = 0
    private height = 0
    private params: PlatformerPhysicsParams = {
        gravity: 0.6,
        jumpForce: 12,
        moveSpeed: 4,
        playerWidth: 16,
        playerHeight: 16,
    }

    setParams = (params: Partial<PlatformerPhysicsParams>): void => {
        this.params = {...this.params, ...params}
    }

    setWorldSize = (width: number, height: number): void => {
        this.width = width
        this.height = height
    }

    applyResize = (oldWidth: number, oldHeight: number, noStretch?: boolean): void => {
        if (oldWidth <= 0 || oldHeight <= 0) {
            return
        }

        const {playerWidth, playerHeight} = this.params
        const player = this.player

        if (noStretch) {
            player.y += this.height - oldHeight
        } else {
            player.x *= this.width / oldWidth
            player.y *= this.height / oldHeight
        }

        player.x = Math.round(Math.max(0, Math.min(player.x, this.width - playerWidth)))
        player.y = Math.round(Math.max(0, Math.min(player.y, this.height - playerHeight)))
    }

    resolveOverlap = (collision: Collision): void => {
        const {playerWidth, playerHeight} = this.params
        const freePosition = collision.findFreePosition(
            this.player.x,
            this.player.y,
            playerWidth,
            playerHeight,
            this.width,
            this.height,
        )

        if (freePosition) {
            this.player.x = freePosition.x
            this.player.y = freePosition.y
        }
    }

    syncGroundState = (collision: Collision): void => {
        const {playerWidth, playerHeight} = this.params
        const player = this.player

        player.onGround = collision.isGrounded(player.x, player.y, playerWidth, playerHeight)

        if (player.onGround) {
            player.vy = 0
        }
    }

    resetPlayer = (collision: Collision): void => {
        const {playerWidth, playerHeight} = this.params
        const centerX = Math.max(0, (this.width - playerWidth) / 2)
        const maxY = this.height - playerHeight

        for (let y = 0; y <= maxY; y++) {
            if (collision.isRectSolid(centerX, y, playerWidth, playerHeight)) {
                continue
            }

            if (collision.isGrounded(centerX, y, playerWidth, playerHeight)) {
                this.player = {
                    x: centerX,
                    y,
                    vx: 0,
                    vy: 0,
                    onGround: true,
                }
                return
            }
        }

        for (let y = 0; y <= maxY; y++) {
            if (!collision.isRectSolid(centerX, y, playerWidth, playerHeight)) {
                this.player = {
                    x: centerX,
                    y,
                    vx: 0,
                    vy: 0,
                    onGround: false,
                }
                return
            }
        }

        this.player = {
            x: centerX,
            y: Math.max(0, maxY),
            vx: 0,
            vy: 0,
            onGround: true,
        }
    }

    step = (
        input: PlatformerInput,
        collision: Collision,
        world: WorldBuffer,
    ): void => {
        const before = {...this.player}
        const worldWasDirty = world.isDirty()

        if (worldWasDirty) {
            collision.rebuild(world.getImageData())
            world.clearDirty()
            platformerProfiler.logCollisionRebuild(
                collision,
                this.player,
                this.params.playerWidth,
                this.params.playerHeight,
                'world.dirty',
            )
        }

        const {gravity, jumpForce, moveSpeed, playerWidth, playerHeight} = this.params
        const player = this.player

        const inputState = input.getState()

        player.vx = 0
        if (inputState.left) {
            player.vx = -moveSpeed
        }
        if (inputState.right) {
            player.vx = moveSpeed
        }

        if (input.consumeJumpPressed() && player.onGround) {
            player.vy = -jumpForce
            player.onGround = false
        } else if (player.onGround && player.vy > 0) {
            player.vy = 0
        }

        player.vy += gravity

        let nextX = player.x + player.vx
        nextX = collision.resolveHorizontal(player.x, player.y, playerWidth, playerHeight, nextX)
        nextX = Math.max(0, Math.min(nextX, Math.max(0, this.width - playerWidth)))
        player.x = nextX

        let nextY = player.y + player.vy
        const vertical = collision.resolveVertical(player.x, player.y, playerWidth, playerHeight, nextY)
        player.y = Math.max(0, Math.min(vertical.y, this.height - playerHeight))
        player.onGround = vertical.onGround

        if (player.onGround && player.vy > 0) {
            player.vy = 0
        }

        if (player.y <= 0) {
            player.vy = Math.max(0, player.vy)
        }

        if (player.y >= this.height - playerHeight) {
            player.onGround = true
            player.vy = 0
        }

        platformerProfiler.logPhysicsStep(
            before,
            {...player},
            collision,
            playerWidth,
            playerHeight,
            {
                worldWasDirty,
                vertical,
            },
        )
    }
}
