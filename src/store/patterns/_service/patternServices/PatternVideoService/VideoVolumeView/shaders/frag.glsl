#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

uniform sampler3D u_volume;
uniform vec3 u_camPos;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform vec3 u_camForward;
uniform float u_tanHalfFov;
uniform float u_aspect;
uniform float u_queueOffset;
uniform float u_stackScale;
uniform int u_steps;
uniform float u_ghost;

__FXY_CUT__

in vec2 v_uv;
out vec4 o;

bool intersectAabb(vec3 ro, vec3 rd, out float t0, out float t1) {
    vec3 inv = 1.0 / rd;
    vec3 tmin = (vec3(0.0) - ro) * inv;
    vec3 tmax = (vec3(1.0) - ro) * inv;
    vec3 tsmaller = min(tmin, tmax);
    vec3 tbigger = max(tmin, tmax);
    t0 = max(max(tsmaller.x, tsmaller.y), tsmaller.z);
    t1 = min(min(tbigger.x, tbigger.y), tbigger.z);
    return t1 >= max(t0, 0.0);
}

// один слайс стека, без lerp; у X/Y стенки crop — торец, иначе лицо кадра
vec4 sampleVolume(vec3 p) {
    float z = fract(1.0 + u_queueOffset - p.z * u_stackScale);
    ivec3 sz = textureSize(u_volume, 0);
    int iz = clamp(int(floor(z * float(sz.z))), 0, sz.z - 1);

    float x0 = min(u_CutOffset_x0, u_CutOffset_x1);
    float x1 = max(u_CutOffset_x0, u_CutOffset_x1);
    float y0 = min(u_CutOffset_y0, u_CutOffset_y1);
    float y1 = max(u_CutOffset_y0, u_CutOffset_y1);
    float z0 = min(u_CutOffset_z0, u_CutOffset_z1);
    float z1 = max(u_CutOffset_z0, u_CutOffset_z1);

    float dx0 = abs(p.x - x0);
    float dx1 = abs(p.x - x1);
    float dy0 = abs(p.y - y0);
    float dy1 = abs(p.y - y1);
    float dz = min(abs(p.z - z0), abs(p.z - z1));

    float edgeX = dx0 < dx1 ? x0 : x1;
    float dX = min(dx0, dx1);
    float edgeY = dy0 < dy1 ? y0 : y1;
    float dY = min(dy0, dy1);

    float eps = max(2.0 / float(max(sz.x, sz.y)), 0.01);
    vec2 uv = p.xy;
    if (dX <= dY && dX < dz && dX < eps) {
        uv.x = edgeX;
    } else if (dY < dX && dY < dz && dY < eps) {
        uv.y = edgeY;
    }

    ivec2 ixy = ivec2(clamp(uv, vec2(0.0), vec2(0.999999)) * vec2(sz.xy));
    return texelFetch(u_volume, ivec3(ixy, iz), 0);
}

void main() {
    vec2 ndc = v_uv * 2.0 - 1.0;
    vec3 rd = normalize(
        u_camForward
        + u_camRight * (-ndc.x * u_aspect * u_tanHalfFov)
        + u_camUp * (ndc.y * u_tanHalfFov)
    );
    vec3 ro = u_camPos;

    float tEnter;
    float tExit;
    if (!intersectAabb(ro, rd, tEnter, tExit)) {
        o = vec4(0.05, 0.05, 0.07, 1.0);
        return;
    }

    tEnter = max(tEnter, 0.0);
    float len = tExit - tEnter;
    int steps = u_steps;
    float dt = len / float(steps);

    vec4 acc = vec4(0.0);
    vec3 p = ro + rd * (tEnter + 0.5 * dt);

    for (int i = 0; i < 128; i++) {
        if (i >= steps) break;
        vec3 pc = clamp(p, 0.0, 1.0);
        float w = cutSampleWeight(pc);
        if (w > 0.0) {
            vec4 s = sampleVolume(pc);
            float dens = max(s.a, max(s.r, max(s.g, s.b)));
            if (w >= 1.0) {
                if (dens > 0.004) {
                    acc.rgb += (1.0 - acc.a) * s.rgb;
                    acc.a = 1.0;
                    break;
                }
            } else if (dens > 0.004) {
                float a = w;
                acc.rgb += (1.0 - acc.a) * a * s.rgb;
                acc.a += (1.0 - acc.a) * a;
                if (acc.a > 0.97) break;
            }
        }
        p += rd * dt;
    }

    vec3 bg = vec3(0.05, 0.05, 0.07);
    o = vec4(acc.rgb + bg * (1.0 - acc.a), 1.0);
}
