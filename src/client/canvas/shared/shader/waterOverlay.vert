precision highp float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec2 aTextureCoordWaterMask;

uniform mat3 projectionMatrix;

varying vec2 vVertexPosition;
varying vec2 vTextureCoord;
varying vec2 vTextureCoordWaterMask;

void main(void) {
   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

   vVertexPosition = aVertexPosition;
   vTextureCoord = aTextureCoord;
   vTextureCoordWaterMask = aTextureCoordWaterMask;
}
