import { Group } from "@pixi/layers";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { flatUnitSize3D, Size3D, unitSize3D } from "../../../../shared/resources/Size3DModel";
import { UiConstants } from "../../../data/UiConstants";
import { createOrUpdateBoxSimple, FlatOrder } from "../../../helper/mapElementSortingHelper";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { autoDisposeOnDisplayObjectRemoved } from "../../../helper/ReactionDisposerGroup";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { BoundsUpdateMode } from "../../shared/map/sorting/MapElementContainer";
import { HideableMapElementContainer } from "../../shared/optimization/cullingConfigurationInterfaces/HideableMapElementContainer";
import { EditorOnlyElementViewText } from "./EditorOnlyElementViewText";

let runningIndex = 0;

export abstract class EditorOnlyElementView extends HideableMapElementContainer {
    protected text: EditorOnlyElementViewText;
    private index = runningIndex++;
    private size: Size3D;

    public constructor(
        protected mapRelatedStore: MapRelatedStore,
        textGroup: Group,
        flat: boolean
    ) {
        super(BoundsUpdateMode.UpdateFromGetLocalBoundsWhenDirty);

        this.size = flat ? flatUnitSize3D : unitSize3D;

        this.text = new EditorOnlyElementViewText(textGroup);
        this.addChild(this.text);

        autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.refreshPosition.bind(this));
            autoDisposingAutorun(this.refreshLabel.bind(this));
            autoDisposingAutorun(this.refreshVisibility.bind(this));
            autoDisposingAutorun(this.refreshTransparency.bind(this));
        });
    }

    protected abstract getPosition(): TilePosition;
    protected abstract getLabelString(): string;

    private refreshPosition() {
        const tilePosition = this.getPosition();
        const { x, y, plane } = tilePosition;
        this.x = tileToWorldPositionX(x, y);
        this.y = tileToWorldPositionY(x, y);

        this.setBox(createOrUpdateBoxSimple(this.box, tilePosition, this.size, 1.1, "editorOnlyElementView_" + this.index, FlatOrder.EditorElement));
    }

    private refreshLabel() {
        this.text.text = this.getLabelString();
    }

    protected refreshVisibility() {
        this.isHidden = this.mapRelatedStore.showGamePreview;
    }

    private refreshTransparency() {
        if (this.mapRelatedStore.ignoreHeightPlanes)
            this.alpha = 1.0;
        else {
            const sameHeightPlane = this.mapRelatedStore.selectedPlane === this.getPosition().plane;
            this.alpha = sameHeightPlane ? 1.0 : UiConstants.ALPHA_WRONG_HEIGHT_PLANE;
        }
    }
}