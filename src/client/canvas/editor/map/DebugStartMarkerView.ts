import { Group } from "@pixi/layers";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { gameStore } from "../../../stores/GameStore";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { DebugStartMarkerVisual, MapMarkerVisualColorBorder } from "./DebugStartMarkerVisual";
import { EditorOnlyElementView } from "./EditorOnlyElementView";

export class DebugStartMarkerView extends EditorOnlyElementView {
    public constructor(
        mapRelatedStore: MapRelatedStore,
        textGroup: Group
    ) {
        super(mapRelatedStore, textGroup, false);

        this.text.style.stroke = MapMarkerVisualColorBorder;
        //this.text.style.fill = "white";

        this.text.anchor.y = 1;
        this.text.position.y = 30;

        this.addChild(new DebugStartMarkerVisual());
    }

    protected getPosition(): TilePosition {
        return gameStore.debugStartMarker.position;
    }

    protected getLabelString(): string {
        return gameStore.debugStartMarker.label;
    }

    protected refreshVisibility() {
        if (!this.mapRelatedStore.highlightedElements)
            return super.refreshVisibility();

        this.isHidden = true;
    }
}