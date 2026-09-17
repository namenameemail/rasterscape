import type {GlContext} from './GlContext'

export const blitToScratch = (
    ctx: GlContext,
    source: WebGLTexture,
    width: number,
    height: number,
    flipY = false,
): WebGLTexture => {
    const scratch = ctx.ensureScratch(width, height)
    blitTexture(ctx, source, scratch, width, height, flipY)
    return scratch
}

export const blitTexture = (
    ctx: GlContext,
    source: WebGLTexture,
    dest: WebGLTexture,
    width: number,
    height: number,
    flipY = false,
): void => {
    const {gl} = ctx
    gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.copyFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dest, 0)
    gl.viewport(0, 0, width, height)
    gl.disable(gl.BLEND)
    drawTexture(ctx, source, flipY)
}

export const copyTexture2D = (
    ctx: GlContext,
    source: WebGLTexture,
    dest: WebGLTexture,
    width: number,
    height: number,
): void => {
    const {gl} = ctx
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.copyFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, source, 0)
    gl.bindTexture(gl.TEXTURE_2D, dest)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
}

export const bindQuad = (ctx: GlContext, program: WebGLProgram): void => {
    const {gl} = ctx
    gl.bindBuffer(gl.ARRAY_BUFFER, ctx.blitBuffer)
    const stride = 16
    const aPos = gl.getAttribLocation(program, 'a_pos')
    const aUv = gl.getAttribLocation(program, 'a_uv')
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8)
    gl.enableVertexAttribArray(aPos)
    gl.enableVertexAttribArray(aUv)
}

export const drawTexture = (ctx: GlContext, texture: WebGLTexture, flipY = false, opacity = 1): void => {
    const {gl} = ctx
    gl.useProgram(ctx.blitProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(gl.getUniformLocation(ctx.blitProgram, 'u_tex'), 0)
    gl.uniform1f(gl.getUniformLocation(ctx.blitProgram, 'u_flipY'), flipY ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(ctx.blitProgram, 'u_opacity'), opacity)
    bindQuad(ctx, ctx.blitProgram)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export const drawBlur = (
    ctx: GlContext,
    texture: WebGLTexture,
    ox: number,
    oy: number,
    radius: number,
): void => {
    const {gl} = ctx
    gl.useProgram(ctx.blurProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(gl.getUniformLocation(ctx.blurProgram, 'u_tex'), 0)
    gl.uniform2f(gl.getUniformLocation(ctx.blurProgram, 'u_offset'), ox, oy)
    gl.uniform1f(gl.getUniformLocation(ctx.blurProgram, 'u_radius'), radius * 0.5)
    bindQuad(ctx, ctx.blurProgram)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export const blurTexture = (
    ctx: GlContext,
    texture: WebGLTexture,
    width: number,
    height: number,
    radius: number,
): void => {
    if (radius <= 0) {
        return
    }

    const scratch = ctx.ensureScratch(width, height)
    const {gl} = ctx
    gl.viewport(0, 0, width, height)

    gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.copyFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scratch, 0)
    drawBlur(ctx, texture, 1 / width, 0, radius)

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.bindTexture(gl.TEXTURE_2D, null)
    drawBlur(ctx, scratch, 0, 1 / height, radius)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
