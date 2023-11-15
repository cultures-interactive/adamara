import { TileViewBase } from "../../shared/map/TileViewBase";
import { Water } from "../../shared/map/Water";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { UiConstants } from "../../../data/UiConstants";
import { autoDisposeOnDisplayObjectRemoved } from "../../../helper/ReactionDisposerGroup";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { ColorOverlayFilter } from "@pixi/filter-color-overlay";
import { getTileLayerType } from "../../../../shared/data/layerConstants";
import { TileLayerType } from "../../../../shared/resources/TileLayerType";
import { TileBlockArrayView } from "./TileBlockArrayView";

export class EditorTileView extends TileViewBase {
    private tileBlockArrayView: TileBlockArrayView;

    public constructor(
        tileData: TileDataInterface,
        tileAssetData: TileAssetModel,
        tileImageUsage: TileImageUsage,
        water: Water,
        private mapRelatedStore: MapRelatedStore
    ) {
        super(tileData, tileAssetData, tileImageUsage, water);

        this.tileBlockArrayView = new TileBlockArrayView();
        this.addChild(this.tileBlockArrayView);

        autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.refreshTileVisuals.bind(this));
            autoDisposingAutorun(this.refreshTransparency.bind(this));
            autoDisposingAutorun(this.refreshTint.bind(this));
            autoDisposingAutorun(this.refreshBlockedDirections.bind(this));
        });
    }

    private refreshTransparency() {
        if (this.mapRelatedStore.showGamePreview || this.mapRelatedStore.ignoreHeightPlanes) {
            // Game preview
            this.alpha = 1.0;
        } else if (this.tilePosition) {
            if (this.mapRelatedStore.selectedPlane === this.tilePosition.plane) {
                const { selectedLayer } = this.mapRelatedStore;
                const layerMatchesDirectly = (selectedLayer === null) || (selectedLayer === this.tilePosition.layer);
                const decorationIsSelectedAndMatches = (getTileLayerType(selectedLayer) === TileLayerType.Decoration) &&
                    (getTileLayerType(this.tilePosition.layer) === TileLayerType.Decoration);

                if (layerMatchesDirectly || decorationIsSelectedAndMatches) {
                    // Correct height plane, correct layer
                    this.alpha = 1.0;
                } else {
                    // Correct height plane, wrong layer
                    this.alpha = UiConstants.ALPHA_CORRECT_HEIGHT_PLANE_WRONG_LAYER;
                }
            } else {
                // Wrong height plane
                this.alpha = this.mapRelatedStore.ignoreHeightPlanes ? 1.0 : UiConstants.ALPHA_WRONG_HEIGHT_PLANE;
            }
        }
    }

    private refreshTint() {
        if (this.mapRelatedStore.highlightedTiles) {
            if (!this.mapRelatedStore.highlightedTiles.has(this.tileData)) {
                this.sprite.tint = UiConstants.NON_HIGHLIGHT_TINT_0x;
                return;
            }
        }

        this.sprite.tint = 0xFFFFFF;
    }

    private refreshBlockedDirections() {
        if (!this.tileAssetData)
            return;

        this.tileBlockArrayView.visible = !this.mapRelatedStore.showGamePreview;
        if (this.tileBlockArrayView.visible) {
            this.tileBlockArrayView.refresh(this.tileAssetData);
        }

        this.emitTileVisualsUpdated();
    }

    protected refreshPartOfLoop(): void {
        if (this.sprite) {
            this.sprite.filters = this.partOfLoop ? [new ColorOverlayFilter(0xFF0000, 0.5)] : [];
        }
    }
}