import { mergeSinglePatchOp, UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorMapStore } from "../../EditorMapStore";

export function undoableMapEditorSubmitCurrentMapPropertyChanges(mapId: number, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    executeUndoableOperation(new MapEditorSubmitCurrentMapPropertyChangesOp(mapId, patch, inversePatch));
}

class MapEditorSubmitCurrentMapPropertyChangesOp extends UndoableOperation {
    public constructor(
        private mapId: number,
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("mapEditorSubmitCurrentMapPropertyChanges");
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitCurrentMapPropertyChanges(this.mapId, this.patch, this.inversePatch);
        if (isRedo) {
            editorClient.patch(editorMapStore.getOrLoadMapWithMetaData(this.mapId).map.properties, this.patch);
        }
    }

    public async reverse() {
        await editorClient.submitCurrentMapPropertyChanges(this.mapId, this.inversePatch, this.patch);
        editorClient.patch(editorMapStore.getOrLoadMapWithMetaData(this.mapId).map.properties, this.inversePatch);
    }

    public merge(previousOperation: MapEditorSubmitCurrentMapPropertyChangesOp) {
        return mergeSinglePatchOp(this, previousOperation);
    }
}