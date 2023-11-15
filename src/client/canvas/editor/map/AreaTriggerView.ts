import { Group } from "@pixi/layers";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { DynamicMapElementAreaTriggerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { AreaTriggerVisual, AreaTriggerVisualColorBorder } from "./AreaTriggerVisual";
import { EditorOnlyElementView } from "./EditorOnlyElementView";

export class AreaTriggerView extends EditorOnlyElementView {
    public constructor(
        mapRelatedStore: MapRelatedStore,
        private areaTriggerData: DynamicMapElementAreaTriggerModel,
        textGroup: Group
    ) {
        super(mapRelatedStore, textGroup, true);

        this.text.style.stroke = AreaTriggerVisualColorBorder;
        this.text.style.fill = "white";

        this.addChild(new AreaTriggerVisual());
    }

    protected getPosition(): TilePosition {
        return this.areaTriggerData.position;
    }

    protected getLabelString(): string {
        return this.areaTriggerData.id;
    }

    protected refreshVisibility() {
        if (!this.mapRelatedStore.highlightedElements)
            return super.refreshVisibility();

        this.isHidden = !this.mapRelatedStore.highlightedElements.has(this.areaTriggerData) && !this.mapRelatedStore.showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted;
    }
}