import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { UiConstants } from "../../../data/UiConstants";
import { autoDisposeOnDisplayObjectRemoved, autoDisposeOnDisplayObjectRemovedArray, RecreateReactionsFunction } from "../../../helper/ReactionDisposerGroup";
import { NpcViewBase } from "../../shared/map/NpcViewBase";
import { Container } from "pixi.js";
import { doesTilePositionEqual } from "../../../../shared/definitions/other/TilePosition";
import { localSettingsStore } from "../../../stores/LocalSettingsStore";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";

export class EditorNpcView extends NpcViewBase {
    private remakeConfigurationRelatedRefreshMethods: RecreateReactionsFunction;
    private remakeConfigurationRelatedRefreshMethods2: RecreateReactionsFunction;

    public constructor(
        protected mapRelatedStore: MapRelatedStore,
        data: DynamicMapElementNPCInterface,
        overlayContainer: Container = null
    ) {
        super(data, overlayContainer, false, null);

        autoDisposeOnDisplayObjectRemovedArray(this, this.baseRefreshMethods, true);
        this.remakeConfigurationRelatedRefreshMethods = autoDisposeOnDisplayObjectRemovedArray(this, this.configurationRelatedRefreshMethods, true);

        this.remakeConfigurationRelatedRefreshMethods2 = autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.refreshTransparency.bind(this));
            autoDisposingAutorun(this.refreshTint.bind(this));
            autoDisposingAutorun(this.updateViewAreaGraphics.bind(this));
        });
    }

    protected onConfigurationApplied() {
        this.remakeConfigurationRelatedRefreshMethods();
        this.remakeConfigurationRelatedRefreshMethods2();
    }

    private refreshTransparency() {
        if (this.mapRelatedStore.showGamePreview || this.mapRelatedStore.ignoreHeightPlanes) {
            this.alpha = 1;
        } else {
            const sameHeightPlane = this.mapRelatedStore.selectedPlane === this.npcData.position.plane;
            this.alpha = sameHeightPlane ? 1.0 : UiConstants.ALPHA_WRONG_HEIGHT_PLANE;
        }
    }

    protected refreshTint() {
        if (!this.animation)
            return;

        if (this.mapRelatedStore.highlightedElements) {
            if (!this.mapRelatedStore.highlightedElements.has(this.npcData)) {
                this.animation.tint = UiConstants.NON_HIGHLIGHT_TINT_0x;
                return;
            }
        }

        if (this.partOfLoop) {
            this.animation.tint = 0xFF0000;
            return;
        }

        this.animation.tint = 0xFFFFFF;
    }

    private updateViewAreaGraphics() {
        if (localSettingsStore.showDebugInfo || doesTilePositionEqual(this.mapRelatedStore.selectedTilePosition, this.baseTilePosition)) {
            this.showViewAreas();
        } else {
            this.hideViewAreas();
        }
    }

    protected refreshPartOfLoop() {
        this.refreshTint();
    }
}
