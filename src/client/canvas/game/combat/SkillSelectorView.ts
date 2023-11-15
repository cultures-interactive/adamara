import { Container, InteractionEvent, Sprite } from "pixi.js";
import { combatStore } from "../../../stores/CombatStore";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";

export class SkillSelectorView extends Container {

    private active: Sprite;
    private inactive: Sprite;

    public constructor(private skillPattern: string, symbol: string) {
        super();

        const buttonSize = 160;

        this.inactive = staticAssetLoader.createStaticAssetView(symbol);
        this.inactive.width = buttonSize;
        this.inactive.height = buttonSize;
        this.active = staticAssetLoader.createStaticAssetView(symbol + "_selected");
        this.active.width = buttonSize;
        this.active.height = buttonSize;
        this.active.visible = false;
        this.addChild(this.inactive, this.active);

        this.inactive.interactive = true;
        this.inactive.on("pointerdown", this.setSkill.bind(this));
    }

    private setSkill(e: InteractionEvent) {
        e.stopPropagation();
        if (this.active.visible)
            return;

        combatStore.setSkill(this.skillPattern);
    }

    public activate() {
        this.active.visible = true;
    }

    public deactivate() {
        this.active.visible = false;
    }

}