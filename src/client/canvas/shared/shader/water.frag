precision highp float;

uniform float timeS;

//[SHARED]
uniform sampler2D uSamplerWaves;
uniform float waveTextureScale;

vec4 colorLayer1 = vec4(88.0 / 255.0, 137.0 / 255.0, 126.0 / 255.0, 1.0);
vec4 colorLayer2 = vec4(21.0 / 255.0, 51.0 / 255.0, 54.0 / 255.0, 1.0);
vec4 colorLayer3 = vec4(33.0 / 255.0, 69.0 / 255.0, 68.0 / 255.0, 1.0);
vec4 colorBackground = vec4(45.0 / 255.0, 87.0 / 255.0, 84.0 / 255.0, 1.0);

void calculateWaves(mat3 matrix, vec2 position, out float scale, out vec2 wavesUv, out float wavesDisplacement, out vec4 wavesColor) {
   vec2 offset = vec2(matrix[2][0], matrix[2][1]);
   scale = matrix[0][0];

   wavesUv = (position - offset) / scale;

   wavesDisplacement = cos(wavesUv.x * 0.01 + timeS * 1.0) * 10.0 * scale;

   wavesColor = colorBackground;

#ifndef SHALLOW_WATER
   float layer3 = texture2D(uSamplerWaves, fract(wavesUv * waveTextureScale)).b;
   wavesColor = mix(wavesColor, colorLayer3, layer3 * 0.5);

   float layer2 = texture2D(uSamplerWaves, fract((wavesUv + wavesDisplacement / 3.0) * waveTextureScale)).g;
   wavesColor = mix(wavesColor, colorLayer2, layer2 * 0.35);
#endif

   float layer1 = texture2D(uSamplerWaves, fract((wavesUv + wavesDisplacement) * waveTextureScale)).r;
   wavesColor = mix(wavesColor, colorLayer1, layer1 * 0.4);
}
//[/SHARED]

varying vec2 vTextureCoord;

uniform mat3 translationMatrix;

void main() {
   float scale;
   vec2 wavesUv;
   float displacement;
   vec4 wavesColor;
   calculateWaves(translationMatrix, vTextureCoord, scale, wavesUv, displacement, wavesColor);

   gl_FragColor = wavesColor;
   //gl_FragColor = vec4(wavesUv.x, 0, wavesUv.y, 1.0);
}
