import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { NewAndOldChangeableTileDataSnapshotWithPosition } from "../../../../shared/definitions/socket.io/socketIODefinitions";
import { ChangeableTileDataSnapshot, getChangeableTileDataSnapshot, tileDataEqualsChangeableTileDataSnapshot, TileDataModel } from "../../../../shared/game/TileDataModel";
import { CurrentMapStore } from "../../CurrentMapStore";

export function undoableMapEditorSetTileConflictResolutionOriginOverride(currentMapStore: CurrentMapStore, tile: TileDataModel, value: number) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.conflictResolutionOriginOverride = value;

    setSnapshot("mapEditorSetTileConflictResolutionOriginOverride", currentMapStore, tile, newSnapshot);
}

export function undoableMapEditorResetTileConflictResolutionOriginOverride(currentMapStore: CurrentMapStore, tile: TileDataModel) {
    undoableMapEditorSetTileConflictResolutionOriginOverride(currentMapStore, tile, null);
}

export function undoableMapEditorSetTileConflictResolutionFlatZIndex(currentMapStore: CurrentMapStore, tile: TileDataModel, value: number) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.conflictResolutionFlatZIndex = value;

    setSnapshot("mapEditorSetTileConflictResolutionFlatZIndex", currentMapStore, tile, newSnapshot);
}

export function undoableMapEditorSetAdditionalTileOffsetX(currentMapStore: CurrentMapStore, tile: TileDataModel, value: number) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.additionalOffsetX = value;

    setSnapshot("mapEditorSetAdditionalTileOffset", currentMapStore, tile, newSnapshot);
}

export function undoableMapEditorSetAdditionalTileOffsetY(currentMapStore: CurrentMapStore, tile: TileDataModel, value: number) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.additionalOffsetY = value;

    setSnapshot("mapEditorSetAdditionalTileOffset", currentMapStore, tile, newSnapshot);
}

export function undoableMapEditorSetAdditionalTileOffsetZ(currentMapStore: CurrentMapStore, tile: TileDataModel, value: number) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.additionalOffsetZ = value;

    setSnapshot("mapEditorSetAdditionalTileOffset", currentMapStore, tile, newSnapshot);
}

export function undoableMapEditorResetTileOffsetOverride(currentMapStore: CurrentMapStore, tile: TileDataModel) {
    const newSnapshot = getChangeableTileDataSnapshot(tile);
    newSnapshot.additionalOffsetX = 0;
    newSnapshot.additionalOffsetY = 0;
    newSnapshot.additionalOffsetZ = 0;

    setSnapshot("mapEditorSetAdditionalTileOffset", currentMapStore, tile, newSnapshot);
}

export function setSnapshot(name: string, currentMapStore: CurrentMapStore, tile: TileDataModel, newSnapshot: ChangeableTileDataSnapshot) {
    if (tileDataEqualsChangeableTileDataSnapshot(tile, newSnapshot))
        return;

    const currentSnapshot = getChangeableTileDataSnapshot(tile);

    const { x, y, layer, plane } = tile.position;
    const tileChangeForward = {
        newData: newSnapshot,
        previousData: currentSnapshot,
        position: { x, y, layer }
    };

    executeUndoableOperation(new MapEditorSetTileConflictResolutionOriginOverride(name, currentMapStore, plane, tileChangeForward));
}

class MapEditorSetTileConflictResolutionOriginOverride extends UndoableOperation {
    private tileChangeReverse: NewAndOldChangeableTileDataSnapshotWithPosition;

    public constructor(
        name: string,
        private currentMapStore: CurrentMapStore,
        private plane: number,
        private tileChangeForward: NewAndOldChangeableTileDataSnapshotWithPosition
    ) {
        super(name);

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
