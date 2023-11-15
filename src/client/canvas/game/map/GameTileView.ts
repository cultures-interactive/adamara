import { Container, IDestroyOptions } from "pixi.js";
import { ReadonlyPosition } from "../../../../shared/game/PositionModel";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { gameConstants } from "../../../data/gameConstants";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { TileViewBase } from "../../shared/map/TileViewBase";
import { Water } from "../../shared/map/Water";
import { GameInteractionTrigger } from "./GameInteractionTrigger";

export class GameTileView extends TileViewBase {
    private _interactionTrigger: GameInteractionTrigger;

    public constructor(
        tileData: TileDataInterface,
        tileAssetData: TileAssetModel,
        tileImageUsage: TileImageUsage,
        water: Water,
        private interactionTriggerOverlay: Container
    ) {
        super(tileData, tileAssetData, tileImageUsage, water);

        this.refreshTileVisuals();
        this.createInteractionTrigger();

        this.events.on("tileVisualsUpdated", () => this.interactionTrigger?.updatePosition());
    }

    private createInteractionTrigger() {
        if (!this.tileData.isInteractionTrigger)
            return;

        // Only continue if this is either foreground, or background if there is no foreground
        if ((this.tileImageUsage === TileImageUsage.Foreground) ||
            (this.tileImageUsage === TileImageUsage.Background) && !this.tileAssetData.imageProperties(TileImageUsage.Foreground)) {
            if (this.interactionTrigger)
                throw new Error("setTileData was called twice for GameTileView and tried to create a second interactionTrigger");

            const { tileOffsetX, tileOffsetY } = this.tileData.interactionTriggerData;
            const { x, y, layer, plane } = this.tileData.position;
            const interactionTriggerTilePosition = new ReadonlyPosition({
                x: x + tileOffsetX,
                y: y + tileOffsetY,
                layer,
                plane
            });

            this._interactionTrigger = new GameInteractionTrigger(
                this.tileData.interactionTriggerData,
                () => interactionTriggerTilePosition,
                this.interactionTriggerOverlay,
                this,
                gameConstants.tileWidth / 2 + tileToWorldPositionX(tileOffsetX, tileOffsetY, false),
                gameConstants.tileHeight / 2 + tileToWorldPositionY(tileOffsetX, tileOffsetY, false)
            );

            this._interactionTrigger.on("show", this.emitTileVisualsUpdated);
            this._interactionTrigger.on("hide", this.emitTileVisualsUpdated);
        }
    }

    public get interactionTrigger() {
        return this._interactionTrigger;
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);
        this._interactionTrigger?.destroy(options);
    }
}