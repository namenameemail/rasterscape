import {describe, expect, it} from 'vitest'
import {HelperCanvas} from '../../../utils/canvas/helpers/base'
import {paintCoverage} from './coverage'

const recorder = () => {
    const ops: string[] = []
    const context = {
        setTransform: () => undefined,
        clearRect: () => ops.push('clear'),
        beginPath: () => undefined,
        moveTo: (x: number) => ops.push(`m${x}`),
        lineTo: (x: number) => ops.push(`l${x}`),
        stroke: () => ops.push('stroke'),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        strokeStyle: '',
        lineWidth: 0,
        lineCap: 'butt',
        lineJoin: 'miter',
    }
    const shape = {canvas: {width: 10, height: 10}, context, clear: () => undefined} as unknown as HelperCanvas
    return {shape, ops, context}
}

describe('line coverage', () => {
    it('strokes only the new corner while the line grows, and the whole line when the width changes', () => {
        const {shape, ops} = recorder()
        const trail = [{x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}]
        let painted = 0
        trail.forEach((_, i) => {
            painted = paintCoverage(shape, trail.slice(0, i + 1), painted, 0, 0, 4, 'round', 'round')
        })
        expect(ops.filter(op => op === 'clear')).toHaveLength(1)
        expect(ops).toEqual(['clear', 'm1', 'l2', 'stroke', 'm1', 'l2', 'l3', 'stroke', 'm2', 'l3', 'l4', 'stroke'])
        ops.length = 0
        paintCoverage(shape, trail, 0, 0, 0, 12, 'round', 'round')
        expect(ops[0]).toBe('clear')
        expect(ops).toContain('l4')
        expect(ops.filter(op => op.startsWith('l') || op.startsWith('m'))).toEqual(['m1', 'l2', 'l3', 'l4'])
    })
})
