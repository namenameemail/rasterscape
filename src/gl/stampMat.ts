export type StampDrawParams = {
    x: number
    y: number
    angleB: number
    angleD: number
    xc: number
    yc: number
    xd: number
    yd: number
    width: number
    height: number
}

const deg = (a: number) => (a * Math.PI) / 180

export const mulMat3 = (a: Float32Array, b: Float32Array): Float32Array => {
    const o = new Float32Array(9)
    for (let col = 0; col < 3; col++) {
        for (let row = 0; row < 3; row++) {
            o[col * 3 + row] =
                a[0 * 3 + row] * b[col * 3 + 0] +
                a[1 * 3 + row] * b[col * 3 + 1] +
                a[2 * 3 + row] * b[col * 3 + 2]
        }
    }
    return o
}

export const translateMat3 = (tx: number, ty: number): Float32Array =>
    new Float32Array([
        1, 0, 0,
        0, 1, 0,
        tx, ty, 1,
    ])

export const rotateMat3 = (angleDeg: number): Float32Array => {
    const r = deg(angleDeg)
    const c = Math.cos(r)
    const s = Math.sin(r)
    return new Float32Array([
        c, s, 0,
        -s, c, 0,
        0, 0, 1,
    ])
}

export const stampCanvasMat = (p: StampDrawParams): Float32Array => {
    let m = translateMat3(p.x, p.y)
    m = mulMat3(m, rotateMat3(-p.angleD))
    m = mulMat3(m, translateMat3(p.xd, p.yd))
    m = mulMat3(m, translateMat3(p.xc, p.yc))
    m = mulMat3(m, rotateMat3(p.angleB))
    m = mulMat3(m, translateMat3(-p.xc, -p.yc))
    return m
}
