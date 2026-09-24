import {describe, expect, it} from 'vitest'
import {buildStroke} from './strokeMesh'

const bounds = (mesh: Float32Array) => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let i = 0; i < mesh.length; i += 2) {
        minX = Math.min(minX, mesh[i])
        maxX = Math.max(maxX, mesh[i])
        minY = Math.min(minY, mesh[i + 1])
        maxY = Math.max(maxY, mesh[i + 1])
    }
    return {minX, minY, maxX, maxY}
}

describe('stroke mesh', () => {
    it('keeps a butt segment to the points and the given width', () => {
        const box = bounds(buildStroke([{x: 10, y: 20}, {x: 40, y: 20}], 6, 'butt', 'miter'))
        expect(box.minX).toBeCloseTo(10)
        expect(box.maxX).toBeCloseTo(40)
        expect(box.minY).toBeCloseTo(17)
        expect(box.maxY).toBeCloseTo(23)
    })

    it('extends round and square caps by half the width', () => {
        const round = bounds(buildStroke([{x: 10, y: 0}, {x: 20, y: 0}], 8, 'round', 'bevel'))
        const square = bounds(buildStroke([{x: 10, y: 0}, {x: 20, y: 0}], 8, 'square', 'bevel'))
        expect(round.minX).toBeCloseTo(6)
        expect(round.maxX).toBeCloseTo(24)
        expect(square.minX).toBeCloseTo(6)
        expect(square.maxX).toBeCloseTo(24)
    })

    it('miters a right angle and bevels a hairpin', () => {
        const miter = bounds(buildStroke([{x: 0, y: 0}, {x: 20, y: 0}, {x: 20, y: 20}], 4, 'butt', 'miter'))
        const bevel = bounds(buildStroke([{x: 0, y: 0}, {x: 20, y: 0}, {x: 1, y: 0.2}], 4, 'butt', 'miter'))
        expect(miter.minY).toBeCloseTo(-2)
        expect(miter.maxX).toBeCloseTo(22)
        expect(bevel.maxX).toBeLessThan(30)
    })
})
