import {ECompositeOperation} from '../store/compositeOperations'
import {compositeMasked, compositeTextureOver} from './composite'
import {bindQuad, copyTexture2D} from './draw'
import type {GlContext} from './GlContext'
import type {PatternInverse} from './linePattern'
import {drawStrokeMask} from './strokeDraw'

export type PatternStroke = {
    inv: PatternInverse
    canvas?: HTMLCanvasElement
    mesh?: Float32Array
    dx?: number
    dy?: number
}

export type PatternFillSource = {
    texture: WebGLTexture
    width: number
    height: number
    flipY: boolean
    premul: boolean
}

const clearTexture = (ctx: GlContext, texture: WebGLTexture, width: number, height: number): void => {
    const {gl} = ctx
    ctx.bindTexture2DTarget(texture, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

const drawPatternStroke = (
    ctx: GlContext,
    layer: WebGLTexture,
    stroke: WebGLTexture,
    backdrop: WebGLTexture,
    pattern: WebGLTexture,
    width: number,
    height: number,
    patternWidth: number,
    patternHeight: number,
    inv: PatternInverse,
    flipY: boolean,
    premul: boolean,
): void => {
    const {gl} = ctx
    const program = ctx.patternProgram
    ctx.bindTexture2DTarget(layer, width, height)
    gl.disable(gl.BLEND)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, stroke)
    gl.uniform1i(gl.getUniformLocation(program, 'u_stroke'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, pattern)
    gl.uniform1i(gl.getUniformLocation(program, 'u_pattern'), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, backdrop)
    gl.uniform1i(gl.getUniformLocation(program, 'u_dst'), 2)
    gl.uniform2f(gl.getUniformLocation(program, 'u_destSize'), width, height)
    gl.uniform2f(gl.getUniformLocation(program, 'u_patternSize'), patternWidth, patternHeight)
    gl.uniform3f(gl.getUniformLocation(program, 'u_inv0'), inv.a, inv.c, inv.e)
    gl.uniform3f(gl.getUniformLocation(program, 'u_inv1'), inv.b, inv.d, inv.f)
    gl.uniform1f(gl.getUniformLocation(program, 'u_patternFlipY'), flipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(program, 'u_patternPremul'), premul ? 1 : 0)
    bindQuad(ctx, program)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

export const compositePatternStrokes = (
    ctx: GlContext,
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
    if (!strokes.length || !source.width || !source.height) {
        return
    }

    const {gl} = ctx
    gl.bindTexture(gl.TEXTURE_2D, source.texture)
    const wrapS = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S)
    const wrapT = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T)
    const mag = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER)
    const min = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    const layer = ctx.ensureLayer(width, height)
    clearTexture(ctx, layer, width, height)

    try {
        for (const stroke of strokes) {
            const strokeTex = ctx.ensureStroke(width, height)
            if (stroke.mesh && stroke.mesh.length >= 6) {
                drawStrokeMask(ctx, strokeTex, width, height, stroke.mesh, stroke.dx ?? 0, stroke.dy ?? 0, true)
            } else if (stroke.canvas) {
                ctx.uploadCanvas(stroke.canvas, strokeTex)
            } else {
                continue
            }
            const backdrop = ctx.ensureScratch(width, height)
            copyTexture2D(ctx, layer, backdrop, width, height)
            drawPatternStroke(
                ctx,
                layer,
                strokeTex,
                backdrop,
                source.texture,
                width,
                height,
                source.width,
                source.height,
                stroke.inv,
                source.flipY,
                source.premul,
            )
        }
    } finally {
        gl.bindTexture(gl.TEXTURE_2D, source.texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min)
        gl.bindTexture(gl.TEXTURE_2D, null)
    }

    if (clipMask) {
        const maskTex = ctx.uploadClipMask(clipMask)
        const clipped = compositeMasked(ctx, layer, maskTex, width, height, false, false, true)
        compositeTextureOver(ctx, clipped, dest, width, height, destFlipY, opacity, false, mode)
        return
    }

    compositeTextureOver(ctx, layer, dest, width, height, destFlipY, opacity, true, mode)
}
