import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { DynamicMapElementMapMarkerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { gameStore } from "../../GameStore";

export function undoableSetDebugStartMarkerOp(debugStartMarker: DynamicMapElementMapMarkerModel, mapId: number) {
    executeUndoableOperation(new ActionEditorDebugStartMarkerChangeOp(debugStartMarker, mapId));
}

class ActionEditorDebugStartMarkerChangeOp extends UndoableOperation {
    private readonly previousDebugStartMarker: DynamicMapElementMapMarkerModel;
    private readonly previousMapId: number;

    public constructor(
        private debugStartMarker: DynamicMapElementMapMarkerModel,
        private mapId: number
    ) {
        super("changeDebugStartMarker");
        this.previousDebugStartMarker = gameStore.debugStartMarker;
        this.previousMapId = gameStore.debugStartMarkerMapId;
    }

    public async execute() {
        gameStore.setDebugStartMarker(this.debugStartMarker, this.mapId);
    }

    public async reverse() {
        gameStore.setDebugStartMarker(this.previousDebugStartMarker, this.previousMapId);
    }
}
