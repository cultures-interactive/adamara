import { Container } from "pixi.js";
import { TileAssetModel } from "../../../../shared/resources/TileAssetModel";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { BlockedDirectionsView } from "./BlockedDirectionView";

export class TileBlockArrayView extends Container {
    private blockedDirectionsViews = new Array<BlockedDirectionsView>();

    public constructor() {
        super();
    }

    public refresh(tileAssetData: TileAssetModel) {
        let nextViewIndex = 0;

        if (tileAssetData) {
            const { tilesX, tilesY, blockedTiles } = tileAssetData;

            for (let x = 0; x < tilesX; x++) {
                for (let y = 0; y < tilesY; y++) {
                    const blocked = blockedTiles[x][y];

                    if (this.blockedDirectionsViews.length <= nextViewIndex) {
                        const newView = new BlockedDirectionsView();
                        this.addChild(newView);
                        this.blockedDirectionsViews.push(newView);
                    }

                    const view = this.blockedDirectionsViews[nextViewIndex++];
                    view.visible = true;
                    view.position.x = tileToWorldPositionX(x, y, false);
                    view.position.y = tileToWorldPositionY(x, y, false);
                    view.update(blocked);
                }
            }
        }

        for (let i = nextViewIndex; i < this.blockedDirectionsViews.length; i++) {
            this.blockedDirectionsViews[i].visible = false;
        }
    }
}