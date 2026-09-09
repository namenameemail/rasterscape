import {stampCanvasMat, type StampDrawParams} from './stampMat'

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type)
    if (!shader) {
        throw new Error('shader')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
}

const linkProgram = (gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram => {
    const program = gl.createProgram()
    if (!program) {
        throw new Error('program')
    }
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return program
}

const BLIT_VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform float u_flipY;
out vec2 v_uv;
void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = vec2(a_uv.x, u_flipY > 0.5 ? 1.0 - a_uv.y : a_uv.y);
}`

const BLIT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o;
void main() {
    vec4 c = texture(u_tex, v_uv);
    o = vec4(c.rgb, c.a * u_opacity);
}`

const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_offset;
uniform float u_radius;
in vec2 v_uv;
out vec4 o;
void main() {
    float r = min(u_radius, 16.0);
    vec4 acc = texture(u_tex, v_uv);
    float wsum = 1.0;
    for (int i = 1; i <= 16; i++) {
        float fi = float(i);
        if (fi > r) break;
        float w = 1.0 - fi / (r + 1.0);
        acc += texture(u_tex, v_uv + u_offset * fi) * w;
        acc += texture(u_tex, v_uv - u_offset * fi) * w;
        wsum += 2.0 * w;
    }
    o = acc / wsum;
}`

const MASK_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform float u_invert;
uniform float u_maskFlipY;
in vec2 v_uv;
out vec4 o;
void main() {
    vec4 c = texture(u_tex, v_uv);
    vec2 muv = vec2(v_uv.x, u_maskFlipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    float ma = texture(u_mask, muv).a;
    float a = u_invert > 0.5 ? 1.0 - ma : ma;
    o = vec4(c.rgb, c.a * a);
}`

const STAMP_VS = `#version 300 es
in vec2 a_corner;
uniform vec2 u_destSize;
uniform vec2 u_stampSize;
uniform mat3 u_mat;
out vec2 v_uv;
out vec2 v_destUv;
void main() {
    vec2 local = a_corner * u_stampSize;
    vec3 p = u_mat * vec3(local, 1.0);
    gl_Position = vec4(
        p.x / u_destSize.x * 2.0 - 1.0,
        1.0 - p.y / u_destSize.y * 2.0,
        0.0,
        1.0
    );
    v_uv = a_corner + 0.5;
    v_destUv = vec2(p.x / u_destSize.x, p.y / u_destSize.y);
}`

const STAMP_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform float u_opacity;
uniform float u_flipY;
uniform float u_useMask;
uniform float u_maskFlipY;
in vec2 v_uv;
in vec2 v_destUv;
out vec4 o;
void main() {
    vec2 uv = vec2(v_uv.x, u_flipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    vec4 c = texture(u_tex, uv);
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    o = vec4(c.rgb, c.a * u_opacity * ma);
}`

const QUAD = new Float32Array([
    -1, 1, 0, 1,
    -1, -1, 0, 0,
    1, 1, 1, 1,
    1, -1, 1, 0,
])

const STAMP_CORNERS = new Float32Array([
    -0.5, -0.5,
    -0.5, 0.5,
    0.5, -0.5,
    0.5, 0.5,
])

export class GlContext {
    readonly canvas: HTMLCanvasElement
    readonly gl: WebGL2RenderingContext

    private blitProgram: WebGLProgram
    private blurProgram: WebGLProgram
    private maskProgram: WebGLProgram
    private stampProgram: WebGLProgram
    private blitBuffer: WebGLBuffer
    private stampBuffer: WebGLBuffer
    private copyFbo: WebGLFramebuffer
    private scratch: WebGLTexture | null = null
    private scratchW = 0
    private scratchH = 0
    private maskScratch: WebGLTexture | null = null
    private maskScratchW = 0
    private maskScratchH = 0
    private layerTex: WebGLTexture | null = null
    private layerW = 0
    private layerH = 0
    private clipMaskTex: WebGLTexture | null = null
    private clipMaskW = 0
    private clipMaskH = 0
    private whiteTex: WebGLTexture | null = null

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
        gl.useProgram(this.blitProgram)
        gl.uniform1f(gl.getUniformLocation(this.blitProgram, 'u_opacity'), 1)
        const blitBuffer = gl.createBuffer()
        const stampBuffer = gl.createBuffer()
        const copyFbo = gl.createFramebuffer()
        if (!blitBuffer || !stampBuffer || !copyFbo) {
            throw new Error('gl alloc')
        }
        this.blitBuffer = blitBuffer
        this.stampBuffer = stampBuffer
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
            : this.blitToScratch(source, destW, destH)

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
        this.drawTexture(texture, flipY)
    }

    compositeTextureOver = (
        video: WebGLTexture,
        dest: WebGLTexture,
        width: number,
        height: number,
        destFlipY: boolean,
        opacity = 1,
        layerFlipY = false,
    ): void => {
        const {gl} = this
        this.setSize(width, height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        this.drawTexture(dest, destFlipY)
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        this.drawTexture(video, layerFlipY, opacity)
        gl.disable(gl.BLEND)
        this.copyFramebufferToTexture(dest, width, height)
    }

    compositeCanvasOver = (
        dest: WebGLTexture,
        width: number,
        height: number,
        destFlipY: boolean,
        layer: HTMLCanvasElement,
        opacity = 1,
        clipMask?: HTMLCanvasElement | null,
    ): void => {
        const layerTex = this.ensureLayer(width, height)
        this.uploadCanvas(layer, layerTex)

        if (clipMask) {
            const maskTex = this.uploadClipMask(clipMask)
            const clipped = this.compositeMasked(layerTex, maskTex, width, height, false, false, true)
            this.compositeTextureOver(clipped, dest, width, height, destFlipY, opacity, false)
            return
        }

        this.compositeTextureOver(layerTex, dest, width, height, destFlipY, opacity, true)
    }

    compositeMasked = (
        source: WebGLTexture,
        mask: WebGLTexture,
        width: number,
        height: number,
        inverted: boolean,
        maskFlipY: boolean,
        sourceFlipY = false,
    ): WebGLTexture => {
        const dest = this.ensureMaskScratch(width, height)
        const {gl} = this
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dest, 0)
        gl.viewport(0, 0, width, height)
        gl.disable(gl.BLEND)
        gl.useProgram(this.maskProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, source)
        gl.uniform1i(gl.getUniformLocation(this.maskProgram, 'u_tex'), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, mask)
        gl.uniform1i(gl.getUniformLocation(this.maskProgram, 'u_mask'), 1)
        gl.uniform1f(gl.getUniformLocation(this.maskProgram, 'u_invert'), inverted ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(this.maskProgram, 'u_flipY'), sourceFlipY ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(this.maskProgram, 'u_maskFlipY'), maskFlipY ? 1 : 0)
        this.bindQuad(this.maskProgram)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return dest
    }

    compositeDefaultOver = (dest: WebGLTexture, width: number, height: number, destFlipY: boolean): void => {
        const {gl} = this
        const video = this.ensureScratch(width, height)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.bindTexture(gl.TEXTURE_2D, video)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height)

        this.blitToDefault(dest, width, height, destFlipY)

        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        this.drawTexture(video)
        gl.disable(gl.BLEND)

        this.copyFramebufferToTexture(dest, width, height)
    }

    stampTextures = (
        dest: WebGLTexture,
        destW: number,
        destH: number,
        source: WebGLTexture,
        sourceFlipY: boolean,
        stamps: StampDrawParams[],
        opacity: number,
        clipMask?: HTMLCanvasElement | null,
    ): void => {
        if (!stamps.length) {
            return
        }

        const {gl} = this
        this.bindTexture2DTarget(dest, destW, destH)
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.useProgram(this.stampProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, source)
        gl.uniform1i(gl.getUniformLocation(this.stampProgram, 'u_tex'), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, clipMask ? this.uploadClipMask(clipMask) : this.ensureWhiteTex())
        gl.uniform1i(gl.getUniformLocation(this.stampProgram, 'u_mask'), 1)
        gl.uniform2f(gl.getUniformLocation(this.stampProgram, 'u_destSize'), destW, destH)
        gl.uniform1f(gl.getUniformLocation(this.stampProgram, 'u_opacity'), opacity)
        gl.uniform1f(gl.getUniformLocation(this.stampProgram, 'u_flipY'), sourceFlipY ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(this.stampProgram, 'u_useMask'), clipMask ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(this.stampProgram, 'u_maskFlipY'), 0)

        gl.bindBuffer(gl.ARRAY_BUFFER, this.stampBuffer)
        const aCorner = gl.getAttribLocation(this.stampProgram, 'a_corner')
        gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aCorner)

        const uMat = gl.getUniformLocation(this.stampProgram, 'u_mat')
        const uStampSize = gl.getUniformLocation(this.stampProgram, 'u_stampSize')

        for (const stamp of stamps) {
            gl.uniform2f(uStampSize, stamp.width, stamp.height)
            gl.uniformMatrix3fv(uMat, false, stampCanvasMat(stamp))
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }

        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE0)
        gl.disable(gl.BLEND)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    blurTexture = (texture: WebGLTexture, width: number, height: number, radius: number): void => {
        if (radius <= 0) {
            return
        }

        const scratch = this.ensureScratch(width, height)
        const {gl} = this
        gl.viewport(0, 0, width, height)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scratch, 0)
        this.drawBlur(texture, 1 / width, 0, radius)

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
        gl.bindTexture(gl.TEXTURE_2D, null)
        this.drawBlur(scratch, 0, 1 / height, radius)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    private ensureScratch = (width: number, height: number): WebGLTexture => {
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

    private ensureMaskScratch = (width: number, height: number): WebGLTexture => {
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

    private ensureLayer = (width: number, height: number): WebGLTexture => {
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

    private uploadClipMask = (canvas: HTMLCanvasElement): WebGLTexture => {
        const {width, height} = canvas
        if (!this.clipMaskTex || this.clipMaskW !== width || this.clipMaskH !== height) {
            if (this.clipMaskTex) {
                this.gl.deleteTexture(this.clipMaskTex)
            }
            this.clipMaskTex = this.createTexture2D(width, height)
            this.clipMaskW = width
            this.clipMaskH = height
        }
        this.uploadCanvas(canvas, this.clipMaskTex)
        return this.clipMaskTex
    }

    private ensureWhiteTex = (): WebGLTexture => {
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

    uploadCanvasSized = (canvas: HTMLCanvasElement): WebGLTexture => {
        const tex = this.ensureLayer(canvas.width, canvas.height)
        this.uploadCanvas(canvas, tex)
        return tex
    }

    private blitToScratch = (source: WebGLTexture, width: number, height: number): WebGLTexture => {
        const scratch = this.ensureScratch(width, height)
        const {gl} = this
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyFbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scratch, 0)
        gl.viewport(0, 0, width, height)
        this.drawTexture(source)
        return scratch
    }

    private bindQuad = (program: WebGLProgram): void => {
        const {gl} = this
        gl.bindBuffer(gl.ARRAY_BUFFER, this.blitBuffer)
        const stride = 16
        const aPos = gl.getAttribLocation(program, 'a_pos')
        const aUv = gl.getAttribLocation(program, 'a_uv')
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0)
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8)
        gl.enableVertexAttribArray(aPos)
        gl.enableVertexAttribArray(aUv)
    }

    private drawTexture = (texture: WebGLTexture, flipY = false, opacity = 1): void => {
        const {gl} = this
        gl.useProgram(this.blitProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(this.blitProgram, 'u_tex'), 0)
        gl.uniform1f(gl.getUniformLocation(this.blitProgram, 'u_flipY'), flipY ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(this.blitProgram, 'u_opacity'), opacity)
        this.bindQuad(this.blitProgram)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    private drawBlur = (texture: WebGLTexture, ox: number, oy: number, radius: number): void => {
        const {gl} = this
        gl.useProgram(this.blurProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(this.blurProgram, 'u_tex'), 0)
        gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_offset'), ox, oy)
        gl.uniform1f(gl.getUniformLocation(this.blurProgram, 'u_radius'), radius * 0.5)
        this.bindQuad(this.blurProgram)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
}

let instance: GlContext | null = null

export const getGlContext = (): GlContext => {
    if (!instance) {
        instance = new GlContext()
    }

    return instance
}
