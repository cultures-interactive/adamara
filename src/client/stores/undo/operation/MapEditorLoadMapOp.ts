import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { CurrentMapStore } from "../../CurrentMapStore";

export function undoableMapEditorLoadMap(currentMapStore: CurrentMapStore, mapId: number) {
    if (currentMapStore.currentMapId === mapId)
        return;

    executeUndoableOperation(new MapEditorLoadMapOp(currentMapStore, mapId));
}

class MapEditorLoadMapOp extends UndoableOperation {
    private previousMapId: number;

    public constructor(
        private currentMapStore: CurrentMapStore,
        private readonly mapId: number
    ) {
        super("mapEditorLoadMap");
        this.previousMapId = currentMapStore.currentMapId;
    }

    public async execute() {
        await editorClient.openMapInMapEditor(this.currentMapStore, this.mapId);
    }

    public async reverse() {
        if (this.previousMapId === null) {
            this.currentMapStore.clearCurrentMap();
        } else {
            await editorClient.openMapInMapEditor(this.currentMapStore, this.previousMapId);
        }
    }
}