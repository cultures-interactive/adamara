import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { UiConstants } from "../../../data/UiConstants";
import { autoDisposeOnDisplayObjectRemoved, autoDisposeOnDisplayObjectRemovedArray, RecreateReactionsFunction } from "../../../helper/ReactionDisposerGroup";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { AnimationElementViewBase } from "../../shared/map/AnimationElementViewBase";

export class EditorAnimationElementView extends AnimationElementViewBase {
    private remakeAnimationRelatedRefreshMethods: RecreateReactionsFunction;

    public constructor(
        protected mapRelatedStore: MapRelatedStore,
        data: DynamicMapElementAnimationElementInterface
    ) {
        super(data, false, null);

        autoDisposeOnDisplayObjectRemovedArray(this, this.baseRefreshMethods, true);

        this.remakeAnimationRelatedRefreshMethods = autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.refreshTransparency.bind(this));
            autoDisposingAutorun(this.refreshTint.bind(this));
        });
    }

    private refreshTransparency() {
        if (this.mapRelatedStore.showGamePreview || this.mapRelatedStore.ignoreHeightPlanes) {
            this.alpha = 1.0;
        } else {
            const sameHeightPlane = this.mapRelatedStore.selectedPlane === this.animationElementData.position.plane;
            this.alpha = sameHeightPlane ? 1.0 : UiConstants.ALPHA_WRONG_HEIGHT_PLANE;
        }
    }

    protected onAnimationLoaded() {
        this.remakeAnimationRelatedRefreshMethods();
    }

    protected refreshTint() {
        if (!this.spine)
            return;

        if (this.mapRelatedStore.highlightedElements) {
            if (!this.mapRelatedStore.highlightedElements.has(this.animationElementData)) {
                this.spine.tint = UiConstants.NON_HIGHLIGHT_TINT_0x;
                return;
            }
        }

        if (this.partOfLoop) {
            this.spine.tint = 0xFF0000;
            return;
        }

        this.spine.tint = 0xFFFFFF;
    }

    protected refreshPartOfLoop() {
        this.refreshTint();
    }
}
