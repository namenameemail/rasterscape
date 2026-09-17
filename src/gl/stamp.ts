import {
    blitTexture,
    copyTexture2D,
} from './draw'
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

    ctx.bindTexture2DTarget(dest, destW, destH)
    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(ctx.stampProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, stampSource)
    gl.uniform1i(gl.getUniformLocation(ctx.stampProgram, 'u_tex'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, clipMask ? ctx.uploadClipMask(clipMask) : ctx.ensureWhiteTex())
    gl.uniform1i(gl.getUniformLocation(ctx.stampProgram, 'u_mask'), 1)
    gl.uniform2f(gl.getUniformLocation(ctx.stampProgram, 'u_destSize'), destW, destH)
    gl.uniform1f(gl.getUniformLocation(ctx.stampProgram, 'u_opacity'), opacity)
    gl.uniform1f(gl.getUniformLocation(ctx.stampProgram, 'u_flipY'), stampFlipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.stampProgram, 'u_useMask'), clipMask ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.stampProgram, 'u_maskFlipY'), 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, ctx.stampBuffer)
    const aCorner = gl.getAttribLocation(ctx.stampProgram, 'a_corner')
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(aCorner)

    const uMat = gl.getUniformLocation(ctx.stampProgram, 'u_mat')
    const uStampSize = gl.getUniformLocation(ctx.stampProgram, 'u_stampSize')

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
