export type StrokePoint = {x: number, y: number}

const MITER_LIMIT = 10

const add = (a: StrokePoint, b: StrokePoint): StrokePoint => ({x: a.x + b.x, y: a.y + b.y})
const sub = (a: StrokePoint, b: StrokePoint): StrokePoint => ({x: a.x - b.x, y: a.y - b.y})
const mul = (a: StrokePoint, k: number): StrokePoint => ({x: a.x * k, y: a.y * k})

const pushTri = (out: number[], a: StrokePoint, b: StrokePoint, c: StrokePoint) => {
    out.push(a.x, a.y, b.x, b.y, c.x, c.y)
}

const arc = (out: number[], c: StrokePoint, a0: number, sweep: number, r: number) => {
    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 8)))
    let prev = {x: c.x + Math.cos(a0) * r, y: c.y + Math.sin(a0) * r}
    for (let i = 1; i <= steps; i++) {
        const a = a0 + sweep * (i / steps)
        const p = {x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r}
        pushTri(out, c, prev, p)
        prev = p
    }
}

const join = (
    out: number[],
    p: StrokePoint,
    d0: StrokePoint,
    d1: StrokePoint,
    n0: StrokePoint,
    n1: StrokePoint,
    hw: number,
    kind: CanvasLineJoin,
) => {
    const cross = d0.x * d1.y - d0.y * d1.x
    const dot = Math.min(1, Math.max(-1, d0.x * d1.x + d0.y * d1.y))
    if (Math.abs(cross) < 1e-6 && dot > 0) return
    const outer0 = add(p, cross > 0 ? mul(n0, -1) : n0)
    const outer1 = add(p, cross > 0 ? mul(n1, -1) : n1)
    const turn = Math.acos(dot)
    const sinHalf = Math.cos(turn / 2)
    const miter = kind === 'miter' && sinHalf > 1 / MITER_LIMIT
    if (kind === 'round') {
        let a0 = Math.atan2(outer0.y - p.y, outer0.x - p.x)
        let a1 = Math.atan2(outer1.y - p.y, outer1.x - p.x)
        let sweep = a1 - a0
        if (sweep > Math.PI) sweep -= Math.PI * 2
        if (sweep < -Math.PI) sweep += Math.PI * 2
        arc(out, p, a0, sweep, hw)
        return
    }
    if (miter) {
        const u0 = mul(sub(outer0, p), 1 / hw)
        const u1 = mul(sub(outer1, p), 1 / hw)
        const sum = add(u0, u1)
        const len = Math.hypot(sum.x, sum.y) || 1
        const bis = mul(sum, 1 / len)
        const along = u0.x * bis.x + u0.y * bis.y
        const tip = add(p, mul(bis, hw / (along || 1)))
        pushTri(out, outer0, tip, outer1)
    }
    pushTri(out, outer0, p, outer1)
}

export const buildStroke = (
    points: StrokePoint[],
    width: number,
    cap: CanvasLineCap,
    joinKind: CanvasLineJoin,
): Float32Array => {
    if (points.length < 2 || width <= 0) return new Float32Array()
    const hw = width / 2
    const src: StrokePoint[] = []
    for (const p of points) {
        const prev = src[src.length - 1]
        if (prev && prev.x === p.x && prev.y === p.y) continue
        src.push(p)
    }
    if (src.length < 2) return new Float32Array()

    if (cap === 'square') {
        const a = src[0]
        const b = src[1]
        const c = src[src.length - 1]
        const d = src[src.length - 2]
        const ab = Math.hypot(b.x - a.x, b.y - a.y) || 1
        const cd = Math.hypot(c.x - d.x, c.y - d.y) || 1
        src[0] = {x: a.x - (b.x - a.x) / ab * hw, y: a.y - (b.y - a.y) / ab * hw}
        src[src.length - 1] = {x: c.x + (c.x - d.x) / cd * hw, y: c.y + (c.y - d.y) / cd * hw}
    }

    const dirs: StrokePoint[] = []
    const norms: StrokePoint[] = []
    for (let i = 0; i < src.length - 1; i++) {
        const dx = src[i + 1].x - src[i].x
        const dy = src[i + 1].y - src[i].y
        const len = Math.hypot(dx, dy) || 1
        dirs.push({x: dx / len, y: dy / len})
        norms.push({x: -dy / len * hw, y: dx / len * hw})
    }

    const out: number[] = []
    if (cap === 'round') {
        const ang = Math.atan2(dirs[0].y, dirs[0].x)
        arc(out, src[0], ang + Math.PI / 2, Math.PI, hw)
    }
    for (let i = 0; i < dirs.length; i++) {
        const n = norms[i]
        const a = src[i]
        const b = src[i + 1]
        pushTri(out, add(a, n), sub(a, n), add(b, n))
        pushTri(out, sub(a, n), sub(b, n), add(b, n))
        if (i < dirs.length - 1) join(out, b, dirs[i], dirs[i + 1], n, norms[i + 1], hw, joinKind)
    }
    if (cap === 'round') {
        const ang = Math.atan2(dirs[dirs.length - 1].y, dirs[dirs.length - 1].x)
        arc(out, src[src.length - 1], ang - Math.PI / 2, Math.PI, hw)
    }
    return new Float32Array(out)
}
