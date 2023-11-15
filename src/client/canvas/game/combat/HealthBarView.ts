import { Container, Sprite } from "pixi.js";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";

export class HealthBarView extends Container {

    private background: Sprite;
    private bar: Sprite;
    private frame: Sprite;

    public constructor(barScale: number, withFrame: boolean) {
        super();

        this.scale.set(barScale, barScale);

        this.background = staticAssetLoader.createStaticAssetView("Healthbar_Background");
        this.bar = staticAssetLoader.createStaticAssetView("Healthbar_Bar");
        this.bar.texture = this.bar.texture.clone();
        this.addChild(this.background, this.bar);

        if (withFrame) {
            this.frame = staticAssetLoader.createStaticAssetView("Healthbar_Player_Frame_Foreground");
            this.addChild(this.frame);
        }
    }

    public setHealth(amount: number) {
        const sprite = this.bar;

        const newWidth = sprite.texture.baseTexture.width * amount;
        const oldWidth = sprite.width;

        sprite.texture.frame.width = newWidth;
        sprite.width = sprite.texture.frame.width;
        sprite.texture.updateUvs();

        return newWidth < oldWidth;
    }

    public isDefeated() {
        return this.bar.width <= 0;
    }
}