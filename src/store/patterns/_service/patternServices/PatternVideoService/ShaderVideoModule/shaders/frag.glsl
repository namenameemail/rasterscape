#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;


uniform sampler3D u_Sampler;
uniform float u_QueueOffset;
uniform float u_TexQueueOffset;
uniform float u_TexOffset;
uniform int u_Direction;
uniform int u_Error;
uniform int u_Width;
uniform int u_Height;
uniform int u_StackSize;
uniform int u_Mirror;

uniform float u_CutOffset_x0;
uniform float u_CutOffset_y0;
uniform float u_CutOffset_z0;
uniform float u_CutOffset_x1;
uniform float u_CutOffset_y1;
uniform float u_CutOffset_z1;


uniform int u_CutFuncType;
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
uniform int u_CFParamI6;
uniform int u_CFParamI7;
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

in vec2 v_TexCoord;
out vec4 outputColor;


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

    float r = (
    XA * sqrt(pow(xxmW2pxdd, 2.0) + pow(yymH2pydd, 2.0))
    + h
    + cosA * cos(
    sqrt(
    pow(xxmW2pxdd + xx * (xN / xD - 1.0), 2.0)
    + pow(yymH2pydd + yy * (yN / yD - 1.0), 2.0)
    )
    )
    ) / W;


    // coordHelper.writeln(r);

    return r;
}


float xySq(float a, float b, float c, float h, float x, float y) {
    

    float r = (sin(x / a) * cos(y / b) * c + h);


    // coordHelper.writeln(r);

    return r;
}

void main() {

    float x = 0.0;
    float y = 0.0;
    float z = 0.0;

    // texture coords
    float tex_x = v_TexCoord.x;
    float tex_y = v_TexCoord.y;
    float tex_z = 0.0;
    float sub_tex_y = 1.0 - tex_y;


    switch (u_CutFuncType) {
        case 1:
        float end_1 = u_CFParamF0;
        float zd = u_CFParamF1;
        float xk = u_CFParamF2;
        float yk = u_CFParamF3;
        tex_z = xyParaboloid(0.5, 0.5, xk, yk, tex_x, tex_y) * end_1 + zd;
        break;

        case 2:
        float end_2 = u_CFParamF0;
        float cosA = u_CFParamF1;
        float h = u_CFParamF2;
        float xN = u_CFParamF3;
        float yN = u_CFParamF4;
        float xD = u_CFParamF5;
        float yD = u_CFParamF6;
        float XA = u_CFParamF7;
        float xdd = u_CFParamF8;
        float ydd = u_CFParamF9;
        tex_z = xySis2(cosA, h, xN, yN, xD, yD, XA, xdd, ydd, tex_x, tex_y) * end_2;
        break;

        case 5:
        float a = u_CFParamF0;
        float b = u_CFParamF1;
        float c = u_CFParamF2;
        float h_5 = u_CFParamF3;
        float end_5 = u_CFParamF4;
        tex_z = xySq(a, b, c, h_5, tex_x, tex_y) * end_5;
        break;

        case 3:

        float from = u_CFParamF1;
        float to = u_CFParamF2;
        float drawWidth = float(u_CFParamI3);
        float drawHeight = float(u_CFParamI4);


        int i = int(floor(tex_x * float(drawWidth)));


        float coordinateValue = float(u_CFParamIV0[i]) / float(drawHeight);


        float amplitude = abs(to - from);
        float min = min(from, to);
        // const inverse = to < from;


        tex_z = min + amplitude * coordinateValue;

        break;
        case 4:

        if (0 < u_CFParamI5) {
            switch (u_CFParamI0) {
                case 0:
                tex_z += u_CFParamF1 + (1.0 - u_CFParamF1) * u_CFParamF0 * texture(u_CFParamTexture_0, vec2(tex_x, sub_tex_y)).r;
                break;
                case 1:
                tex_z += u_CFParamF1 + (1.0 - u_CFParamF1) * u_CFParamF0 * texture(u_CFParamTexture_0, vec2(tex_x, sub_tex_y)).g;
                break;
                case 2:
                tex_z += u_CFParamF1 + (1.0 - u_CFParamF1) * u_CFParamF0 * texture(u_CFParamTexture_0, vec2(tex_x, sub_tex_y)).b;
                break;
                case 3:
                tex_z += u_CFParamF1 + (1.0 - u_CFParamF1) * u_CFParamF0 * texture(u_CFParamTexture_0, vec2(tex_x, sub_tex_y)).a;
                break;
            }
        }
        if (1 < u_CFParamI5) {
            switch (u_CFParamI1) {
                case 0:
                tex_z += u_CFParamF3 + (1.0 - u_CFParamF3) * u_CFParamF2 * texture(u_CFParamTexture_1, vec2(tex_x, sub_tex_y)).r;
                break;
                case 1:
                tex_z += u_CFParamF3 + (1.0 - u_CFParamF3) * u_CFParamF2 * texture(u_CFParamTexture_1, vec2(tex_x, sub_tex_y)).g;
                break;
                case 2:
                tex_z += u_CFParamF3 + (1.0 - u_CFParamF3) * u_CFParamF2 * texture(u_CFParamTexture_1, vec2(tex_x, sub_tex_y)).b;
                break;
                case 3:
                tex_z += u_CFParamF3 + (1.0 - u_CFParamF3) * u_CFParamF2 * texture(u_CFParamTexture_1, vec2(tex_x, sub_tex_y)).a;
                break;
            }
        }
        if (2 < u_CFParamI5) {
            switch (u_CFParamI2) {
                case 0:
                tex_z += u_CFParamF5 + (1.0 - u_CFParamF5) * u_CFParamF4 * texture(u_CFParamTexture_2, vec2(tex_x, sub_tex_y)).r;
                break;
                case 1:
                tex_z += u_CFParamF5 + (1.0 - u_CFParamF5) * u_CFParamF4 * texture(u_CFParamTexture_2, vec2(tex_x, sub_tex_y)).g;
                break;
                case 2:
                tex_z += u_CFParamF5 + (1.0 - u_CFParamF5) * u_CFParamF4 * texture(u_CFParamTexture_2, vec2(tex_x, sub_tex_y)).b;
                break;
                case 3:
                tex_z += u_CFParamF5 + (1.0 - u_CFParamF5) * u_CFParamF4 * texture(u_CFParamTexture_2, vec2(tex_x, sub_tex_y)).a;
                break;
            }
        }
        if (3 < u_CFParamI5) {
            switch (u_CFParamI3) {
                case 0:
                tex_z += u_CFParamF7 + (1.0 - u_CFParamF7) * u_CFParamF6 * texture(u_CFParamTexture_3, vec2(tex_x, sub_tex_y)).r;
                break;
                case 1:
                tex_z += u_CFParamF7 + (1.0 - u_CFParamF7) * u_CFParamF6 * texture(u_CFParamTexture_3, vec2(tex_x, sub_tex_y)).g;
                break;
                case 2:
                tex_z += u_CFParamF7 + (1.0 - u_CFParamF7) * u_CFParamF6 * texture(u_CFParamTexture_3, vec2(tex_x, sub_tex_y)).b;
                break;
                case 3:
                tex_z += u_CFParamF7 + (1.0 - u_CFParamF7) * u_CFParamF6 * texture(u_CFParamTexture_3, vec2(tex_x, sub_tex_y)).a;
                break;
            }
        }

        break;
        default :
        break;
    }

    //Direction
    switch (u_Direction) {
        case 1:
        x = tex_x;
        y = tex_y;
        z = tex_z;
        break;
        case 2:
        x = tex_z;
        y = tex_y;
        z = tex_x;
        break;
        case 3:
        x = tex_x;
        y = tex_z;
        z = tex_y;
        break;
    }


    // OFFSETS

    float x0 = u_CutOffset_x0;
    float y0 = u_CutOffset_y0;
    float z0 = u_CutOffset_z0;

    float x1 = u_CutOffset_x1;
    float y1 = u_CutOffset_y1;
    float z1 = u_CutOffset_z1;

    x = x0 + x * (x1 - x0);
    y = y0 + y * (y1 - y0);
    z = z0 + z * (z1 - z0);


    // QUEUE OFFSET
    z = fract(1.0 + u_TexQueueOffset - z * ((float(u_StackSize) - float(u_Error)) / float(u_StackSize)));
    outputColor = texture(u_Sampler, vec3(x, 1.0 - y, z));

    //    if (x > 0.5) {
    //        outputColor = texture(u_CFParamTexture, vec2(x, 1.0 - y));
    //    } else {
    //        outputColor = texture(u_Sampler, vec3(x, 1.0 - y, z));
    //    }

}
