import { autorun, IReactionDisposer } from "mobx";
import { MapDataInterface } from "../../../../shared/game/MapDataModel";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { createOrUpdateBoxFromTileData } from "../../../helper/mapElementSortingHelper";
import { destroyDisplayObject, tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { sharedStore } from "../../../stores/SharedStore";

import { StaticLocalBoundsContainer } from "../optimization/StaticLocalBoundsContainer";
import { TileViewBase, TileViewCreator } from "./TileViewBase";

export class TileViewBundle<TileView extends TileViewBase> extends StaticLocalBoundsContainer {
    public readonly tileViews = new Array<TileView>();
    private reactionDisposers = new Array<IReactionDisposer>();

    public constructor(
        public readonly tileData: TileDataInterface,
        private mapData: MapDataInterface,
        private createTileView: TileViewCreator<TileView>
    ) {
        super();
        this.reactionDisposers.push(autorun(this.create.bind(this)));
        this.reactionDisposers.push(autorun(this.updateBox.bind(this)));
    }

    private createAndAddTileView(tileData: TileDataInterface, tileAssetData: TileAssetModel, tileImageUsage: TileImageUsage) {
        const tileView = this.createTileView(tileData, tileAssetData, tileImageUsage);
        this.tileViews.push(tileView);

        tileView.events.on("tileVisualsUpdated", () => {
            if (this.tileViews.some(tileView => tileView.hasVisibleInvalidTexture))
                return;

            this.updateStaticLocalBounds();
        });
    }

    private create() {
        const { x, y } = this.tileData.position;
        this.position.set(tileToWorldPositionX(x, y), tileToWorldPositionY(x, y));

        if (this.tileViews) {
            for (const tileView of this.tileViews) {
                destroyDisplayObject(tileView);
            }

            this.tileViews.length = 0;
        }

        const tileAssetData = sharedStore.getTileAsset(this.tileData.tileAssetId);

        // If the tile was deleted, create a placeholder. (If we ever don't want to do that, remove the forced layer in requiredTileViews())
        if (!tileAssetData) {
            this.createAndAddTileView(this.tileData, null, null);
        } else {
            const backgroundImageProperties = tileAssetData.imageProperties(TileImageUsage.Background);
            const waterMaskImageProperties = tileAssetData.imageProperties(TileImageUsage.WaterMask);
            const foregroundImageProperties = tileAssetData.imageProperties(TileImageUsage.Foreground);
            const waterMaskForegroundImageProperties = tileAssetData.imageProperties(TileImageUsage.WaterMaskForeground);

            if (backgroundImageProperties || (!foregroundImageProperties && !waterMaskImageProperties && !waterMaskForegroundImageProperties)) {
                this.createAndAddTileView(this.tileData, tileAssetData, TileImageUsage.Background);
            }
            if (waterMaskImageProperties && this.mapData.properties.shouldShowWater) {
                this.createAndAddTileView(this.tileData, tileAssetData, TileImageUsage.WaterMask);
            }
            if (foregroundImageProperties) {
                this.createAndAddTileView(this.tileData, tileAssetData, TileImageUsage.Foreground);
            }
            if (waterMaskForegroundImageProperties && this.mapData.properties.shouldShowWater) {
                this.createAndAddTileView(this.tileData, tileAssetData, TileImageUsage.WaterMaskForeground);
            }
        }

        for (const tileView of this.tileViews) {
            //this.contentContainer.addChild(tileView);
            this.addChild(tileView);
        }

        this.refreshPartOfLoop();

        this.updateStaticLocalBounds();
    }

    public destroy() {
        super.destroy({
            children: true,
            texture: false,
            baseTexture: false
        });

        /*
        for (const tileView of this.tileViews) {
            destroyDisplayObject(tileView);
        }
        */

        this.tileViews.length = 0;

        this.reactionDisposers.forEach(disposer => disposer());
        this.reactionDisposers.length = 0;
    }

    private updateBox() {
        this.setBox(createOrUpdateBoxFromTileData(this.box, this.tileData));
    }

    public refreshPartOfLoop() {
        for (const tileView of this.tileViews) {
            tileView.partOfLoop = this.partOfLoop;
        }
    }
}

