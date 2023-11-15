import { ReadonlyDynamicMapElementMapMarker } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { PositionModel } from "../../shared/game/PositionModel";
import { GameAnimationElementView } from "../canvas/game/map/GameAnimationElementView";
import { GameInteractionTrigger } from "../canvas/game/map/GameInteractionTrigger";
import { GameNpcView } from "../canvas/game/map/GameNpcView";
import { DynamicMapElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElement";
import { MapDataInterface } from "../../shared/game/MapDataModel";
import { ReadonlyDynamicMapElementAreaTrigger } from "../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";

export class LoadedMap {
    public constructor(
        public readonly mapData: MapDataInterface,
        public readonly npcs: ReadonlyArray<GameNpcView>,
        public readonly mapMarkers: ReadonlyArray<ReadonlyDynamicMapElementMapMarker>,
        public readonly animationElements: ReadonlyArray<GameAnimationElementView>,
        public readonly interactionTriggers: ReadonlyArray<GameInteractionTrigger>,
        public readonly areaTriggers: ReadonlyArray<ReadonlyDynamicMapElementAreaTrigger>
    ) {
    }

    public findExtendedMapMarkerPosition(id: string): PositionModel {
        for (let i = 0; i < this.mapData.dynamicMapElements.length; i++) {
            const element = this.mapData.dynamicMapElements[i] as DynamicMapElementModel<any>;
            if (element) {
                if (element instanceof ReadonlyDynamicMapElementAreaTrigger) {
                    // For area triggers, we are not looking for the $modelId, but for the first one matching the user-set id that might be shared by multiple area triggers.
                    if (element.id == id) return element.position;
                }
                if (element.$modelId == id) return element.position;
            }
        }
        return null;
    }
}