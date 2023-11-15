import { DynamicMapElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElement";

export class TaskMarkerWithColor {
    public constructor(
        public readonly taskMarker: DynamicMapElementInterface<any>,
        public readonly color: number
    ) {
    }
}