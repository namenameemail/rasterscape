import {ICollisionSource} from './types'

const TILE_SIZE = 8

export class Collision implements ICollisionSource {
    private imageData: ImageData | null = null
    private threshold: number
    private solidTiles: boolean[][] = []
    private tileCols = 0
    private tileRows = 0

    constructor(threshold: number) {
        this.threshold = threshold
    }

    setThreshold = (threshold: number): void => {
        this.threshold = threshold
    }

    rebuild = (imageData: ImageData): void => {
        this.imageData = imageData
        this.tileCols = Math.ceil(imageData.width / TILE_SIZE)
        this.tileRows = Math.ceil(imageData.height / TILE_SIZE)
        this.solidTiles = []

        for (let ty = 0; ty < this.tileRows; ty++) {
            const row: boolean[] = []
            for (let tx = 0; tx < this.tileCols; tx++) {
                row.push(this.isTileSolid(tx, ty, imageData))
            }
            this.solidTiles.push(row)
        }
    }

    private isTileSolid = (tx: number, ty: number, imageData: ImageData): boolean => {
        const startX = tx * TILE_SIZE
        const startY = ty * TILE_SIZE
        const endX = Math.min(startX + TILE_SIZE, imageData.width)
        const endY = Math.min(startY + TILE_SIZE, imageData.height)
        const data = imageData.data

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const alpha = data[(y * imageData.width + x) * 4 + 3]
                if (alpha >= this.threshold) {
                    return true
                }
            }
        }

        return false
    }

    isSolidAt = (x: number, y: number): boolean => {
        return this.getAlphaAt(x, y) >= this.threshold
    }

    getAlphaAt = (x: number, y: number): number => {
        if (!this.imageData) {
            return 0
        }

        const px = Math.floor(x)
        const py = Math.floor(y)

        if (px < 0 || py < 0 || px >= this.imageData.width || py >= this.imageData.height) {
            return 0
        }

        return this.imageData.data[(py * this.imageData.width + px) * 4 + 3]
    }

    getStats = (): {
        width: number
        height: number
        threshold: number
        solidTileCount: number
        solidTileRatio: number
    } => {
        const solidTileCount = this.solidTiles.reduce(
            (sum, row) => sum + row.filter(Boolean).length,
            0,
        )
        const totalTiles = this.tileCols * this.tileRows

        return {
            width: this.imageData?.width ?? 0,
            height: this.imageData?.height ?? 0,
            threshold: this.threshold,
            solidTileCount,
            solidTileRatio: totalTiles ? solidTileCount / totalTiles : 0,
        }
    }

    isRectSolid = (x: number, y: number, width: number, height: number): boolean => {
        const points = [
            [x, y],
            [x + width - 1, y],
            [x, y + height - 1],
            [x + width - 1, y + height - 1],
            [x + width / 2, y + height - 1],
        ]

        for (const [px, py] of points) {
            if (this.isSolidAt(px, py)) {
                return true
            }
        }

        return false
    }

    private isVerticalEdgeBlocked = (edgeX: number, y: number, height: number): boolean => {
        const px = Math.floor(edgeX)

        for (let py = Math.floor(y); py < Math.floor(y) + height; py++) {
            if (this.isSolidAt(px, py)) {
                return true
            }
        }

        return false
    }

    resolveHorizontal = (x: number, y: number, width: number, height: number, nextX: number): number => {
        if (nextX === x) {
            return x
        }

        const direction = nextX > x ? 1 : -1
        let resolved = Math.round(x)
        const target = Math.round(nextX)

        while (direction > 0 ? resolved < target : resolved > target) {
            const candidate = resolved + direction
            const leadingEdgeX = direction > 0 ? candidate + width - 1 : candidate

            if (this.isVerticalEdgeBlocked(leadingEdgeX, y, height)) {
                break
            }

            resolved = candidate
        }

        return resolved
    }

    findFreePosition = (
        x: number,
        y: number,
        width: number,
        height: number,
        worldWidth: number,
        worldHeight: number,
    ): { x: number; y: number } | null => {
        const startX = Math.round(x)
        const startY = Math.round(y)

        if (!this.isRectSolid(startX, startY, width, height)) {
            return {x: startX, y: startY}
        }

        for (let radius = 1; radius <= Math.max(width, height) * 2; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue
                    }

                    const nx = startX + dx
                    const ny = startY + dy

                    if (nx < 0 || ny < 0 || nx > worldWidth - width || ny > worldHeight - height) {
                        continue
                    }

                    if (!this.isRectSolid(nx, ny, width, height)) {
                        return {x: nx, y: ny}
                    }
                }
            }
        }

        return null
    }

    isGrounded = (x: number, y: number, width: number, height: number): boolean => {
        if (!this.imageData) {
            return false
        }

        const feetY = y + height

        if (feetY >= this.imageData.height) {
            return true
        }

        const sampleX = [
            x,
            x + width / 2,
            x + width - 1,
        ]

        return sampleX.some(px => this.isSolidAt(px, feetY))
    }

    resolveVertical = (x: number, y: number, width: number, height: number, nextY: number): { y: number; onGround: boolean } => {
        const direction = nextY > y ? 1 : -1
        let resolved = y
        let onGround = false

        while (direction > 0 ? resolved < nextY : resolved > nextY) {
            const candidate = resolved + direction

            if (this.isRectSolid(x, candidate, width, height)) {
                if (direction > 0) {
                    onGround = true
                }
                break
            }

            resolved = candidate
        }

        if (!onGround && direction > 0) {
            onGround = this.isGrounded(x, resolved, width, height)
        }

        return {y: resolved, onGround}
    }
}
