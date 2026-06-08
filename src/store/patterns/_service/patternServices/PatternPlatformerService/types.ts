import {PlatformerParams} from '../../../platformer/types'

export interface PlayerState {
    x: number
    y: number
    vx: number
    vy: number
    onGround: boolean
}

export interface PlatformerInputState {
    left: boolean
    right: boolean
    jump: boolean
    jumpPressed: boolean
}

export interface PlatformerInitParams extends PlatformerParams {
    width: number
    height: number
}

export interface IBackgroundSource {
    draw(ctx: CanvasRenderingContext2D, width: number, height: number): void
}

export interface IPlayerSpriteSource {
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void
}

export interface ICollisionSource {
    isSolidAt(x: number, y: number): boolean
    isRectSolid(x: number, y: number, width: number, height: number): boolean
}
