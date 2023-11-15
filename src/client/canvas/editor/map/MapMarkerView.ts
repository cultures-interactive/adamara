import { Group } from "@pixi/layers";
import { Text } from "pixi.js";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { DynamicMapElementMapMarkerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { EditorOnlyElementView } from "./EditorOnlyElementView";
import { MapMarkerVisual, MapMarkerVisualColorBorder } from "./MapMarkerVisual";

export function adjustMapMarkerViewText(text: Text) {
    text.style.stroke = MapMarkerVisualColorBorder;
    //text.style.fill = "white";

    text.anchor.y = 1;
    text.position.y = 30;
}

export class MapMarkerView extends EditorOnlyElementView {
    public constructor(
        mapRelatedStore: MapRelatedStore,
        private mapMarkerData: DynamicMapElementMapMarkerModel,
        textGroup: Group
    ) {
        super(mapRelatedStore, textGroup, false);

        adjustMapMarkerViewText(this.text);

        this.addChild(new MapMarkerVisual());
    }

    protected getPosition(): TilePosition {
        return this.mapMarkerData.position;
    }

    protected getLabelString(): string {
        return this.mapMarkerData.label;
    }

    protected refreshVisibility() {
        if (!this.mapRelatedStore.highlightedElements)
            return super.refreshVisibility();

        this.isHidden = !this.mapRelatedStore.highlightedElements.has(this.mapMarkerData);
    }
}