export const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type)
    if (!shader) {
        throw new Error('shader')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
}

export const linkProgram = (gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram => {
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
