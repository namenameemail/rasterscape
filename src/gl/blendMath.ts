import {ECompositeOperation} from '../store/compositeOperations'
import {BLEND_MODE_ID} from './blendModes'

export type Straight = {r: number, g: number, b: number, a: number}

const M = {
    sourceOver: BLEND_MODE_ID[ECompositeOperation.SourceOver],
    destinationOut: BLEND_MODE_ID[ECompositeOperation.DestinationOut],
    sourceAtop: BLEND_MODE_ID[ECompositeOperation.SourceAtop],
    destinationOver: BLEND_MODE_ID[ECompositeOperation.DestinationOver],
    lighter: BLEND_MODE_ID[ECompositeOperation.Lighter],
    xor: BLEND_MODE_ID[ECompositeOperation.Xor],
    multiply: BLEND_MODE_ID[ECompositeOperation.multiply],
    screen: BLEND_MODE_ID[ECompositeOperation.screen],
    overlay: BLEND_MODE_ID[ECompositeOperation.overlay],
    darken: BLEND_MODE_ID[ECompositeOperation.darken],
    lighten: BLEND_MODE_ID[ECompositeOperation.lighten],
    colorDodge: BLEND_MODE_ID[ECompositeOperation.colorDodge],
    colorBurn: BLEND_MODE_ID[ECompositeOperation.colorBurn],
    hardLight: BLEND_MODE_ID[ECompositeOperation.hardLight],
    softLight: BLEND_MODE_ID[ECompositeOperation.softLight],
    difference: BLEND_MODE_ID[ECompositeOperation.difference],
    exclusion: BLEND_MODE_ID[ECompositeOperation.exclusion],
    hue: BLEND_MODE_ID[ECompositeOperation.hue],
    saturation: BLEND_MODE_ID[ECompositeOperation.saturation],
    color: BLEND_MODE_ID[ECompositeOperation.color],
    luminosity: BLEND_MODE_ID[ECompositeOperation.luminosity],
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const lum = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b

const clipColor = (r: number, g: number, b: number): [number, number, number] => {
    const l = lum(r, g, b)
    const n = Math.min(r, g, b)
    const x = Math.max(r, g, b)
    if (n < 0) {
        const s = l / (l - n)
        r = l + (r - l) * s
        g = l + (g - l) * s
        b = l + (b - l) * s
    }
    if (x > 1) {
        const s = (1 - l) / (x - l)
        r = l + (r - l) * s
        g = l + (g - l) * s
        b = l + (b - l) * s
    }
    return [r, g, b]
}

const setLum = (r: number, g: number, b: number, l: number): [number, number, number] => {
    const d = l - lum(r, g, b)
    return clipColor(r + d, g + d, b + d)
}

const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b)

const setSat = (r: number, g: number, b: number, s: number): [number, number, number] => {
    const mn = Math.min(r, g, b)
    const mx = Math.max(r, g, b)
    if (mx <= mn) {
        return [0, 0, 0]
    }
    const scale = s / (mx - mn)
    return [(r - mn) * scale, (g - mn) * scale, (b - mn) * scale]
}

const soft = (cb: number, cs: number) => {
    if (cs <= 0.5) {
        return cb - (1 - 2 * cs) * cb * (1 - cb)
    }
    const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb)
    return cb + (2 * cs - 1) * (d - cb)
}

const dodge = (cb: number, cs: number) => {
    if (cb <= 0) return 0
    if (cs >= 1) return 1
    return Math.min(1, cb / (1 - cs))
}

const burn = (cb: number, cs: number) => {
    if (cb >= 1) return 1
    if (cs <= 0) return 0
    return 1 - Math.min(1, (1 - cb) / cs)
}

const hard = (cb: number, cs: number) =>
    cs <= 0.5 ? 2 * cs * cb : 1 - 2 * (1 - cs) * (1 - cb)

const overlay = (cb: number, cs: number) => hard(cs, cb)

const separable = (cb: number, cs: number, mode: number) => {
    if (mode === M.multiply) return cb * cs
    if (mode === M.screen) return cb + cs - cb * cs
    if (mode === M.overlay) return overlay(cb, cs)
    if (mode === M.darken) return Math.min(cb, cs)
    if (mode === M.lighten) return Math.max(cb, cs)
    if (mode === M.colorDodge) return dodge(cb, cs)
    if (mode === M.colorBurn) return burn(cb, cs)
    if (mode === M.hardLight) return hard(cb, cs)
    if (mode === M.softLight) return soft(cb, cs)
    if (mode === M.difference) return Math.abs(cb - cs)
    if (mode === M.exclusion) return cb + cs - 2 * cb * cs
    return cs
}

const nonSeparable = (
    cr: number, cg: number, cb: number,
    sr: number, sg: number, sb: number,
    mode: number,
): [number, number, number] => {
    if (mode === M.hue) {
        const [r, g, b] = setSat(sr, sg, sb, sat(cr, cg, cb))
        return setLum(r, g, b, lum(cr, cg, cb))
    }
    if (mode === M.saturation) {
        const [r, g, b] = setSat(cr, cg, cb, sat(sr, sg, sb))
        return setLum(r, g, b, lum(cr, cg, cb))
    }
    if (mode === M.color) {
        return setLum(sr, sg, sb, lum(cr, cg, cb))
    }
    return setLum(cr, cg, cb, lum(sr, sg, sb))
}

export function compositeBlend(src: Straight, dstPremul: Straight, mode: number): Straight {
    const as = src.a
    const ab = dstPremul.a
    const Cs: [number, number, number] = [src.r, src.g, src.b]
    const premulDst: [number, number, number] = [dstPremul.r, dstPremul.g, dstPremul.b]
    const Cb: [number, number, number] = ab > 1e-5
        ? [premulDst[0] / ab, premulDst[1] / ab, premulDst[2] / ab]
        : [0, 0, 0]

    let co: [number, number, number]
    let ao: number

    if (mode >= M.multiply) {
        const B = mode >= M.hue
            ? nonSeparable(Cb[0], Cb[1], Cb[2], Cs[0], Cs[1], Cs[2], mode)
            : [
                separable(Cb[0], Cs[0], mode),
                separable(Cb[1], Cs[1], mode),
                separable(Cb[2], Cs[2], mode),
            ] as [number, number, number]
        co = [
            as * (1 - ab) * Cs[0] + as * ab * B[0] + (1 - as) * premulDst[0],
            as * (1 - ab) * Cs[1] + as * ab * B[1] + (1 - as) * premulDst[1],
            as * (1 - ab) * Cs[2] + as * ab * B[2] + (1 - as) * premulDst[2],
        ]
        ao = as + ab * (1 - as)
    } else {
        let Fa = 1
        let Fb = 1 - as
        if (mode === M.destinationOut) {
            Fa = 0
            Fb = 1 - as
        } else if (mode === M.sourceAtop) {
            Fa = ab
            Fb = 1 - as
        } else if (mode === M.destinationOver) {
            Fa = 1 - ab
            Fb = 1
        } else if (mode === M.lighter) {
            Fa = 1
            Fb = 1
        } else if (mode === M.xor) {
            Fa = 1 - ab
            Fb = 1 - as
        }
        co = [
            as * Fa * Cs[0] + Fb * premulDst[0],
            as * Fa * Cs[1] + Fb * premulDst[1],
            as * Fa * Cs[2] + Fb * premulDst[2],
        ]
        ao = as * Fa + ab * Fb
    }

    ao = clamp01(ao)
    return {
        r: clamp01(co[0]),
        g: clamp01(co[1]),
        b: clamp01(co[2]),
        a: ao,
    }
}

export function premulToStraight(c: Straight): Straight {
    if (c.a <= 1e-5) {
        return {r: 0, g: 0, b: 0, a: 0}
    }
    return {r: c.r / c.a, g: c.g / c.a, b: c.b / c.a, a: c.a}
}
