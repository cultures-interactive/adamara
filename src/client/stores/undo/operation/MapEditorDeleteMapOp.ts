import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { mainMapEditorStore } from "../../MapEditorStore";

export function undoableMapEditorDeleteMap(mapId: number) {
    executeUndoableOperation(new MapEditorDeleteMapOp(mapId));
}

class MapEditorDeleteMapOp extends UndoableOperation {
    private mapWasOpen: boolean;

    public constructor(
        private mapId: number
    ) {
        super("mapEditorDeleteMap");
        this.mapWasOpen = mainMapEditorStore.currentMapStore.currentMapId === mapId;
    }

    public async execute() {
        await editorClient.deleteMap(mainMapEditorStore.currentMapStore, this.mapId);
    }

    public async reverse() {
        await editorClient.undeleteMap(mainMapEditorStore.currentMapStore, this.mapId);
        if (this.mapWasOpen) {
            await editorClient.openMapInMapEditor(mainMapEditorStore.currentMapStore, this.mapId);
        }
    }
}