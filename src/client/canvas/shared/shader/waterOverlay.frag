precision highp float;

varying vec2 vVertexPosition;
varying vec2 vTextureCoord;
varying vec2 vTextureCoordWaterMask;
uniform sampler2D uSampler;

uniform sampler2D uSamplerWaterMask;

uniform mat3 cameraTranslationMatrix;
uniform float height;
uniform float maxV;

uniform float timeS;

#define SHALLOW_WATER 1

//[OVERWRITE]
void calculateWaves(mat3 matrix, vec2 position, out float scale, out vec2 wavesUv, out float wavesDisplacement, out vec4 wavesColor) { }
//[/OVERWRITE]

float easeDepth(float x) {
   return x * x * x;
}

void main(void) {
   float wavesDisplacement;
   float scale;
   vec2 wavesUv;
   vec4 wavesColor;
   calculateWaves(cameraTranslationMatrix, vVertexPosition, scale, wavesUv, wavesDisplacement, wavesColor);

   wavesDisplacement += cos(wavesUv.x * 0.1 + timeS * 1.37) * 2.0 * scale;

   vec2 wavyTextureCoord = vTextureCoordWaterMask;
   wavyTextureCoord.y += wavesDisplacement / height;
   wavyTextureCoord.y = min(wavyTextureCoord.y, maxV);

   vec4 backgroundImageUndistorted = texture2D(uSampler, vTextureCoord);
   vec4 waterMaskUndistorted = texture2D(uSamplerWaterMask, vTextureCoordWaterMask);
   vec4 waterMaskDistorted = texture2D(uSamplerWaterMask, wavyTextureCoord);

   float fadedOutDepthColor = 0.0;
   float depth = waterMaskUndistorted.a * (1.0 - clamp((waterMaskUndistorted.g - fadedOutDepthColor) / (1.0 - fadedOutDepthColor), 0.0, 1.0));
   float fade = mix(0.7, 1.0, easeDepth(depth));
   //fade = 0.7;

   float waterMaskDistortedGRaw = (waterMaskDistorted.g / waterMaskDistorted.a);
   float border = 0.02;
   float thickness = 0.07;
   float borderMin = 1.0 - thickness - border * 2.0;
   float whiteLineValueBorderUp = 1.0 - clamp((waterMaskDistortedGRaw - (1.0 - border)) / border, 0.0, 1.0);
   float whiteLineValueBorderDown = clamp((waterMaskDistortedGRaw - borderMin) / border, 0.0, 1.0);
   float whiteLine = whiteLineValueBorderUp * whiteLineValueBorderDown * backgroundImageUndistorted.a * 0.75;

   float alpha = min(ceil(backgroundImageUndistorted.a), floor(waterMaskDistorted.a)) * fade * whiteLineValueBorderUp;

   gl_FragColor = mix(alpha * wavesColor, vec4(119.0 / 255.0, 163.0 / 255.0, 148.0 / 255.0, 1.0), whiteLine);
}
