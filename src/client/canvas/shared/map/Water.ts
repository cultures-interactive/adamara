import { Container, Geometry, Mesh, Shader, Buffer, MIPMAP_MODES, Texture, IDestroyOptions } from "pixi.js";
import waterVertexCode from "../shader/water.vert";
import waterFragmentCode from "../shader/water.frag";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { ApplicationReference } from "../ApplicationReference";

export interface SharedWaterUninforms {
    uSamplerWaves: Texture;
    waveTextureScale: number;
    timeS: number;
}

type WaterUniforms = SharedWaterUninforms;

export class Water extends Container {
    private appRef: ApplicationReference;
    private mesh: Mesh<Shader>;
    private shader: Shader;
    private vertexPositionBuffer: Buffer;
    private textureCoordBuffer: Buffer;
    private startTime: number;

    public readonly uniforms: WaterUniforms;

    public constructor(appRef: ApplicationReference) {
        super();

        this.appRef = appRef;

        this.startTime = Date.now();

        const wavesTexture = staticAssetLoader.getTexture("Water_Waves");
        wavesTexture.baseTexture.mipmap = MIPMAP_MODES.OFF;
        this.uniforms = {
            uSamplerWaves: wavesTexture,
            waveTextureScale: 1 / 512,
            timeS: 0
        };
        this.shader = Shader.from(waterVertexCode, waterFragmentCode, this.uniforms);

        this.vertexPositionBuffer = new Buffer();
        this.textureCoordBuffer = new Buffer();

        const geometry = new Geometry()
            .addAttribute("aVertexPosition", this.vertexPositionBuffer, 2)
            .addAttribute("aTextureCoord", this.textureCoordBuffer, 2)
            .addIndex([0, 1, 2, 0, 3, 2]);

        const { width, height } = appRef.required.renderer;
        this.resize(width, height);

        this.mesh = new Mesh(geometry, this.shader);

        this.addChild(this.mesh);

        this.on("added", this.onAdded, this);
        this.on("removed", this.onRemoved, this);
    }

    private onAdded() {
        const app = this.appRef.required;
        app.ticker.add(this.update, this);
        app.renderer.on("resize", this.resize, this);
    }

    private onRemoved() {
        const app = this.appRef.required;
        app.ticker?.remove(this.update, this);
        app.renderer.off("resize", this.resize, this);
    }

    private resize(width: number, height: number) {
        this.vertexPositionBuffer.update(new Float32Array([0, 0, width, 0, width, height, 0, height]));

        const uMax = width;
        const vMax = height;
        this.textureCoordBuffer.update(new Float32Array([0, 0, uMax, 0, uMax, vMax, 0, vMax]));
    }

    private update() {
        this.uniforms.timeS = (Date.now() - this.startTime) / 1000;
    }

    public destroy(options?: IDestroyOptions | boolean): void {
        this.mesh.destroy({ children: true });

        super.destroy(options);

        this.shader.destroy();
        this.vertexPositionBuffer.destroy();
        this.textureCoordBuffer.destroy();
    }
}