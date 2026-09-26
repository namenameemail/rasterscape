uniform int u_CutFuncType;
uniform int u_Direction;
uniform sampler2D u_CFParamTexture_0;
uniform sampler2D u_CFParamTexture_1;
uniform sampler2D u_CFParamTexture_2;
uniform sampler2D u_CFParamTexture_3;
uniform int u_CFParamIV0[500];
uniform int u_CFParamI0;
uniform int u_CFParamI1;
uniform int u_CFParamI2;
uniform int u_CFParamI3;
uniform int u_CFParamI4;
uniform int u_CFParamI5;
uniform float u_CFParamF0;
uniform float u_CFParamF1;
uniform float u_CFParamF2;
uniform float u_CFParamF3;
uniform float u_CFParamF4;
uniform float u_CFParamF5;
uniform float u_CFParamF6;
uniform float u_CFParamF7;
uniform float u_CFParamF8;
uniform float u_CFParamF9;
uniform float u_CutOffset_x0;
uniform float u_CutOffset_y0;
uniform float u_CutOffset_z0;
uniform float u_CutOffset_x1;
uniform float u_CutOffset_y1;
uniform float u_CutOffset_z1;

float xyParaboloid(float centerX, float centerY, float kx, float ky, float x, float y) {
    return pow(x - centerX, 2.0) * kx + pow(y - centerY, 2.0) * ky;
}

float xySis2(float cosA, float h, float xN, float yN, float xD, float yD, float XA, float xdd, float ydd, float x, float y) {
    float W = 300.0;
    float H = 300.0;
    float xx = x * W;
    float yy = y * H;
    float xxmW2pxdd = xx - W / 2.0 + xdd;
    float yymH2pydd = yy - H / 2.0 + ydd;
    return (
        XA * sqrt(pow(xxmW2pxdd, 2.0) + pow(yymH2pydd, 2.0))
        + h
        + cosA * cos(
            sqrt(
                pow(xxmW2pxdd + xx * (xN / xD - 1.0), 2.0)
                + pow(yymH2pydd + yy * (yN / yD - 1.0), 2.0)
            )
        )
    ) / W;
}

float xySq(float a, float b, float c, float h, float x, float y) {
    return sin(x / a) * cos(y / b) * c + h;
}

float sampleDepthComp(sampler2D tex, vec2 uv, int comp) {
    vec4 c = texture(tex, uv);
    if (comp == 1) {
        return c.g;
    }
    if (comp == 2) {
        return c.b;
    }
    if (comp == 3) {
        return c.a;
    }
    return c.r;
}

float evalFxyCut(float tex_x, float tex_y) {
    float tex_z = 0.0;
    if (u_CutFuncType == 1) {
        tex_z = xyParaboloid(0.5, 0.5, u_CFParamF2, u_CFParamF3, tex_x, tex_y) * u_CFParamF0 + u_CFParamF1;
    } else if (u_CutFuncType == 2) {
        tex_z = xySis2(
            u_CFParamF1, u_CFParamF2, u_CFParamF3, u_CFParamF4,
            u_CFParamF5, u_CFParamF6, u_CFParamF7, u_CFParamF8, u_CFParamF9,
            tex_x, tex_y
        ) * u_CFParamF0;
    } else if (u_CutFuncType == 5) {
        tex_z = xySq(u_CFParamF0, u_CFParamF1, u_CFParamF2, u_CFParamF3, tex_x, tex_y) * u_CFParamF4;
    } else if (u_CutFuncType == 3) {
        float from = u_CFParamF1;
        float to = u_CFParamF2;
        float drawWidth = float(u_CFParamI3);
        float drawHeight = float(u_CFParamI4);
        int i = int(floor(tex_x * drawWidth));
        float coordinateValue = float(u_CFParamIV0[i]) / drawHeight;
        float amplitude = abs(to - from);
        float mn = min(from, to);
        tex_z = mn + amplitude * coordinateValue;
    }
    return tex_z;
}

float evalDepthCut(float tex_x, float tex_y) {
    float tex_z = 0.0;
    vec2 uv = vec2(tex_x, 1.0 - tex_y);
    if (0 < u_CFParamI5) {
        tex_z += u_CFParamF1 + (1.0 - u_CFParamF1) * u_CFParamF0 * sampleDepthComp(u_CFParamTexture_0, uv, u_CFParamI0);
    }
    if (1 < u_CFParamI5) {
        tex_z += u_CFParamF3 + (1.0 - u_CFParamF3) * u_CFParamF2 * sampleDepthComp(u_CFParamTexture_1, uv, u_CFParamI1);
    }
    if (2 < u_CFParamI5) {
        tex_z += u_CFParamF5 + (1.0 - u_CFParamF5) * u_CFParamF4 * sampleDepthComp(u_CFParamTexture_2, uv, u_CFParamI2);
    }
    if (3 < u_CFParamI5) {
        tex_z += u_CFParamF7 + (1.0 - u_CFParamF7) * u_CFParamF6 * sampleDepthComp(u_CFParamTexture_3, uv, u_CFParamI3);
    }
    return tex_z;
}

float evalCut(float tex_x, float tex_y) {
    if (u_CutFuncType == 4) {
        return evalDepthCut(tex_x, tex_y);
    }
    return evalFxyCut(tex_x, tex_y);
}

bool insideOffsetBox(vec3 p) {
    float x0 = min(u_CutOffset_x0, u_CutOffset_x1);
    float x1 = max(u_CutOffset_x0, u_CutOffset_x1);
    float y0 = min(u_CutOffset_y0, u_CutOffset_y1);
    float y1 = max(u_CutOffset_y0, u_CutOffset_y1);
    float z0 = min(u_CutOffset_z0, u_CutOffset_z1);
    float z1 = max(u_CutOffset_z0, u_CutOffset_z1);
    return p.x >= x0 && p.x <= x1
        && p.y >= y0 && p.y <= y1
        && p.z >= z0 && p.z <= z1;
}

float normInRange(float v, float a, float b) {
    float d = b - a;
    if (abs(d) < 1e-6) {
        return 0.0;
    }
    return (v - a) / d;
}

bool insideFxyCut(vec3 p) {
    if (!insideOffsetBox(p)) {
        return false;
    }
    if (u_CutFuncType == 0) {
        return true;
    }

    float ux = normInRange(p.x, u_CutOffset_x0, u_CutOffset_x1);
    float uy = normInRange(p.y, u_CutOffset_y0, u_CutOffset_y1);
    float uz = normInRange(p.z, u_CutOffset_z0, u_CutOffset_z1);

    if (u_Direction == 2) {
        return ux > evalCut(uz, uy);
    }
    if (u_Direction == 3) {
        return uy > evalCut(ux, uz);
    }
    return uz > evalCut(ux, uy);
}
