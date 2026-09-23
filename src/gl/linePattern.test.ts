import {describe, expect, it} from 'vitest'
import {linePatternInverse, linePatternMatrix, type LinePatternPlacement} from './linePattern'

const placement = (patch: Partial<LinePatternPlacement> = {}): LinePatternPlacement => ({
    x: 10,
    y: 20,
    patternSize: 1,
    width: 8,
    height: 6,
    patternMouseCentered: false,
    angle: 0,
    xc: 0,
    yc: 0,
    xd: 0,
    yd: 0,
    ...patch,
})

describe('line pattern matrix', () => {
    it('maps the pattern center onto the pointer when centering is on', () => {
        const p = placement({patternMouseCentered: true, x: 30, y: 40, patternSize: 1.5})
        const center = linePatternMatrix(p).transformPoint(new DOMPoint(p.width / 2, p.height / 2))
        expect(center.x).toBeCloseTo(p.x)
        expect(center.y).toBeCloseTo(p.y)
    })

    it('samples the same pixel as createPattern', () => {
        const src = document.createElement('canvas')
        src.width = 2
        src.height = 2
        const sctx = src.getContext('2d')
        const dest = document.createElement('canvas')
        dest.width = 4
        dest.height = 4
        const ctx = dest.getContext('2d')
        if (!sctx || !ctx) return

        const paint = (x: number, y: number, color: string) => {
            sctx.fillStyle = color
            sctx.fillRect(x, y, 1, 1)
        }
        paint(0, 0, '#ff0000')
        paint(1, 0, '#00ff00')
        paint(0, 1, '#0000ff')
        paint(1, 1, '#ffffff')

        const p = placement({
            x: 3,
            y: 2,
            patternSize: 1,
            width: 2,
            height: 2,
            patternMouseCentered: true,
        })
        const pattern = ctx.createPattern(src, 'repeat')
        if (!pattern) return
        pattern.setTransform(linePatternMatrix(p))
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, 4, 4)

        const inv = linePatternInverse(p)
        expect(inv).not.toBeNull()
        const data = ctx.getImageData(0, 0, 4, 4).data
        const srcData = sctx.getImageData(0, 0, 2, 2).data
        let painted = 0
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const lx = inv!.a * (x + 0.5) + inv!.c * (y + 0.5) + inv!.e
                const ly = inv!.b * (x + 0.5) + inv!.d * (y + 0.5) + inv!.f
                const sx = ((Math.floor(lx) % 2) + 2) % 2
                const sy = ((Math.floor(ly) % 2) + 2) % 2
                const i = (y * 4 + x) * 4
                const j = (sy * 2 + sx) * 4
                if (data[i + 3] === 0) continue
                painted++
                expect(data[i]).toBe(srcData[j])
                expect(data[i + 1]).toBe(srcData[j + 1])
                expect(data[i + 2]).toBe(srcData[j + 2])
            }
        }
        expect(painted).toBeGreaterThan(0)
    })

    it('inverse returns the pattern point for a canvas point', () => {
        const p = placement({patternMouseCentered: true, angle: 40, patternSize: 2, xc: 1, yd: -3})
        const inv = linePatternInverse(p)
        expect(inv).not.toBeNull()
        const src = new DOMPoint(1.5, 4)
        const canvas = linePatternMatrix(p).transformPoint(src)
        const x = inv!.a * canvas.x + inv!.c * canvas.y + inv!.e
        const y = inv!.b * canvas.x + inv!.d * canvas.y + inv!.f
        expect(x).toBeCloseTo(src.x)
        expect(y).toBeCloseTo(src.y)
    })

    it('rejects a zero pattern scale', () => {
        expect(linePatternInverse(placement({patternSize: 0}))).toBeNull()
    })
})
