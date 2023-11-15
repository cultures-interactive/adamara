import { Container, IDestroyOptions } from "pixi.js";
import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { gameConstants } from "../../../data/gameConstants";
import { AnimationElementViewBase } from "../../shared/map/AnimationElementViewBase";
import { GameInteractionTrigger } from "./GameInteractionTrigger";

export class GameAnimationElementView extends AnimationElementViewBase {
    public readonly interactionTrigger: GameInteractionTrigger;

    public constructor(
        data: DynamicMapElementAnimationElementInterface,
        repeatLoadingUntilSuccessCancelled: () => boolean,
        interactionTriggerOverlay: Container
    ) {
        super(data, true, repeatLoadingUntilSuccessCancelled);

        this.baseRefreshMethods.forEach(refresh => refresh.call(this));

        if (data.isInteractionTrigger) {
            this.interactionTrigger = new GameInteractionTrigger(data, () => this.tilePosition, interactionTriggerOverlay, this, gameConstants.tileWidth / 2, gameConstants.tileHeight / 2);
        }
    }

    protected updateBox() {
        super.updateBox();
        this.interactionTrigger?.updatePosition();
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);
        this.interactionTrigger?.destroy(options);
    }
}