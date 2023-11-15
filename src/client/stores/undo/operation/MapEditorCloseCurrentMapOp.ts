import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { CurrentMapStore } from "../../CurrentMapStore";

export function undoableMapEditorCloseCurrentMap(currentMapStore: CurrentMapStore) {
    if (!currentMapStore.hasCurrentMap)
        return;

    executeUndoableOperation(new MapEditorCloseCurrentMapOp(currentMapStore, false));
}

export function undoableMapEditorCloseCurrentMapBecauseOfDeletion(currentMapStore: CurrentMapStore) {
    executeUndoableOperation(new MapEditorCloseCurrentMapOp(currentMapStore, true));
}

class MapEditorCloseCurrentMapOp extends UndoableOperation {
    private previousMapId: number;

    public constructor(
        private currentMapStore: CurrentMapStore,
        private willBeAutomaticallyClosedBecauseOfDeletion: boolean
    ) {
        super("mapEditorCloseCurrentMap");
        this.previousMapId = currentMapStore.currentMapId;
    }

    public async execute(isRedo: boolean) {
        if (this.willBeAutomaticallyClosedBecauseOfDeletion && !isRedo)
            return;

        this.currentMapStore.clearCurrentMap();
    }

    public async reverse() {
        await editorClient.openMapInMapEditor(this.currentMapStore, this.previousMapId);
    }
}