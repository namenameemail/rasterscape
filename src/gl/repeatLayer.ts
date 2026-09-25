import type {GlContext} from './GlContext'
import {stampCanvasMat, type StampDrawParams} from './stampMat'

export type RepeatStamp = {
    tex: WebGLTexture
    stamp: StampDrawParams
}

export const drawRepeatLayer = (
    ctx: GlContext,
    layer: WebGLTexture,
    width: number,
    height: number,
    stamps: RepeatStamp[],
    opacity: number,
    clipMask?: HTMLCanvasElement | null,
): void => {
    const {gl} = ctx
    ctx.bindTexture2DTarget(layer, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!stamps.length) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(ctx.repeatProgram)

    const mask = clipMask ? ctx.uploadClipMask(clipMask) : ctx.ensureWhiteTex()
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(gl.getUniformLocation(ctx.repeatProgram, 'u_tex'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, mask)
    gl.uniform1i(gl.getUniformLocation(ctx.repeatProgram, 'u_mask'), 1)
    gl.uniform2f(gl.getUniformLocation(ctx.repeatProgram, 'u_destSize'), width, height)
    gl.uniform1f(gl.getUniformLocation(ctx.repeatProgram, 'u_opacity'), opacity)
    gl.uniform1f(gl.getUniformLocation(ctx.repeatProgram, 'u_flipY'), 0)
    gl.uniform1f(gl.getUniformLocation(ctx.repeatProgram, 'u_useMask'), clipMask ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.repeatProgram, 'u_maskFlipY'), clipMask ? 1 : 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, ctx.stampBuffer)
    const aCorner = gl.getAttribLocation(ctx.repeatProgram, 'a_corner')
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(aCorner)

    const uMat = gl.getUniformLocation(ctx.repeatProgram, 'u_mat')
    const uStampSize = gl.getUniformLocation(ctx.repeatProgram, 'u_stampSize')
    const uColor = gl.getUniformLocation(ctx.repeatProgram, 'u_color')

    gl.activeTexture(gl.TEXTURE0)
    for (const item of stamps) {
        const color = item.stamp.color ?? [1, 1, 1]
        gl.bindTexture(gl.TEXTURE_2D, item.tex)
        gl.uniform2f(uStampSize, item.stamp.width, item.stamp.height)
        gl.uniform3f(uColor, color[0], color[1], color[2])
        gl.uniformMatrix3fv(uMat, false, stampCanvasMat(item.stamp))
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    gl.disable(gl.BLEND)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
