import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { NewAndOldChangeableTileDataSnapshotWithPosition } from "../../../../shared/definitions/socket.io/socketIODefinitions";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { ChangeableTileDataSnapshot, tileDataEqualsChangeableTileDataSnapshot, getChangeableTileDataSnapshot, getEmptyChangeableTileDataSnapshot } from "../../../../shared/game/TileDataModel";
import { CurrentMapStore } from "../../CurrentMapStore";
import { mainMapEditorStore } from "../../MapEditorStore";
import { sharedStore } from "../../SharedStore";

export interface TileAssetChange {
    position: {
        x: number;
        y: number;
        layer: number;
    };
    newData: ChangeableTileDataSnapshot;
}

export function getChangesToClearTilesToMakeWayForGroundTile(mapStore: CurrentMapStore, tileAssetId: string, x: number, y: number, plane: number, layer: number) {
    const tileAsset = sharedStore.getTileAsset(tileAssetId);
    if (!tileAsset)
        return [];

    const { tilesX, tilesY } = tileAsset;

    // Delete all tiles that...
    // - are on the same layer and plane, but not exactly on x|y AND
    // - are intersecting with any position of the new tile we are setting
    const tilesToBeDeleted = mapStore.currentMap.tiles
        .filter(tile => (tile.position.plane === plane) && (tile.position.layer === layer) && ((tile.position.x !== x) || (tile.position.y !== y)))
        .filter(tile => tile.isIntersectingXY(x, y, tilesX, tilesY, sharedStore.getTileAsset));

    const emptyData = getEmptyChangeableTileDataSnapshot();

    return tilesToBeDeleted.map(tile => ({
        position: tile.position,
        newData: emptyData
    }));
}

export function undoableMapEditorRemoveTiles(currentMapStore: CurrentMapStore, plane: number, tileAssetsToChange: TileAssetChange[]) {
    executeUndoableMapEditorSetAndSelectTilesWithCheck(currentMapStore, plane, tileAssetsToChange, null, "mapEditorClearTile");
}

export function undoableMapEditorSwapTileLayers(currentMapStore: CurrentMapStore, plane: number, tileAssetsToChange: TileAssetChange[]) {
    executeUndoableMapEditorSetAndSelectTilesWithCheck(currentMapStore, plane, tileAssetsToChange, null, "mapEditorLayerOrderChanged");
}

export function undoableMapEditorSetAndSelectTiles(currentMapStore: CurrentMapStore, plane: number, tileAssetsToChange: TileAssetChange[], selectionPosition: TilePosition) {
    executeUndoableMapEditorSetAndSelectTilesWithCheck(currentMapStore, plane, tileAssetsToChange, selectionPosition, "mapEditorSetTile");
}

function executeUndoableMapEditorSetAndSelectTilesWithCheck(currentMapStore: CurrentMapStore, plane: number, tileAssetsToChange: TileAssetChange[], selectionPosition: TilePosition, operationTypeTranslationKey: string) {
    const tileChangeForward = new Array<NewAndOldChangeableTileDataSnapshotWithPosition>();
    for (const changeData of tileAssetsToChange) {
        const { newData, position } = changeData;
        const { x, y, layer } = position;

        const tile = currentMapStore.currentMap.getTile(x, y, layer, plane);
        if (tileDataEqualsChangeableTileDataSnapshot(tile, newData))
            continue;

        const currentSnapshot = getChangeableTileDataSnapshot(tile);

        tileChangeForward.push({
            newData,
            previousData: currentSnapshot,
            position: { x, y, layer }
        });
    }

    // Skip if no actual changes are necessary
    if (tileChangeForward.length === 0)
        return;

    executeUndoableOperation(new MapEditorSetTilesOp(currentMapStore, plane, tileChangeForward, selectionPosition, operationTypeTranslationKey));
}

class MapEditorSetTilesOp extends UndoableOperation {
    private tileChangeReverse = new Array<NewAndOldChangeableTileDataSnapshotWithPosition>();

    private readonly previousSelectedTilePosition: TilePosition;

    public constructor(
        private currentMapStore: CurrentMapStore,
        private plane: number,
        private tileChangeForward: NewAndOldChangeableTileDataSnapshotWithPosition[],
        private selectionPosition: TilePosition,
        operationTypeTranslationKey: string
    ) {
        super(operationTypeTranslationKey);

        // Set Reverse Changes
        for (const tileChange of tileChangeForward) {
            this.tileChangeReverse.push({
                newData: tileChange.previousData,
                previousData: tileChange.newData,
                position: tileChange.position
            });
        }

        this.previousSelectedTilePosition = mainMapEditorStore.selectedTilePosition;
    }

    public async execute() {
        await editorClient.setCurrentMapTiles(this.currentMapStore, this.tileChangeForward, this.plane);

        if (this.selectionPosition) {
            mainMapEditorStore.setSelectedTilePosition(this.selectionPosition);
        }
    }

    public async reverse() {
        await editorClient.setCurrentMapTiles(this.currentMapStore, this.tileChangeReverse, this.plane);

        if (this.selectionPosition) {
            mainMapEditorStore.setSelectedTilePosition(this.previousSelectedTilePosition);
        }
    }
}
