import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { doesTilePositionEqual, TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { MapEditorStore } from "../../MapEditorStore";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";

export function undoableMapEditorSelectTile(tilePosition: TilePosition, mapEditorStore: MapEditorStore, focusOnTile: boolean) {
    const { selectedTilePosition } = mapEditorStore;

    // Deselect without any selection? Skip.
    if (!selectedTilePosition && !tilePosition)
        return;

    // Selected again directly - unselect then.
    if (selectedTilePosition && tilePosition && doesTilePositionEqual(selectedTilePosition, tilePosition)) {
        tilePosition = null;
    }

    // execute method from 'UndoStore' ..
    executeUndoableOperation(new MapEditorEntitySelectionOp(tilePosition, mapEditorStore, focusOnTile));
}

class MapEditorEntitySelectionOp extends UndoableOperation {

    private readonly lastSelectedTileDataPosition: TilePosition;

    public constructor(
        private readonly nextSelectedTileDataPosition: TilePosition,
        private readonly mapEditorStore: MapEditorStore,
        private focusOnTile: boolean
    ) {
        super("mapEditorEntitySelectionChanged");
        this.lastSelectedTileDataPosition = this.mapEditorStore.selectedTilePosition;
    }

    public async execute() {
        this.select(this.nextSelectedTileDataPosition);
    }

    public async reverse() {
        this.select(this.lastSelectedTileDataPosition);
    }

    private select(targetPosition: TilePosition) {
        this.mapEditorStore.setSelectedTilePosition(targetPosition);

        if (targetPosition && this.focusOnTile) {
            const { mapState, canvasWidth, canvasHeight } = this.mapEditorStore;
            const zoom = mapState.currentMapZoom;
            const x = canvasWidth / 2 - tileToWorldPositionX(targetPosition.x, targetPosition.y, true) * zoom;
            const y = canvasHeight / 2 - tileToWorldPositionY(targetPosition.x, targetPosition.y, true) * zoom;
            mapState.setMapCenter(x, y, mapState.currentMapZoom);
        }
    }
}