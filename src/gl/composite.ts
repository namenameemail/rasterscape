import {ECompositeOperation} from '../store/compositeOperations'
import {blendTextureOver} from './blend'
import {bindQuad, drawTexture} from './draw'
import type {GlContext} from './GlContext'

export const compositeTextureOver = (
    ctx: GlContext,
    video: WebGLTexture,
    dest: WebGLTexture,
    width: number,
    height: number,
    destFlipY: boolean,
    opacity = 1,
    layerFlipY = false,
    mode: ECompositeOperation = ECompositeOperation.SourceOver,
): void => {
    blendTextureOver(ctx, dest, video, width, height, destFlipY, layerFlipY, mode, opacity)
}

export const compositeCanvasOver = (
    ctx: GlContext,
    dest: WebGLTexture,
    width: number,
    height: number,
    destFlipY: boolean,
    layer: HTMLCanvasElement,
    opacity = 1,
    clipMask?: HTMLCanvasElement | null,
    mode: ECompositeOperation = ECompositeOperation.SourceOver,
): void => {
    const layerTex = ctx.ensureLayer(width, height)
    ctx.uploadCanvas(layer, layerTex)

    if (clipMask) {
        const maskTex = ctx.uploadClipMask(clipMask)
        const clipped = compositeMasked(ctx, layerTex, maskTex, width, height, false, false, true)
        compositeTextureOver(ctx, clipped, dest, width, height, destFlipY, opacity, false, mode)
        return
    }

    compositeTextureOver(ctx, layerTex, dest, width, height, destFlipY, opacity, true, mode)
}

export const compositeMasked = (
    ctx: GlContext,
    source: WebGLTexture,
    mask: WebGLTexture,
    width: number,
    height: number,
    inverted: boolean,
    maskFlipY: boolean,
    sourceFlipY = false,
): WebGLTexture => {
    const dest = ctx.ensureMaskScratch(width, height)
    const {gl} = ctx
    gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.copyFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dest, 0)
    gl.viewport(0, 0, width, height)
    gl.disable(gl.BLEND)
    gl.useProgram(ctx.maskProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, source)
    gl.uniform1i(gl.getUniformLocation(ctx.maskProgram, 'u_tex'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, mask)
    gl.uniform1i(gl.getUniformLocation(ctx.maskProgram, 'u_mask'), 1)
    gl.uniform1f(gl.getUniformLocation(ctx.maskProgram, 'u_invert'), inverted ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.maskProgram, 'u_flipY'), sourceFlipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.maskProgram, 'u_maskFlipY'), maskFlipY ? 1 : 0)
    bindQuad(ctx, ctx.maskProgram)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return dest
}

export const compositeDefaultOver = (
    ctx: GlContext,
    dest: WebGLTexture,
    width: number,
    height: number,
    destFlipY: boolean,
): void => {
    const {gl} = ctx
    const video = ctx.ensureScratch(width, height)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, video)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height)

    ctx.blitToDefault(dest, width, height, destFlipY)

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    drawTexture(ctx, video)
    gl.disable(gl.BLEND)

    ctx.copyFramebufferToTexture(dest, width, height)
}
