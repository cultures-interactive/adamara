import { Circle, Container, Sprite } from "pixi.js";
import { InteractionTriggerIconType } from "../../../../shared/game/InteractionTriggerIconType";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { GameInteractionTrigger } from "./GameInteractionTrigger";

export class GameInteractionTriggerIcon extends Container {
    private sprite: Sprite;

    private currentType: InteractionTriggerIconType;

    public constructor(
        public readonly interactionTrigger: GameInteractionTrigger
    ) {
        super();

        this.interactive = true;
        this.buttonMode = true;
    }

    public setType(type: InteractionTriggerIconType) {
        if (this.currentType === type)
            return;

        this.currentType = type;

        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }

        switch (type) {
            case InteractionTriggerIconType.Interact:
                this.sprite = staticAssetLoader.createStaticAssetView("trigger_interact");
                break;

            case InteractionTriggerIconType.Look:
                this.sprite = staticAssetLoader.createStaticAssetView("trigger_look");
                break;

            case InteractionTriggerIconType.Speak:
                this.sprite = staticAssetLoader.createStaticAssetView("trigger_speak");
                break;

            case InteractionTriggerIconType.Attack:
                this.sprite = staticAssetLoader.createStaticAssetView("trigger_attack");
                break;
        }

        if (this.sprite) {
            this.addChild(this.sprite);
            this.sprite.anchor.set(0.5, 0.5);
            this.sprite.hitArea = new Circle(0, 0, 42);
        }
    }
}
