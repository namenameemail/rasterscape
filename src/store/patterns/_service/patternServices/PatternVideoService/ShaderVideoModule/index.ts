import fs from './shaders/frag.glsl'
import vs from './shaders/vert.glsl'
import {coordHelper4, coordHelper5, imageDataDebug} from '../../../../../../components/Area/canvasPosition.servise'
import {initShaders} from './utils/cuon-utils'
import {Matrix4} from './utils/cuon-matrix'
import {getGlContext} from '../../../../../../gl/GlContext'
import {
    AnyFxyParams,
    FxyArrayParams,
    FxyType,
    ParabParams,
    Sis2Params,
    SqParams,
} from '../../../../../changeFunctions/functions/fxy'
import {EdgeMode, CameraAxis, StackType, VideoOffset} from './types'
import {
    XYCutFunctionTypeToNumber,
    CameraAxisToNumber,
    XYArrayCutFunctionTypeToNumber,
    rgbaComponentToNumber
} from './utils'
import {VideoServiceInitParams} from '../index'
import {ECFType} from '../../../../../changeFunctions/types'
import {CfDepthParams} from '../../../../../changeFunctions/functions/depth'
import {AppState, patternsService} from '../../../../../index'
import {profileLogger} from '../../../../../../utils/profiling/ProfileLogger'


export class ShaderVideoModule {

    glCanvas: HTMLCanvasElement
    gl: WebGL2RenderingContext
    program: WebGLProgram
    vertexBuffer: WebGLBuffer

    canvas: HTMLCanvasElement

    verticesData: Float32Array = new Float32Array([
        -1, 1, 0.0, 1.0,
        -1, -1, 0.0, 0.0,
        1, 1, 1.0, 1.0,
        1, -1, 1.0, 0.0,
    ])
    verticesCount: number = 4

    // parameters
    width: number
    height: number
    stackSizeWithError: number
    stackType: StackType
    edgeMode: EdgeMode
    cameraAxis: CameraAxis
    mirrorH: boolean = false
    mirrorW: boolean = false
    cutFunctionType: FxyType | ECFType.DEPTH | null
    cutFuncParams: AnyFxyParams | CfDepthParams
    error: number = 2 // кадры краев которые обрезаются чтобы не смешивались края


    depth: number
    cutOffset: number

    offset: {
        x0: number
        y0: number
        z0: number
        x1: number
        y1: number
        z1: number
    }

    queueOffset: number

    constructor() {
        this.canvas = document.createElement('canvas')
    }

    async instantiate(): Promise<ShaderVideoModule> {

        return this
    }

    frameTexture: WebGLTexture | null = null
    private frameW = 0
    private frameH = 0

    init(params: VideoServiceInitParams): ShaderVideoModule {
        const {width, height, stackSize, cameraAxis, offset} = params
        this.width = width
        this.height = height
        this.stackSizeWithError = stackSize + this.error
        this.cameraAxis = cameraAxis
        this.offset = offset
        this.canvas.width = width
        this.canvas.height = height

        this.initShader()

        return this
    }

    initShader = () => {
        const glc = getGlContext()
        const gl = this.gl = glc.gl
        this.glCanvas = glc.canvas

        if (!this.program) {
            if (!initShaders(gl, vs, fs)) {
                return alert('failed to init')
            }

            this.program = gl.getParameter(gl.CURRENT_PROGRAM)
            gl.clearColor(0, 0, 0, 0)
            this.initVertexBuffers(gl)
        }

        this.ensureFrameTexture()
        this.initTexture()

        for (let i = 0; i < 4; i++) {
            this.ensureParamTexture(i, this.width, this.height)
        }
    }

    use = (): void => {
        const gl = this.gl

        gl.useProgram(this.program)

        if (this.vertexBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
            const F_SIZE = this.verticesData.BYTES_PER_ELEMENT
            const a_Position = gl.getAttribLocation(this.program, 'a_Position')
            const a_TexCoord = gl.getAttribLocation(this.program, 'a_TexCoord')
            gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 4 * F_SIZE, 0)
            gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 4 * F_SIZE, 2 * F_SIZE)
            gl.enableVertexAttribArray(a_Position)
            gl.enableVertexAttribArray(a_TexCoord)
        }

        if (this.cubeTexture) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_3D, this.cubeTexture)
        }
    }

    cubeTexture;
    initTexture = () => {
        const width = this.width
        const height = this.height
        const stackSizeWithError = this.stackSizeWithError
        const gl = this.gl

        this.use()

        this.cubeTexture = this.cubeTexture || gl.createTexture()

        const u_Sampler = gl.getUniformLocation(this.program, 'u_Sampler')
        const u_QueueOffset = gl.getUniformLocation(this.program, 'u_QueueOffset')
        const u_TexQueueOffset = gl.getUniformLocation(this.program, 'u_TexQueueOffset')
        const u_Width = gl.getUniformLocation(this.program, 'u_Width')
        const u_Height = gl.getUniformLocation(this.program, 'u_Height')
        const u_StackSize = gl.getUniformLocation(this.program, 'u_StackSize')
        const u_Mirror = gl.getUniformLocation(this.program, 'u_Mirror')
        const u_Direction = gl.getUniformLocation(this.program, 'u_Direction')
        const u_Error = gl.getUniformLocation(this.program, 'u_Error')
        const u_CutFuncType = gl.getUniformLocation(this.program, 'u_CutFuncType')

        Object.keys(this.offset).forEach(key => {
            const u_CutOffset = gl.getUniformLocation(this.program, 'u_CutOffset_' + key)
            gl.uniform1f(u_CutOffset, this.offset[key])
        })

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_3D, this.cubeTexture)
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage3D(
            gl.TEXTURE_3D,
            0,
            gl.RGBA,
            width,
            height,
            stackSizeWithError,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        )
        gl.uniform1i(u_Sampler, 0)

        gl.uniform1i(u_Width, width)
        gl.uniform1i(u_Height, height)
        gl.uniform1i(u_StackSize, stackSizeWithError)
        gl.uniform1i(u_Mirror, this.mirrorH ? 1 : 0)
        gl.uniform1i(u_Direction, CameraAxisToNumber[this.cameraAxis])
        gl.uniform1i(u_Error, this.error)
        gl.uniform1i(u_CutFuncType, XYCutFunctionTypeToNumber[this.cutFunctionType])

        this.queueOffset = 0

        gl.uniform1f(u_TexQueueOffset, this.queueOffset / (this.stackSizeWithError))
        gl.uniform1f(u_QueueOffset, this.queueOffset)
    }

    private setQueueUniforms = () => {
        const gl = this.gl
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_TexQueueOffset'), this.queueOffset / this.stackSizeWithError)
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_QueueOffset'), this.queueOffset)
    }

    private advanceQueue = () => {
        this.setQueueUniforms()
        this.queueOffset = (this.queueOffset + 1) % this.stackSizeWithError
    }

    updateTexture = (source: TexImageSource) => {
        const gl = this.gl
        this.use()

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_3D, this.cubeTexture)
        gl.texSubImage3D(
            gl.TEXTURE_3D,
            0,
            0, 0, this.queueOffset % this.stackSizeWithError,
            this.width, this.height, 1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            source,
        )
        this.advanceQueue()
    }

    pushFrameFromTexture = (texture: WebGLTexture, srcW: number, srcH: number): ShaderVideoModule => {
        this.use()
        getGlContext().copyTexture2DTo3D(
            texture,
            this.cubeTexture,
            this.queueOffset % this.stackSizeWithError,
            this.width,
            this.height,
            srcW,
            srcH,
        )
        this.use()
        this.advanceQueue()
        return this
    }

    bindParamTexture = (index: number, texture: WebGLTexture): void => {
        const gl = this.gl
        const unit = 1 + index
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_CFParamTexture_' + index), unit)
    }

    initVertexBuffers(gl): number {
        const vertices = this.verticesData
        const F_SIZE = vertices.BYTES_PER_ELEMENT

        if (this.vertexBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        } else {
            const vertexBuffer = this.vertexBuffer = gl.createBuffer()
            if (!vertexBuffer) {
                console.log('Failed to create the buffer object ')
                return -1
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        }

        const a_Position = gl.getAttribLocation(this.program, 'a_Position')
        const a_TexCoord = gl.getAttribLocation(this.program, 'a_TexCoord')

        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 4 * F_SIZE, 0)
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 4 * F_SIZE, 2 * F_SIZE)

        gl.enableVertexAttribArray(a_Position)
        gl.enableVertexAttribArray(a_TexCoord)
    }

    createRotationMatrix(ANGLE, tx, ty, tz) { // ? deprec
        const xformMatrix = new Matrix4()

        xformMatrix.setTranslate(tx, ty, tz)
        xformMatrix.rotate(ANGLE, 0, 0, 1)
        return xformMatrix.elements
    }


    draw = () => {
        this.use()
        const gl = this.gl
        getGlContext().bindTexture2DTarget(this.frameTexture as WebGLTexture, this.width, this.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.verticesCount)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    updateImage(): WebGLTexture {
        this.ensureFrameTexture()
        this.draw()
        return this.frameTexture as WebGLTexture
    }

    pushNewFrame(source: TexImageSource): ShaderVideoModule {

        this.updateTexture(source)

        return this
    }


    updateWidth(value: number): ShaderVideoModule {
        this.width = value
        return this
    }

    updateHeight(value: number): ShaderVideoModule {
        this.height = value
        return this
    }

    updateDepth(value: number): ShaderVideoModule {
        this.depth = value
        this.use()
        const u_TexDepth = this.gl.getUniformLocation(this.program, 'u_TexDepth')
        this.gl.uniform1f(u_TexDepth, this.depth)
        return this
    }

    updateStackType(value: StackType): ShaderVideoModule {
        this.stackType = value
        return this
    }

    updateEdgeMode(value: EdgeMode): ShaderVideoModule {
        this.edgeMode = value
        return this
    }

    updateCameraAxis(value: CameraAxis): ShaderVideoModule {
        this.cameraAxis = value
        this.use()
        const u_Direction = this.gl.getUniformLocation(this.program, 'u_Direction')
        this.gl.uniform1i(u_Direction, CameraAxisToNumber[this.cameraAxis])
        return this
    }


    updateOffsets(value: VideoOffset): ShaderVideoModule {
        this.offset = value
        this.use()
        Object.keys(this.offset).forEach((key) => {
            const u_CutOffset = this.gl.getUniformLocation(this.program, 'u_CutOffset_' + key)
            this.gl.uniform1f(u_CutOffset, this.offset[key])
        })
        return this
    }

    updateOffset(name: string, value: number): ShaderVideoModule {
        this.offset = {...this.offset, [name]: value}

        if (this.gl) {
            this.use()
            const u_CutOffset = this.gl.getUniformLocation(this.program, 'u_CutOffset_' + name)
            this.gl.uniform1f(u_CutOffset, this.offset[name])
        }

        return this
    }

    updateStackSize(value: number): ShaderVideoModule {
        this.stackSizeWithError = value + this.error
        this.gl && this.initTexture()
        return this
    }

    updateMirror(mirrorH: boolean, mirrorW: boolean): ShaderVideoModule {
        this.mirrorH = mirrorH
        this.mirrorW = mirrorW
        this.use()
        const u_Mirror = this.gl.getUniformLocation(this.program, 'u_Mirror')
        this.gl.uniform1i(u_Mirror, this.mirrorH ? 1 : 0)
        return this
    }


    updateCutFunctionType(value: FxyType | ECFType.DEPTH): ShaderVideoModule {
        this.cutFunctionType = value

        if (this.gl) {
            this.use()
            const u_CutFuncType = this.gl.getUniformLocation(this.program, 'u_CutFuncType')
            this.gl.uniform1i(u_CutFuncType, XYCutFunctionTypeToNumber[this.cutFunctionType])
        }

        coordHelper4.writeln('this.cutFunctionType', this.cutFunctionType)
        
        return this
    }

    updateFuncParamsByType = {
        [FxyType.Parab]: () => {
            const params = this.cutFuncParams as ParabParams
            // coordHelper4.writeln('FxyType.Parab', ...Object.keys(params))

            const u_CFParamF0 = this.gl.getUniformLocation(this.program, 'u_CFParamF0')
            const u_CFParamF1 = this.gl.getUniformLocation(this.program, 'u_CFParamF1')
            const u_CFParamF2 = this.gl.getUniformLocation(this.program, 'u_CFParamF2')
            const u_CFParamF3 = this.gl.getUniformLocation(this.program, 'u_CFParamF3')

            this.gl.uniform1f(u_CFParamF2, params.x)
            this.gl.uniform1f(u_CFParamF3, params.y)
            this.gl.uniform1f(u_CFParamF0, params.end)
            this.gl.uniform1f(u_CFParamF1, params.zd)

        },
        [FxyType.Sis2]: () => {

            const params = this.cutFuncParams as Sis2Params
            // coordHelper4.writeln('FxyType.Sis2', ...Object.keys(params))


            const u_CFParamF0 = this.gl.getUniformLocation(this.program, 'u_CFParamF0')
            const u_CFParamF1 = this.gl.getUniformLocation(this.program, 'u_CFParamF1')
            const u_CFParamF2 = this.gl.getUniformLocation(this.program, 'u_CFParamF2')
            const u_CFParamF3 = this.gl.getUniformLocation(this.program, 'u_CFParamF3')
            const u_CFParamF4 = this.gl.getUniformLocation(this.program, 'u_CFParamF4')
            const u_CFParamF5 = this.gl.getUniformLocation(this.program, 'u_CFParamF5')
            const u_CFParamF6 = this.gl.getUniformLocation(this.program, 'u_CFParamF6')
            const u_CFParamF7 = this.gl.getUniformLocation(this.program, 'u_CFParamF7')
            const u_CFParamF8 = this.gl.getUniformLocation(this.program, 'u_CFParamF8')
            const u_CFParamF9 = this.gl.getUniformLocation(this.program, 'u_CFParamF9')


            this.gl.uniform1f(u_CFParamF0, params.end)
            this.gl.uniform1f(u_CFParamF1, params.cosA)
            this.gl.uniform1f(u_CFParamF2, params.h)
            this.gl.uniform1f(u_CFParamF3, params.xN)
            this.gl.uniform1f(u_CFParamF4, params.yN)
            this.gl.uniform1f(u_CFParamF5, params.xD)
            this.gl.uniform1f(u_CFParamF6, params.yD)
            this.gl.uniform1f(u_CFParamF7, params.XA)
            this.gl.uniform1f(u_CFParamF8, params.xdd)
            this.gl.uniform1f(u_CFParamF9, params.ydd)
        },
        
        [FxyType.Sq]: () => {

            const params = this.cutFuncParams as SqParams
            // coordHelper4.writeln('FxyType.Sis2', ...Object.keys(params))

            const u_CFParamF0 = this.gl.getUniformLocation(this.program, 'u_CFParamF0')
            const u_CFParamF1 = this.gl.getUniformLocation(this.program, 'u_CFParamF1')
            const u_CFParamF2 = this.gl.getUniformLocation(this.program, 'u_CFParamF2')
            const u_CFParamF3 = this.gl.getUniformLocation(this.program, 'u_CFParamF3')
            const u_CFParamF4 = this.gl.getUniformLocation(this.program, 'u_CFParamF4')
           
            this.gl.uniform1f(u_CFParamF0, params.a)
            this.gl.uniform1f(u_CFParamF1, params.b)
            this.gl.uniform1f(u_CFParamF2, params.c)
            this.gl.uniform1f(u_CFParamF3, params.h)
            this.gl.uniform1f(u_CFParamF4, params.end)
        },
        [FxyType.Array]: () => {
            const params = this.cutFuncParams as FxyArrayParams

            const typeParams = params.typeParams[params.type];

            const u_CFParamI0 = this.gl.getUniformLocation(this.program, 'u_CFParamI0')
            const u_CFParamF1 = this.gl.getUniformLocation(this.program, 'u_CFParamF1')
            const u_CFParamF2 = this.gl.getUniformLocation(this.program, 'u_CFParamF2')
            const u_CFParamI3 = this.gl.getUniformLocation(this.program, 'u_CFParamI3')
            const u_CFParamI4 = this.gl.getUniformLocation(this.program, 'u_CFParamI4')
            const u_CFParamIV0 = this.gl.getUniformLocation(this.program, 'u_CFParamIV0')


            this.gl.uniform1i(u_CFParamI0, XYArrayCutFunctionTypeToNumber[params.type])
            this.gl.uniform1f(u_CFParamF1, typeParams.from)
            this.gl.uniform1f(u_CFParamF2, typeParams.to)
            this.gl.uniform1i(u_CFParamI3, typeParams.drawWidth)
            this.gl.uniform1i(u_CFParamI4, typeParams.drawHeight)
            this.gl.uniform1iv(u_CFParamIV0, typeParams.valuesArray)

        },
        [ECFType.DEPTH]: (state: AppState) => {
            const params = this.cutFuncParams as CfDepthParams

            (params.items.length > 4
                    ? params.items.slice(0, 4)
                    : params.items
            ).forEach((item, index) => {
                const {component, patternId, id, zed, zd} = item

                const buffer = patternsService.pattern[patternId]?.canvasService.buffer

                if (!buffer) {
                    return;
                }

                profileLogger.time('video.depth.texture', () =>
                    this.bindParamTexture(index, buffer.ensureGpu())
                )

                const u_CFParamI0 = this.gl.getUniformLocation(this.program, 'u_CFParamI' + (index * 1 + 0))
                const u_CFParamI5 = this.gl.getUniformLocation(this.program, 'u_CFParamI5')
                const u_CFParamF0 = this.gl.getUniformLocation(this.program, 'u_CFParamF' + (index * 2 + 0))
                const u_CFParamF1 = this.gl.getUniformLocation(this.program, 'u_CFParamF' + (index * 2 + 1))

                // coordHelper5.writeln(
                //     Math.min(4, params.items.length),
                //     'u_CFParamF' + (index * 2 + 0) + ':' + zed,
                //     'u_CFParamF' + (index * 2 + 1) + ':' +zd,
                //     'component :' + component)
                this.gl.uniform1i(u_CFParamI0, component)
                this.gl.uniform1i(u_CFParamI5, Math.min(4, params.items.length))
                this.gl.uniform1f(u_CFParamF0, zed)
                this.gl.uniform1f(u_CFParamF1, zd)

            })
        },
    }

    updateFuncParams(type: FxyType | ECFType.DEPTH, cutFuncParams: AnyFxyParams | CfDepthParams, state: AppState): ShaderVideoModule {

        this.cutFuncParams = cutFuncParams
        if (this.cutFunctionType !== type) {
            this.updateCutFunctionType(type)
        }
        this.use()
        this.updateFuncParamsByType[this.cutFunctionType](state)

        return this
    }

    paramTextures: { texture, width, height }[] = []

    private ensureFrameTexture = (): WebGLTexture => {
        const glc = getGlContext()

        if (!this.frameTexture) {
            this.frameTexture = glc.createTexture2D(this.width, this.height)
            this.frameW = this.width
            this.frameH = this.height
            return this.frameTexture
        }

        if (this.frameW !== this.width || this.frameH !== this.height) {
            glc.resizeTexture2D(this.frameTexture, this.width, this.height)
            this.frameW = this.width
            this.frameH = this.height
        }

        return this.frameTexture
    }

    ensureParamTexture = (index, width, height) => {
        const glTextureIndex = 1 + index
        const gl = this.gl
        let paramTexture = this.paramTextures[index]

        if (!paramTexture?.texture) {
            paramTexture = this.paramTextures[index] = {
                texture: gl.createTexture(),
                width: 0,
                height: 0,
            }
        }

        gl.activeTexture(gl['TEXTURE' + glTextureIndex])
        gl.bindTexture(gl.TEXTURE_2D, paramTexture.texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        if (paramTexture.width !== width || paramTexture.height !== height) {
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                width,
                height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                null,
            )
            paramTexture.width = width
            paramTexture.height = height
        }

        gl.uniform1i(gl.getUniformLocation(this.program, 'u_CFParamTexture_' + index), glTextureIndex)
    }
}

export {StackType} from './types'
export {CameraAxis} from './types'
export {MirrorMode} from './types'
export {EdgeMode} from './types'