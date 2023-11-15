import { Container } from "pixi.js";
import { TileAssetModel } from "../../../../shared/resources/TileAssetModel";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { BlockedDirectionsSetterView, ToggleCallback } from "./BlockedDirectionSetterView";

export class BlockedTileSetterView extends Container {
    private setterViews = new Array<BlockedDirectionsSetterView>();

    public constructor(
        private toggleCallback: ToggleCallback
    ) {
        super();
    }

    public refresh(tileAssetData: TileAssetModel) {
        let nextViewIndex = 0;

        if (tileAssetData) {
            const { tilesX, tilesY } = tileAssetData;

            for (let x = 0; x < tilesX; x++) {
                for (let y = 0; y < tilesY; y++) {
                    if (this.setterViews.length <= nextViewIndex) {
                        const newView = new BlockedDirectionsSetterView(this.toggleCallback);
                        this.addChild(newView);
                        this.setterViews.push(newView);
                    }

                    const view = this.setterViews[nextViewIndex++];
                    view.visible = true;
                    view.position.x = tileToWorldPositionX(x, y, false);
                    view.position.y = tileToWorldPositionY(x, y, false);
                    view.tileX = x;
                    view.tileY = y;
                }
            }
        }

        for (let i = nextViewIndex; i < this.setterViews.length; i++) {
            this.setterViews[i].visible = false;
        }
    }
}