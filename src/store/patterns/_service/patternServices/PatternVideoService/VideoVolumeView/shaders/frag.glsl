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

vec4 sampleVolume(vec3 p) {
    float z = fract(1.0 + u_queueOffset - p.z * u_stackScale);
    return texture(u_volume, vec3(p.x, p.y, z));
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
            float a = s.a * w;
            acc.rgb += (1.0 - acc.a) * a * s.rgb;
            acc.a += (1.0 - acc.a) * a;
            if (acc.a > 0.97) break;
        }
        p += rd * dt;
    }

    vec3 bg = vec3(0.05, 0.05, 0.07);
    o = vec4(acc.rgb + bg * (1.0 - acc.a), 1.0);
}
