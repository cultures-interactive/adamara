import { AnimatedSprite, Geometry, Shader, Buffer, FrameObject, MeshMaterial, Renderer, Texture, State, DRAW_MODES, IDestroyOptions, Transform, Program } from "pixi.js";
import waterOverlayVertexCode from "../shader/waterOverlay.vert";
import waterOverlayFragmentCode from "../shader/waterOverlay.frag";
import waterFragmentCode from "../shader/water.frag";
import { SharedWaterUninforms, Water } from "./Water";
import { typedArrayValuesEqual } from "../../../helper/pixiHelpers";

const keywordRegex = (keyword: string) => new RegExp(`\\/\\/\\[${keyword}\\](.*)//\\[\\/${keyword}\\]`, "s"); // matches [keyword] ... [/keyword]
const sharedWaterFragmentCode = (keywordRegex("SHARED")).exec(waterFragmentCode)[1];
const processedWaterOverlayFragmentCode = waterOverlayFragmentCode.replace(keywordRegex("OVERWRITE"), sharedWaterFragmentCode);

let shaderProgram: Program;

interface Uniforms extends SharedWaterUninforms {
    uSampler: Texture;
    uSamplerWaterMask: Texture;
    height: number;
    maxV: number;
    cameraTranslationMatrix: Float32Array;
}

export class WaterOverlayAnimatedSprite extends AnimatedSprite {
    private water: Water;
    private scrollTransform: Transform;
    private uniforms: Uniforms;
    private shader: Shader;
    private vertexPositionBuffer: Buffer;
    private textureCoordBuffer: Buffer;
    private textureCoordWaterMaskBuffer: Buffer;
    private geometry: Geometry;

    private previousVertexData: Float32Array;
    private previousUVs: Float32Array;
    private waterMaskTextureID: number;

    private readonly state: State = State.for2d();
    private readonly drawMode: DRAW_MODES = DRAW_MODES.TRIANGLES;
    private readonly start: number = 0;
    private readonly size: number = 0;

    public constructor(water: Water, textures: Texture[] | FrameObject[], autoUpdate?: boolean) {
        super(textures, autoUpdate);

        this.water = water;
        this.scrollTransform = water.transform;

        const waterUniforms = water.uniforms;

        this.uniforms = {
            uSamplerWaves: waterUniforms.uSamplerWaves,
            waveTextureScale: waterUniforms.waveTextureScale,
            timeS: 0,
            uSampler: this.texture,
            uSamplerWaterMask: null,
            height: 0,
            maxV: 0,
            cameraTranslationMatrix: null
        };

        if (!shaderProgram) {
            shaderProgram = new Program(waterOverlayVertexCode, processedWaterOverlayFragmentCode, "WaterOverlay");
        }
        this.shader = new Shader(shaderProgram, this.uniforms);

        this.vertexPositionBuffer = new Buffer(this.vertexData);
        this.previousVertexData = new Float32Array(this.vertexData);

        this.textureCoordBuffer = new Buffer(this.uvs);
        this.previousUVs = new Float32Array(this.uvs);

        this.textureCoordWaterMaskBuffer = new Buffer();

        const indexBuffer = new Buffer(this.indices, false, true);

        this.geometry = new Geometry()
            .addAttribute("aVertexPosition", this.vertexPositionBuffer, 2)
            .addAttribute("aTextureCoord", this.textureCoordBuffer, 2)
            .addAttribute("aTextureCoordWaterMask", this.textureCoordWaterMaskBuffer, 2)
            .addIndex(indexBuffer);

        this.state = State.for2d();
    }

    public set waterMaskTexture(value: Texture) {
        this.uniforms.uSamplerWaterMask = value;
    }

    public get waterMaskTexture() {
        return this.uniforms.uSamplerWaterMask;
    }

    protected _render(renderer: Renderer): void {
        if (!this.waterMaskTexture || !this.texture)
            return;

        this.calculateVertices();

        // Update vertex position buffer if vertex positions changed
        if (!typedArrayValuesEqual(this.previousVertexData, this.vertexData)) {
            this.previousVertexData.set(this.vertexData);
            this.vertexPositionBuffer.update(this.vertexData);
        }

        // Update texture coordinate buffer if UVs changed
        if (!typedArrayValuesEqual(this.previousUVs, this.uvs)) {
            this.previousUVs.set(this.uvs);
            this.textureCoordBuffer.update(this.uvs);
        }

        if (this.waterMaskTextureID !== this.waterMaskTexture._updateID) {
            this.waterMaskTextureID = this.waterMaskTexture._updateID;
            this.textureCoordWaterMaskBuffer.update(this.waterMaskTexture._uvs.uvsFloat32);
        }

        this.shader.uniforms.uSampler = this.texture;
        this.uniforms.timeS = this.water.uniforms.timeS;
        this.uniforms.cameraTranslationMatrix = this.scrollTransform.worldTransform.toArray(true);

        // Set the vertex height scaled by the UV height for wave scaling
        this.uniforms.height = (this.vertexData[5] - this.vertexData[1]) / (this.waterMaskTexture._uvs.uvsFloat32[5] - this.waterMaskTexture._uvs.uvsFloat32[1]);

        // Set the maximum V coordinate to the lower part of the UV rect minus 1 pixel (to stay in the black part even in spritesheets)
        this.uniforms.maxV = this.waterMaskTexture._uvs.uvsFloat32[5] - 1 / this.waterMaskTexture.baseTexture.height;

        // From here on this is a 1:1 copy of PIXI.Mesh._renderDefault()
        const shader = this.shader as unknown as MeshMaterial;

        shader.alpha = this.worldAlpha;
        if (shader.update) {
            shader.update();
        }

        renderer.batch.flush();

        shader.uniforms.translationMatrix = this.transform.worldTransform.toArray(true);

        // bind and sync uniforms..
        renderer.shader.bind(shader);

        // set state..
        renderer.state.set(this.state);

        // bind the geometry...
        renderer.geometry.bind(this.geometry, shader);

        // then render it
        renderer.geometry.draw(this.drawMode, this.size, this.start, this.geometry.instanceCount);
    }

    public destroy(options?: IDestroyOptions | boolean): void {
        this.geometry.destroy();

        super.destroy(options);

        this.shader.destroy();
        this.vertexPositionBuffer.destroy();
        this.textureCoordBuffer.destroy();
        this.textureCoordWaterMaskBuffer.destroy();
    }
}