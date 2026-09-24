import {bindQuad} from './draw'
import type {GlContext} from './GlContext'

export type StrokeDraw = {
    mesh: Float32Array
    dx: number
    dy: number
    color: [number, number, number]
}

export const drawStrokeLayer = (
    ctx: GlContext,
    layer: WebGLTexture,
    width: number,
    height: number,
    strokes: StrokeDraw[],
    opacity: number,
    clipMask?: HTMLCanvasElement | null,
): void => {
    const {gl} = ctx
    const mask = ctx.ensureMaskScratch(width, height)
    ctx.bindTexture2DTarget(layer, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!strokes.length) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return
    }

    const clip = clipMask ? ctx.uploadClipMask(clipMask) : null
    const aUv = gl.getAttribLocation(ctx.strokeTintProgram, 'a_uv')
    const aStrokePos = gl.getAttribLocation(ctx.strokeProgram, 'a_pos')
    for (const stroke of strokes) {
        if (stroke.mesh.length < 6) continue
        ctx.bindTexture2DTarget(mask, width, height)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.disable(gl.BLEND)
        if (aUv >= 0) gl.disableVertexAttribArray(aUv)
        gl.useProgram(ctx.strokeProgram)
        gl.uniform2f(gl.getUniformLocation(ctx.strokeProgram, 'u_destSize'), width, height)
        gl.uniform2f(gl.getUniformLocation(ctx.strokeProgram, 'u_translate'), stroke.dx, stroke.dy)
        gl.bindBuffer(gl.ARRAY_BUFFER, ctx.strokeBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, stroke.mesh, gl.DYNAMIC_DRAW)
        gl.vertexAttribPointer(aStrokePos, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aStrokePos)
        gl.drawArrays(gl.TRIANGLES, 0, stroke.mesh.length / 2)

        ctx.bindTexture2DTarget(layer, width, height)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.useProgram(ctx.strokeTintProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, mask)
        gl.uniform1i(gl.getUniformLocation(ctx.strokeTintProgram, 'u_mask'), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, clip ?? ctx.ensureWhiteTex())
        gl.uniform1i(gl.getUniformLocation(ctx.strokeTintProgram, 'u_clip'), 1)
        gl.uniform1f(gl.getUniformLocation(ctx.strokeTintProgram, 'u_opacity'), opacity)
        gl.uniform1f(gl.getUniformLocation(ctx.strokeTintProgram, 'u_useClip'), clip ? 1 : 0)
        gl.uniform1f(gl.getUniformLocation(ctx.strokeTintProgram, 'u_flipY'), 0)
        gl.uniform3f(gl.getUniformLocation(ctx.strokeTintProgram, 'u_color'), stroke.color[0], stroke.color[1], stroke.color[2])
        bindQuad(ctx, ctx.strokeTintProgram)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    gl.disable(gl.BLEND)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
