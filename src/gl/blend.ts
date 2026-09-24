import {ECompositeOperation} from '../store/compositeOperations'
import {blendModeId} from './blendModes'
import {bindQuad, blitTexture} from './draw'
import type {GlContext} from './GlContext'

export const blendTextureOver = (
    ctx: GlContext,
    dest: WebGLTexture,
    src: WebGLTexture,
    width: number,
    height: number,
    destFlipY: boolean,
    srcFlipY: boolean,
    mode: ECompositeOperation = ECompositeOperation.SourceOver,
    opacity = 1,
    premul = false,
): void => {
    const backdrop = ctx.ensureScratch(width, height)
    blitTexture(ctx, dest, backdrop, width, height, destFlipY)

    const {gl} = ctx
    ctx.bindTexture2DTarget(dest, width, height)
    gl.disable(gl.BLEND)
    gl.useProgram(ctx.blendProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src)
    gl.uniform1i(gl.getUniformLocation(ctx.blendProgram, 'u_src'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, backdrop)
    gl.uniform1i(gl.getUniformLocation(ctx.blendProgram, 'u_dst'), 1)
    gl.uniform1f(gl.getUniformLocation(ctx.blendProgram, 'u_opacity'), opacity)
    gl.uniform1f(gl.getUniformLocation(ctx.blendProgram, 'u_srcFlipY'), srcFlipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.blendProgram, 'u_premul'), premul ? 1 : 0)
    gl.uniform1i(gl.getUniformLocation(ctx.blendProgram, 'u_mode'), blendModeId(mode))
    bindQuad(ctx, ctx.blendProgram)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
