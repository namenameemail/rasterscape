import vs from './shaders/vert.glsl'
import fsBody from './shaders/frag.glsl'
import fxyCut from './shaders/fxyCut.glsl'
import {getGlContext} from '../../../../../../gl/GlContext'
import {linkProgram} from '../../../../../../gl/program'
import {
    AnyFxyParams,
    FxyArrayParams,
    FxyType,
    ParabParams,
    Sis2Params,
    SqParams,
} from '../../../../../changeFunctions/functions/fxy'
import {CfDepthParams} from '../../../../../changeFunctions/functions/depth'
import {ECFType} from '../../../../../changeFunctions/types'
import {patternsService} from '../../../../../index'
import {CameraAxis, VideoOffset} from '../ShaderVideoModule/types'
import {
    CameraAxisToNumber,
    XYArrayCutFunctionTypeToNumber,
    XYCutFunctionTypeToNumber,
} from '../ShaderVideoModule/utils'
import {toInt32Array} from '../../../../../../utils/int32ArrayJson'
import {profileLogger} from '../../../../../../utils/profiling/ProfileLogger'
import {profileDebug} from '../../../../../../utils/profileDebug'

type UvMode = 'face' | 'wallX' | 'wallY'
type GeoFace = 'x0' | 'x1' | 'y0' | 'y1' | 'z0' | 'z1' | 'none'

const intersectAabbCpu = (
    ro: [number, number, number],
    rd: [number, number, number],
): {t0: number; t1: number} | null => {
    let t0 = -Infinity
    let t1 = Infinity
    for (let i = 0; i < 3; i++) {
        const inv = 1 / rd[i]
        let tmin = (0 - ro[i]) * inv
        let tmax = (1 - ro[i]) * inv
        if (tmin > tmax) {
            const tmp = tmin
            tmin = tmax
            tmax = tmp
        }
        t0 = Math.max(t0, tmin)
        t1 = Math.min(t1, tmax)
        if (t1 < Math.max(t0, 0)) {
            return null
        }
    }
    return {t0, t1}
}

const entryFaceAt = (
    ro: [number, number, number],
    rd: [number, number, number],
    tEnter: number,
): {face: GeoFace; p: [number, number, number]} => {
    const p: [number, number, number] = [
        ro[0] + rd[0] * tEnter,
        ro[1] + rd[1] * tEnter,
        ro[2] + rd[2] * tEnter,
    ]
    const eps = 1e-3
    let face: GeoFace = 'none'
    let best = Infinity
    const candidates: Array<[GeoFace, number]> = [
        ['x0', Math.abs(p[0] - 0)],
        ['x1', Math.abs(p[0] - 1)],
        ['y0', Math.abs(p[1] - 0)],
        ['y1', Math.abs(p[1] - 1)],
        ['z0', Math.abs(p[2] - 0)],
        ['z1', Math.abs(p[2] - 1)],
    ]
    for (const [f, d] of candidates) {
        if (d < best && d < eps) {
            best = d
            face = f
        }
    }
    if (face === 'none') {
        let bi = 0
        for (let i = 1; i < 3; i++) {
            if (Math.abs(rd[i]) > Math.abs(rd[bi])) {
                bi = i
            }
        }
        const at0 = Math.abs(p[bi] - 0) < Math.abs(p[bi] - 1)
        face = (['x0', 'y0', 'z0'] as const)[bi]
        if (!at0) {
            face = (['x1', 'y1', 'z1'] as const)[bi]
        }
    }
    return {face, p}
}

const sampleUvAt = (
    p: [number, number, number],
    offset: VideoOffset,
    texW = 256,
    texH = 256,
): {mode: UvMode; uv: [number, number]} => {
    const x0 = Math.min(offset.x0, offset.x1)
    const x1 = Math.max(offset.x0, offset.x1)
    const y0 = Math.min(offset.y0, offset.y1)
    const y1 = Math.max(offset.y0, offset.y1)
    const z0 = Math.min(offset.z0, offset.z1)
    const z1 = Math.max(offset.z0, offset.z1)
    const dX0 = Math.abs(p[0] - x0)
    const dX1 = Math.abs(p[0] - x1)
    const dY0 = Math.abs(p[1] - y0)
    const dY1 = Math.abs(p[1] - y1)
    const dZ = Math.min(Math.abs(p[2] - z0), Math.abs(p[2] - z1))
    const edgeX = dX0 < dX1 ? x0 : x1
    const dX = Math.min(dX0, dX1)
    const edgeY = dY0 < dY1 ? y0 : y1
    const dY = Math.min(dY0, dY1)
    const eps = Math.max(2 / Math.max(texW, texH), 0.01)
    const uv: [number, number] = [p[0], p[1]]
    if (dX <= dY && dX < dZ && dX < eps) {
        return {mode: 'wallX', uv: [edgeX, p[1]]}
    }
    if (dY < dX && dY < dZ && dY < eps) {
        return {mode: 'wallY', uv: [p[0], edgeY]}
    }
    return {mode: 'face', uv}
}

const isWallOnFront = (mode: UvMode, face: GeoFace): boolean => {
    if (mode === 'face') {
        return false
    }
    return face === 'z0' || face === 'z1'
}

export type VolumeViewPointer = {
    type: 'down' | 'move' | 'up'
    x: number
    y: number
    buttons: number
}

export type VolumeRenderParams = {
    queueOffset: number
    stackSize: number
    error?: number
    steps?: number
    direction?: CameraAxis
    offset?: VideoOffset
    ghost?: number
}

const DEFAULT_OFFSET: VideoOffset = {
    x0: 0,
    x1: 1,
    y0: 0,
    y1: 1,
    z0: 0,
    z1: 1,
}

const QUAD = new Float32Array([
    -1, 1,
    -1, -1,
    1, 1,
    1, -1,
])

const VOLUME_SHADER_REV = 8

export class VideoVolumeView {
    // -Z: снаружи у грани p.z=0 (логический «новый» кадр), как 2D-видео по оси T
    yaw = -Math.PI / 2
    pitch = 0
    distance = 2.4

    private program: WebGLProgram | null = null
    private programRev = -1
    private quadBuffer: WebGLBuffer | null = null
    private frameTexture: WebGLTexture | null = null
    private frameW = 0
    private frameH = 0
    private dragging = false
    private lastX = 0
    private lastY = 0
    private cutFuncType = 0
    private cutParams: AnyFxyParams | CfDepthParams | null = null
    private lastOffset: VideoOffset = DEFAULT_OFFSET
    private lastAspect = 1
    private lastTanHalfFov = Math.tan((50 * Math.PI) / 180 / 2)
    private lastUvProbeKey = ''

    private ensureProgram = (): WebGLProgram => {
        const {gl} = getGlContext()
        if (this.program && this.programRev === VOLUME_SHADER_REV) {
            return this.program
        }
        if (this.program) {
            gl.deleteProgram(this.program)
            this.program = null
        }
        if (this.quadBuffer) {
            gl.deleteBuffer(this.quadBuffer)
            this.quadBuffer = null
        }
        const fs = (fsBody as string).replace('__FXY_CUT__', fxyCut as string)
        this.program = linkProgram(gl, vs, fs)
        this.programRev = VOLUME_SHADER_REV
        this.quadBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
        return this.program
    }

    private ensureFrame = (width: number, height: number): WebGLTexture => {
        const glc = getGlContext()
        if (!this.frameTexture) {
            this.frameTexture = glc.createTexture2D(width, height)
            this.frameW = width
            this.frameH = height
            return this.frameTexture
        }
        if (this.frameW !== width || this.frameH !== height) {
            glc.resizeTexture2D(this.frameTexture, width, height)
            this.frameW = width
            this.frameH = height
        }
        return this.frameTexture
    }

    private cameraBasis = (): {
        pos: [number, number, number]
        right: [number, number, number]
        up: [number, number, number]
        forward: [number, number, number]
    } => {
        const pitch = Math.max(-1.2, Math.min(1.2, this.pitch))
        const cy = Math.cos(this.yaw)
        const sy = Math.sin(this.yaw)
        const cp = Math.cos(pitch)
        const sp = Math.sin(pitch)
        const target: [number, number, number] = [0.5, 0.5, 0.5]
        const offset: [number, number, number] = [
            this.distance * cy * cp,
            this.distance * sp,
            this.distance * sy * cp,
        ]
        const pos: [number, number, number] = [
            target[0] + offset[0],
            target[1] + offset[1],
            target[2] + offset[2],
        ]
        const forward: [number, number, number] = [
            target[0] - pos[0],
            target[1] - pos[1],
            target[2] - pos[2],
        ]
        const fl = Math.hypot(forward[0], forward[1], forward[2]) || 1
        forward[0] /= fl
        forward[1] /= fl
        forward[2] /= fl
        const worldUp: [number, number, number] = [0, 1, 0]
        const right: [number, number, number] = [
            forward[1] * worldUp[2] - forward[2] * worldUp[1],
            forward[2] * worldUp[0] - forward[0] * worldUp[2],
            forward[0] * worldUp[1] - forward[1] * worldUp[0],
        ]
        const rl = Math.hypot(right[0], right[1], right[2]) || 1
        right[0] /= rl
        right[1] /= rl
        right[2] /= rl
        const up: [number, number, number] = [
            right[1] * forward[2] - right[2] * forward[1],
            right[2] * forward[0] - right[0] * forward[2],
            right[0] * forward[1] - right[1] * forward[0],
        ]
        return {pos, right, up, forward}
    }

    handlePointer = (e: VolumeViewPointer): void => {
        if (e.type === 'down' && e.buttons) {
            this.dragging = true
            this.lastX = e.x
            this.lastY = e.y
            return
        }
        if (e.type === 'up') {
            const wasDragging = this.dragging
            this.dragging = false
            if (wasDragging) {
                this.logUvProbe(true)
            }
            return
        }
        if (e.type === 'move' && this.dragging) {
            const dx = e.x - this.lastX
            const dy = e.y - this.lastY
            this.lastX = e.x
            this.lastY = e.y
            this.yaw -= dx * 0.01
            this.pitch += dy * 0.01
            this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch))
            this.logUvProbe(false)
        }
    }

    private logUvProbe = (force: boolean): void => {
        if (!profileLogger.isRecording) {
            return
        }
        const cam = this.cameraBasis()
        const offset = this.lastOffset
        const absFwd = [
            +Math.abs(cam.forward[0]).toFixed(3),
            +Math.abs(cam.forward[1]).toFixed(3),
            +Math.abs(cam.forward[2]).toFixed(3),
        ]
        const probes = [
            {ndc: [0, 0] as [number, number], label: 'center'},
            {ndc: [-0.6, 0] as [number, number], label: 'left'},
            {ndc: [0.6, 0] as [number, number], label: 'right'},
            {ndc: [0, 0.6] as [number, number], label: 'top'},
            {ndc: [0, -0.6] as [number, number], label: 'bottom'},
        ].map(({ndc, label}) => {
            const rd: [number, number, number] = [
                cam.forward[0]
                    + cam.right[0] * (-ndc[0] * this.lastAspect * this.lastTanHalfFov)
                    + cam.up[0] * (ndc[1] * this.lastTanHalfFov),
                cam.forward[1]
                    + cam.right[1] * (-ndc[0] * this.lastAspect * this.lastTanHalfFov)
                    + cam.up[1] * (ndc[1] * this.lastTanHalfFov),
                cam.forward[2]
                    + cam.right[2] * (-ndc[0] * this.lastAspect * this.lastTanHalfFov)
                    + cam.up[2] * (ndc[1] * this.lastTanHalfFov),
            ]
            const rl = Math.hypot(rd[0], rd[1], rd[2]) || 1
            rd[0] /= rl
            rd[1] /= rl
            rd[2] /= rl
            const hit = intersectAabbCpu(cam.pos, rd)
            if (!hit) {
                return {label, miss: true}
            }
            const tEnter = Math.max(hit.t0, 0)
            const {face, p} = entryFaceAt(cam.pos, rd, tEnter)
            const sampled = sampleUvAt(p, offset)
            const wallOnFront = isWallOnFront(sampled.mode, face)
            return {
                label,
                face,
                mode: sampled.mode,
                sampleUv: sampled.uv.map((v) => +v.toFixed(3)),
                p: [+p[0].toFixed(3), +p[1].toFixed(3), +p[2].toFixed(3)],
                wallOnFront,
            }
        })
        const anyWallOnFront = probes.some((p) => 'wallOnFront' in p && p.wallOnFront)
        const key = probes
            .map((p) => (
                'face' in p
                    ? `${p.label}:${p.face}:${p.mode}:${p.wallOnFront ? 1 : 0}`
                    : `${p.label}:miss`
            ))
            .join('|')
        if (!force && key === this.lastUvProbeKey) {
            return
        }
        this.lastUvProbeKey = key
        profileDebug('video', 'volume.uvProbe', {
            force,
            remap: 'geoWall',
            yaw: +this.yaw.toFixed(3),
            pitch: +this.pitch.toFixed(3),
            forward: cam.forward.map((v) => +v.toFixed(3)),
            absFwd,
            offset: {
                x0: offset.x0,
                x1: offset.x1,
                y0: offset.y0,
                y1: offset.y1,
                z0: offset.z0,
                z1: offset.z1,
            },
            anyWallOnFront,
            probes,
        })
    }

    clearCut = (): void => {
        this.cutFuncType = 0
        this.cutParams = null
    }

    setFxyCut = (type: FxyType, params: AnyFxyParams): void => {
        this.cutFuncType = XYCutFunctionTypeToNumber[type] ?? 0
        this.cutParams = params
    }

    setDepthCut = (params: CfDepthParams): void => {
        this.cutFuncType = XYCutFunctionTypeToNumber[ECFType.DEPTH]
        this.cutParams = params
    }

    private bindDepthSamplerSlots = (gl: WebGL2RenderingContext, program: WebGLProgram): void => {
        const dummy = getGlContext().ensureWhiteTex()
        for (let i = 0; i < 4; i++) {
            const unit = 1 + i
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, dummy)
            gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamTexture_' + i), unit)
        }
        gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI5'), 0)
    }

    private bindDepthCut = (gl: WebGL2RenderingContext, program: WebGLProgram): void => {
        const params = this.cutParams as CfDepthParams
        const items = (params.items?.length > 4 ? params.items.slice(0, 4) : params.items) ?? []
        gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI5'), items.length)

        items.forEach((item, index) => {
            const buffer = patternsService.pattern[item.patternId]?.canvasService.buffer
            if (!buffer) {
                return
            }
            const unit = 1 + index
            profileLogger.time('video.volume.depth.texture', () => {
                const texture = buffer.ensureGpu()
                gl.activeTexture(gl.TEXTURE0 + unit)
                gl.bindTexture(gl.TEXTURE_2D, texture)
            })
            gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI' + index), item.component)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF' + (index * 2)), item.zed)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF' + (index * 2 + 1)), item.zd)
        })
    }

    private bindCutUniforms = (gl: WebGL2RenderingContext, program: WebGLProgram, params: VolumeRenderParams): void => {
        this.bindDepthSamplerSlots(gl, program)

        gl.uniform1i(gl.getUniformLocation(program, 'u_CutFuncType'), this.cutFuncType)
        gl.uniform1i(
            gl.getUniformLocation(program, 'u_Direction'),
            CameraAxisToNumber[params.direction ?? CameraAxis.T] ?? 1,
        )
        const offset = params.offset ?? DEFAULT_OFFSET
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_x0'), offset.x0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_x1'), offset.x1)
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_y0'), offset.y0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_y1'), offset.y1)
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_z0'), offset.z0)
        gl.uniform1f(gl.getUniformLocation(program, 'u_CutOffset_z1'), offset.z1)
        gl.uniform1f(gl.getUniformLocation(program, 'u_ghost'), params.ghost ?? 0)

        if (!this.cutFuncType || !this.cutParams) {
            return
        }

        if (this.cutFuncType === XYCutFunctionTypeToNumber[ECFType.DEPTH]) {
            this.bindDepthCut(gl, program)
            return
        }

        if (this.cutFuncType === XYCutFunctionTypeToNumber[FxyType.Parab]) {
            const p = this.cutParams as ParabParams
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF0'), p.end)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF1'), p.zd)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF2'), p.x)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF3'), p.y)
            return
        }

        if (this.cutFuncType === XYCutFunctionTypeToNumber[FxyType.Sis2]) {
            const p = this.cutParams as Sis2Params
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF0'), p.end)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF1'), p.cosA)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF2'), p.h)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF3'), p.xN)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF4'), p.yN)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF5'), p.xD)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF6'), p.yD)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF7'), p.XA)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF8'), p.xdd)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF9'), p.ydd)
            return
        }

        if (this.cutFuncType === XYCutFunctionTypeToNumber[FxyType.Sq]) {
            const p = this.cutParams as SqParams
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF0'), p.a)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF1'), p.b)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF2'), p.c)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF3'), p.h)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF4'), p.end)
            return
        }

        if (this.cutFuncType === XYCutFunctionTypeToNumber[FxyType.Array]) {
            const p = this.cutParams as FxyArrayParams
            const typeParams = p.typeParams[p.type]
            gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI0'), XYArrayCutFunctionTypeToNumber[p.type])
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF1'), typeParams.from)
            gl.uniform1f(gl.getUniformLocation(program, 'u_CFParamF2'), typeParams.to)
            gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI3'), typeParams.drawWidth)
            gl.uniform1i(gl.getUniformLocation(program, 'u_CFParamI4'), typeParams.drawHeight)
            gl.uniform1iv(gl.getUniformLocation(program, 'u_CFParamIV0'), toInt32Array(typeParams.valuesArray))
        }
    }

    render = (
        cubeTexture: WebGLTexture,
        width: number,
        height: number,
        params: VolumeRenderParams,
    ): WebGLTexture => {
        const glc = getGlContext()
        const {gl} = glc
        const program = this.ensureProgram()
        const frame = this.ensureFrame(width, height)
        const cam = this.cameraBasis()
        const error = params.error ?? 2
        const stackSize = Math.max(params.stackSize, 1)
        const stackScale = (stackSize - error) / stackSize
        const queueOffset = params.queueOffset / stackSize
        const steps = params.steps ?? 64
        const aspect = width / Math.max(height, 1)
        const tanHalfFov = Math.tan((50 * Math.PI) / 180 / 2)
        this.lastOffset = params.offset ?? DEFAULT_OFFSET
        this.lastAspect = aspect
        this.lastTanHalfFov = tanHalfFov
        this.logUvProbe(false)

        glc.bindTexture2DTarget(frame, width, height)
        gl.useProgram(program)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_3D, cubeTexture)
        gl.uniform1i(gl.getUniformLocation(program, 'u_volume'), 0)
        gl.uniform3fv(gl.getUniformLocation(program, 'u_camPos'), cam.pos)
        gl.uniform3fv(gl.getUniformLocation(program, 'u_camRight'), cam.right)
        gl.uniform3fv(gl.getUniformLocation(program, 'u_camUp'), cam.up)
        gl.uniform3fv(gl.getUniformLocation(program, 'u_camForward'), cam.forward)
        gl.uniform1f(gl.getUniformLocation(program, 'u_tanHalfFov'), tanHalfFov)
        gl.uniform1f(gl.getUniformLocation(program, 'u_aspect'), aspect)
        gl.uniform1f(gl.getUniformLocation(program, 'u_queueOffset'), queueOffset)
        gl.uniform1f(gl.getUniformLocation(program, 'u_stackScale'), stackScale)
        gl.uniform1i(gl.getUniformLocation(program, 'u_steps'), steps)
        this.bindCutUniforms(gl, program, params)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_3D, cubeTexture)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
        const aPos = gl.getAttribLocation(program, 'a_pos')
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.disable(gl.BLEND)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE3)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE4)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_3D, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return frame
    }
}
