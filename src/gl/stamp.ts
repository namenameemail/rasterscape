import {ECompositeOperation} from '../store/compositeOperations'
import {blendTextureOver} from './blend'
import {blitTexture, copyTexture2D} from './draw'
import type {GlContext} from './GlContext'
import {stampCanvasMat, type StampDrawParams} from './stampMat'

export const stampTextures = (
    ctx: GlContext,
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
    if (!stamps.length) {
        return
    }

    const {gl} = ctx
    let stampSource = source
    let stampFlipY = sourceFlipY

    if (destFlipY) {
        const scratch = ctx.ensureScratch(destW, destH)
        blitTexture(ctx, dest, scratch, destW, destH, true)
        copyTexture2D(ctx, scratch, dest, destW, destH)
        if (source === dest) {
            stampSource = scratch
            stampFlipY = true
        }
    } else if (source === dest) {
        const scratch = ctx.ensureScratch(destW, destH)
        copyTexture2D(ctx, dest, scratch, destW, destH)
        stampSource = scratch
        stampFlipY = true
    }

    const layer = ctx.ensureLayer(destW, destH)
    ctx.bindTexture2DTarget(layer, destW, destH)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(ctx.stampLayerProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, stampSource)
    gl.uniform1i(gl.getUniformLocation(ctx.stampLayerProgram, 'u_tex'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, clipMask ? ctx.uploadClipMask(clipMask) : ctx.ensureWhiteTex())
    gl.uniform1i(gl.getUniformLocation(ctx.stampLayerProgram, 'u_mask'), 1)
    gl.uniform2f(gl.getUniformLocation(ctx.stampLayerProgram, 'u_destSize'), destW, destH)
    gl.uniform1f(gl.getUniformLocation(ctx.stampLayerProgram, 'u_flipY'), stampFlipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.stampLayerProgram, 'u_useMask'), clipMask ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.stampLayerProgram, 'u_maskFlipY'), clipMask ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.stampLayerProgram, 'u_premul'), sourcePremul ? 1 : 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, ctx.stampBuffer)
    const aCorner = gl.getAttribLocation(ctx.stampLayerProgram, 'a_corner')
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(aCorner)

    const uMat = gl.getUniformLocation(ctx.stampLayerProgram, 'u_mat')
    const uStampSize = gl.getUniformLocation(ctx.stampLayerProgram, 'u_stampSize')
    const uColor = gl.getUniformLocation(ctx.stampLayerProgram, 'u_color')

    for (const stamp of stamps) {
        const color = stamp.color ?? [1, 1, 1]
        gl.uniform2f(uStampSize, stamp.width, stamp.height)
        gl.uniform3f(uColor, color[0], color[1], color[2])
        gl.uniformMatrix3fv(uMat, false, stampCanvasMat(stamp))
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    gl.disable(gl.BLEND)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    blendTextureOver(ctx, dest, layer, destW, destH, false, false, mode, opacity, true)
}
