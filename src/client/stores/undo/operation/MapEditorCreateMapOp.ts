import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { mainMapEditorStore } from "../../MapEditorStore";

export function undoableMapEditorCreateMap(mapName: string) {
    executeUndoableOperation(new MapEditorCreateMapOp(mapName));
}

class MapEditorCreateMapOp extends UndoableOperation {
    private createdMapId: number;

    public constructor(
        private mapName: string
    ) {
        super("mapEditorCreateMap");
    }

    public async execute(redo: boolean) {
        const { currentMapStore } = mainMapEditorStore;
        if (redo) {
            await editorClient.undeleteMap(currentMapStore, this.createdMapId);
            await editorClient.openMapInMapEditor(currentMapStore, this.createdMapId);
        } else {
            this.createdMapId = await editorClient.createNewMap(currentMapStore, this.mapName);
        }
    }

    public async reverse() {
        const { currentMapStore } = mainMapEditorStore;
        await editorClient.deleteMap(currentMapStore, this.createdMapId);
    }
}