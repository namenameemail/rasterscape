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

export const BLEND_FN = `
const int M_SRC_OVER = 0;
const int M_DST_OUT = 1;
const int M_SRC_ATOP = 2;
const int M_DST_OVER = 3;
const int M_LIGHTER = 4;
const int M_XOR = 5;
const int M_MULTIPLY = 6;
const int M_SCREEN = 7;
const int M_OVERLAY = 8;
const int M_DARKEN = 9;
const int M_LIGHTEN = 10;
const int M_DODGE = 11;
const int M_BURN = 12;
const int M_HARD = 13;
const int M_SOFT = 14;
const int M_DIFF = 15;
const int M_EXCL = 16;
const int M_HUE = 17;
const int M_SAT = 18;
const int M_COLOR = 19;
const int M_LUM = 20;

float lum3(vec3 c) {
    return dot(c, vec3(0.3, 0.59, 0.11));
}

vec3 clipColor(vec3 c) {
    float l = lum3(c);
    float n = min(min(c.r, c.g), c.b);
    float x = max(max(c.r, c.g), c.b);
    if (n < 0.0) {
        c = l + (c - l) * (l / (l - n));
    }
    if (x > 1.0) {
        c = l + (c - l) * ((1.0 - l) / (x - l));
    }
    return c;
}

vec3 setLum(vec3 c, float l) {
    return clipColor(c + (l - lum3(c)));
}

float sat3(vec3 c) {
    return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
}

vec3 setSat(vec3 c, float s) {
    float mn = min(min(c.r, c.g), c.b);
    float mx = max(max(c.r, c.g), c.b);
    if (mx <= mn) {
        return vec3(0.0);
    }
    return (c - mn) * (s / (mx - mn));
}

float softLight(float cb, float cs) {
    if (cs <= 0.5) {
        return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);
    }
    float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);
    return cb + (2.0 * cs - 1.0) * (d - cb);
}

float colorDodge(float cb, float cs) {
    if (cb <= 0.0) return 0.0;
    if (cs >= 1.0) return 1.0;
    return min(1.0, cb / (1.0 - cs));
}

float colorBurn(float cb, float cs) {
    if (cb >= 1.0) return 1.0;
    if (cs <= 0.0) return 0.0;
    return 1.0 - min(1.0, (1.0 - cb) / cs);
}

float hardLight(float cb, float cs) {
    return cs <= 0.5 ? 2.0 * cs * cb : 1.0 - 2.0 * (1.0 - cs) * (1.0 - cb);
}

vec3 separable(vec3 Cb, vec3 Cs, int mode) {
    if (mode == M_MULTIPLY) return Cb * Cs;
    if (mode == M_SCREEN) return Cb + Cs - Cb * Cs;
    if (mode == M_OVERLAY) return vec3(hardLight(Cs.r, Cb.r), hardLight(Cs.g, Cb.g), hardLight(Cs.b, Cb.b));
    if (mode == M_DARKEN) return min(Cb, Cs);
    if (mode == M_LIGHTEN) return max(Cb, Cs);
    if (mode == M_DODGE) return vec3(colorDodge(Cb.r, Cs.r), colorDodge(Cb.g, Cs.g), colorDodge(Cb.b, Cs.b));
    if (mode == M_BURN) return vec3(colorBurn(Cb.r, Cs.r), colorBurn(Cb.g, Cs.g), colorBurn(Cb.b, Cs.b));
    if (mode == M_HARD) return vec3(hardLight(Cb.r, Cs.r), hardLight(Cb.g, Cs.g), hardLight(Cb.b, Cs.b));
    if (mode == M_SOFT) return vec3(softLight(Cb.r, Cs.r), softLight(Cb.g, Cs.g), softLight(Cb.b, Cs.b));
    if (mode == M_DIFF) return abs(Cb - Cs);
    if (mode == M_EXCL) return Cb + Cs - 2.0 * Cb * Cs;
    if (mode == M_HUE) return setLum(setSat(Cs, sat3(Cb)), lum3(Cb));
    if (mode == M_SAT) return setLum(setSat(Cb, sat3(Cs)), lum3(Cb));
    if (mode == M_COLOR) return setLum(Cs, lum3(Cb));
    return setLum(Cb, lum3(Cs));
}

vec4 compositeBlend(vec4 src, vec4 dst, int mode) {
    float as = src.a;
    float ab = dst.a;
    vec3 Cs = src.rgb;
    vec3 premulDst = dst.rgb;
    vec3 Cb = ab > 1e-5 ? premulDst / ab : vec3(0.0);
    vec3 co;
    float ao;
    if (mode >= M_MULTIPLY) {
        vec3 B = separable(Cb, Cs, mode);
        co = as * (1.0 - ab) * Cs + as * ab * B + (1.0 - as) * premulDst;
        ao = as + ab * (1.0 - as);
    } else {
        float Fa = 1.0;
        float Fb = 1.0 - as;
        if (mode == M_DST_OUT) {
            Fa = 0.0;
            Fb = 1.0 - as;
        } else if (mode == M_SRC_ATOP) {
            Fa = ab;
            Fb = 1.0 - as;
        } else if (mode == M_DST_OVER) {
            Fa = 1.0 - ab;
            Fb = 1.0;
        } else if (mode == M_LIGHTER) {
            Fa = 1.0;
            Fb = 1.0;
        } else if (mode == M_XOR) {
            Fa = 1.0 - ab;
            Fb = 1.0 - as;
        }
        co = as * Fa * Cs + Fb * premulDst;
        ao = as * Fa + ab * Fb;
    }
    return vec4(clamp(co, 0.0, 1.0), clamp(ao, 0.0, 1.0));
}
`

export const STAMP_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform sampler2D u_dst;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_flipY;
uniform float u_useMask;
uniform float u_maskFlipY;
uniform int u_mode;
uniform vec2 u_destSize;
in vec2 v_uv;
in vec2 v_destUv;
out vec4 o;
${BLEND_FN}
void main() {
    vec2 uv = vec2(v_uv.x, u_flipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    vec4 c = texture(u_tex, uv);
    c.rgb *= u_color;
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    c.a *= u_opacity * ma;
    vec2 duv = gl_FragCoord.xy / u_destSize;
    vec4 dst = texture(u_dst, duv);
    o = compositeBlend(c, dst, u_mode);
}`

export const STAMP_LAYER_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform vec3 u_color;
uniform float u_flipY;
uniform float u_useMask;
uniform float u_maskFlipY;
uniform float u_premul;
in vec2 v_uv;
in vec2 v_destUv;
out vec4 o;
void main() {
    vec2 uv = vec2(v_uv.x, u_flipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    vec4 c = texture(u_tex, uv);
    if (u_premul > 0.5 && c.a > 1e-5) c.rgb /= c.a;
    c.rgb *= u_color;
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    float a = c.a * ma;
    o = vec4(c.rgb * a, a);
}`

export const CIRCLE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_mask;
uniform vec3 u_color;
uniform float u_useMask;
uniform float u_maskFlipY;
uniform vec2 u_stampSize;
in vec2 v_uv;
in vec2 v_destUv;
out vec4 o;
void main() {
    vec2 d = (v_uv - 0.5) * u_stampSize;
    float r = min(u_stampSize.x, u_stampSize.y) * 0.5;
    float cov = clamp(r - length(d) + 0.5, 0.0, 1.0);
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    float a = cov * ma;
    o = vec4(u_color * a, a);
}`

export const STROKE_VS = `#version 300 es
in vec2 a_pos;
uniform vec2 u_destSize;
uniform vec2 u_translate;
uniform float u_flipY;
void main() {
    vec2 p = a_pos + u_translate;
    float ndcY = u_flipY > 0.5
        ? p.y / u_destSize.y * 2.0 - 1.0
        : 1.0 - p.y / u_destSize.y * 2.0;
    gl_Position = vec4(
        p.x / u_destSize.x * 2.0 - 1.0,
        ndcY,
        0.0,
        1.0
    );
}`

export const STROKE_FS = `#version 300 es
precision highp float;
out vec4 o;
void main() {
    o = vec4(1.0);
}`

export const STROKE_TINT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_mask;
uniform sampler2D u_clip;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_useClip;
in vec2 v_uv;
out vec4 o;
void main() {
    float a = texture(u_mask, v_uv).a * u_opacity;
    if (u_useClip > 0.5) a *= texture(u_clip, v_uv).a;
    o = vec4(u_color * a, a);
}`

export const REPEAT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform vec3 u_color;
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
    c.rgb *= u_color;
    float ma = 1.0;
    if (u_useMask > 0.5) {
        vec2 muv = vec2(v_destUv.x, u_maskFlipY > 0.5 ? 1.0 - v_destUv.y : v_destUv.y);
        ma = texture(u_mask, muv).a;
    }
    float a = c.a * u_opacity * ma;
    o = vec4(c.rgb * a, a);
}`

export const BLEND_FS = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform sampler2D u_dst;
uniform float u_opacity;
uniform float u_srcFlipY;
uniform float u_premul;
uniform int u_mode;
in vec2 v_uv;
out vec4 o;
${BLEND_FN}
void main() {
    vec2 suv = vec2(v_uv.x, u_srcFlipY > 0.5 ? 1.0 - v_uv.y : v_uv.y);
    vec4 src = texture(u_src, suv);
    if (u_premul > 0.5 && src.a > 1e-5) src.rgb /= src.a;
    src.a *= u_opacity;
    vec4 dst = texture(u_dst, v_uv);
    o = compositeBlend(src, dst, u_mode);
}`

export const PATTERN_STROKE_FS = `#version 300 es
precision highp float;
uniform sampler2D u_stroke;
uniform sampler2D u_pattern;
uniform sampler2D u_dst;
uniform vec2 u_destSize;
uniform vec2 u_patternSize;
uniform vec3 u_inv0;
uniform vec3 u_inv1;
uniform float u_patternFlipY;
uniform float u_patternPremul;
out vec4 o;
void main() {
    vec2 px = gl_FragCoord.xy;
    vec2 local = vec2(dot(u_inv0, vec3(px, 1.0)), dot(u_inv1, vec3(px, 1.0)));
    vec2 uv = local / u_patternSize;
    if (u_patternFlipY > 0.5) uv.y = 1.0 - uv.y;
    vec4 stroke = texture(u_stroke, px / u_destSize);
    vec4 pat = texture(u_pattern, uv);
    float pa = pat.a;
    vec3 prgb = pat.rgb;
    if (u_patternPremul > 0.5 && pa > 1e-4) prgb /= pa;
    float asrc = stroke.a * pa;
    vec4 dst = texture(u_dst, px / u_destSize);
    float ao = asrc + dst.a * (1.0 - asrc);
    vec3 co = ao > 1e-4 ? (prgb * asrc + dst.rgb * dst.a * (1.0 - asrc)) / ao : vec3(0.0);
    o = vec4(co, ao);
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
