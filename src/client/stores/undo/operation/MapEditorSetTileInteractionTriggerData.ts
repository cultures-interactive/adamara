import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { NewAndOldChangeableTileDataSnapshotWithPosition } from "../../../../shared/definitions/socket.io/socketIODefinitions";
import { getChangeableTileDataSnapshot, TileDataModel } from "../../../../shared/game/TileDataModel";
import * as uuid from "uuid";
import { CurrentMapStore } from "../../CurrentMapStore";

export function executableUndoableMapEditorSetTileInteractionTriggerStatus(currentMapStore: CurrentMapStore, tile: TileDataModel, isInteractionTrigger: boolean) {
    executableUndoableMapEditorSetTileInteractionTriggerData(currentMapStore, tile, isInteractionTrigger, tile.isModuleGate, tile.interactionTriggerData?.label);
}

export function executableUndoableMapEditorSetTileModuleGateStatus(currentMapStore: CurrentMapStore, tile: TileDataModel, isModuleGate: boolean) {
    executableUndoableMapEditorSetTileInteractionTriggerData(currentMapStore, tile, true, isModuleGate, tile.interactionTriggerData?.label);
}

export function executableUndoableMapEditorSetTileInteractionTriggerLabel(currentMapStore: CurrentMapStore, tile: TileDataModel, label: string) {
    executableUndoableMapEditorSetTileInteractionTriggerData(currentMapStore, tile, true, tile.isModuleGate, label);
}

function executableUndoableMapEditorSetTileInteractionTriggerData(currentMapStore: CurrentMapStore, tile: TileDataModel, isInteractionTrigger: boolean, isModuleGate: boolean, label: string) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.isInteractionTrigger = isInteractionTrigger;
    newSnapshot.isModuleGate = isModuleGate;

    if (isInteractionTrigger) {
        newSnapshot.interactionTriggerModelId = newSnapshot.interactionTriggerModelId || uuid.v4();
        newSnapshot.interactionTriggerLabel = label || "";
        newSnapshot.interactionTriggerTileOffsetX |= 0;
        newSnapshot.interactionTriggerTileOffsetY |= 0;
    }

    const currentSnapshot = getChangeableTileDataSnapshot(tile);

    if ((newSnapshot.isInteractionTrigger == currentSnapshot.isInteractionTrigger) &&
        (newSnapshot.isModuleGate == currentSnapshot.isModuleGate) &&
        (newSnapshot.interactionTriggerModelId == currentSnapshot.interactionTriggerModelId) &&
        (newSnapshot.interactionTriggerLabel == currentSnapshot.interactionTriggerLabel))
        return;

    const { x, y, layer, plane } = tile.position;
    const tileChangeForward = {
        newData: newSnapshot,
        previousData: currentSnapshot,
        position: { x, y, layer }
    };

    executeUndoableOperation(new MapEditorSetTileInteractionTriggerData(currentMapStore, plane, tileChangeForward));
}

class MapEditorSetTileInteractionTriggerData extends UndoableOperation {
    private tileChangeReverse: NewAndOldChangeableTileDataSnapshotWithPosition;

    public constructor(
        private currentMapStore: CurrentMapStore,
        private plane: number,
        private tileChangeForward: NewAndOldChangeableTileDataSnapshotWithPosition
    ) {
        super("mapEditorSetTileInteractionTriggerData");

        this.tileChangeReverse = {
            newData: tileChangeForward.previousData,
            previousData: tileChangeForward.newData,
            position: tileChangeForward.position
        };
    }

    public async execute() {
        // ========= Set Tiles
        const { plane, tileChangeForward } = this;
        await editorClient.setCurrentMapTiles(this.currentMapStore, [tileChangeForward], plane);
    }

    public async reverse() {
        // ========= Set Tiles
        const { plane, tileChangeReverse } = this;
        await editorClient.setCurrentMapTiles(this.currentMapStore, [tileChangeReverse], plane);
    }
}
