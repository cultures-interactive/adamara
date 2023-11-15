import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorClient } from "../../../communication/EditorClient";
import { itemStore } from "../../ItemStore";
import { translationStore } from "../../TranslationStore";
import { mergeSinglePatchOp, UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableItemEditorSubmitItemChanges(itemId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    // Don't create undo entries while translations are importing
    if (translationStore.isImporting)
        return;

    executeUndoableOperation(new ItemEditorSubmitItemPropertyChangesOp(itemId, patch, inversePatch));
}

class ItemEditorSubmitItemPropertyChangesOp extends UndoableOperation {
    public constructor(
        public itemId: string,
        public patch: AugmentedPatch,
        public inversePatch: AugmentedPatch
    ) {
        super("itemEditorSubmitItemPropertyChanges");
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitItemChanges(this.itemId, this.patch, this.inversePatch);
        if (isRedo) {
            editorClient.patchItem(this.itemId, this.patch);
        }
        itemStore.setSelectedItem(itemStore.getItem(this.itemId));
    }

    public async reverse() {
        await editorClient.submitItemChanges(this.itemId, this.inversePatch, this.patch);
        editorClient.patchItem(this.itemId, this.inversePatch);
        itemStore.setSelectedItem(itemStore.getItem(this.itemId));
    }

    public merge(previousOperation: ItemEditorSubmitItemPropertyChangesOp) {
        return mergeSinglePatchOp(this, previousOperation);
    }
}