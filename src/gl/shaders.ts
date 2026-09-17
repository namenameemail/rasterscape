export const BLIT_VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform float u_flipY;
out vec2 v_uv;
void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_uv = vec2(a_uv.x, u_flipY > 0.5 ? 1.0 - a_uv.y : a_uv.y);
}`

export const BLIT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o;
void main() {
    vec4 c = texture(u_tex, v_uv);
    o = vec4(c.rgb, c.a * u_opacity);
}`

export const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_offset;
uniform float u_radius;
in vec2 v_uv;
out vec4 o;
void main() {
    float r = min(u_radius, 16.0);
    vec4 acc = texture(u_tex, v_uv);
    float wsum = 1.0;
    for (int i = 1; i <= 16; i++) {
        float fi = float(i);
        if (fi > r) break;
        float w = 1.0 - fi / (r + 1.0);
        acc += texture(u_tex, v_uv + u_offset * fi) * w;
        acc += texture(u_tex, v_uv - u_offset * fi) * w;
        wsum += 2.0 * w;
    }
    o = acc / wsum;
}`

export const MASK_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform float u_invert;
uniform float u_maskFlipY;
in vec2 v_uv;
out vec4 o;
void main() {
    vec4 c = texture(u_tex, v_uv);
    vec2 muv = vec2(v_uv.x, u_maskFlipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    float ma = texture(u_mask, muv).a;
    float a = u_invert > 0.5 ? 1.0 - ma : ma;
    o = vec4(c.rgb, c.a * a);
}`

export const STAMP_VS = `#version 300 es
in vec2 a_corner;
uniform vec2 u_destSize;
uniform vec2 u_stampSize;
uniform mat3 u_mat;
out vec2 v_uv;
out vec2 v_destUv;
void main() {
    vec2 local = a_corner * u_stampSize;
    vec3 p = u_mat * vec3(local, 1.0);
    gl_Position = vec4(
        p.x / u_destSize.x * 2.0 - 1.0,
        1.0 - p.y / u_destSize.y * 2.0,
        0.0,
        1.0
    );
    v_uv = a_corner + 0.5;
    v_destUv = vec2(p.x / u_destSize.x, p.y / u_destSize.y);
}`

export const STAMP_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform float u_opacity;
uniform float u_flipY;
uniform float u_useMask;
uniform float u_maskFlipY;
in vec2 v_uv;
in vec2 v_destUv;
out vec4 o;
void main() {
    vec2 uv = vec2(v_uv.x, u_flipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    vec4 c = texture(u_tex, uv);
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    o = vec4(c.rgb, c.a * u_opacity * ma);
}`

export const QUAD = new Float32Array([
    -1, 1, 0, 1,
    -1, -1, 0, 0,
    1, 1, 1, 1,
    1, -1, 1, 0,
])

export const STAMP_CORNERS = new Float32Array([
    -0.5, -0.5,
    -0.5, 0.5,
    0.5, -0.5,
    0.5, 0.5,
])
