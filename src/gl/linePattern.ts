export type LinePatternPlacement = {
    x: number
    y: number
    patternSize: number
    width: number
    height: number
    patternMouseCentered: boolean
    angle: number
    xc: number
    yc: number
    xd: number
    yd: number
}

export type PatternInverse = {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
}

export const linePatternMatrix = (p: LinePatternPlacement): DOMMatrix => {
    const mouseX = p.patternMouseCentered ? p.x - p.width / 2 : 0
    const mouseY = p.patternMouseCentered ? p.y - p.height / 2 : 0
    return new DOMMatrix()
        .translateSelf(mouseX, mouseY)
        .translateSelf(p.xd, -p.yd)
        .translateSelf(p.width / 2 + p.xc, p.height / 2 - p.yc)
        .rotateSelf(p.angle)
        .scaleSelf(p.patternSize)
        .translateSelf(-p.width / 2 - p.xc, -p.height / 2 + p.yc)
}

export const linePatternInverse = (p: LinePatternPlacement): PatternInverse | null => {
    const inv = linePatternMatrix(p).inverse()
    if (![inv.a, inv.b, inv.c, inv.d, inv.e, inv.f].every(Number.isFinite)) {
        return null
    }
    return {a: inv.a, b: inv.b, c: inv.c, d: inv.d, e: inv.e, f: inv.f}
}
