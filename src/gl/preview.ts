import {bindQuad, drawTexture} from './draw'
import type {GlContext} from './GlContext'

export const drawPreviewToCanvas = (
    ctx: GlContext,
    target: HTMLCanvasElement,
    source: WebGLTexture,
    sourceW: number,
    sourceH: number,
    sourceFlipY: boolean,
    mask: WebGLTexture | null,
    maskFlipY: boolean,
    inverted: boolean,
): void => {
    const outW = target.width
    const outH = target.height
    const context = target.getContext('2d')
    if (!context || !outW || !outH || !sourceW || !sourceH) return

    const ratio = sourceW / sourceH
    const width = outW * (ratio <= 1 ? ratio : 1)
    const height = outH * (ratio > 1 ? 1 / ratio : 1)
    const x = ratio <= 1 ? (outW - width) / 2 : 0
    const y = ratio > 1 ? (outH - height) / 2 : 0

    const {gl} = ctx
    const dest = ctx.ensurePreview(outW, outH)
    ctx.bindTexture2DTarget(dest, outW, outH)
    gl.disable(gl.BLEND)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const vx = Math.round(x)
    const vw = Math.max(1, Math.round(width))
    const vh = Math.max(1, Math.round(height))
    const vy = Math.round(outH - y - height)
    gl.viewport(vx, vy, vw, vh)

    if (mask) {
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
        gl.bindTexture(gl.TEXTURE_2D, null)
    } else {
        drawTexture(ctx, source, sourceFlipY)
    }

    const pixels = ctx.ensurePreviewPixels(outW, outH)
    gl.readPixels(0, 0, outW, outH, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    const imageData = context.createImageData(outW, outH)
    const row = outW * 4
    for (let yRow = 0; yRow < outH; yRow++) {
        const src = (outH - 1 - yRow) * row
        imageData.data.set(pixels.subarray(src, src + row), yRow * row)
    }
    context.clearRect(0, 0, outW, outH)
    context.putImageData(imageData, 0, 0)
}
