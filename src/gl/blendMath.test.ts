import {describe, expect, it} from 'vitest'
import {ECompositeOperation} from '../store/compositeOperations'
import {compositeOperationSelectItems} from '../store/compositeOperations'
import {BLEND_MODE_ID, blendModeId} from './blendModes'
import {compositeBlend, premulToStraight, type Straight} from './blendMath'

const px = (r: number, g: number, b: number, a: number): Straight => ({r, g, b, a})

const near = (got: Straight, exp: Straight, eps = 1e-4) => {
    expect(got.r).toBeCloseTo(exp.r, 3)
    expect(got.g).toBeCloseTo(exp.g, 3)
    expect(got.b).toBeCloseTo(exp.b, 3)
    expect(got.a).toBeCloseTo(exp.a, 3)
    void eps
}

describe('blend modes', () => {
    it('maps every select item to a unique id', () => {
        const ids = compositeOperationSelectItems.map(item => blendModeId(item.value as ECompositeOperation))
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids).toContain(BLEND_MODE_ID[ECompositeOperation.SourceOver])
        expect(blendModeId(ECompositeOperation.SourceOver)).toBe(0)
    })

    it('source-over matches premul hardware blend on opaque dest', () => {
        const src = px(1, 0, 0, 0.5)
        const dst = px(0, 0, 1, 1)
        const out = compositeBlend(src, dst, blendModeId(ECompositeOperation.SourceOver))
        near(premulToStraight(out), px(0.5, 0, 0.5, 1))
    })

    it('destination-out erases by source alpha', () => {
        const src = px(0, 0, 0, 0.5)
        const dst = px(0, 0, 1, 1)
        const out = premulToStraight(compositeBlend(src, dst, blendModeId(ECompositeOperation.DestinationOut)))
        near(out, px(0, 0, 1, 0.5))
    })

    it('multiply darkens opaque blue by red', () => {
        const src = px(1, 0, 0, 1)
        const dst = px(0, 0, 1, 1)
        const out = premulToStraight(compositeBlend(src, dst, blendModeId(ECompositeOperation.multiply)))
        near(out, px(0, 0, 0, 1))
    })

    it('screen of black stays dest', () => {
        const src = px(0, 0, 0, 1)
        const dst = px(0.2, 0.4, 0.6, 1)
        const out = premulToStraight(compositeBlend(src, dst, blendModeId(ECompositeOperation.screen)))
        near(out, px(0.2, 0.4, 0.6, 1))
    })

    it('canvas source-over and multiply stay within rounding of the formula', () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return
        }

        const paint = (mode: GlobalCompositeOperation, src: Straight) => {
            ctx.clearRect(0, 0, 1, 1)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1
            ctx.fillStyle = 'rgb(0, 0, 255)'
            ctx.fillRect(0, 0, 1, 1)
            ctx.globalCompositeOperation = mode
            ctx.globalAlpha = src.a
            ctx.fillStyle = `rgb(${src.r * 255}, ${src.g * 255}, ${src.b * 255})`
            ctx.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
            return px(r / 255, g / 255, b / 255, a / 255)
        }

        const cases: [ECompositeOperation, Straight][] = [
            [ECompositeOperation.SourceOver, px(1, 0, 0, 0.5)],
            [ECompositeOperation.multiply, px(1, 0, 0, 1)],
            [ECompositeOperation.screen, px(1, 1, 1, 1)],
            [ECompositeOperation.DestinationOut, px(0, 0, 0, 0.25)],
            [ECompositeOperation.overlay, px(1, 0, 0, 1)],
            [ECompositeOperation.hue, px(1, 0, 0, 1)],
        ]

        for (const [mode, src] of cases) {
            const fromCanvas = paint(mode, src)
            const fromFormula = premulToStraight(compositeBlend(
                src,
                px(0, 0, 1, 1),
                blendModeId(mode),
            ))
            expect(fromFormula.r).toBeCloseTo(fromCanvas.r, 1)
            expect(fromFormula.g).toBeCloseTo(fromCanvas.g, 1)
            expect(fromFormula.b).toBeCloseTo(fromCanvas.b, 1)
            expect(fromFormula.a).toBeCloseTo(fromCanvas.a, 1)
        }
    })
})
