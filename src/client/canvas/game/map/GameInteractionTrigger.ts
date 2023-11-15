import { Container, IDestroyOptions, IPointData, Point } from "pixi.js";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { InteractionTriggerData } from "../../../../shared/game/InteractionTriggerData";
import { InteractionTriggerIconType } from "../../../../shared/game/InteractionTriggerIconType";
import { GameInteractionTriggerIcon } from "./GameInteractionTriggerIcon";
import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
    "show": () => void;
    "hide": () => void;
}

const tempPosition = new Point();

export class GameInteractionTrigger extends TypedEmitter<Events> {
    public icon: GameInteractionTriggerIcon;
    private offsetPosition: IPointData;

    public constructor(
        private interactionTriggerData: InteractionTriggerData,
        private getTilePosition: () => TilePosition,
        private interactionTriggerOverlay: Container,
        private parent: Container,
        iconOffsetX: number,
        iconOffsetY: number
    ) {
        super();

        this.icon = new GameInteractionTriggerIcon(this);
        interactionTriggerOverlay.addChild(this.icon);

        this.offsetPosition = new Point(iconOffsetX + 50, iconOffsetY - 40);

        this.hide();
    }

    public destroy(options?: boolean | IDestroyOptions) {
        this.icon.destroy(options);
        this.removeAllListeners();
    }

    public updatePosition() {
        if (!this.icon.visible)
            return;

        // Move icon on this.interactionTriggerOverlay on the offset position relative to this.parent
        this.interactionTriggerOverlay.toLocal(this.offsetPosition, this.parent, tempPosition);
        this.icon.position.set(tempPosition.x, tempPosition.y);
    }

    public get $modelId() {
        return this.interactionTriggerData.$modelId;
    }

    public get tilePosition() {
        return this.getTilePosition();
    }

    public show(iconType: InteractionTriggerIconType) {
        this.icon.visible = true;
        this.icon.setType(iconType);
        this.emit("show");
        this.updatePosition();
    }

    public hide() {
        this.icon.visible = false;
        this.emit("hide");
    }
}
