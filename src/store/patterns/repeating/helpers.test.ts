import {describe, expect, it} from 'vitest'
import {getRepeatingCoords} from './helpers'
import {ERepeatsType, RepeatsParams} from './types'

const flat = (patch: Partial<RepeatsParams['typeParams'][ERepeatsType.FlatGrid]> = {}): RepeatsParams => ({
    type: ERepeatsType.FlatGrid,
    typeParams: {
        [ERepeatsType.FlatGrid]: {xd: 2, yd: 2, xOut: 1, yOut: 1, float: false, ...patch},
        [ERepeatsType.BezierGrid]: {
            xd: 2, yd: 2, xn0: 1, yn0: 1, xn1: 1, yn1: 1, float: false,
            bezierPoints: [{x: 0, y: 0}, {x: 25, y: 25}, {x: 75, y: 75}, {x: 100, y: 100}],
        },
    },
})

const bezier = (
    points: {x: number, y: number}[],
    patch: Partial<RepeatsParams['typeParams'][ERepeatsType.BezierGrid]> = {},
): RepeatsParams => ({
    type: ERepeatsType.BezierGrid,
    typeParams: {
        ...flat().typeParams,
        [ERepeatsType.BezierGrid]: {
            xd: 2, yd: 2, xn0: 1, yn0: 1, xn1: 1, yn1: 1, float: false,
            bezierPoints: points,
            ...patch,
        },
    },
})

const at = (repeatsParams: RepeatsParams | null, x: number, y: number, width = 100, height = 80) =>
    getRepeatingCoords({repeatsParams: repeatsParams as RepeatsParams, width, height, x, y})

describe('repeating points', () => {
    it('keeps a single point when repeats are off', () => {
        const points = getRepeatingCoords({repeatsParams: null as unknown as RepeatsParams, width: 100, height: 80, x: 30, y: 20})
        expect(points).toEqual([{x: 30, y: 20, id: '0-0'}])
    })

    it('does not build a grid for Center or Dart', () => {
        for (const type of [ERepeatsType.Center, ERepeatsType.Dart]) {
            const points = at({...flat(), type}, 30, 20)
            expect(points).toEqual([{x: 30, y: 20, id: '0-0'}])
        }
    })

    it('steps a flat grid by width and height over the cell count, including the outer cells', () => {
        const points = at(flat(), 30, 20)
        expect(points).toHaveLength(16)
        expect(points[0]).toMatchObject({x: 30 - 50, y: 20 - 40, id: '-1--1'})
        expect(points.find(p => p.id === '0-0')).toMatchObject({x: 30, y: 20})
        expect(points.find(p => p.id === '1-0')).toMatchObject({x: 80, y: 20})
        const moved = at(flat(), 36, 28)
        expect(moved.map(p => p.id)).toEqual(points.map(p => p.id))
        const dx = moved[0].x - points[0].x
        const dy = moved[0].y - points[0].y
        moved.forEach((p, i) => {
            expect(p.x - points[i].x).toBeCloseTo(dx)
            expect(p.y - points[i].y).toBeCloseTo(dy)
        })
    })

    it('changes the flat step when the cell count is fractional', () => {
        const points = at(flat({xd: 2.5, yd: 2, xOut: 0, yOut: 0, float: true}), 10, 10, 100, 80)
        expect(points.find(p => p.id === '1-0')?.x).toBeCloseTo(10 + 100 / 2.5)
    })

    it('does not match the default diagonal curve to the flat grid', () => {
        const straight = [{x: 0, y: 0}, {x: 25, y: 25}, {x: 75, y: 75}, {x: 100, y: 100}]
        const curved = at(bezier(straight, {xn0: 1, yn0: 1, xn1: 1, yn1: 1}), 30, 20)
        const grid = at(flat(), 30, 20)
        const same = curved.every((p, i) => Math.abs(p.x - grid[i].x) < 0.01 && Math.abs(p.y - grid[i].y) < 0.01)
        expect(same).toBe(false)
    })

    it('warps bezier x and y separately and keeps cell ids', () => {
        const bend = [{x: 0, y: 0}, {x: 0, y: 90}, {x: 100, y: 10}, {x: 100, y: 100}]
        const params = bezier(bend, {xn0: 0, yn0: 0, xn1: 1, yn1: 1})
        const a = at(params, 20, 30)
        const b = at(params, 50, 30)
        expect(b.map(p => p.id)).toEqual(a.map(p => p.id))
        a.forEach((p, i) => expect(b[i].y).toBeCloseTo(p.y))
        expect(b.some((p, i) => Math.abs(p.x - a[i].x) > 0.5)).toBe(true)
        const shift = b[0].x - a[0].x
        expect(b.every((p, i) => Math.abs((p.x - a[i].x) - shift) < 0.01)).toBe(false)
    })
})
