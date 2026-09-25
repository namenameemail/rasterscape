import {
    compositeCanvasOver as compositeCanvasOverImpl,
    compositeDefaultOver as compositeDefaultOverImpl,
    compositeMasked as compositeMaskedImpl,
    compositeTextureOver as compositeTextureOverImpl,
} from './composite'
import {compositePatternStrokes as compositePatternStrokesImpl, type PatternFillSource, type PatternStroke} from './patternFill'
import {
    blitToScratch,
    blurTexture as blurTextureImpl,
    drawTexture,
} from './draw'
import {linkProgram} from './program'
import {ECompositeOperation} from '../store/compositeOperations'
import {
    BLEND_FS,
    BLIT_FS,
    BLIT_VS,
    BLUR_FS,
    MASK_FS,
    PATTERN_STROKE_FS,
    QUAD,
    REPEAT_FS,
    STAMP_CORNERS,
    STROKE_FS,
    STROKE_TINT_FS,
    STROKE_VS,
    STAMP_FS,
    STAMP_LAYER_FS,
    STAMP_VS,
    CIRCLE_FS,
} from './shaders'
import {stampTextures as stampTexturesImpl} from './stamp'
import {stampCircles as stampCirclesImpl} from './circleStamp'
import {drawPreviewToCanvas as drawPreviewToCanvasImpl} from './preview'
import type {StampDrawParams} from './stampMat'

export class GlContext {
    readonly canvas: HTMLCanvasElement
    readonly gl: WebGL2RenderingContext

    blitProgram: WebGLProgram
    blurProgram: WebGLProgram
    maskProgram: WebGLProgram
    stampProgram: WebGLProgram
    stampLayerProgram: WebGLProgram
    circleProgram: WebGLProgram
    repeatProgram: WebGLProgram
    strokeProgram: WebGLProgram
    strokeTintProgram: WebGLProgram
    blendProgram: WebGLProgram
    patternProgram: WebGLProgram
    blitBuffer: WebGLBuffer
    stampBuffer: WebGLBuffer
    strokeBuffer: WebGLBuffer
    copyFbo: WebGLFramebuffer

    private scratch: WebGLTexture | null = null
    private scratchW = 0
    private scratchH = 0
    private maskScratch: WebGLTexture | null = null
    private maskScratchW = 0
    private maskScratchH = 0
    private layerTex: WebGLTexture | null = null
    private layerW = 0
    private layerH = 0
    private strokeTex: WebGLTexture | null = null
    private strokeW = 0
    private strokeH = 0
    private clipMaskTex: WebGLTexture | null = null
    private clipMaskW = 0
    private clipMaskH = 0
    private selectionMaskTex: WebGLTexture | null = null
    private selectionMaskCanvas: HTMLCanvasElement | null = null
    private selectionMaskW = 0
    private selectionMaskH = 0
    private selectionMaskSerial = -1
    private whiteTex: WebGLTexture | null = null
    private previewTex: WebGLTexture | null = null
    private previewW = 0
    private previewH = 0
    private previewPixels: Uint8Array | null = null

    constructor() {
        this.canvas = document.createElement('canvas')
        const gl = this.canvas.getContext('webgl2', {
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
        })

        if (!gl) {
            throw new Error('need webgl2')
        }

        this.gl = gl
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
        gl.clearColor(0, 0, 0, 0)
        this.blitProgram = linkProgram(gl, BLIT_VS, BLIT_FS)
        this.blurProgram = linkProgram(gl, BLIT_VS, BLUR_FS)
        this.maskProgram = linkProgram(gl, BLIT_VS, MASK_FS)
        this.stampProgram = linkProgram(gl, STAMP_VS, STAMP_FS)
        this.stampLayerProgram = linkProgram(gl, STAMP_VS, STAMP_LAYER_FS)
        this.circleProgram = linkProgram(gl, STAMP_VS, CIRCLE_FS)
        this.repeatProgram = linkProgram(gl, STAMP_VS, REPEAT_FS)
        this.strokeProgram = linkProgram(gl, STROKE_VS, STROKE_FS)
        this.strokeTintProgram = linkProgram(gl, BLIT_VS, STROKE_TINT_FS)
        this.blendProgram = linkProgram(gl, BLIT_VS, BLEND_FS)
        this.patternProgram = linkProgram(gl, BLIT_VS, PATTERN_STROKE_FS)
        gl.useProgram(this.blitProgram)
        gl.uniform1f(gl.getUniformLocation(this.blitProgram, 'u_opacity'), 1)
        const blitBuffer = gl.createBuffer()
        const stampBuffer = gl.createBuffer()
        const strokeBuffer = gl.createBuffer()
        const copyFbo = gl.createFramebuffer()
        if (!blitBuffer || !stampBuffer || !strokeBuffer || !copyFbo) {
            throw new Error('gl alloc')
        }
        this.blitBuffer = blitBuffer
        this.stampBuffer = stampBuffer
        this.strokeBuffer = strokeBuffer
        this.copyFbo = copyFbo
        gl.bindBuffer(gl.ARRAY_BUFFER, blitBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, stampBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, STAMP_CORNERS, gl.STATIC_DRAW)
    }

    setSize = (width: number, height: number): void => {
        if (this.canvas.width !== width) {
            this.canvas.width = width
        }
        if (this.canvas.height !== height) {
            this.canvas.height = height
        }
        this.gl.viewport(0, 0, width, height)
    }

    createTexture2D = (width: number, height: number): WebGLTexture => {
        const {gl} = this
        const texture = gl.createTexture()
        if (!texture) {
            throw new Error('texture')
        }
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        return texture
    }

    resizeTexture2D = (texture: WebGLTexture, width: number, height: number): void => {
        const {gl} = this
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }

    uploadCanvas = (canvas: HTMLCanvasElement, texture: WebGLTexture): void => {
        const {gl} = this
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    }

    uploadSelectionMaskCanvas = (canvas: HTMLCanvasElement, texture: WebGLTexture): void => {
        const {gl} = this
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
        this.uploadCanvas(canvas, texture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
    }

    copyFramebufferToTexture = (texture: WebGLTexture, width: number, height: number): void => {
        const {gl} = this
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height)
    }

    copyTexture2DTo3D = (
        source: WebGLTexture,
        dest3D: WebGLTexture,
        z: number,
        destW: number,
        destH: number,
        srcW: number,
        srcH: number,
    ): void => {
        const {gl} = this
        const readTex = srcW === destW && srcH === destH
            ? source
            : blitToScratch(this, source, destW, destH)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.bindTexture(gl.TEXTURE_3D, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, readTex, 0)
        gl.bindTexture(gl.TEXTURE_3D, dest3D)
        gl.copyTexSubImage3D(gl.TEXTURE_3D, 0, 0, 0, z, 0, 0, destW, destH)
        gl.bindTexture(gl.TEXTURE_3D, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    bindTexture2DTarget = (texture: WebGLTexture, width: number, height: number): void => {
        const {gl} = this
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
        gl.viewport(0, 0, width, height)
    }

    blitToDefault = (texture: WebGLTexture, width: number, height: number, flipY = false): void => {
        const {gl} = this
        this.setSize(width, height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        drawTexture(this, texture, flipY)
    }

    compositeTextureOver = (
        video: WebGLTexture,
        dest: WebGLTexture,
        width: number,
        height: number,
        destFlipY: boolean,
        opacity = 1,
        layerFlipY = false,
        mode: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        compositeTextureOverImpl(this, video, dest, width, height, destFlipY, opacity, layerFlipY, mode)
    }

    compositePatternStrokes = (
        dest: WebGLTexture,
        width: number,
        height: number,
        destFlipY: boolean,
        strokes: PatternStroke[],
        source: PatternFillSource,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        mode: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        compositePatternStrokesImpl(this, dest, width, height, destFlipY, strokes, source, opacity, clipMask, mode)
    }

    compositeCanvasOver = (
        dest: WebGLTexture,
        width: number,
        height: number,
        destFlipY: boolean,
        layer: HTMLCanvasElement,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
        mode: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        compositeCanvasOverImpl(this, dest, width, height, destFlipY, layer, opacity, clipMask, mode)
    }

    compositeMasked = (
        source: WebGLTexture,
        mask: WebGLTexture,
        width: number,
        height: number,
        inverted: boolean,
        maskFlipY: boolean,
        sourceFlipY = false,
    ): WebGLTexture =>
        compositeMaskedImpl(this, source, mask, width, height, inverted, maskFlipY, sourceFlipY)

    compositeDefaultOver = (dest: WebGLTexture, width: number, height: number, destFlipY: boolean): void => {
        compositeDefaultOverImpl(this, dest, width, height, destFlipY)
    }

    stampTextures = (
        dest: WebGLTexture,
        destW: number,
        destH: number,
        destFlipY: boolean,
        source: WebGLTexture,
        sourceFlipY: boolean,
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
        mode: ECompositeOperation = ECompositeOperation.SourceOver,
        sourcePremul = false,
    ): void => {
        stampTexturesImpl(this, dest, destW, destH, destFlipY, source, sourceFlipY, stamps, opacity, clipMask, mode, sourcePremul)
    }

    stampCircles = (
        dest: WebGLTexture,
        destW: number,
        destH: number,
        destFlipY: boolean,
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
        mode: ECompositeOperation = ECompositeOperation.SourceOver,
    ): void => {
        stampCirclesImpl(this, dest, destW, destH, destFlipY, stamps, opacity, clipMask, mode)
    }

    drawPreviewToCanvas = (
        target: HTMLCanvasElement,
        source: WebGLTexture,
        sourceW: number,
        sourceH: number,
        sourceFlipY: boolean,
        mask: WebGLTexture | null = null,
        maskFlipY = false,
        inverted = false,
    ): void => {
        drawPreviewToCanvasImpl(this, target, source, sourceW, sourceH, sourceFlipY, mask, maskFlipY, inverted)
    }

    blurTexture = (texture: WebGLTexture, width: number, height: number, radius: number): void => {
        blurTextureImpl(this, texture, width, height, radius)
    }

    selectionMaskTexture = (canvas: HTMLCanvasElement, serial: number): WebGLTexture => {
        const {width, height} = canvas
        if (!this.selectionMaskTex || this.selectionMaskW !== width || this.selectionMaskH !== height) {
            if (this.selectionMaskTex) {
                this.gl.deleteTexture(this.selectionMaskTex)
            }
            this.selectionMaskTex = this.createTexture2D(width, height)
            this.selectionMaskW = width
            this.selectionMaskH = height
            this.selectionMaskCanvas = null
            this.selectionMaskSerial = -1
        }
        if (this.selectionMaskCanvas !== canvas || this.selectionMaskSerial !== serial) {
            this.uploadSelectionMaskCanvas(canvas, this.selectionMaskTex)
            this.selectionMaskCanvas = canvas
            this.selectionMaskSerial = serial
        }
        return this.selectionMaskTex
    }

    ensureScratch = (width: number, height: number): WebGLTexture => {
        if (!this.scratch || this.scratchW !== width || this.scratchH !== height) {
            if (this.scratch) {
                this.gl.deleteTexture(this.scratch)
            }
            this.scratch = this.createTexture2D(width, height)
            this.scratchW = width
            this.scratchH = height
        }
        return this.scratch
    }

    ensureMaskScratch = (width: number, height: number): WebGLTexture => {
        if (!this.maskScratch || this.maskScratchW !== width || this.maskScratchH !== height) {
            if (this.maskScratch) {
                this.gl.deleteTexture(this.maskScratch)
            }
            this.maskScratch = this.createTexture2D(width, height)
            this.maskScratchW = width
            this.maskScratchH = height
        }
        return this.maskScratch
    }

    ensureStroke = (width: number, height: number): WebGLTexture => {
        if (!this.strokeTex || this.strokeW !== width || this.strokeH !== height) {
            if (this.strokeTex) {
                this.gl.deleteTexture(this.strokeTex)
            }
            this.strokeTex = this.createTexture2D(width, height)
            this.strokeW = width
            this.strokeH = height
        }
        return this.strokeTex
    }

    ensureLayer = (width: number, height: number): WebGLTexture => {
        if (!this.layerTex || this.layerW !== width || this.layerH !== height) {
            if (this.layerTex) {
                this.gl.deleteTexture(this.layerTex)
            }
            this.layerTex = this.createTexture2D(width, height)
            this.layerW = width
            this.layerH = height
        }
        return this.layerTex
    }

    ensurePreview = (width: number, height: number): WebGLTexture => {
        if (!this.previewTex || this.previewW !== width || this.previewH !== height) {
            if (this.previewTex) {
                this.gl.deleteTexture(this.previewTex)
            }
            this.previewTex = this.createTexture2D(width, height)
            this.previewW = width
            this.previewH = height
            this.previewPixels = null
        }
        return this.previewTex
    }

    ensurePreviewPixels = (width: number, height: number): Uint8Array => {
        const n = width * height * 4
        if (!this.previewPixels || this.previewPixels.length !== n) {
            this.previewPixels = new Uint8Array(n)
        }
        return this.previewPixels
    }

    uploadClipMask = (canvas: HTMLCanvasElement): WebGLTexture => {
        const {width, height} = canvas
        if (!this.clipMaskTex || this.clipMaskW !== width || this.clipMaskH !== height) {
            if (this.clipMaskTex) {
                this.gl.deleteTexture(this.clipMaskTex)
            }
            this.clipMaskTex = this.createTexture2D(width, height)
            this.clipMaskW = width
            this.clipMaskH = height
        }
        this.uploadSelectionMaskCanvas(canvas, this.clipMaskTex)
        return this.clipMaskTex
    }

    ensureWhiteTex = (): WebGLTexture => {
        if (!this.whiteTex) {
            const {gl} = this
            const tex = gl.createTexture()
            if (!tex) {
                throw new Error('texture')
            }
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]))
            this.whiteTex = tex
        }
        return this.whiteTex
    }
}

let instance: GlContext | null = null

export const getGlContext = (): GlContext => {
    if (!instance) {
        instance = new GlContext()
    }
    return instance
}
